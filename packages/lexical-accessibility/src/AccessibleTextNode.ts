/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorConfig, LexicalNode, SerializedTextNode} from 'lexical';

import {$applyNodeReplacement, TextNode} from 'lexical';

// Format bit flags (from Lexical)
const IS_BOLD = 1;
const IS_ITALIC = 1 << 1;
const IS_STRIKETHROUGH = 1 << 2;
const IS_UNDERLINE = 1 << 3;
const IS_CODE = 1 << 4;
const IS_SUBSCRIPT = 1 << 5;
const IS_SUPERSCRIPT = 1 << 6;

// Formats that require semantic HTML tags
const DOM_REQUIRED_FORMATS = IS_CODE | IS_SUBSCRIPT | IS_SUPERSCRIPT;

/**
 * AccessibleTextNode extends TextNode to use CSS styling instead of
 * semantic HTML tags for bold, italic, underline, and strikethrough.
 *
 * This prevents DOM node replacement when formatting changes, which
 * eliminates the "selected/unselected" announcements that screen readers
 * make when selection is restored after DOM replacement.
 */
export class AccessibleTextNode extends TextNode {
  static getType(): string {
    return 'accessible-text';
  }

  static clone(node: AccessibleTextNode): AccessibleTextNode {
    return new AccessibleTextNode(node.__text, node.__key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    this.applyCSSFormatting(dom);
    return dom;
  }

  updateDOM(
    prevNode: AccessibleTextNode,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
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

  private applyCSSFormatting(dom: HTMLElement): void {
    const format = this.__format;

    // Bold
    if (format & IS_BOLD) {
      dom.style.fontWeight = 'bold';
    } else {
      dom.style.fontWeight = '';
    }

    // Italic
    if (format & IS_ITALIC) {
      dom.style.fontStyle = 'italic';
    } else {
      dom.style.fontStyle = '';
    }

    // Text decorations (can combine multiple)
    const decorations: string[] = [];
    if (format & IS_UNDERLINE) {
      decorations.push('underline');
    }
    if (format & IS_STRIKETHROUGH) {
      decorations.push('line-through');
    }
    dom.style.textDecorationLine =
      decorations.length > 0 ? decorations.join(' ') : '';
  }

  static importJSON(serializedNode: SerializedTextNode): AccessibleTextNode {
    const node = $createAccessibleTextNode(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: 'accessible-text',
    };
  }
}

export function $createAccessibleTextNode(
  text: string = '',
): AccessibleTextNode {
  return $applyNodeReplacement(new AccessibleTextNode(text));
}

export function $isAccessibleTextNode(
  node: LexicalNode | null | undefined,
): node is AccessibleTextNode {
  return node instanceof AccessibleTextNode;
}
