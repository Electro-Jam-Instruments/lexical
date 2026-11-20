/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {HistoryAnnounceExtension} from '@lexical/a11y';
import {
  buildEditorFromExtensions,
  defineExtension,
  getExtensionDependencyFromEditor,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {
  $createListItemNode,
  $createListNode,
  ListExtension,
} from '@lexical/list';
import {
  $createHeadingNode,
  HeadingAnnounceExtension,
  RichTextExtension,
} from '@lexical/rich-text';
import {$createTableNodeWithDimensions, TableExtension} from '@lexical/table';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  configExtension,
  HISTORY_PUSH_TAG,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import {afterEach, describe, expect, onTestFinished, test} from 'vitest';

afterEach(() => {
  document.body.replaceChildren();
});

// The live region follows the editor's root document, so a mounted root is
// required for it to exist.
function mountRoot(editor: LexicalEditorWithDispose): void {
  const root = document.createElement('div');
  root.contentEditable = 'true';
  document.body.appendChild(root);
  editor.setRootElement(root);
  onTestFinished(() => root.remove());
}

const tick = () => new Promise(resolve => setTimeout(resolve, 5));

function readLiveRegion(): string {
  return document.body.querySelector('[aria-live]')!.textContent ?? '';
}

describe('HistoryAnnounceExtension', () => {
  test('announces the default Undone / Redone messages on the dependency sink', async () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [HistoryAnnounceExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    mountRoot(editor);
    editor.dispatchCommand(UNDO_COMMAND);
    await tick();
    expect(readLiveRegion()).toBe('Undone');
    editor.dispatchCommand(REDO_COMMAND);
    await tick();
    expect(readLiveRegion()).toBe('Redone');
  });

  test('respects message overrides from configExtension', async () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          configExtension(HistoryAnnounceExtension, {
            redone: 'Custom redo',
            undone: 'Custom undo',
          }),
          RichTextExtension,
        ],
        name: '[root]',
      }),
    );
    mountRoot(editor);
    editor.dispatchCommand(UNDO_COMMAND);
    await tick();
    expect(readLiveRegion()).toBe('Custom undo');
    editor.dispatchCommand(REDO_COMMAND);
    await tick();
    expect(readLiveRegion()).toBe('Custom redo');
  });

  test('reflects message signal changes at runtime', async () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [HistoryAnnounceExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    mountRoot(editor);
    const {undone, redone} = getExtensionDependencyFromEditor(
      editor,
      HistoryAnnounceExtension,
    ).output;
    undone.value = 'Reverted';
    redone.value = 'Restored';
    editor.dispatchCommand(UNDO_COMMAND);
    await tick();
    expect(readLiveRegion()).toBe('Reverted');
    editor.dispatchCommand(REDO_COMMAND);
    await tick();
    expect(readLiveRegion()).toBe('Restored');
  });

  test('does not announce while disabled, and resumes when re-enabled', async () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [HistoryAnnounceExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    mountRoot(editor);
    const {disabled} = getExtensionDependencyFromEditor(
      editor,
      HistoryAnnounceExtension,
    ).output;

    disabled.value = true;
    editor.dispatchCommand(UNDO_COMMAND);
    await tick();
    expect(readLiveRegion()).toBe('');

    disabled.value = false;
    editor.dispatchCommand(REDO_COMMAND);
    await tick();
    expect(readLiveRegion()).toBe('Redone');
  });

  test('keeps the history command chain intact (returns false)', async () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [HistoryAnnounceExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    mountRoot(editor);
    // A handler registered after HistoryAnnounce at the same priority should
    // still receive the UNDO_COMMAND because HistoryAnnounce returns false.
    let reached = false;
    editor.registerCommand(
      UNDO_COMMAND,
      () => {
        reached = true;
        return false;
      },
      1,
    );
    editor.dispatchCommand(UNDO_COMMAND);
    await tick();
    expect(reached).toBe(true);
  });
});

describe('HistoryAnnounceExtension says what changed', () => {
  function buildWithHistory(detail = true) {
    const editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          configExtension(HistoryAnnounceExtension, {detail}),
          HistoryExtension,
          RichTextExtension,
          configExtension(HeadingAnnounceExtension, {disabled: true}),
          ListExtension,
          TableExtension,
        ],
        name: '[root]',
      }),
    );
    mountRoot(editor);
    return editor;
  }

  const push = (editor: ReturnType<typeof buildWithHistory>, fn: () => void) =>
    editor.update(fn, {discrete: true, tag: HISTORY_PUSH_TAG});

  test('a small deleted paragraph is read back in words, and redo says it went again', async () => {
    using editor = buildWithHistory();
    push(editor, () => {
      $getRoot()
        .clear()
        .append($createParagraphNode().append($createTextNode('hello world')));
    });
    push(editor, () => $getRoot().clear().append($createParagraphNode()));
    editor.dispatchCommand(UNDO_COMMAND);
    await tick();
    expect(readLiveRegion()).toBe('Undone, restored hello world');
    editor.dispatchCommand(REDO_COMMAND);
    await tick();
    expect(readLiveRegion()).toBe('Redone, removed hello world');
  });

  test('a large delete names the kinds of block, interesting ones first and plain paragraphs last', async () => {
    using editor = buildWithHistory();
    push(editor, () => {
      const $item = (text: string) =>
        $createListItemNode().append($createTextNode(text));
      $getRoot()
        .clear()
        .append(
          $createParagraphNode().append($createTextNode('one')),
          $createHeadingNode('h1').append($createTextNode('Meeting notes')),
          $createParagraphNode().append($createTextNode('two')),
          $createListNode('bullet').append($item('a')),
          $createParagraphNode().append($createTextNode('three')),
          $createListNode('number').append($item('b')),
          $createTableNodeWithDimensions(2, 2, false),
        );
    });
    push(editor, () => $getRoot().clear().append($createParagraphNode()));
    editor.dispatchCommand(UNDO_COMMAND);
    await tick();
    expect(readLiveRegion()).toBe(
      'Undone, restored a table, 2 lists, a heading and 3 paragraphs',
    );
    editor.dispatchCommand(REDO_COMMAND);
    await tick();
    expect(readLiveRegion()).toBe(
      'Redone, removed a table, 2 lists, a heading and 3 paragraphs',
    );
  });

  test('undoing typing inside a paragraph reads the typed words, shortened when long', async () => {
    using editor = buildWithHistory();
    push(editor, () => {
      $getRoot()
        .clear()
        .append($createParagraphNode().append($createTextNode('start')));
    });
    push(editor, () => {
      const text = $getRoot().getFirstChild();
      if ($isElementNode(text)) {
        text.append(
          $createTextNode(' one two three four five six seven eight nine'),
        );
      }
    });
    editor.dispatchCommand(UNDO_COMMAND);
    await tick();
    expect(readLiveRegion()).toBe(
      'Undone, removed one two three four five six and more',
    );
  });

  test('with nothing to undo it still says Undone', async () => {
    using editor = buildWithHistory();
    editor.dispatchCommand(UNDO_COMMAND);
    await tick();
    expect(readLiveRegion()).toBe('Undone');
  });

  test('detail: false announces the plain message immediately', () => {
    using editor = buildWithHistory(false);
    editor.dispatchCommand(UNDO_COMMAND);
    expect(readLiveRegion()).toBe('Undone');
  });
});
