/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {ElementTransformer, Transformer, TRANSFORMERS} from '@lexical/markdown';
import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleNode,
} from '@lexical/react/LexicalHorizontalRuleNode';
import {LexicalNode} from 'lexical';

/**
 * Horizontal Rule transformer for markdown.
 *
 * Converts `---`, `***`, or `___` to a HorizontalRuleNode.
 * This transformer is not included in the default @lexical/markdown TRANSFORMERS
 * because HorizontalRuleNode lives in @lexical/react.
 */
export const HR: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node: LexicalNode) => {
    return $isHorizontalRuleNode(node) ? '***' : null;
  },
  regExp: /^(---|\*\*\*|___)\s?$/,
  replace: (parentNode, _1, _2, isImport) => {
    const line = $createHorizontalRuleNode();

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
export const ACCESSIBILITY_TRANSFORMERS: Array<Transformer> = [
  HR,
  ...TRANSFORMERS,
];
