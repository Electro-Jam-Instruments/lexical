/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $convertFromMarkdownString,
  type Transformer,
  TRANSFORMERS,
} from '@lexical/markdown';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $insertNodes,
  $isElementNode,
  $isRangeSelection,
  $setSelection,
  type LexicalNode,
} from 'lexical';

/**
 * Inserts markdown content at the current selection position.
 * Parses the markdown string and inserts the resulting nodes at cursor.
 *
 * Uses a temporary root approach: parse markdown in isolation, then extract
 * and insert the resulting nodes at the current selection.
 *
 * @param markdownString - The markdown text to parse and insert
 * @param transformers - Optional custom transformers (defaults to TRANSFORMERS)
 *
 * @example
 * ```typescript
 * editor.update(() => {
 *   $insertMarkdownAtSelection('**bold text** and *italic*');
 * });
 * ```
 */
export function $insertMarkdownAtSelection(
  markdownString: string,
  transformers: Array<Transformer> = TRANSFORMERS,
): void {
  const selection = $getSelection();
  const root = $getRoot();

  // If no selection or root is empty, just replace everything
  if (!$isRangeSelection(selection) || root.isEmpty()) {
    $convertFromMarkdownString(markdownString, transformers);
    return;
  }

  // For simple single-line text without markdown, just insert as text
  // This handles the common case of pasting plain text efficiently
  const hasMarkdownSyntax = /[*_`#[\]|>\-+]/.test(markdownString);
  const isMultiLine = markdownString.includes('\n');

  if (!hasMarkdownSyntax && !isMultiLine) {
    // Simple text insertion - just insert at selection
    selection.insertText(markdownString);
    return;
  }

  // For multi-line plain text without markdown, split into paragraphs
  if (!hasMarkdownSyntax && isMultiLine) {
    const lines = markdownString.split('\n');
    const nodes: LexicalNode[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i === 0) {
        // First line: insert as text at current position
        selection.insertText(line);
      } else {
        // Subsequent lines: create new paragraphs
        const paragraph = $createParagraphNode();
        if (line.length > 0) {
          paragraph.append($createTextNode(line));
        }
        nodes.push(paragraph);
      }
    }

    if (nodes.length > 0) {
      $insertNodes(nodes);
    }
    return;
  }

  // For markdown content with existing editor content:
  // We need to parse markdown without losing existing content.
  //
  // Strategy: Detach existing nodes, parse markdown, then reattach
  // in order: existing nodes before selection, parsed nodes, existing nodes after.

  // Find the top-level block element containing the selection
  const anchorNode = selection.anchor.getNode();
  let currentBlock: LexicalNode | null = anchorNode;

  // Walk up to find the direct child of root (top-level block)
  while (currentBlock !== null) {
    const parent: LexicalNode | null = currentBlock.getParent();
    if (parent === null || parent === root) {
      break;
    }
    currentBlock = parent;
  }

  if (!currentBlock || !$isElementNode(currentBlock)) {
    // Fallback: just replace everything
    $convertFromMarkdownString(markdownString, transformers);
    return;
  }

  // Get all root children and find current block index
  const rootChildren = root.getChildren();
  const currentBlockIndex = rootChildren.indexOf(currentBlock);

  if (currentBlockIndex === -1) {
    // Block not found in root, fallback
    $convertFromMarkdownString(markdownString, transformers);
    return;
  }

  // Detach all existing nodes (keeping references to them)
  // Nodes before and including selection block
  const nodesBefore: LexicalNode[] = [];
  for (let i = 0; i <= currentBlockIndex; i++) {
    const node = rootChildren[i];
    node.remove();
    nodesBefore.push(node);
  }

  // Nodes after selection block
  const nodesAfter: LexicalNode[] = [];
  for (let i = currentBlockIndex + 1; i < rootChildren.length; i++) {
    const node = rootChildren[i];
    node.remove();
    nodesAfter.push(node);
  }

  // Now root is empty - parse markdown
  $convertFromMarkdownString(markdownString, transformers);

  // Get the parsed nodes (keep them attached for now, we'll move them)
  const parsedNodes = root.getChildren().slice(); // copy the array

  // Detach parsed nodes
  for (const node of parsedNodes) {
    node.remove();
  }

  // Now root is empty again - rebuild in correct order
  // 1. Add nodes before selection
  for (const node of nodesBefore) {
    root.append(node);
  }

  // 2. Add parsed markdown nodes
  for (const node of parsedNodes) {
    root.append(node);
  }

  // 3. Add nodes after selection
  for (const node of nodesAfter) {
    root.append(node);
  }

  // 4. Set cursor at end of pasted content
  // Find the last parsed node and position cursor at its end
  if (parsedNodes.length > 0) {
    const lastParsedNode = parsedNodes[parsedNodes.length - 1];
    const newSelection = $createRangeSelection();

    // For element nodes, select at end of element
    if ($isElementNode(lastParsedNode)) {
      const lastChild = lastParsedNode.getLastDescendant();
      if (lastChild) {
        const key = lastChild.getKey();
        const offset = lastChild.getTextContentSize();
        newSelection.anchor.set(key, offset, 'text');
        newSelection.focus.set(key, offset, 'text');
      } else {
        // Empty element - select at element level
        const key = lastParsedNode.getKey();
        newSelection.anchor.set(key, 0, 'element');
        newSelection.focus.set(key, 0, 'element');
      }
    } else {
      // Text node
      const key = lastParsedNode.getKey();
      const offset = lastParsedNode.getTextContentSize();
      newSelection.anchor.set(key, offset, 'text');
      newSelection.focus.set(key, offset, 'text');
    }

    $setSelection(newSelection);
  }
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
  transformers: Array<Transformer> = TRANSFORMERS,
): void {
  $convertFromMarkdownString(markdownString, transformers);
}
