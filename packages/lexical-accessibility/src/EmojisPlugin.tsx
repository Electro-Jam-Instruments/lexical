/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';
import type {JSX} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {TextNode} from 'lexical';
import {useEffect} from 'react';

import {AccessibleTextNode} from './AccessibleTextNode';
import {$createEmojiNode, EmojiNode} from './EmojiNode';

/**
 * Default emoji patterns for auto-replacement.
 * Map of text patterns to [cssClass, emojiCharacter].
 * Patterns are checked in order: 3-char, then 2-char.
 */
export const DEFAULT_EMOJI_PATTERNS: Map<string, [string, string]> = new Map([
  // 3-character patterns
  ['-->', ['emoji arrow-right', '➡️']],
  ['<--', ['emoji arrow-left', '⬅️']],
  // 2-character patterns
  [':)', ['emoji happysmile', '🙂']],
  [':D', ['emoji veryhappysmile', '😀']],
  [':(', ['emoji unhappysmile', '🙁']],
  ['<3', ['emoji heart', '❤']],
]);

function $findAndTransformEmoji(
  node: TextNode,
  emojiPatterns: Map<string, [string, string]>,
): null | TextNode {
  const text = node.getTextContent();

  for (let i = 0; i < text.length; i++) {
    // Check 3-char patterns first, then 2-char
    const threeChar = text.slice(i, i + 3);
    const twoChar = text.slice(i, i + 2);
    const emojiData =
      emojiPatterns.get(threeChar) || emojiPatterns.get(twoChar);

    if (emojiData !== undefined) {
      const [emojiStyle, emojiText] = emojiData;
      const patternLength = emojiPatterns.has(threeChar) ? 3 : 2;
      let targetNode;

      if (i === 0) {
        [targetNode] = node.splitText(i + patternLength);
      } else {
        [, targetNode] = node.splitText(i, i + patternLength);
      }

      const emojiNode = $createEmojiNode(emojiStyle, emojiText);
      targetNode.replace(emojiNode);
      return emojiNode;
    }
  }

  return null;
}

function $textNodeTransform(
  node: TextNode,
  emojiPatterns: Map<string, [string, string]>,
): void {
  let targetNode: TextNode | null = node;

  while (targetNode !== null) {
    // Check if this is a simple text node or an accessible text node
    // AccessibleTextNode extends TextNode but has type 'accessible-text'
    // so isSimpleText() returns false for it. We still want to transform it.
    const nodeType = targetNode.getType();
    const isAccessibleText = nodeType === 'accessible-text';
    const isSimple = targetNode.isSimpleText();

    if (!isSimple && !isAccessibleText) {
      return;
    }

    // Don't transform emojis inside inline code
    if (targetNode.hasFormat('code')) {
      return;
    }

    targetNode = $findAndTransformEmoji(targetNode, emojiPatterns);
  }
}

function useEmojis(
  editor: LexicalEditor,
  emojiPatterns: Map<string, [string, string]>,
): void {
  useEffect(() => {
    if (!editor.hasNodes([EmojiNode])) {
      throw new Error('EmojisPlugin: EmojiNode not registered on editor');
    }

    // Register transform for regular TextNode
    const unregisterTextNode = editor.registerNodeTransform(TextNode, (node) =>
      $textNodeTransform(node, emojiPatterns),
    );

    // Also register transform for AccessibleTextNode (used when useCSSFormatting is enabled)
    // AccessibleTextNode extends TextNode but has a different type, so we need both transforms
    let unregisterAccessibleTextNode: (() => void) | null = null;
    if (editor.hasNodes([AccessibleTextNode])) {
      unregisterAccessibleTextNode = editor.registerNodeTransform(
        AccessibleTextNode,
        (node) => $textNodeTransform(node, emojiPatterns),
      );
    }

    return () => {
      unregisterTextNode();
      if (unregisterAccessibleTextNode) {
        unregisterAccessibleTextNode();
      }
    };
  }, [editor, emojiPatterns]);
}

export interface EmojisPluginProps {
  /**
   * Custom emoji patterns to use instead of defaults.
   * If not provided, uses DEFAULT_EMOJI_PATTERNS.
   */
  emojiPatterns?: Map<string, [string, string]>;
}

/**
 * Plugin that auto-converts text patterns into emoji nodes.
 *
 * Default patterns:
 * - :) → 🙂
 * - :D → 😀
 * - :( → 🙁
 * - <3 → ❤
 * - --> → ➡️
 * - <-- → ⬅️
 *
 * You can provide custom patterns via the emojiPatterns prop.
 *
 * @example
 * ```tsx
 * // Use default patterns
 * <EmojisPlugin />
 *
 * // Use custom patterns
 * const customPatterns = new Map([
 *   [':P', ['emoji tongue', '😛']],
 *   [';)', ['emoji wink', '😉']],
 * ]);
 * <EmojisPlugin emojiPatterns={customPatterns} />
 * ```
 */
export function EmojisPlugin({
  emojiPatterns = DEFAULT_EMOJI_PATTERNS,
}: EmojisPluginProps = {}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  useEmojis(editor, emojiPatterns);
  return null;
}
