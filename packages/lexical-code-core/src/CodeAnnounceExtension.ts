/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {AriaLiveRegionExtension} from '@lexical/a11y';
import {
  effect,
  getPeerDependencyFromEditor,
  namedSignals,
} from '@lexical/extension';
import {$findMatchingParent} from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  defineExtension,
  type EditorState,
  type LexicalEditor,
  mergeRegister,
  type NodeKey,
  safeCast,
} from 'lexical';

import {$isCodeNode, CodeNode} from './CodeNode';

/**
 * One message for a swap. The block the caret landed in comes first, then
 * the block that was removed. The second clause continues the first.
 */
function joinSwap(left: string, right: string): string {
  const continued =
    right.length === 0 ? right : right.charAt(0).toLowerCase() + right.slice(1);
  return `${left}, ${continued}`;
}

interface HeadingAnnounceOutput {
  created: {peek: () => string};
  destroyed: {peek: () => string};
  disabled: {peek: () => boolean};
}

/**
 * The heading announcer lives in rich text. Reading it by name keeps this
 * package from depending on that one, and still uses whatever wording the
 * editor was given.
 */
function readHeadingAnnounce(
  editor: LexicalEditor,
): HeadingAnnounceOutput | null {
  // Named rather than imported, so a code-only editor does not pull in rich text.
  const peer = getPeerDependencyFromEditor(
    editor,
    '@lexical/rich-text/HeadingAnnounce' as never,
  ) as {output: HeadingAnnounceOutput} | undefined;
  return peer === undefined ? null : peer.output;
}

export interface CodeAnnounceExtensionConfig {
  /** Announced when a block becomes a code block. */
  created: string;
  /** Announced when a code block stops being a code block. */
  destroyed: string;
  /** Announced when a code block goes away and the caret lands in another one. */
  destroyedInside: string;
  /** Announced when the caret moves into a code block that already existed. */
  entered: string;
  /** Announced when the caret leaves a code block that is still there. */
  exited: string;
  /**
   * When `true`, code blocks are not announced. Toggle at runtime via the
   * output signal. Default `false`.
   */
  disabled: boolean;
}

/**
 * Announces code blocks through the {@link AriaLiveRegionExtension} sink.
 *
 * The markdown shortcut consumes the fence (three backticks, then a space or
 * Enter) and swaps the block type, which is silent to a screen reader. Without
 * this the user has no way to know the transformation happened.
 *
 * Crossing the edge of a code block is announced only when the block on the
 * far side appears or disappears in the same update. Pressing Enter to leave
 * the block, or backspacing into one, is that case. Moving across the edge
 * with the arrow keys is left alone: both blocks are already there and the
 * screen reader reports the boundary itself.
 *
 * A code block made or removed somewhere other than the caret stays quiet.
 * That covers another person's edit, and a paste that contains a code block
 * the caret did not land in.
 *
 * When a heading and a code block trade places, both facts go in the one
 * message, destination first. The live region keeps only the last message in
 * a commit, so this announcer writes that whole line itself. Any other block
 * type is left to speak for itself.
 */
export const CodeAnnounceExtension = defineExtension({
  build: (_editor, config) => namedSignals(config),
  config: safeCast<CodeAnnounceExtensionConfig>({
    created: 'Code block',
    destroyed: 'Code block removed',
    destroyedInside: 'Code block removed, in code block',
    disabled: false,
    entered: 'Code block',
    exited: 'Exiting code block',
  }),
  dependencies: [AriaLiveRegionExtension],
  name: '@lexical/code/CodeAnnounce',
  register(editor, _config, state) {
    const {created, destroyed, destroyedInside, disabled, entered, exited} =
      state.getOutput();
    const {announce} = state.getDependency(AriaLiveRegionExtension).output;

    const $headingLevel = (
      editorState: EditorState,
      blockKey: NodeKey,
    ): string | null =>
      editorState.read(() => {
        const block = $getNodeByKey(blockKey);
        if (block === null || block.getType() !== 'heading') {
          return null;
        }
        const withTag = block as {getTag?: () => string};
        if (typeof withTag.getTag !== 'function') {
          return null;
        }
        const tag = withTag.getTag();
        return tag.startsWith('h') ? tag.slice(1) : null;
      });

    const $caretAt = (
      editorState: EditorState,
    ): {block: NodeKey; code: NodeKey | null} | null =>
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return null;
        }
        const node = selection.anchor.getNode();
        const block = node.getTopLevelElement() ?? node;
        const code = $isCodeNode(node)
          ? node
          : $findMatchingParent(node, $isCodeNode);
        return {
          block: block.getKey(),
          code: code === null ? null : code.getKey(),
        };
      });

    const isMissingFrom = (editorState: EditorState, key: NodeKey): boolean =>
      editorState.read(() => $getNodeByKey(key) === null);

    /**
     * True when the caret now sits in a block that this commit created and
     * that is not a plain paragraph. Converting to a plain paragraph is
     * excluded because nothing announces a paragraph, so "Code block removed"
     * is the only report the user gets.
     */
    const $replacedByAnotherBlockType = (
      editorState: EditorState,
      prevEditorState: EditorState,
      blockKey: NodeKey,
    ): boolean =>
      editorState.read(() => {
        const block = $getNodeByKey(blockKey);
        return (
          block !== null &&
          !$isParagraphNode(block) &&
          isMissingFrom(prevEditorState, blockKey)
        );
      });

    let codesChanged: 'created' | 'destroyed' | null = null;
    let createdKeys = new Set<NodeKey>();
    let destroyedKeys = new Set<NodeKey>();

    // Gate on `disabled` from an effect so a disabled announcer registers no
    // listener at all. Peek the message signals at announce time so editing
    // them does not re-register.
    return effect(() => {
      if (disabled.value) {
        return undefined;
      }
      return mergeRegister(
        editor.registerMutationListener(
          CodeNode,
          nodes => {
            // Converting one block type to another destroys and creates in
            // the same update. Prefer the creation, so a paragraph becoming
            // a code block is not reported as a code block being removed.
            for (const [key, mutation] of nodes) {
              if (mutation === 'created') {
                createdKeys.add(key);
                codesChanged = 'created';
              } else if (mutation === 'destroyed') {
                destroyedKeys.add(key);
                if (codesChanged !== 'created') {
                  codesChanged = 'destroyed';
                }
              }
            }
          },
          {skipInitialization: true},
        ),
        editor.registerUpdateListener(
          ({dirtyElements, dirtyLeaves, editorState, prevEditorState}) => {
            const changed = codesChanged;
            const createdNow = createdKeys;
            const destroyedNow = destroyedKeys;
            codesChanged = null;
            createdKeys = new Set();
            destroyedKeys = new Set();
            if (dirtyElements.size === 0 && dirtyLeaves.size === 0) {
              return;
            }

            const before = $caretAt(prevEditorState);
            const after = $caretAt(editorState);
            const headings = readHeadingAnnounce(editor);

            if (changed === 'created') {
              if (
                after !== null &&
                after.code !== null &&
                createdNow.has(after.code)
              ) {
                const level =
                  before !== null && isMissingFrom(editorState, before.block)
                    ? $headingLevel(prevEditorState, before.block)
                    : null;
                if (
                  level !== null &&
                  headings !== null &&
                  !headings.disabled.peek()
                ) {
                  announce(
                    joinSwap(
                      created.peek(),
                      headings.destroyed.peek().replace('%s', level),
                    ),
                  );
                } else {
                  announce(created.peek());
                }
              }
              return;
            }

            if (changed === 'destroyed') {
              if (
                before === null ||
                before.code === null ||
                !destroyedNow.has(before.code)
              ) {
                return;
              }
              if (
                after !== null &&
                after.code === null &&
                $replacedByAnotherBlockType(
                  editorState,
                  prevEditorState,
                  after.block,
                )
              ) {
                const level = $headingLevel(editorState, after.block);
                if (
                  level !== null &&
                  headings !== null &&
                  !headings.disabled.peek()
                ) {
                  announce(
                    joinSwap(
                      headings.created.peek().replace('%s', level),
                      destroyed.peek(),
                    ),
                  );
                }
                return;
              }
              announce(
                after !== null && after.code !== null
                  ? destroyedInside.peek()
                  : destroyed.peek(),
              );
              return;
            }

            if (
              before === null ||
              after === null ||
              before.code === after.code
            ) {
              return;
            }

            if (
              after.code !== null &&
              !isMissingFrom(prevEditorState, after.code) &&
              isMissingFrom(editorState, before.block)
            ) {
              announce(entered.peek());
            } else if (
              after.code === null &&
              before.code !== null &&
              !isMissingFrom(editorState, before.code) &&
              isMissingFrom(prevEditorState, after.block)
            ) {
              announce(exited.peek());
            }
          },
        ),
      );
    });
  },
});
