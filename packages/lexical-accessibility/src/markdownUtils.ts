/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createCodeNode} from '@lexical/code';
import {$isListItemNode} from '@lexical/list';
import {
  $convertFromMarkdownString,
  type ElementTransformer,
  type MultilineElementTransformer,
  type TextFormatTransformer,
  type TextMatchTransformer,
  type Transformer,
} from '@lexical/markdown';
import {
  $createHorizontalRuleNode,
  HorizontalRuleNode,
} from '@lexical/react/LexicalHorizontalRuleNode';
import {$isHeadingNode, $isQuoteNode} from '@lexical/rich-text';
import {
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  type ElementNode,
  type LexicalNode,
  type TextNode,
} from 'lexical';

import {ACCESSIBILITY_TRANSFORMERS} from './transformers';

/**
 * Options for $insertMarkdownAtSelection.
 */
export interface InsertMarkdownOptions {
  /**
   * When true, preserves the current selection/cursor position instead of
   * moving the cursor to the end of inserted content.
   *
   * Use this when inserting content into a non-focused/background editor
   * to prevent focus from shifting to that editor.
   *
   * @default false
   */
  preserveSelection?: boolean;
}

/**
 * HR transformer for paste operations - does NOT call selectNext().
 * The standard HR transformer calls line.selectNext() which corrupts
 * cursor position during our hybrid paste approach.
 */
const HR_PASTE_TRANSFORMER: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: () => null, // We don't need export for paste
  regExp: /^(---|\*\*\*|___)\s?$/,
  replace: (parentNode, _1, _2, isImport) => {
    const line = $createHorizontalRuleNode();

    if (isImport || parentNode.getNextSibling() != null) {
      parentNode.replace(line);
    } else {
      parentNode.insertBefore(line);
    }

    // NOTE: We deliberately do NOT call line.selectNext() here!
    // This preserves the cursor position for paste operations.
  },
  type: 'element',
};

/**
 * Categorizes transformers by type for easier processing.
 * For paste operations, we substitute the HR transformer with our
 * custom version that doesn't call selectNext().
 */
function transformersByType(transformers: Array<Transformer>): {
  element: Array<ElementTransformer>;
  multilineElement: Array<MultilineElementTransformer>;
  textFormat: Array<TextFormatTransformer>;
  textMatch: Array<TextMatchTransformer>;
} {
  const element: Array<ElementTransformer> = [];
  const multilineElement: Array<MultilineElementTransformer> = [];
  const textFormat: Array<TextFormatTransformer> = [];
  const textMatch: Array<TextMatchTransformer> = [];

  for (const transformer of transformers) {
    if (transformer.type === 'element') {
      const elementTransformer = transformer as ElementTransformer;
      // Check if this is an HR transformer (by regex pattern)
      // Replace with our paste-friendly version
      if (
        elementTransformer.regExp.source.includes('---') ||
        elementTransformer.regExp.source.includes('\\*\\*\\*') ||
        elementTransformer.regExp.source.includes('___')
      ) {
        // Use our custom HR transformer that doesn't call selectNext()
        element.push(HR_PASTE_TRANSFORMER);
      } else {
        element.push(elementTransformer);
      }
    } else if (transformer.type === 'multiline-element') {
      multilineElement.push(transformer as MultilineElementTransformer);
    } else if (transformer.type === 'text-format') {
      textFormat.push(transformer as TextFormatTransformer);
    } else if (transformer.type === 'text-match') {
      textMatch.push(transformer as TextMatchTransformer);
    }
  }

  return {element, multilineElement, textFormat, textMatch};
}

/**
 * Applies element transformers to a paragraph node.
 * Returns true if any transformer was applied.
 */
function $applyElementTransformers(
  paragraphNode: ElementNode,
  elementTransformers: Array<ElementTransformer>,
): boolean {
  if (!$isParagraphNode(paragraphNode)) {
    return false;
  }

  const textContent = paragraphNode.getTextContent();
  const children = paragraphNode.getChildren();
  const textNodes = children.filter($isTextNode);

  for (const transformer of elementTransformers) {
    const match = textContent.match(transformer.regExp);
    if (match) {
      // For HR transformer, DON'T modify text before replace - let the replace function handle it
      const isHRTransformer = transformer.regExp.source.includes('---');
      // For TABLE transformer, also don't modify text - the table transformer handles its own content
      const isTableTransformer = transformer.regExp.source.includes('\\|');

      if (!isHRTransformer && !isTableTransformer) {
        // Update the first text node to remove the markdown prefix
        if (textNodes.length > 0) {
          const firstTextNode = textNodes[0];
          const newContent = textContent.slice(match[0].length);
          firstTextNode.setTextContent(newContent);
        }
      }

      // Call the replace function with isImport=true
      try {
        const result = transformer.replace(
          paragraphNode,
          textNodes,
          match,
          true,
        );

        // If replace returns false, the transformer declined to handle it
        if (result === false) {
          // Restore the text content
          if (textNodes.length > 0 && !isHRTransformer && !isTableTransformer) {
            textNodes[0].setTextContent(textContent);
          }
          continue;
        }
      } catch (_e) {
        continue;
      }

      return true;
    }
  }

  return false;
}

/**
 * Applies text format transformers (bold, italic, etc.) to a text node.
 * This is a simplified version that handles common cases.
 */
function $applyTextFormatTransformers(
  textNode: TextNode,
  textFormatTransformers: Array<TextFormatTransformer>,
): void {
  if (!textNode.isAttached()) {
    return;
  }

  // Sort transformers by tag length (longest first) to process ** before *, etc.
  const sortedTransformers = [...textFormatTransformers].sort(
    (a, b) => (b.tag ? b.tag.length : 0) - (a.tag ? a.tag.length : 0),
  );

  // Process each text format transformer
  for (const transformer of sortedTransformers) {
    const {tag, format} = transformer;
    if (!tag || !format) {
      continue;
    }

    // Build regex to match the format pattern
    // Escape special regex chars in tag for use outside character classes
    const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // For character classes, different escaping rules apply:
    // - In [...], special chars are: ] \ ^ -
    // - * + ? etc. are literal inside character classes
    const firstChar = tag[0];
    const escapedFirstCharForClass =
      firstChar === ']' ||
      firstChar === '\\' ||
      firstChar === '^' ||
      firstChar === '-'
        ? '\\' + firstChar
        : firstChar;

    // Use a safer regex pattern
    // Match: tag + (content that doesn't contain the first char of tag) + tag
    let regex: RegExp;
    try {
      // For single-char tags like * or _, match content that doesn't contain that char
      if (tag.length === 1) {
        regex = new RegExp(
          `${escapedTag}([^${escapedFirstCharForClass}]+)${escapedTag}`,
          'g',
        );
      } else {
        // For multi-char tags like ** or ~~, use non-greedy match
        regex = new RegExp(`${escapedTag}(.+?)${escapedTag}`, 'g');
      }
    } catch (_e) {
      continue;
    }

    let currentNode: TextNode | null = textNode;
    let iterations = 0;
    const maxIterations = 100; // Safety limit

    while (
      currentNode &&
      currentNode.isAttached() &&
      iterations < maxIterations
    ) {
      iterations++;
      const currentText = currentNode.getTextContent();
      const match = currentText.match(regex);

      if (!match) {
        break;
      }

      const fullMatch = match[0];
      const innerText = fullMatch.slice(tag.length, -tag.length);
      const matchIndex = currentText.indexOf(fullMatch);

      if (matchIndex === -1) {
        break;
      }

      try {
        // Split the node to isolate the formatted part
        let formattedNode: TextNode;
        let afterNode: TextNode | null = null;

        if (matchIndex === 0 && fullMatch.length === currentText.length) {
          // Entire node is the match
          formattedNode = currentNode;
          formattedNode.setTextContent(innerText);
        } else if (matchIndex === 0) {
          // Match at start
          const [splitFirst, second] = currentNode.splitText(fullMatch.length);
          formattedNode = splitFirst;
          formattedNode.setTextContent(innerText);
          afterNode = second;
        } else if (matchIndex + fullMatch.length === currentText.length) {
          // Match at end
          const [_splitFirst, second] = currentNode.splitText(matchIndex);
          formattedNode = second;
          formattedNode.setTextContent(innerText);
          afterNode = null;
        } else {
          // Match in middle
          const [_splitFirst, rest] = currentNode.splitText(matchIndex);
          const [second, third] = rest.splitText(fullMatch.length);
          formattedNode = second;
          formattedNode.setTextContent(innerText);
          afterNode = third;
        }

        // Apply the format(s)
        for (const fmt of format) {
          if (!formattedNode.hasFormat(fmt)) {
            formattedNode.toggleFormat(fmt);
          }
        }

        // Continue processing the remaining text
        currentNode = afterNode;
      } catch (_e) {
        break;
      }
    }
  }
}

/**
 * Applies text match transformers (like LINK) to a text node.
 * This handles markdown syntax like [text](url) converting to LinkNode.
 */
function $applyTextMatchTransformers(
  textNode: TextNode,
  textMatchTransformers: Array<TextMatchTransformer>,
): void {
  if (!textNode.isAttached()) {
    return;
  }

  for (const transformer of textMatchTransformers) {
    if (!transformer.replace || !transformer.importRegExp) {
      continue;
    }

    let currentNode: TextNode | null = textNode;
    let iterations = 0;
    const maxIterations = 100; // Safety limit

    while (
      currentNode &&
      currentNode.isAttached() &&
      iterations < maxIterations
    ) {
      iterations++;
      const currentText = currentNode.getTextContent();
      const match = currentText.match(transformer.importRegExp);

      if (!match) {
        break;
      }

      const matchIndex = match.index;
      if (matchIndex === undefined) {
        break;
      }

      try {
        // Split node if match doesn't start at beginning
        let nodeToTransform: TextNode = currentNode;
        let afterNode: TextNode | null = null;

        if (matchIndex > 0) {
          // Split: [before][match+after]
          const [_before, rest] = currentNode.splitText(matchIndex);
          nodeToTransform = rest;
        }

        // Now nodeToTransform starts with the match
        // If there's content after the match, split again
        const matchLength = match[0].length;
        const nodeText = nodeToTransform.getTextContent();

        if (matchLength < nodeText.length) {
          const [matchPart, restPart] = nodeToTransform.splitText(matchLength);
          nodeToTransform = matchPart;
          afterNode = restPart;
        }

        // Re-match on the isolated node to get proper match object
        const isolatedMatch = nodeToTransform
          .getTextContent()
          .match(transformer.importRegExp);
        if (isolatedMatch) {
          // Call the transformer's replace function
          transformer.replace(nodeToTransform, isolatedMatch);
        }

        // Continue processing after the match
        currentNode = afterNode;
      } catch (_e) {
        break;
      }
    }
  }
}

/**
 * Applies code block transforms to paragraphs that match ``` fences.
 * This must run BEFORE Phase 2 because code blocks span multiple paragraphs.
 *
 * @param root - The root node
 * @param createdParagraphKeys - Keys of paragraphs created during Phase 1
 */
function $applyCodeBlockTransforms(
  root: ElementNode,
  createdParagraphKeys: string[],
): void {
  // Match opening fence: ``` optionally followed by language identifier
  // The language can contain letters, numbers, +, -, # (for c++, c#, f#, etc.)
  const CODE_FENCE_REGEX = /^```([\w+#-]*)\s*$/;
  // Match closing fence: exactly ``` with optional trailing whitespace
  const CODE_FENCE_END_REGEX = /^```\s*$/;

  let i = 0;
  while (i < root.getChildrenSize()) {
    const children = root.getChildren();
    const child = children[i];

    if (
      !$isParagraphNode(child) ||
      !createdParagraphKeys.includes(child.getKey())
    ) {
      i++;
      continue;
    }

    const textContent = child.getTextContent().replace(/\r$/, ''); // Strip trailing \r
    const startMatch = textContent.match(CODE_FENCE_REGEX);

    if (!startMatch) {
      i++;
      continue;
    }

    // Found opening ```, look for closing ```
    const language = startMatch[1] || undefined;
    const codeLines: string[] = [];
    const nodesToRemove: ElementNode[] = [child];
    let j = i + 1;
    let foundEnd = false;

    while (j < root.getChildrenSize()) {
      const nextChild = root.getChildren()[j];
      if (!$isParagraphNode(nextChild)) {
        j++;
        continue;
      }

      // Check if this paragraph is also in our created list
      // If not, we've gone past our pasted content
      if (!createdParagraphKeys.includes(nextChild.getKey())) {
        break;
      }

      const nextText = nextChild.getTextContent().replace(/\r$/, '');
      const endMatch = nextText.match(CODE_FENCE_END_REGEX);

      if (endMatch && j > i) {
        // Found closing ```
        foundEnd = true;
        nodesToRemove.push(nextChild);
        break;
      }

      // This is a code line
      codeLines.push(nextText);
      nodesToRemove.push(nextChild);
      j++;
    }

    if (!foundEnd) {
      // No closing fence found, treat as regular paragraph
      i++;
      continue;
    }

    // Create code block node
    try {
      const codeBlockNode = $createCodeNode(language);
      const codeContent = codeLines.join('\n');
      if (codeContent.length > 0) {
        const codeTextNode = $createTextNode(codeContent);
        codeBlockNode.append(codeTextNode);
      }

      // Insert code block before the first removed node
      const firstNode = nodesToRemove[0];
      firstNode.insertBefore(codeBlockNode);

      // Remove all the original paragraph nodes
      for (const node of nodesToRemove) {
        if (node.isAttached()) {
          // Remove from createdParagraphKeys so Phase 2 doesn't try to process
          const idx = createdParagraphKeys.indexOf(node.getKey());
          if (idx !== -1) {
            createdParagraphKeys.splice(idx, 1);
          }
          node.remove();
        }
      }
    } catch (_e) {
      // CodeNode might not be registered - skip this code block transformation
      // and let the raw backticks remain as text
      i++;
      continue;
    }

    // Don't increment i, the next node is now at position i
  }
}

/**
 * Recursively collects all TextNode descendants from a node.
 */
function $collectTextNodes(node: LexicalNode): TextNode[] {
  const textNodes: TextNode[] = [];

  if ($isTextNode(node)) {
    textNodes.push(node);
  } else if ('getChildren' in node && typeof node.getChildren === 'function') {
    const children = (node as ElementNode).getChildren();
    for (const child of children) {
      textNodes.push(...$collectTextNodes(child));
    }
  }

  return textNodes;
}

/**
 * Applies text format and text match transforms to text nodes inside
 * element-transformed nodes like lists, headings, and quotes.
 *
 * This is needed because element transforms (list, heading, quote) move the
 * text content to a new node structure, but the markdown syntax like **bold**
 * and [links](url) is still present in the text and needs to be converted.
 */
function $applyTextFormatsToElementTransformResults(
  root: ElementNode,
  textFormatTransformers: Array<TextFormatTransformer>,
  textMatchTransformers: Array<TextMatchTransformer> = [],
): void {
  const rootChildren = root.getChildren();

  // Helper to apply all text transforms to a collection of text nodes
  const applyAllTextTransforms = (textNodes: TextNode[]) => {
    // First apply format transforms (bold, italic, etc.)
    for (const tn of textNodes) {
      if (tn.isAttached()) {
        $applyTextFormatTransformers(tn, textFormatTransformers);
      }
    }
    // Then apply text match transforms (links) - re-collect as nodes may have changed
    // We need to get fresh nodes from the parent after format transforms
  };

  for (const child of rootChildren) {
    // Skip paragraphs - they're handled in Phase 2 main loop
    if ($isParagraphNode(child)) {
      continue;
    }

    // Process list nodes
    if ('getListType' in child) {
      // This is a ListNode - process all list items
      const listItems = (child as unknown as ElementNode).getChildren();
      for (const listItem of listItems) {
        if ($isListItemNode(listItem)) {
          const textNodes = $collectTextNodes(listItem);
          applyAllTextTransforms(textNodes);
          // Apply text match transforms after format transforms
          const updatedTextNodes = $collectTextNodes(listItem);
          for (const tn of updatedTextNodes) {
            if (tn.isAttached()) {
              $applyTextMatchTransformers(tn, textMatchTransformers);
            }
          }
        }
      }
    }

    // Process heading nodes
    if ($isHeadingNode(child)) {
      const textNodes = $collectTextNodes(child);
      applyAllTextTransforms(textNodes);
      // Apply text match transforms after format transforms
      const updatedTextNodes = $collectTextNodes(child);
      for (const tn of updatedTextNodes) {
        if (tn.isAttached()) {
          $applyTextMatchTransformers(tn, textMatchTransformers);
        }
      }
    }

    // Process quote nodes
    if ($isQuoteNode(child)) {
      const textNodes = $collectTextNodes(child);
      applyAllTextTransforms(textNodes);
      // Apply text match transforms after format transforms
      const updatedTextNodes = $collectTextNodes(child);
      for (const tn of updatedTextNodes) {
        if (tn.isAttached()) {
          $applyTextMatchTransformers(tn, textMatchTransformers);
        }
      }
    }
  }
}

/**
 * Inserts markdown content at the current selection position.
 * Uses a hybrid approach:
 * 1. Insert raw text using clipboard pattern (preserves cursor position)
 * 2. Transform inserted paragraphs using markdown transformers
 *
 * This solves the fundamental issue where $convertFromMarkdownString's
 * text transformers call splitText() which corrupts selection state.
 *
 * @param markdownString - The markdown text to parse and insert
 * @param transformers - Optional custom transformers (defaults to ACCESSIBILITY_TRANSFORMERS)
 * @param options - Optional settings for insertion behavior
 *
 * @example
 * ```typescript
 * // Normal paste - cursor moves to end of inserted content
 * editor.update(() => {
 *   $insertMarkdownAtSelection('**bold text** and *italic*');
 * });
 *
 * // Background insert - cursor stays where it was
 * editor.update(() => {
 *   $insertMarkdownAtSelection('# Heading\n\nContent', ACCESSIBILITY_TRANSFORMERS, {
 *     preserveSelection: true,
 *   });
 * }, { tag: SUPPRESS_A11Y_ANNOUNCEMENTS_TAG });
 * ```
 */
export function $insertMarkdownAtSelection(
  markdownString: string,
  transformers: Array<Transformer> = ACCESSIBILITY_TRANSFORMERS,
  options: InsertMarkdownOptions = {},
): void {
  const {preserveSelection = false} = options;

  const selection = $getSelection();
  const root = $getRoot();

  // Capture original selection state for preservation mode
  // We need the node key and offset to restore position after insertion
  let originalAnchorKey: string | null = null;
  let originalAnchorOffset = 0;
  let _originalFocusKey: string | null = null;
  let _originalFocusOffset = 0;

  if (preserveSelection && $isRangeSelection(selection)) {
    originalAnchorKey = selection.anchor.key;
    originalAnchorOffset = selection.anchor.offset;
    _originalFocusKey = selection.focus.key;
    _originalFocusOffset = selection.focus.offset;
  }

  // If no selection or root is empty, just replace everything
  if (!$isRangeSelection(selection) || root.isEmpty()) {
    $convertFromMarkdownString(markdownString, transformers);
    return;
  }

  // For simple single-line text without markdown, just insert as text
  const hasMarkdownSyntax = /[*_`#[\]|>\-+]/.test(markdownString);
  const isMultiLine = markdownString.includes('\n');

  if (!hasMarkdownSyntax && !isMultiLine) {
    selection.insertText(markdownString);
    // If preserving selection, restore the original position
    if (preserveSelection && originalAnchorKey) {
      const anchorNode = $getNodeByKey(originalAnchorKey);
      if (anchorNode && $isTextNode(anchorNode) && anchorNode.isAttached()) {
        const textLen = anchorNode.getTextContent().length;
        // Clamp offset to valid range (text may have changed)
        const safeOffset = Math.min(originalAnchorOffset, textLen);
        anchorNode.select(safeOffset, safeOffset);
      }
    }
    return;
  }

  // Categorize transformers
  const byType = transformersByType(transformers);

  // Track the starting paragraph for later transformation
  const startNode = selection.anchor.getNode();
  const startParagraph = $isParagraphNode(startNode)
    ? startNode
    : startNode.getParentOrThrow();
  const startParagraphKey = startParagraph.getKey();

  // IMPORTANT: Track the index where we're inserting for later cursor restoration.
  // We need to find the last inserted node, not the last node in the document.
  const insertionStartIndex = root
    .getChildren()
    .findIndex((child) => child.getKey() === startParagraph.getKey());

  // Track the starting index in the root for cursor restoration
  const startingRootIndex = root
    .getChildren()
    .findIndex((child) => child.getKey() === startParagraph.getKey());

  // PHASE 1: Insert raw text using clipboard pattern
  // This preserves cursor position correctly
  // Normalize line endings (handle Windows CRLF and old Mac CR)
  const normalizedMarkdown = markdownString
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const lines = normalizedMarkdown.split('\n');
  const createdParagraphKeys: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const currentSelection = $getSelection();
    if (!$isRangeSelection(currentSelection)) {
      break;
    }

    const line = lines[i];

    if (i === 0) {
      // First line: insert as text at current position
      if (line.length > 0) {
        currentSelection.insertText(line);
      }
      // Track the paragraph we're in
      const anchor = currentSelection.anchor.getNode();
      const para = $isParagraphNode(anchor)
        ? anchor
        : anchor.getParentOrThrow();
      if (!createdParagraphKeys.includes(para.getKey())) {
        createdParagraphKeys.push(para.getKey());
      }
    } else {
      // Subsequent lines: insert paragraph break then text
      currentSelection.insertParagraph();

      // Get the new paragraph
      const newSelection = $getSelection();
      if ($isRangeSelection(newSelection)) {
        const anchor = newSelection.anchor.getNode();
        const para = $isParagraphNode(anchor)
          ? anchor
          : anchor.getParentOrThrow();
        createdParagraphKeys.push(para.getKey());

        if (line.length > 0) {
          newSelection.insertText(line);
        }
      }
    }
  }

  // PHASE 1.5: Process multiline code blocks BEFORE Phase 2
  // Code blocks span multiple paragraphs, so we need special handling
  $applyCodeBlockTransforms(root, createdParagraphKeys);

  // CRITICAL: Clear selection before Phase 2 to prevent "selection has been lost" error.
  // Phase 2 transformers may replace/remove nodes that the selection points to.
  // If we don't clear selection here, Lexical's reconciler will throw:
  // "selection has been lost because the previously selected nodes have been removed"
  // We'll restore selection in Phase 3 after all transformations are complete.
  $setSelection(null);

  // PHASE 2: Apply transformers to created paragraphs
  // We iterate through the root children to find our paragraphs
  const rootChildren = root.getChildren();

  for (const child of rootChildren) {
    if (!$isParagraphNode(child)) {
      continue;
    }
    if (!createdParagraphKeys.includes(child.getKey())) {
      continue;
    }

    // First, apply element transformers (headings, lists, quotes, etc.)
    const elementApplied = $applyElementTransformers(child, byType.element);

    if (!elementApplied && child.isAttached()) {
      // If no element transformer was applied, apply text format and text match transformers
      const textNodes = child.getChildren().filter($isTextNode);
      for (const tn of textNodes) {
        if (tn.isAttached()) {
          $applyTextFormatTransformers(tn, byType.textFormat);
        }
      }
      // Apply text match transformers (like LINK) - must re-get text nodes as format transforms may have changed them
      const updatedTextNodes = child.getChildren().filter($isTextNode);
      for (const tn of updatedTextNodes) {
        if (tn.isAttached()) {
          $applyTextMatchTransformers(tn, byType.textMatch);
        }
      }
    }
    // NOTE: When elementApplied is true, the paragraph is detached and replaced
    // by another node (list, heading, quote). The text content is moved to that
    // new node but still contains markdown syntax like **bold**.
    // We'll handle this in a second pass below.
  }

  // PHASE 2b: Apply text format transforms to nodes created by element transforms
  // This handles bold/italic inside lists, headings, and quotes
  $applyTextFormatsToElementTransformResults(
    root,
    byType.textFormat,
    byType.textMatch,
  );

  // PHASE 3: Cursor position handling
  // We cleared selection before Phase 2, so we MUST restore it to a valid node.
  // When preserveSelection is true, we try to restore to the original position
  // (or as close as possible). When false, we move cursor to end of inserted content.
  if (preserveSelection) {
    // For preserveSelection mode (background editors), we need to set selection
    // to a valid node but avoid triggering focus. Try to restore original position.
    // Since we cleared selection earlier, we can't leave it null.
    try {
      // Try to find the original anchor node or a node near it
      if (originalAnchorKey) {
        const anchorNode = $getNodeByKey(originalAnchorKey);
        if (anchorNode && $isTextNode(anchorNode) && anchorNode.isAttached()) {
          const textLen = anchorNode.getTextContent().length;
          const safeOffset = Math.min(originalAnchorOffset, textLen);
          anchorNode.select(safeOffset, safeOffset);
          return;
        }
      }
      // Fallback: select end of first child (least intrusive)
      const firstChild = root.getFirstChild();
      if (firstChild && 'selectStart' in firstChild) {
        (firstChild as ElementNode).selectStart();
      }
    } catch (_e) {
      // If all else fails, just select root start
      root.selectStart();
    }

    // Suppress unused variable warnings
    void startParagraphKey;
    void startingRootIndex;
    void insertionStartIndex;
    return;
  }

  // Normal mode: restore cursor to the ACTUAL end of pasted content.
  //
  // Key insight: selectEnd() on element nodes doesn't always work as expected.
  // We need to find the deepest last text node and position cursor at its end.

  try {
    const finalRootChildren = root.getChildren();

    if (finalRootChildren.length === 0) {
      return;
    }

    // Find the last root-level node
    const lastRootNode = finalRootChildren[finalRootChildren.length - 1];

    if (!lastRootNode || !lastRootNode.isAttached()) {
      root.selectEnd();
      return;
    }

    // Helper to find the deepest last text node in a subtree
    const findLastTextNode = (node: LexicalNode): TextNode | null => {
      if ($isTextNode(node)) {
        return node;
      }
      if ('getChildren' in node && typeof node.getChildren === 'function') {
        const nodeChildren = (node as ElementNode).getChildren();
        // Search from last child backward
        for (let idx = nodeChildren.length - 1; idx >= 0; idx--) {
          const result = findLastTextNode(nodeChildren[idx]);
          if (result) {
            return result;
          }
        }
      }
      return null;
    };

    // Find the last text node in the last root element
    const lastTextNode = findLastTextNode(lastRootNode);

    if (lastTextNode && lastTextNode.isAttached()) {
      const textContent = lastTextNode.getTextContent();
      const textLength = textContent.length;

      // Position cursor at the very end of this text node
      lastTextNode.select(textLength, textLength);
    } else {
      // No text node found - might be a decorator node (HR, image)
      // Use selectEnd on the last root node
      if (
        'selectEnd' in lastRootNode &&
        typeof lastRootNode.selectEnd === 'function'
      ) {
        (lastRootNode as ElementNode).selectEnd();
      } else if (
        'select' in lastRootNode &&
        typeof (lastRootNode as {select?: () => void}).select === 'function'
      ) {
        (lastRootNode as {select: () => void}).select();
      } else {
        root.selectEnd();
      }
    }
  } catch (_e) {
    try {
      root.selectEnd();
    } catch (_rootError) {
      // Could not restore cursor
    }
  }

  // Suppress unused variable warnings for tracking vars used in debugging
  void startParagraphKey;
  void startingRootIndex;
  void insertionStartIndex;
}

/**
 * Replaces the entire editor content with parsed markdown.
 * This is a wrapper around $convertFromMarkdownString for convenience.
 *
 * @param markdownString - The markdown text to parse
 * @param transformers - Optional custom transformers (defaults to TRANSFORMERS)
 *
 * @example
 * ```typescript
 * editor.update(() => {
 *   $replaceWithMarkdown('# Heading\n\nParagraph text');
 * });
 * ```
 */
export function $replaceWithMarkdown(
  markdownString: string,
  transformers: Array<Transformer> = ACCESSIBILITY_TRANSFORMERS,
): void {
  $convertFromMarkdownString(markdownString, transformers);
}
