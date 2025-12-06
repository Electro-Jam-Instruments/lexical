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
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $parseSerializedNode,
  type SerializedLexicalNode,
} from 'lexical';

/**
 * Inserts markdown content at the current selection position.
 * Parses the markdown string and inserts the resulting nodes at cursor.
 *
 * For complex block-level content (tables, code blocks, etc.), this function
 * uses JSON serialization to safely preserve existing content while the
 * markdown parser operates on the root, then reconstructs the complete tree.
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

  // Strategy: The markdown parser replaces root content, and extracting
  // then re-inserting orphaned nodes causes issues with complex nodes (tables).
  //
  // Solution: Use JSON serialization to preserve existing content:
  // 1. Serialize existing nodes to JSON (detached from tree)
  // 2. Parse markdown (which properly creates and attaches new nodes)
  // 3. Keep parsed nodes attached, insert deserialized nodes around them

  // Get insertion position info
  const anchorNode = selection.anchor.getNode();
  const anchorTopLevelElement = anchorNode.getTopLevelElementOrThrow();
  const insertionIndex = anchorTopLevelElement.getIndexWithinParent();

  // Serialize existing content to JSON (safe copies, not references)
  const allChildren = root.getChildren();
  const nodesBefore: SerializedLexicalNode[] = [];
  const nodesAfter: SerializedLexicalNode[] = [];
  let nodeAtInsertion: SerializedLexicalNode | null = null;

  for (let i = 0; i < allChildren.length; i++) {
    const serialized = allChildren[i].exportJSON();
    if (i < insertionIndex) {
      nodesBefore.push(serialized);
    } else if (i === insertionIndex) {
      // Keep the node at insertion if it has content
      const hasContent = allChildren[i].getTextContent().trim().length > 0;
      if (hasContent) {
        nodeAtInsertion = serialized;
      }
    } else {
      nodesAfter.push(serialized);
    }
  }

  // Parse the markdown - this replaces root content with properly attached nodes
  $convertFromMarkdownString(markdownString, transformers);

  // The parsed nodes are now properly attached to root.
  // We need to insert the serialized (original) nodes around them.
  // IMPORTANT: We do NOT call root.clear() - that would orphan the parsed nodes!

  // Get references to first and last parsed nodes for insertion points
  const firstParsed = root.getFirstChild();
  const lastParsed = root.getLastChild();

  // Insert nodes BEFORE the first parsed node (in reverse order to maintain order)
  if (firstParsed) {
    // First, insert nodeAtInsertion if it exists
    if (nodeAtInsertion) {
      const node = $parseSerializedNode(nodeAtInsertion);
      firstParsed.insertBefore(node);
    }
    // Then, insert nodesBefore in reverse order
    for (let i = nodesBefore.length - 1; i >= 0; i--) {
      const node = $parseSerializedNode(nodesBefore[i]);
      firstParsed.insertBefore(node);
    }
  }

  // Insert nodes AFTER the last parsed node (in order)
  if (lastParsed) {
    let insertAfterNode = lastParsed;
    for (const serialized of nodesAfter) {
      const node = $parseSerializedNode(serialized);
      insertAfterNode.insertAfter(node);
      insertAfterNode = node;
    }
  }

  // Select end of last parsed node
  if (lastParsed && lastParsed.selectEnd) {
    lastParsed.selectEnd();
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
