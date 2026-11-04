/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {AriaLiveRegionExtension} from '@lexical/a11y';
import {effect, namedSignals} from '@lexical/extension';
import {$findMatchingParent} from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  defineExtension,
  INDENT_CONTENT_COMMAND,
  type NodeKey,
  OUTDENT_CONTENT_COMMAND,
  safeCast,
} from 'lexical';

import {$isListItemNode} from './LexicalListItemNode';
import {$isListNode, type ListType} from './LexicalListNode';

export interface ListAnnounceExtensionConfig {
  /** Announced when a bulleted list is started. */
  bulletStarted: string;
  /** Announced when a numbered list is started. */
  numberStarted: string;
  /** Announced when a check list is started. */
  checkStarted: string;
  /**
   * Announced when Tab or Shift+Tab moves an item. `%d` is the level, counting
   * from 1, and `%s` is the name of the marker at that level.
   */
  level: string;
  /**
   * Announced when Tab cannot move the item any deeper. `%d` is the level the
   * item is still at. Shift+Tab at the far left says `level` again instead.
   */
  limit: string;
  /** Marker names for bulleted lists, one per level, repeating. */
  bulletNames: readonly string[];
  /** Marker names for numbered lists, one per level, repeating. */
  numberNames: readonly string[];
  /** Marker name for check lists. */
  checkName: string;
  /**
   * When `true`, lists are not announced. Toggle at runtime via the output
   * signal. Default `false`.
   */
  disabled: boolean;
}

interface ItemPlace {
  key: NodeKey;
  indent: number;
  type: ListType;
}

type Direction = 'indent' | 'outdent';

function $itemPlace(key: NodeKey | null): ItemPlace | null {
  let item = null;
  if (key === null) {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      item = $findMatchingParent(selection.anchor.getNode(), $isListItemNode);
    }
  } else {
    const node = $getNodeByKey(key);
    item = $isListItemNode(node) ? node : null;
  }
  if (item === null) {
    return null;
  }
  const list = item.getParent();
  if (!$isListNode(list)) {
    return null;
  }
  return {
    indent: item.getIndent(),
    key: item.getKey(),
    type: list.getListType(),
  };
}

function format(template: string, level: number, marker: string): string {
  return template.replace('%d', String(level)).replace('%s', marker);
}

/**
 * Announces what a screen reader cannot work out for itself in a list:
 *
 * - A list being started by a markdown shortcut (`- ` or `1. `).
 * - The level and marker after Tab or Shift+Tab, such as "Level 2, hollow
 *   bullet".
 * - Tab at the deepest level, "Max, level 3", and Shift+Tab at the far left,
 *   which says "Level 1, bullet" again so the user knows where they are.
 *
 * Whether Tab moved the item is learned by comparing the item before and after
 * the command runs, so the speech stays correct if the indent rules change.
 */
export const ListAnnounceExtension = defineExtension({
  build: (_editor, config) => namedSignals(config),
  config: safeCast<ListAnnounceExtensionConfig>({
    bulletNames: ['bullet', 'hollow bullet', 'square bullet'],
    bulletStarted: 'Bullet list started',
    checkName: 'checkbox',
    checkStarted: 'Check list started',
    disabled: false,
    level: 'Level %d, %s',
    limit: 'Max, level %d',
    numberNames: [
      'number',
      'capital letter',
      'small letter',
      'capital roman',
      'small roman',
    ],
    numberStarted: 'Numbered list started',
  }),
  dependencies: [AriaLiveRegionExtension],
  name: '@lexical/list/ListAnnounce',
  register(editor, _config, state) {
    const {
      bulletNames,
      bulletStarted,
      checkName,
      checkStarted,
      disabled,
      level,
      limit,
      numberNames,
      numberStarted,
    } = state.getOutput();
    const {announce} = state.getDependency(AriaLiveRegionExtension).output;

    const markerName = (type: ListType, indent: number): string => {
      if (type === 'check') {
        return checkName.peek();
      }
      const names = type === 'number' ? numberNames.peek() : bulletNames.peek();
      return names.length === 0 ? '' : names[indent % names.length];
    };

    const startedMessage = (type: ListType): string =>
      type === 'number'
        ? numberStarted.peek()
        : type === 'check'
          ? checkStarted.peek()
          : bulletStarted.peek();

    const say = (message: string) => {
      if (message !== '') {
        announce(message);
      }
    };

    // Set while a Tab or Shift+Tab is running, so the commit that follows it
    // is spoken as a move and not as a new list. Nesting makes a new inner
    // list, which would otherwise read as "Bullet list started".
    let pending: {before: ItemPlace; direction: Direction} | null = null;

    const finishMove = () => {
      if (pending === null) {
        return;
      }
      const {before, direction} = pending;
      pending = null;
      const after = editor
        .getEditorState()
        .read(() => $itemPlace(before.key) ?? $itemPlace(null));
      if (after === null) {
        return;
      }
      const moved = after.indent !== before.indent;
      if (!moved && direction === 'indent') {
        say(limit.peek().replace('%d', String(after.indent + 1)));
        return;
      }
      say(
        format(
          level.peek(),
          after.indent + 1,
          markerName(after.type, after.indent),
        ),
      );
    };

    const watchMove = (direction: Direction) => () => {
      if (pending !== null) {
        return false;
      }
      const before = $itemPlace(null);
      if (before === null) {
        return false;
      }
      pending = {before, direction};
      // A move that changes nothing may never commit. Check on the next turn
      // of the event loop in case the update listener did not run.
      setTimeout(finishMove, 0);
      // Return false so the real indent handler still runs.
      return false;
    };

    return effect(() => {
      if (disabled.value) {
        return undefined;
      }
      const removeIndent = editor.registerCommand(
        INDENT_CONTENT_COMMAND,
        watchMove('indent'),
        COMMAND_PRIORITY_CRITICAL,
      );
      const removeOutdent = editor.registerCommand(
        OUTDENT_CONTENT_COMMAND,
        watchMove('outdent'),
        COMMAND_PRIORITY_CRITICAL,
      );
      const removeUpdate = editor.registerUpdateListener(
        ({dirtyElements, editorState, prevEditorState}) => {
          if (pending !== null) {
            finishMove();
            return;
          }
          if (dirtyElements.size === 0) {
            return;
          }
          // A list that did not exist a moment ago, at the top level, with the
          // caret in it: a markdown shortcut turned a paragraph into a list.
          const started = editorState.read(() => {
            const here = $itemPlace(null);
            if (here === null) {
              return null;
            }
            const item = $getNodeByKey(here.key);
            const list = item === null ? null : item.getParent();
            if (
              !$isListNode(list) ||
              $isListItemNode(list.getParent()) ||
              !dirtyElements.has(list.getKey())
            ) {
              return null;
            }
            const listKey = list.getKey();
            return prevEditorState.read(() => $getNodeByKey(listKey) === null)
              ? here.type
              : null;
          });
          if (started !== null) {
            say(startedMessage(started));
          }
        },
      );
      return () => {
        removeIndent();
        removeOutdent();
        removeUpdate();
      };
    });
  },
});
