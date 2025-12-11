/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

let code = require('@lexical/code');
let list = require('@lexical/list');
let LexicalComposerContext = require('@lexical/react/LexicalComposerContext');
let lexical = require('lexical');
let react = require('react');
let jsxRuntime = require('react/jsx-runtime');
let markdown = require('@lexical/markdown');
let LexicalHorizontalRuleNode = require('@lexical/react/LexicalHorizontalRuleNode');
let richText = require('@lexical/rich-text');
let LexicalAutoLinkPlugin = require('@lexical/react/LexicalAutoLinkPlugin');
let link = require('@lexical/link');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * ARIA live region component for screen reader announcements.
 * Visually hidden but accessible to screen readers.
 */
function AccessibilityLiveRegion({announcement}) {
  return /*#__PURE__*/ jsxRuntime.jsx('div', {
    'aria-atomic': 'true',
    'aria-live': 'assertive',
    children: announcement,
    role: 'status',
    style: {
      height: '1px',
      left: '-10000px',
      overflow: 'hidden',
      position: 'absolute',
      width: '1px',
    },
  });
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Format bit flags (from Lexical)
const IS_BOLD$1 = 1;
const IS_ITALIC$1 = 1 << 1;
const IS_STRIKETHROUGH$1 = 1 << 2;
const IS_UNDERLINE$1 = 1 << 3;
const IS_CODE$1 = 1 << 4;
const IS_SUBSCRIPT = 1 << 5;
const IS_SUPERSCRIPT = 1 << 6;

// Formats that require semantic HTML tags
const DOM_REQUIRED_FORMATS = IS_CODE$1 | IS_SUBSCRIPT | IS_SUPERSCRIPT;

/**
 * AccessibleTextNode extends TextNode to use CSS styling instead of
 * semantic HTML tags for bold, italic, underline, and strikethrough.
 *
 * This prevents DOM node replacement when formatting changes, which
 * eliminates the "selected/unselected" announcements that screen readers
 * make when selection is restored after DOM replacement.
 */
class AccessibleTextNode extends lexical.TextNode {
  static getType() {
    return 'accessible-text';
  }
  static clone(node) {
    return new AccessibleTextNode(node.__text, node.__key);
  }
  createDOM(config) {
    const dom = super.createDOM(config);
    this.applyCSSFormatting(dom);
    return dom;
  }
  updateDOM(prevNode, dom, config) {
    const prevFormat = prevNode.__format;
    const nextFormat = this.__format;

    // Check if DOM-required formats changed (code, subscript, superscript)
    const prevDOMFormats = prevFormat & DOM_REQUIRED_FORMATS;
    const nextDOMFormats = nextFormat & DOM_REQUIRED_FORMATS;
    if (prevDOMFormats !== nextDOMFormats) {
      // DOM-required format changed - need full replacement
      return true;
    }

    // Check if text content changed
    if (prevNode.__text !== this.__text) {
      dom.textContent = this.__text;
    }

    // Apply CSS formatting for compatible formats
    this.applyCSSFormatting(dom);

    // Check other properties that might require DOM update
    const prevMode = prevNode.__mode;
    const nextMode = this.__mode;
    if (prevMode !== nextMode) {
      return true;
    }
    const prevStyle = prevNode.__style;
    const nextStyle = this.__style;
    if (prevStyle !== nextStyle) {
      dom.style.cssText = nextStyle;
      // Re-apply CSS formatting since cssText was overwritten
      this.applyCSSFormatting(dom);
    }

    // No DOM replacement needed
    return false;
  }
  applyCSSFormatting(dom) {
    const format = this.__format;

    // Bold
    if (format & IS_BOLD$1) {
      dom.style.fontWeight = 'bold';
    } else {
      dom.style.fontWeight = '';
    }

    // Italic
    if (format & IS_ITALIC$1) {
      dom.style.fontStyle = 'italic';
    } else {
      dom.style.fontStyle = '';
    }

    // Text decorations (can combine multiple)
    const decorations = [];
    if (format & IS_UNDERLINE$1) {
      decorations.push('underline');
    }
    if (format & IS_STRIKETHROUGH$1) {
      decorations.push('line-through');
    }
    dom.style.textDecorationLine =
      decorations.length > 0 ? decorations.join(' ') : '';
  }
  static importJSON(serializedNode) {
    const node = $createAccessibleTextNode(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }
  exportJSON() {
    return {
      ...super.exportJSON(),
      type: 'accessible-text',
    };
  }
}
function $createAccessibleTextNode(text = '') {
  return lexical.$applyNodeReplacement(new AccessibleTextNode(text));
}
function $isAccessibleTextNode(node) {
  return node instanceof AccessibleTextNode;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Generates announcement messages based on transformation type and verbosity level
 */
function generateHeadingAnnouncement$1(level, verbosity) {
  // Handle paragraph (level 0 or empty)
  if (!level || level === '0' || level === 'paragraph') {
    switch (verbosity) {
      case 'minimal':
        return 'Paragraph';
      case 'standard':
        return 'Changed to paragraph';
      case 'verbose':
        return 'Changed to paragraph';
      default:
        return 'Changed to paragraph';
    }
  }
  switch (verbosity) {
    case 'minimal':
      return `Heading ${level}`;
    case 'standard':
      return `Heading level ${level}`;
    case 'verbose':
      return `Changed to heading level ${level}`;
    default:
      return `Heading level ${level}`;
  }
}
function generateListAnnouncement$1(
  listType,
  verbosity,
  isNewList = false,
  isDeleted = false,
  itemCount,
) {
  const typeLabels = {
    bullet: 'Bulleted',
    check: 'Checklist',
    number: 'Numbered',
  };
  const label = typeLabels[listType] || 'List';
  if (isDeleted) {
    switch (verbosity) {
      case 'minimal':
        return 'List removed';
      case 'standard':
        return 'List removed';
      case 'verbose':
        return 'Removed list formatting';
      default:
        return 'List removed';
    }
  }
  if (isNewList) {
    const countText = itemCount !== undefined ? `, ${itemCount} items` : '';
    switch (verbosity) {
      case 'minimal':
        return label;
      case 'standard':
        return `${label} list${countText}`;
      case 'verbose':
        return itemCount !== undefined
          ? `Created ${label.toLowerCase()} list with ${itemCount} items`
          : `Created ${label.toLowerCase()} list`;
      default:
        return `${label} list${countText}`;
    }
  }
  switch (verbosity) {
    case 'minimal':
      return label;
    case 'standard':
      return `${label} list item`;
    case 'verbose':
      return `Created ${label.toLowerCase()} list item`;
    default:
      return `${label} list item`;
  }
}
function generateIndentAnnouncement(direction, verbosity, level) {
  const action = direction === 'indent' ? 'Indented' : 'Outdented';

  // Level is 0-based from getIndent(), add 1 for human-readable
  const displayLevel = level !== undefined ? level + 1 : undefined;
  switch (verbosity) {
    case 'minimal':
      return action;
    case 'standard':
      return displayLevel !== undefined ? `${action} ${displayLevel}` : action;
    case 'verbose':
      return displayLevel !== undefined
        ? `${action} to level ${displayLevel}`
        : action;
    default:
      return displayLevel !== undefined ? `${action} ${displayLevel}` : action;
  }
}
function generateFormatAnnouncement(format, applied, verbosity, text) {
  // Word count thresholds by verbosity level
  const wordThresholds = {
    minimal: 12,
    standard: 3,
    verbose: 10,
  };
  const wordThreshold = wordThresholds[verbosity] || 3;

  // Format verbs by verbosity
  const formatVerbs = {
    bold: {
      applied: {
        minimal: 'Bold',
        standard: 'Bolded',
        verbose: 'Bolded selected text:',
      },
      removed: {
        minimal: 'Unbold',
        standard: 'Removed bold',
        verbose: 'Removed bold formatting from:',
      },
    },
    code: {
      applied: {
        minimal: 'Code',
        standard: 'Code',
        verbose: 'Code formatted',
      },
      removed: {
        minimal: 'Code removed',
        standard: 'Removed code',
        verbose: 'Removed code formatting from:',
      },
    },
    italic: {
      applied: {
        minimal: 'Italic',
        standard: 'Italicized',
        verbose: 'Italicized selected text:',
      },
      removed: {
        minimal: 'Unitalic',
        standard: 'Removed italic',
        verbose: 'Removed italic formatting from:',
      },
    },
    strikethrough: {
      applied: {
        minimal: 'Strikethrough',
        standard: 'Strikethrough',
        verbose: 'Strikethrough applied to:',
      },
      removed: {
        minimal: 'Unstrikethrough',
        standard: 'Removed strikethrough',
        verbose: 'Removed strikethrough from:',
      },
    },
    underline: {
      applied: {
        minimal: 'Underline',
        standard: 'Underlined',
        verbose: 'Underlined text:',
      },
      removed: {
        minimal: 'Ununderline',
        standard: 'Removed underline',
        verbose: 'Removed underline from:',
      },
    },
  };
  const verbs = formatVerbs[format] || {
    applied: {
      minimal: format,
      standard: `${format} applied`,
      verbose: `${format} applied to:`,
    },
    removed: {
      minimal: `Un${format}`,
      standard: `Removed ${format}`,
      verbose: `Removed ${format} from:`,
    },
  };
  const verb = applied ? verbs.applied[verbosity] : verbs.removed[verbosity];

  // If we have text, announce with word count for longer selections
  if (text && text.trim().length > 0) {
    const words = text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    const wordCount = words.length;
    if (wordCount > wordThreshold) {
      return `${verb} ${wordCount} words`;
    }
    return `${verb} ${text.trim()}`;
  }

  // Fallback if no text - just return the verb
  return verb;
}
function mergeFormatAnnouncements(announcements) {
  if (announcements.length === 0) {
    return '';
  }
  if (announcements.length === 1) {
    return announcements[0];
  }

  // Join with "and" for the last item
  const allButLast = announcements.slice(0, -1);
  const last = announcements[announcements.length - 1];
  return `${allButLast.join(', ')} and ${last}`;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Horizontal Rule transformer for markdown.
 *
 * Converts `---`, `***`, or `___` to a HorizontalRuleNode.
 * This transformer is not included in the default @lexical/markdown TRANSFORMERS
 * because HorizontalRuleNode lives in @lexical/react.
 */
const HR = {
  dependencies: [LexicalHorizontalRuleNode.HorizontalRuleNode],
  export: (node) => {
    return LexicalHorizontalRuleNode.$isHorizontalRuleNode(node) ? '***' : null;
  },
  regExp: /^(---|\*\*\*|___)\s?$/,
  replace: (parentNode, _1, _2, isImport) => {
    const line = LexicalHorizontalRuleNode.$createHorizontalRuleNode();
    if (isImport || parentNode.getNextSibling() != null) {
      parentNode.replace(line);
    } else {
      parentNode.insertBefore(line);
    }
    line.selectNext();
  },
  type: 'element',
};

/**
 * Extended transformers for accessibility plugin.
 *
 * Includes all standard @lexical/markdown TRANSFORMERS plus:
 * - HR (Horizontal Rule) - converts ---, ***, ___ to horizontal rules
 *
 * Use this as the default for markdown paste operations, or pass
 * your own custom transformers array to override.
 *
 * @example
 * ```tsx
 * import { ACCESSIBILITY_TRANSFORMERS } from '@lexical/accessibility';
 *
 * // Use directly
 * $convertFromMarkdownString(text, ACCESSIBILITY_TRANSFORMERS);
 *
 * // Or extend with app-specific transformers
 * const MY_TRANSFORMERS = [MY_CUSTOM, ...ACCESSIBILITY_TRANSFORMERS];
 * ```
 */
const ACCESSIBILITY_TRANSFORMERS = [HR, ...markdown.TRANSFORMERS];

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * HR transformer for paste operations - does NOT call selectNext().
 * The standard HR transformer calls line.selectNext() which corrupts
 * cursor position during our hybrid paste approach.
 */
const HR_PASTE_TRANSFORMER = {
  dependencies: [LexicalHorizontalRuleNode.HorizontalRuleNode],
  export: () => null,
  // We don't need export for paste
  regExp: /^(---|\*\*\*|___)\s?$/,
  replace: (parentNode, _1, _2, isImport) => {
    const line = LexicalHorizontalRuleNode.$createHorizontalRuleNode();
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
function transformersByType(transformers) {
  const element = [];
  const multilineElement = [];
  const textFormat = [];
  const textMatch = [];
  for (const transformer of transformers) {
    if (transformer.type === 'element') {
      const elementTransformer = transformer;
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
      multilineElement.push(transformer);
    } else if (transformer.type === 'text-format') {
      textFormat.push(transformer);
    } else if (transformer.type === 'text-match') {
      textMatch.push(transformer);
    }
  }
  return {
    element,
    multilineElement,
    textFormat,
    textMatch,
  };
}

/**
 * Applies element transformers to a paragraph node.
 * Returns true if any transformer was applied.
 */
function $applyElementTransformers(paragraphNode, elementTransformers) {
  if (!lexical.$isParagraphNode(paragraphNode)) {
    return false;
  }
  const textContent = paragraphNode.getTextContent();
  const children = paragraphNode.getChildren();
  const textNodes = children.filter(lexical.$isTextNode);
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
function $applyTextFormatTransformers(textNode, textFormatTransformers) {
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
    let regex;
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
    let currentNode = textNode;
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
        let formattedNode;
        let afterNode = null;
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
 * Applies code block transforms to paragraphs that match ``` fences.
 * This must run BEFORE Phase 2 because code blocks span multiple paragraphs.
 *
 * @param root - The root node
 * @param createdParagraphKeys - Keys of paragraphs created during Phase 1
 */
function $applyCodeBlockTransforms(root, createdParagraphKeys) {
  const CODE_FENCE_REGEX = /^```(\w*)\s*$/;
  const CODE_FENCE_END_REGEX = /^```\s*$/;
  let i = 0;
  while (i < root.getChildrenSize()) {
    const children = root.getChildren();
    const child = children[i];
    if (
      !lexical.$isParagraphNode(child) ||
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
    const codeLines = [];
    const nodesToRemove = [child];
    let j = i + 1;
    let foundEnd = false;
    while (j < root.getChildrenSize()) {
      const nextChild = root.getChildren()[j];
      if (!lexical.$isParagraphNode(nextChild)) {
        j++;
        continue;
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
    const codeBlockNode = code.$createCodeNode(language);
    const codeContent = codeLines.join('\n');
    if (codeContent.length > 0) {
      const codeTextNode = lexical.$createTextNode(codeContent);
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

    // Don't increment i, the next node is now at position i
  }
}

/**
 * Recursively collects all TextNode descendants from a node.
 */
function $collectTextNodes(node) {
  const textNodes = [];
  if (lexical.$isTextNode(node)) {
    textNodes.push(node);
  } else if ('getChildren' in node && typeof node.getChildren === 'function') {
    const children = node.getChildren();
    for (const child of children) {
      textNodes.push(...$collectTextNodes(child));
    }
  }
  return textNodes;
}

/**
 * Applies text format transforms (bold, italic, etc.) to text nodes inside
 * element-transformed nodes like lists, headings, and quotes.
 *
 * This is needed because element transforms (list, heading, quote) move the
 * text content to a new node structure, but the markdown syntax like **bold**
 * is still present in the text and needs to be converted.
 */
function $applyTextFormatsToElementTransformResults(
  root,
  textFormatTransformers,
) {
  const rootChildren = root.getChildren();
  for (const child of rootChildren) {
    // Skip paragraphs - they're handled in Phase 2 main loop
    if (lexical.$isParagraphNode(child)) {
      continue;
    }

    // Process list nodes
    if ('getListType' in child) {
      // This is a ListNode - process all list items
      const listItems = child.getChildren();
      for (const listItem of listItems) {
        if (list.$isListItemNode(listItem)) {
          const textNodes = $collectTextNodes(listItem);
          for (const tn of textNodes) {
            if (tn.isAttached()) {
              $applyTextFormatTransformers(tn, textFormatTransformers);
            }
          }
        }
      }
    }

    // Process heading nodes
    if (richText.$isHeadingNode(child)) {
      const textNodes = $collectTextNodes(child);
      for (const tn of textNodes) {
        if (tn.isAttached()) {
          $applyTextFormatTransformers(tn, textFormatTransformers);
        }
      }
    }

    // Process quote nodes
    if (richText.$isQuoteNode(child)) {
      const textNodes = $collectTextNodes(child);
      for (const tn of textNodes) {
        if (tn.isAttached()) {
          $applyTextFormatTransformers(tn, textFormatTransformers);
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
 *
 * @example
 * ```typescript
 * editor.update(() => {
 *   $insertMarkdownAtSelection('**bold text** and *italic*');
 * });
 * ```
 */
function $insertMarkdownAtSelection(
  markdownString,
  transformers = ACCESSIBILITY_TRANSFORMERS,
) {
  const selection = lexical.$getSelection();
  const root = lexical.$getRoot();

  // If no selection or root is empty, just replace everything
  if (!lexical.$isRangeSelection(selection) || root.isEmpty()) {
    markdown.$convertFromMarkdownString(markdownString, transformers);
    return;
  }

  // For simple single-line text without markdown, just insert as text
  const hasMarkdownSyntax = /[*_`#[\]|>\-+]/.test(markdownString);
  const isMultiLine = markdownString.includes('\n');
  if (!hasMarkdownSyntax && !isMultiLine) {
    selection.insertText(markdownString);
    return;
  }

  // Categorize transformers
  const byType = transformersByType(transformers);

  // Track the starting paragraph for later transformation
  const startNode = selection.anchor.getNode();
  const startParagraph = lexical.$isParagraphNode(startNode)
    ? startNode
    : startNode.getParentOrThrow();
  startParagraph.getKey();

  // Track the starting index in the root for cursor restoration
  root
    .getChildren()
    .findIndex((child) => child.getKey() === startParagraph.getKey());

  // PHASE 1: Insert raw text using clipboard pattern
  // This preserves cursor position correctly
  const lines = markdownString.split('\n');
  const createdParagraphKeys = [];
  for (let i = 0; i < lines.length; i++) {
    const currentSelection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(currentSelection)) {
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
      const para = lexical.$isParagraphNode(anchor)
        ? anchor
        : anchor.getParentOrThrow();
      if (!createdParagraphKeys.includes(para.getKey())) {
        createdParagraphKeys.push(para.getKey());
      }
    } else {
      // Subsequent lines: insert paragraph break then text
      currentSelection.insertParagraph();

      // Get the new paragraph
      const newSelection = lexical.$getSelection();
      if (lexical.$isRangeSelection(newSelection)) {
        const anchor = newSelection.anchor.getNode();
        const para = lexical.$isParagraphNode(anchor)
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

  // PHASE 2: Apply transformers to created paragraphs
  // We iterate through the root children to find our paragraphs
  const rootChildren = root.getChildren();
  for (const child of rootChildren) {
    if (!lexical.$isParagraphNode(child)) {
      continue;
    }
    if (!createdParagraphKeys.includes(child.getKey())) {
      continue;
    }

    // First, apply element transformers (headings, lists, quotes, etc.)
    const elementApplied = $applyElementTransformers(child, byType.element);
    if (!elementApplied && child.isAttached()) {
      // If no element transformer was applied, apply text format transformers
      const textNodes = child.getChildren().filter(lexical.$isTextNode);
      for (const tn of textNodes) {
        if (tn.isAttached()) {
          $applyTextFormatTransformers(tn, byType.textFormat);
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
  $applyTextFormatsToElementTransformResults(root, byType.textFormat);

  // PHASE 3: Restore cursor position
  // ALWAYS restore cursor to the ACTUAL end of pasted content.
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
    const findLastTextNode = (node) => {
      if (lexical.$isTextNode(node)) {
        return node;
      }
      if ('getChildren' in node && typeof node.getChildren === 'function') {
        const nodeChildren = node.getChildren();
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
        lastRootNode.selectEnd();
      } else if (
        'select' in lastRootNode &&
        typeof lastRootNode.select === 'function'
      ) {
        lastRootNode.select();
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
function $replaceWithMarkdown(
  markdownString,
  transformers = ACCESSIBILITY_TRANSFORMERS,
) {
  markdown.$convertFromMarkdownString(markdownString, transformers);
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Module-level flag for suppressing announcements during bulk operations (like paste).
 * This is in a separate file to avoid circular imports between
 * LexicalAccessibilityPlugin.tsx and useNodeRegistry.ts.
 *
 * This is module-level because React refs and closures don't work reliably with
 * Lexical's synchronous node transform callbacks.
 */
let __isSuppressingAnnouncements = false;
function getSuppressingAnnouncements() {
  return __isSuppressingAnnouncements;
}
function setSuppressingAnnouncements(value) {
  __isSuppressingAnnouncements = value;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Configuration options for the AccessibilityPlugin
 */

/**
 * Props for the AccessibilityPlugin component
 */

/**
 * Internal announcement type
 */

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  announceFormats: true,
  announceStructural: true,
  enabled: true,
  useCSSFormatting: true,
  verbosity: 'standard',
};

/**
 * Update tag to suppress accessibility announcements during bulk operations.
 *
 * Use this tag when performing operations that would trigger many announcements
 * that aren't useful to the user, such as clearing the editor or bulk deletions.
 *
 * @example
 * ```typescript
 * import { SUPPRESS_A11Y_ANNOUNCEMENTS_TAG } from '@lexical/accessibility';
 *
 * // Clear editor without announcing each deleted node
 * editor.update(() => {
 *   $getRoot().clear();
 * }, { tag: SUPPRESS_A11Y_ANNOUNCEMENTS_TAG });
 * ```
 */
const SUPPRESS_A11Y_ANNOUNCEMENTS_TAG = 'suppress-a11y-announcements';

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Hook for announcing to screen readers
 * Clears then sets content to force re-announcement of identical messages
 */
function useAnnounce() {
  const [currentAnnouncement, setCurrentAnnouncement] = react.useState('');
  const lastMessageRef = react.useRef('');
  const announce = react.useCallback((message) => {
    // If same message, clear first then re-set to force live region update
    if (message === lastMessageRef.current) {
      setCurrentAnnouncement('');
      requestAnimationFrame(() => {
        setCurrentAnnouncement(message);
      });
    } else {
      setCurrentAnnouncement(message);
    }
    lastMessageRef.current = message;
  }, []);
  return {
    announce,
    currentAnnouncement,
  };
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function generateCodeBlockAnnouncement(isDeleted) {
  if (isDeleted) {
    return 'Code block removed';
  }
  return 'Code block started';
}
const codeBlockConfig = {
  extractMetadata: (node) => {
    return {
      language: node.getLanguage(),
      nodeType: 'code-block',
    };
  },
  nodeClass: code.CodeNode,
  nodeType: 'code-block',
  onCreated: () => {
    return generateCodeBlockAnnouncement(false);
  },
  onDestroyed: () => {
    return generateCodeBlockAnnouncement(true);
  },
  shouldAnnounceCreation: () => true,
  shouldAnnounceDestruction: () => true,
};

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function generateHeadingAnnouncement(level, verbosity, isDeleted) {
  if (isDeleted) {
    switch (verbosity) {
      case 'minimal':
        return `Heading ${level} removed`;
      case 'standard':
        return `Heading level ${level} removed`;
      case 'verbose':
        return `Removed heading level ${level}`;
      default:
        return `Heading level ${level} removed`;
    }
  }
  switch (verbosity) {
    case 'minimal':
      return `Heading ${level}`;
    case 'standard':
      return `Heading level ${level}`;
    case 'verbose':
      return `Changed to heading level ${level}`;
    default:
      return `Heading level ${level}`;
  }
}
const headingConfig = {
  extractMetadata: (node) => {
    const tag = node.getTag();
    const level = tag.charAt(1);
    return {
      level,
      nodeType: 'heading',
    };
  },
  nodeClass: richText.HeadingNode,
  nodeType: 'heading',
  onCreated: (metadata, verbosity) => {
    const headingMeta = metadata;
    return generateHeadingAnnouncement(headingMeta.level, verbosity, false);
  },
  onDestroyed: (metadata, verbosity) => {
    const headingMeta = metadata;
    return generateHeadingAnnouncement(headingMeta.level, verbosity, true);
  },
  shouldAnnounceCreation: () => true,
  shouldAnnounceDestruction: () => true,
};

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function generateHorizontalRuleAnnouncement(verbosity, isDeleted) {
  if (isDeleted) {
    switch (verbosity) {
      case 'minimal':
        return 'Rule removed';
      case 'standard':
        return 'Horizontal rule removed';
      case 'verbose':
        return 'Removed horizontal rule';
      default:
        return 'Horizontal rule removed';
    }
  }
  switch (verbosity) {
    case 'minimal':
      return 'Rule';
    case 'standard':
      return 'Horizontal rule';
    case 'verbose':
      return 'Inserted horizontal rule';
    default:
      return 'Horizontal rule';
  }
}
const horizontalRuleConfig = {
  extractMetadata: () => {
    return {
      nodeType: 'horizontalRule',
    };
  },
  nodeClass: LexicalHorizontalRuleNode.HorizontalRuleNode,
  nodeType: 'horizontalRule',
  onCreated: (_metadata, verbosity) => {
    return generateHorizontalRuleAnnouncement(verbosity, false);
  },
  onDestroyed: (_metadata, verbosity) => {
    return generateHorizontalRuleAnnouncement(verbosity, true);
  },
  shouldAnnounceCreation: () => true,
  shouldAnnounceDestruction: () => true,
};

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function generateListDeletionAnnouncement(listType, verbosity, itemValue) {
  if (listType === 'number') {
    switch (verbosity) {
      case 'minimal':
        return `${itemValue} deleted list item`;
      case 'standard':
        return `${itemValue} deleted list item`;
      case 'verbose':
        return `Deleted list item ${itemValue}`;
      default:
        return `${itemValue} deleted list item`;
    }
  }
  const typeLabels = {
    bullet: 'Bullet',
    check: 'Checklist',
  };
  const label = typeLabels[listType] || 'List';
  switch (verbosity) {
    case 'minimal':
      return `${label} deleted list item`;
    case 'standard':
      return `${label} deleted list item`;
    case 'verbose':
      return `Deleted ${label.toLowerCase()} list item`;
    default:
      return `${label} deleted list item`;
  }
}
function generateListAnnouncement(listType, verbosity, isNewList) {
  const typeLabels = {
    bullet: 'Bullet',
    check: 'Checklist',
    number: 'Numbered',
  };
  const label = typeLabels[listType] || 'List';
  {
    switch (verbosity) {
      case 'minimal':
        return `${label} list`;
      case 'standard':
        return `${label} list started`;
      case 'verbose':
        return `Started ${label.toLowerCase()} list`;
      default:
        return `${label} list started`;
    }
  }
}
const listItemConfig = {
  extractMetadata: (node) => {
    const parent = node.getParent();
    if (!(parent instanceof list.ListNode)) {
      return null;
    }
    const listType = parent.getListType();
    if (
      listType !== 'bullet' &&
      listType !== 'number' &&
      listType !== 'check'
    ) {
      return null;
    }
    const textContent = node.getTextContent().trim();
    const isEmpty = textContent.length === 0;
    let nestingDepth = 0;
    let currentParent = parent;
    while (currentParent !== null) {
      if (currentParent instanceof list.ListNode) {
        nestingDepth++;
      }
      currentParent = currentParent.getParent();
    }
    const children = node.getChildren();
    const hasNestedList = children.some(
      (child) => child instanceof list.ListNode,
    );
    let nestedItemPosition = null;
    if (hasNestedList) {
      for (const child of children) {
        if (child instanceof list.ListNode) {
          const nestedChildren = child.getChildren();
          if (nestedChildren.length >= 1) {
            const firstNestedItem = nestedChildren[0];
            if (firstNestedItem instanceof list.ListItemNode) {
              nestedItemPosition = 1;
            }
          }
          break;
        }
      }
    }
    const siblings = parent.getChildren();
    let displayPosition = 1;
    for (const sibling of siblings) {
      if (sibling.getKey() === node.getKey()) {
        break;
      }
      if (sibling instanceof list.ListItemNode) {
        displayPosition++;
      }
    }
    const effectivePosition =
      hasNestedList && nestedItemPosition !== null
        ? nestedItemPosition
        : displayPosition;
    return {
      hasNestedList,
      isEmpty,
      itemValue: effectivePosition,
      listType,
      nestingDepth,
      nodeType: 'list-item',
      parentKey: parent.getKey(),
    };
  },
  nodeClass: list.ListItemNode,
  nodeType: 'list-item',
  onCreated: (metadata, verbosity) => {
    const listMeta = metadata;
    return generateListAnnouncement(listMeta.listType, verbosity);
  },
  onDestroyed: (metadata, verbosity) => {
    const listMeta = metadata;
    if (!listMeta.isEmpty) {
      return null;
    }
    return generateListDeletionAnnouncement(
      listMeta.listType,
      verbosity,
      listMeta.itemValue,
    );
  },
  shouldAnnounceCreation: (node, context) => {
    const parent = node.getParent();
    if (!(parent instanceof list.ListNode)) {
      return false;
    }
    if (context.isIndentOperation) {
      return false;
    }
    if (context.isEnterOnEmpty) {
      return false;
    }
    const parentKey = parent.getKey();
    const isNewList = !context.knownContainers.has(parentKey);
    context.knownContainers.add(parentKey);
    return isNewList;
  },
  shouldAnnounceDestruction: (metadata, context) => {
    // During indent/outdent operations, don't announce "deleted list item"
    // The outdent announcement is handled separately in useNodeRegistry.ts
    // and we don't want duplicate/confusing announcements
    if (context.isIndentOperation) {
      return false;
    }
    return true;
  },
};

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function generateQuoteAnnouncement(verbosity, isDeleted) {
  if (isDeleted) {
    switch (verbosity) {
      case 'minimal':
        return 'Quote removed';
      case 'standard':
        return 'Block quote removed';
      case 'verbose':
        return 'Removed block quote';
      default:
        return 'Block quote removed';
    }
  }
  switch (verbosity) {
    case 'minimal':
      return 'Quote';
    case 'standard':
      return 'Block quote';
    case 'verbose':
      return 'Changed to block quote';
    default:
      return 'Block quote';
  }
}
const quoteConfig = {
  extractMetadata: () => {
    return {
      nodeType: 'quote',
    };
  },
  nodeClass: richText.QuoteNode,
  nodeType: 'quote',
  onCreated: (_metadata, verbosity) => {
    return generateQuoteAnnouncement(verbosity, false);
  },
  onDestroyed: (_metadata, verbosity) => {
    return generateQuoteAnnouncement(verbosity, true);
  },
  shouldAnnounceCreation: () => true,
  shouldAnnounceDestruction: () => true,
};

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * All registered node announcement configurations.
 * Add new configs here to enable announcements for additional node types.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeConfigs = [
  listItemConfig,
  headingConfig,
  codeBlockConfig,
  quoteConfig,
  horizontalRuleConfig,
];
/**
 * Hook that registers all node announcement listeners based on configs.
 *
 * This centralizes the registration logic so the main plugin doesn't need
 * to know about individual node types. Adding a new node type is as simple
 * as creating a config and adding it to the configs array.
 */
function useNodeRegistry({
  editor,
  configs,
  verbosity,
  enabled,
  announce,
  isIndentOperationRef,
  isEnterOnEmptyRef,
}) {
  const nodeMetadataRef = react.useRef(new Map());
  const knownContainersRef = react.useRef(new Set());
  const announcedCreationsRef = react.useRef(new Set());
  react.useEffect(() => {
    if (!enabled) {
      return;
    }
    const nodeMetadata = nodeMetadataRef.current;
    const knownContainers = knownContainersRef.current;
    const announcedCreations = announcedCreationsRef.current;
    const unregisterFns = [];
    configs.forEach((config) => {
      const getContext = () => ({
        isEnterOnEmpty: isEnterOnEmptyRef.current,
        isIndentOperation: isIndentOperationRef.current,
        knownContainers,
      });
      const unregisterTransform = editor.registerNodeTransform(
        config.nodeClass,
        (node) => {
          const key = node.getKey();
          const metadata = config.extractMetadata(node);
          if (!metadata) {
            return;
          }
          nodeMetadata.set(key, metadata);

          // Skip creation announcements if suppression is active (e.g., during paste)
          // Use module-level getter because React refs don't work with Lexical's synchronous transforms
          if (getSuppressingAnnouncements()) {
            announcedCreations.add(key); // Mark as announced to prevent future announcement
            // Also run shouldAnnounceCreation to update knownContainers (for list tracking)
            // but don't actually announce anything
            if (config.shouldAnnounceCreation) {
              config.shouldAnnounceCreation(node, getContext());
            }
            return;
          }
          if (config.onCreated) {
            const shouldAnnounce = config.shouldAnnounceCreation
              ? config.shouldAnnounceCreation(node, getContext())
              : !announcedCreations.has(key);
            if (shouldAnnounce && !announcedCreations.has(key)) {
              const message = config.onCreated(metadata, verbosity);
              if (message) {
                announce(message);
              }
              announcedCreations.add(key);
            }
          }
        },
      );
      unregisterFns.push(unregisterTransform);
      if (config.onDestroyed) {
        const unregisterMutation = editor.registerMutationListener(
          config.nodeClass,
          (mutations, {prevEditorState}) => {
            // Skip announcements if suppression is active (e.g., during paste)
            if (getSuppressingAnnouncements()) {
              // Still clean up metadata for destroyed nodes
              mutations.forEach((mutation, key) => {
                if (mutation === 'destroyed') {
                  nodeMetadata.delete(key);
                  announcedCreations.delete(key);
                }
              });
              return;
            }
            const destroyedEntries = [];
            mutations.forEach((mutation, key) => {
              if (mutation === 'destroyed') {
                let metadata = null;
                prevEditorState.read(() => {
                  const node = lexical.$getNodeByKey(key);
                  if (node && node instanceof config.nodeClass) {
                    metadata = config.extractMetadata(node);
                  }
                });
                if (!metadata) {
                  metadata = nodeMetadata.get(key) ?? null;
                }
                if (metadata) {
                  destroyedEntries.push({
                    key,
                    metadata,
                  });
                }
              }
            });
            let entryToAnnounce = null;
            if (destroyedEntries.length === 1) {
              entryToAnnounce = destroyedEntries[0];
            } else if (destroyedEntries.length === 2) {
              const listMetas = destroyedEntries.map((e) => e.metadata);
              const emptyNonWrapper = destroyedEntries.find(
                (e, i) => listMetas[i].isEmpty && !listMetas[i].hasNestedList,
              );
              if (emptyNonWrapper) {
                entryToAnnounce = emptyNonWrapper;
                const meta = emptyNonWrapper.metadata;
                if (meta.nestingDepth && meta.nestingDepth > 1) {
                  const newIndentLevel = meta.nestingDepth - 2;
                  const message = generateIndentAnnouncement(
                    'outdent',
                    verbosity,
                    newIndentLevel,
                  );
                  announce(message);
                }
              }
            }
            if (entryToAnnounce) {
              const {metadata} = entryToAnnounce;
              const shouldAnnounce = config.shouldAnnounceDestruction
                ? config.shouldAnnounceDestruction(metadata, getContext())
                : true;
              if (shouldAnnounce && config.onDestroyed) {
                const message = config.onDestroyed(
                  metadata,
                  verbosity,
                  getContext(),
                );
                if (message) {
                  announce(message);
                }
              }
            }
            destroyedEntries.forEach(({key}) => {
              nodeMetadata.delete(key);
              announcedCreations.delete(key);
            });
          },
        );
        unregisterFns.push(unregisterMutation);
      }
    });
    return () => {
      unregisterFns.forEach((fn) => fn());
    };
  }, [
    editor,
    configs,
    verbosity,
    enabled,
    announce,
    isIndentOperationRef,
    isEnterOnEmptyRef,
  ]);
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const IS_BOLD = 1;
const IS_ITALIC = 1 << 1; // 2
const IS_STRIKETHROUGH = 1 << 2; // 4
const IS_UNDERLINE = 1 << 3; // 8
const IS_CODE = 1 << 4; // 16

/**
 * AccessibilityPlugin provides screen reader announcements for markdown
 * transformations and editor operations in Lexical.
 *
 * Architecture:
 * - Node creation/deletion announcements are handled by the Node Registry pattern
 * - Each node type has a config in nodeConfigs/ that defines its announcements
 * - Format changes (bold, italic, etc.) are handled separately via update listener
 * - Indent/outdent operations are handled via command listeners
 *
 * @example
 * ```tsx
 * <LexicalComposer initialConfig={config}>
 *   <RichTextPlugin />
 *   <AccessibilityPlugin config={{ verbosity: 'standard' }} />
 * </LexicalComposer>
 * ```
 */
function AccessibilityPlugin({
  config = {},
  transformers = ACCESSIBILITY_TRANSFORMERS,
}) {
  const [editor] = LexicalComposerContext.useLexicalComposerContext();
  const mergedConfig = react.useMemo(
    () => ({
      ...DEFAULT_CONFIG,
      ...config,
    }),
    [config],
  );
  const {currentAnnouncement, announce} = useAnnounce();
  const previousFormatsRef = react.useRef(new Map());
  const isIndentOperationRef = react.useRef(false);
  const isEnterOnEmptyRef = react.useRef(false);
  const wasInCodeBlockRef = react.useRef(false);
  const wasInInlineCodeRef = react.useRef(false);
  useNodeRegistry({
    announce,
    configs: mergedConfig.announceStructural ? nodeConfigs : [],
    editor,
    enabled: mergedConfig.enabled,
    isEnterOnEmptyRef,
    isIndentOperationRef,
    verbosity: mergedConfig.verbosity,
  });

  // CSS-based formatting: Transform TextNodes into AccessibleTextNodes
  // This prevents DOM node replacement for bold/italic/underline/strikethrough,
  // eliminating "selected/unselected" announcements from screen readers
  //
  // NOTE: Users must add AccessibleTextNode to their editor config nodes array:
  // nodes: [AccessibleTextNode, ...]
  // Or use the replace pattern:
  // nodes: [{ replace: TextNode, with: () => new AccessibleTextNode('') }, ...]
  react.useEffect(() => {
    if (!mergedConfig.enabled || !mergedConfig.useCSSFormatting) {
      return;
    }

    // Check if AccessibleTextNode is registered
    if (!editor.hasNode(AccessibleTextNode)) {
      {
        console.warn(
          'AccessibilityPlugin: useCSSFormatting is enabled but AccessibleTextNode is not registered. ' +
            'Add AccessibleTextNode to your editor config nodes array for CSS-based formatting to work.',
        );
      }
      return;
    }

    // Transform regular TextNodes into AccessibleTextNodes
    const unregisterTransform = editor.registerNodeTransform(
      lexical.TextNode,
      (node) => {
        // Only transform base TextNode, not subclasses (including AccessibleTextNode)
        if (node.getType() === 'text') {
          const accessibleNode = $createAccessibleTextNode(
            node.getTextContent(),
          );
          accessibleNode.setFormat(node.getFormat());
          accessibleNode.setDetail(node.getDetail());
          accessibleNode.setMode(node.getMode());
          accessibleNode.setStyle(node.getStyle());
          node.replace(accessibleNode);
        }
      },
    );
    return () => {
      unregisterTransform();
    };
  }, [editor, mergedConfig.enabled, mergedConfig.useCSSFormatting]);
  react.useEffect(() => {
    if (!mergedConfig.enabled) {
      return;
    }
    const previousFormats = previousFormatsRef.current;

    // Initialize code block and inline code state on mount
    editor.getEditorState().read(() => {
      const selection = lexical.$getSelection();
      if (lexical.$isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode();

        // Check for code block
        let node = anchorNode;
        while (node !== null) {
          if (code.$isCodeNode(node)) {
            wasInCodeBlockRef.current = true;
            break;
          }
          node = node.getParent();
        }
        if (node === null) {
          wasInCodeBlockRef.current = false;
        }

        // Check for inline code
        if (lexical.$isTextNode(anchorNode)) {
          wasInInlineCodeRef.current = (anchorNode.getFormat() & IS_CODE) !== 0;
        } else {
          wasInInlineCodeRef.current = false;
        }
      } else {
        wasInCodeBlockRef.current = false;
        wasInInlineCodeRef.current = false;
      }
    });
    const $getSelectedListItemLevel = () => {
      const selection = lexical.$getSelection();
      if (!lexical.$isRangeSelection(selection)) {
        return undefined;
      }
      const anchorNode = selection.anchor.getNode();
      let node = anchorNode;
      while (node !== null) {
        if (list.$isListItemNode(node)) {
          return node.getIndent();
        }
        node = node.getParent();
      }
      return undefined;
    };
    const $isInsideCodeBlock = () => {
      const selection = lexical.$getSelection();
      if (!lexical.$isRangeSelection(selection)) {
        return false;
      }
      const anchorNode = selection.anchor.getNode();
      let node = anchorNode;
      while (node !== null) {
        if (code.$isCodeNode(node)) {
          return true;
        }
        node = node.getParent();
      }
      return false;
    };
    const $isInsideInlineCode = () => {
      const selection = lexical.$getSelection();
      if (!lexical.$isRangeSelection(selection)) {
        return false;
      }
      const anchorNode = selection.anchor.getNode();
      if (!lexical.$isTextNode(anchorNode)) {
        return false;
      }

      // Check if the text node has the code format flag
      return (anchorNode.getFormat() & IS_CODE) !== 0;
    };
    const unregisterBackspace = editor.registerCommand(
      lexical.KEY_BACKSPACE_COMMAND,
      () => false,
      lexical.COMMAND_PRIORITY_LOW,
    );
    const unregisterEnter = editor.registerCommand(
      lexical.KEY_ENTER_COMMAND,
      () => {
        const selection = lexical.$getSelection();
        if (lexical.$isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode();

          // Check if we're inside a code block
          if ($isInsideCodeBlock()) {
            // Count current line number by counting line breaks before cursor
            let codeNode = anchorNode;
            while (codeNode !== null && !code.$isCodeNode(codeNode)) {
              codeNode = codeNode.getParent();
            }
            if (codeNode && code.$isCodeNode(codeNode)) {
              const children = codeNode.getChildren();
              let lineNumber = 1;
              for (const child of children) {
                if (child.getKey() === anchorNode.getKey()) {
                  break;
                }
                // Count line breaks to determine current line
                if (child.getType() === 'linebreak') {
                  lineNumber++;
                }
              }

              // After Enter, we'll be on the next line (which is blank)
              const newLineNumber = lineNumber + 1;
              setTimeout(() => {
                // Only announce if we're still in a code block
                // (Enter at end of code block exits, handled by update listener)
                editor.getEditorState().read(() => {
                  if ($isInsideCodeBlock()) {
                    // Announce based on verbosity level
                    if (mergedConfig.verbosity === 'minimal') {
                      announce('Blank');
                    } else {
                      // default and verbose
                      announce(`Blank, line ${newLineNumber}`);
                    }
                  }
                });
              }, 10);
            }
            return false;
          }

          // Handle list items
          let listItemNode = anchorNode;
          while (listItemNode !== null && !list.$isListItemNode(listItemNode)) {
            listItemNode = listItemNode.getParent();
          }
          if (listItemNode && list.$isListItemNode(listItemNode)) {
            const textContent = listItemNode.getTextContent().trim();
            const isEmpty = textContent.length === 0;
            const indentLevel = listItemNode.getIndent();
            if (isEmpty && indentLevel > 0) {
              isEnterOnEmptyRef.current = true;
              setTimeout(() => {
                isEnterOnEmptyRef.current = false;
              }, 50);
            }
          }
        }
        return false;
      },
      lexical.COMMAND_PRIORITY_LOW,
    );
    const unregisterTab = editor.registerCommand(
      lexical.KEY_TAB_COMMAND,
      () => false,
      lexical.COMMAND_PRIORITY_LOW,
    );
    const unregisterIndent = editor.registerCommand(
      lexical.INDENT_CONTENT_COMMAND,
      () => {
        isIndentOperationRef.current = true;
        const currentLevel = $getSelectedListItemLevel();
        const newLevel =
          currentLevel !== undefined ? currentLevel + 1 : undefined;
        setTimeout(() => {
          isIndentOperationRef.current = false;
        }, 50);
        if (mergedConfig.announceStructural) {
          const message = generateIndentAnnouncement(
            'indent',
            mergedConfig.verbosity,
            newLevel,
          );
          announce(message);
        }
        return false;
      },
      lexical.COMMAND_PRIORITY_LOW,
    );
    const unregisterOutdent = editor.registerCommand(
      lexical.OUTDENT_CONTENT_COMMAND,
      () => {
        isIndentOperationRef.current = true;
        const currentLevel = $getSelectedListItemLevel();
        const newLevel =
          currentLevel !== undefined
            ? Math.max(0, currentLevel - 1)
            : undefined;
        setTimeout(() => {
          isIndentOperationRef.current = false;
        }, 50);
        if (mergedConfig.announceStructural) {
          const message = generateIndentAnnouncement(
            'outdent',
            mergedConfig.verbosity,
            newLevel,
          );
          announce(message);
        }
        return false;
      },
      lexical.COMMAND_PRIORITY_LOW,
    );

    // ACCESSIBILITY FIX: Intercept INSERT_PARAGRAPH_COMMAND for empty nested list items
    // and dispatch OUTDENT_CONTENT_COMMAND instead. This makes Enter behave like Backspace
    // (updating nodes instead of creating/destroying), preventing NVDA from announcing "out of list".
    const unregisterInsertParagraph = editor.registerCommand(
      lexical.INSERT_PARAGRAPH_COMMAND,
      () => {
        const selection = lexical.$getSelection();
        if (lexical.$isRangeSelection(selection) && selection.isCollapsed()) {
          const anchorNode = selection.anchor.getNode();
          let listItemNode = anchorNode;
          while (listItemNode !== null && !list.$isListItemNode(listItemNode)) {
            listItemNode = listItemNode.getParent();
          }
          if (listItemNode && list.$isListItemNode(listItemNode)) {
            const childrenSize = listItemNode.getChildrenSize();
            const textContent = listItemNode.getTextContent().trim();
            const isEmpty = childrenSize === 0 || textContent.length === 0;
            const indent = listItemNode.getIndent();
            if (isEmpty && indent > 0) {
              editor.dispatchCommand(
                lexical.OUTDENT_CONTENT_COMMAND,
                undefined,
              );
              return true;
            }
          }
        }
        return false;
      },
      lexical.COMMAND_PRIORITY_HIGH,
    );

    // SELECTION_CHANGE_COMMAND - not used for code block tracking
    // because it doesn't fire reliably inside code blocks
    // Keeping registration but empty - code block tracking is in update listener
    const unregisterSelectionChange = editor.registerCommand(
      lexical.SELECTION_CHANGE_COMMAND,
      () => {
        return false;
      },
      lexical.COMMAND_PRIORITY_LOW,
    );

    // Smart Paste as Markdown
    // - Ctrl+Shift+V always parses as markdown (explicit override)
    // - Normal Ctrl+V uses smart detection:
    //   - If HTML has rich formatting (strong, em, h1, etc.) → use default paste
    //   - If HTML is just structural (div, span, p) → parse as markdown
    //   - If no HTML → parse as markdown
    const hasRichFormatting = (html) => {
      // Tags that indicate actual formatting worth preserving
      const richPatterns = [
        /<(strong|b|em|i|u|s|strike|del|mark)\b/i,
        // Text formatting
        /<(h[1-6])\b/i,
        // Headings
        /<(ul|ol|li)\b/i,
        // Lists
        /<(pre|code)\b/i,
        // Code
        /<(blockquote)\b/i,
        // Quotes
        /<a\s+href/i, // Links with href
      ];
      return richPatterns.some((p) => p.test(html));
    };
    const unregisterPaste = editor.registerCommand(
      lexical.PASTE_COMMAND,
      (event) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) {
          return false;
        }

        // Let file pastes (images) pass through to DragDropPastePlugin
        const hasFiles = clipboardData.types.includes('Files');
        if (hasFiles) {
          return false;
        }
        const plainText = clipboardData.getData('text/plain');
        if (!plainText) {
          return false;
        }
        const htmlText = clipboardData.getData('text/html');

        // Check if the plain text actually contains markdown syntax
        // Only intercept if there's actual markdown to parse
        const hasMarkdownSyntax =
          /(\*\*|__|~~|`|^#{1,6}\s|^\s*[-*+]\s|^\s*\d+\.\s|^\s*>|^\|.*\|$)/m.test(
            plainText,
          );

        // Smart detection for Ctrl+V:
        // If no HTML or HTML has no rich formatting, AND text has markdown → parse as markdown
        if ((!htmlText || !hasRichFormatting(htmlText)) && hasMarkdownSyntax) {
          event.preventDefault();
          // Set module-level suppression flag BEFORE the update so node transforms can check it
          setSuppressingAnnouncements(true);
          editor.update(
            () => {
              $insertMarkdownAtSelection(plainText, transformers);
            },
            {
              onUpdate: () => {
                // Clear suppression flag AFTER the update completes
                setSuppressingAnnouncements(false);
              },
              tag: SUPPRESS_A11Y_ANNOUNCEMENTS_TAG,
            },
          );
          return true;
        }

        // No markdown syntax or HTML has rich formatting → let default handler handle it
        return false;
      },
      lexical.COMMAND_PRIORITY_CRITICAL, // Higher priority than default paste handler
    );
    const unregisterUpdate = editor.registerUpdateListener(
      ({editorState, dirtyLeaves, tags}) => {
        // Skip all announcements if suppress tag is present
        if (tags.has(SUPPRESS_A11Y_ANNOUNCEMENTS_TAG)) {
          return;
        }

        // Track code block and inline code enter/exit via update listener
        // SELECTION_CHANGE_COMMAND doesn't fire reliably inside code blocks
        editorState.read(() => {
          if (mergedConfig.announceStructural) {
            // Track code block transitions
            const isInCodeBlock = $isInsideCodeBlock();
            const wasInCodeBlock = wasInCodeBlockRef.current;

            // Announce code block transitions
            if (wasInCodeBlock && !isInCodeBlock) {
              announce('Code block exited');
            } else if (!wasInCodeBlock && isInCodeBlock) {
              announce('Code block entered');
            }
            wasInCodeBlockRef.current = isInCodeBlock;

            // Track inline code transitions (only when not in code block)
            // Inline code detection is based on the IS_CODE format flag on TextNode
            if (!isInCodeBlock) {
              const isInInlineCode = $isInsideInlineCode();
              const wasInInlineCode = wasInInlineCodeRef.current;

              // Announce inline code transitions with verbosity awareness
              if (wasInInlineCode && !isInInlineCode) {
                // Exiting inline code
                if (mergedConfig.verbosity === 'verbose') {
                  announce('Exiting code');
                } else if (mergedConfig.verbosity === 'standard') {
                  announce('End code');
                }
                // minimal: no announcement
              } else if (!wasInInlineCode && isInInlineCode) {
                // Entering inline code
                if (mergedConfig.verbosity === 'verbose') {
                  announce('Entering code');
                } else if (mergedConfig.verbosity === 'standard') {
                  announce('Code');
                }
                // minimal: no announcement
              }
              wasInInlineCodeRef.current = isInInlineCode;
            } else {
              // Reset inline code state when inside code block
              wasInInlineCodeRef.current = false;
            }
          }
        });
        if (!mergedConfig.announceFormats) {
          return;
        }
        editorState.read(() => {
          dirtyLeaves.forEach((leafKey) => {
            const node = lexical.$getNodeByKey(leafKey);
            if (!node || !lexical.$isTextNode(node)) {
              return;
            }
            const key = node.getKey();
            const currentFormat = node.getFormat();
            const previousFormat = previousFormats.get(key) || 0;
            const addedFormats = currentFormat & ~previousFormat;
            const removedFormats = previousFormat & ~currentFormat;
            const textContent = node.getTextContent();
            if (addedFormats & IS_BOLD) {
              announce(
                generateFormatAnnouncement(
                  'bold',
                  true,
                  mergedConfig.verbosity,
                  textContent,
                ),
              );
            }
            if (addedFormats & IS_ITALIC) {
              announce(
                generateFormatAnnouncement(
                  'italic',
                  true,
                  mergedConfig.verbosity,
                  textContent,
                ),
              );
            }
            if (addedFormats & IS_CODE) {
              announce(
                generateFormatAnnouncement(
                  'code',
                  true,
                  mergedConfig.verbosity,
                  textContent,
                ),
              );
            }
            if (addedFormats & IS_UNDERLINE) {
              announce(
                generateFormatAnnouncement(
                  'underline',
                  true,
                  mergedConfig.verbosity,
                  textContent,
                ),
              );
            }
            if (addedFormats & IS_STRIKETHROUGH) {
              announce(
                generateFormatAnnouncement(
                  'strikethrough',
                  true,
                  mergedConfig.verbosity,
                  textContent,
                ),
              );
            }
            if (removedFormats & IS_BOLD) {
              announce(
                generateFormatAnnouncement(
                  'bold',
                  false,
                  mergedConfig.verbosity,
                  textContent,
                ),
              );
            }
            if (removedFormats & IS_ITALIC) {
              announce(
                generateFormatAnnouncement(
                  'italic',
                  false,
                  mergedConfig.verbosity,
                  textContent,
                ),
              );
            }
            if (removedFormats & IS_CODE) {
              announce(
                generateFormatAnnouncement(
                  'code',
                  false,
                  mergedConfig.verbosity,
                  textContent,
                ),
              );
            }
            if (removedFormats & IS_UNDERLINE) {
              announce(
                generateFormatAnnouncement(
                  'underline',
                  false,
                  mergedConfig.verbosity,
                  textContent,
                ),
              );
            }
            if (removedFormats & IS_STRIKETHROUGH) {
              announce(
                generateFormatAnnouncement(
                  'strikethrough',
                  false,
                  mergedConfig.verbosity,
                  textContent,
                ),
              );
            }
            previousFormats.set(key, currentFormat);
          });
        });
      },
    );
    return () => {
      unregisterBackspace();
      unregisterEnter();
      unregisterTab();
      unregisterIndent();
      unregisterOutdent();
      unregisterInsertParagraph();
      unregisterSelectionChange();
      unregisterPaste();
      unregisterUpdate();
    };
  }, [editor, mergedConfig, announce, transformers]);
  return /*#__PURE__*/ jsxRuntime.jsx(AccessibilityLiveRegion, {
    announcement: currentAnnouncement,
  });
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const URL_REGEX =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

/**
 * Email regex pattern
 */
const EMAIL_REGEX =
  /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

/**
 * Type for link matcher results
 */

/**
 * Type for link matcher functions
 */

/**
 * Creates a URL matcher function
 */
function createUrlMatcher() {
  return (text) => {
    const match = URL_REGEX.exec(text);
    if (match === null) {
      return null;
    }
    const fullMatch = match[0];
    return {
      index: match.index,
      length: fullMatch.length,
      text: fullMatch,
      url: fullMatch.startsWith('http') ? fullMatch : `https://${fullMatch}`,
    };
  };
}

/**
 * Creates an email matcher function
 */
function createEmailMatcher() {
  return (text) => {
    const match = EMAIL_REGEX.exec(text);
    if (match === null) {
      return null;
    }
    const fullMatch = match[0];
    return {
      index: match.index,
      length: fullMatch.length,
      text: fullMatch,
      url: `mailto:${fullMatch}`,
    };
  };
}

/**
 * Default matchers for URLs and emails
 */
const DEFAULT_LINK_MATCHERS = [createUrlMatcher(), createEmailMatcher()];
/**
 * Pre-configured AutoLink plugin for accessibility.
 *
 * Automatically converts bare URLs and email addresses into links.
 * Works with pasted content and typed text.
 *
 * @example
 * ```tsx
 * import { AccessibilityAutoLinkPlugin } from '@lexical/accessibility';
 *
 * // Use with default URL and email matchers
 * <AccessibilityAutoLinkPlugin />
 *
 * // Or provide custom matchers
 * <AccessibilityAutoLinkPlugin matchers={myCustomMatchers} />
 * ```
 */
function AccessibilityAutoLinkPlugin({matchers = DEFAULT_LINK_MATCHERS}) {
  return /*#__PURE__*/ jsxRuntime.jsx(LexicalAutoLinkPlugin.AutoLinkPlugin, {
    matchers: matchers,
  });
}

exports.$createAutoLinkNode = link.$createAutoLinkNode;
exports.$createLinkNode = link.$createLinkNode;
exports.$isAutoLinkNode = link.$isAutoLinkNode;
exports.$isLinkNode = link.$isLinkNode;
exports.AutoLinkNode = link.AutoLinkNode;
exports.LinkNode = link.LinkNode;
exports.$createAccessibleTextNode = $createAccessibleTextNode;
exports.$insertMarkdownAtSelection = $insertMarkdownAtSelection;
exports.$isAccessibleTextNode = $isAccessibleTextNode;
exports.$replaceWithMarkdown = $replaceWithMarkdown;
exports.ACCESSIBILITY_TRANSFORMERS = ACCESSIBILITY_TRANSFORMERS;
exports.AccessibilityAutoLinkPlugin = AccessibilityAutoLinkPlugin;
exports.AccessibilityLiveRegion = AccessibilityLiveRegion;
exports.AccessibilityPlugin = AccessibilityPlugin;
exports.AccessibleTextNode = AccessibleTextNode;
exports.DEFAULT_CONFIG = DEFAULT_CONFIG;
exports.DEFAULT_LINK_MATCHERS = DEFAULT_LINK_MATCHERS;
exports.HR = HR;
exports.SUPPRESS_A11Y_ANNOUNCEMENTS_TAG = SUPPRESS_A11Y_ANNOUNCEMENTS_TAG;
exports.generateFormatAnnouncement = generateFormatAnnouncement;
exports.generateHeadingAnnouncement = generateHeadingAnnouncement$1;
exports.generateIndentAnnouncement = generateIndentAnnouncement;
exports.generateListAnnouncement = generateListAnnouncement$1;
exports.headingConfig = headingConfig;
exports.horizontalRuleConfig = horizontalRuleConfig;
exports.listItemConfig = listItemConfig;
exports.mergeFormatAnnouncements = mergeFormatAnnouncements;
exports.nodeConfigs = nodeConfigs;
exports.quoteConfig = quoteConfig;
exports.useAnnounce = useAnnounce;
exports.useNodeRegistry = useNodeRegistry;
