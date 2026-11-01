/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  type ElementTransformer,
  TABLE,
  type Transformer,
  TRANSFORMERS,
} from '@lexical/markdown';
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
 * - TABLE - converts `| a | b |` pipe tables to/from TableNode
 * - HR (Horizontal Rule) - converts ---, ***, ___ to horizontal rules
 *
 * Neither is in the default @lexical/markdown TRANSFORMERS: HorizontalRuleNode
 * lives in @lexical/react, and TABLE depends on the @lexical/table nodes.
 *
 * TABLE is first so pipe-table rows are matched before the paragraph-level
 * transformers get a chance to claim the line.
 *
 * REQUIREMENT: because TABLE declares TableNode, TableRowNode and TableCellNode
 * as dependencies, the editor MUST register those nodes. registerMarkdownShortcuts
 * throws if a transformer's dependencies are missing. If your editor has no
 * tables, use `ACCESSIBILITY_TRANSFORMERS.filter((t) => t !== TABLE)` or build
 * your own array from `[HR, ...TRANSFORMERS]`.
 *
 * @example
 * ```tsx
 * import { ACCESSIBILITY_TRANSFORMERS } from '@lexical/accessibility';
 *
 * // Use directly (editor must register TableNode/TableRowNode/TableCellNode)
 * $convertFromMarkdownString(text, ACCESSIBILITY_TRANSFORMERS);
 *
 * // Or extend with app-specific transformers
 * const MY_TRANSFORMERS = [MY_CUSTOM, ...ACCESSIBILITY_TRANSFORMERS];
 * ```
 */
export const ACCESSIBILITY_TRANSFORMERS: Array<Transformer> = [
  TABLE,
  HR,
  ...TRANSFORMERS,
];
