/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {HistoryAnnounceExtension} from '@lexical/a11y';
import {CodeExtension} from '@lexical/code';
import {
  buildEditorFromExtensions,
  defineExtension,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {LinkExtension} from '@lexical/link';
import {ListExtension} from '@lexical/list';
import {registerMarkdownShortcuts} from '@lexical/markdown';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import {afterEach, describe, expect, onTestFinished, test} from 'vitest';

// Typing a markdown shortcut and pressing undo: what is heard comes from
// Lexical's real shortcut, not a hand-built before and after.

afterEach(() => {
  document.body.replaceChildren();
});

const tick = () => new Promise(resolve => setTimeout(resolve, 5));
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);

function region(): HTMLElement {
  const found = [...document.body.querySelectorAll('[aria-live]')].pop();
  if (!(found instanceof HTMLElement)) {
    throw new Error('no live region');
  }
  return found;
}

function build(): LexicalEditorWithDispose {
  document.body.replaceChildren();
  const editor = buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        HistoryAnnounceExtension,
        HistoryExtension,
        RichTextExtension,
        ListExtension,
        LinkExtension,
        CodeExtension,
      ],
      name: '[root]',
      register: e => registerMarkdownShortcuts(e),
    }),
  );
  const root = document.createElement('div');
  root.contentEditable = 'true';
  document.body.appendChild(root);
  editor.setRootElement(root);
  onTestFinished(() => {
    root.remove();
    editor.dispose();
  });
  editor.update(
    () => {
      const paragraph = $createParagraphNode();
      $getRoot().clear().append(paragraph);
      paragraph.select();
    },
    {discrete: true},
  );
  return editor;
}

function type(editor: LexicalEditorWithDispose, text: string): void {
  for (const character of text) {
    editor.update(
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText(character);
        }
      },
      {discrete: true},
    );
  }
}

/** What is heard for each of the next `steps` presses of undo, then redo. */
async function undoThenRedo(
  editor: LexicalEditorWithDispose,
  steps: number,
): Promise<{redone: string[]; undone: string[]}> {
  const press = async (command: typeof UNDO_COMMAND) => {
    region().textContent = '';
    editor.dispatchCommand(command, undefined);
    await tick();
    return (region().textContent ?? '').split(ZERO_WIDTH_SPACE).join('');
  };
  const undone: string[] = [];
  for (let i = 0; i < steps; i++) {
    undone.push(await press(UNDO_COMMAND));
  }
  const redone: string[] = [];
  for (let i = 0; i < steps; i++) {
    redone.push(await press(REDO_COMMAND));
  }
  return {redone, undone};
}

describe('undo and redo after a markdown shortcut', () => {
  test.each([
    ['*some words* ', 'italic'],
    ['_some words_ ', 'italic'],
    ['**some words** ', 'bold'],
    ['***some words*** ', 'bold and italic'],
    ['~~some words~~ ', 'strikethrough'],
    ['`some words` ', 'code'],
  ])('%s says the %s, not the markers', async (typed, format) => {
    const editor = build();
    type(editor, `say ${typed}`);
    const {redone, undone} = await undoThenRedo(editor, 3);
    expect(undone[0]).toBe(`Undone, removed ${format} from some words`);
    expect(redone[2]).toBe(`Redone, added ${format} to some words`);
  });

  test('a markdown link says it was a link, not the address', async () => {
    const editor = build();
    type(editor, '[site](https://example.com) ');
    const {undone} = await undoThenRedo(editor, 1);
    expect(undone[0]).toBe('Undone, removed link from site');
  });

  test.each([['- buy milk'], ['1. buy milk']])(
    '%s says what the block became, and a part of a word is read whole',
    async typed => {
      const editor = build();
      type(editor, typed);
      const {redone, undone} = await undoThenRedo(editor, 4);
      expect(undone[0]).toBe('Undone, removed buy milk');
      expect(undone[1]).toBe('Undone, changed to a paragraph');
      expect(redone[2]).toBe('Redone, changed to a list');
    },
  );

  test('a heading is left to the heading announcer', async () => {
    const editor = build();
    type(editor, '# Title');
    const {redone, undone} = await undoThenRedo(editor, 4);
    expect(undone[1]).not.toMatch(/^Undone/);
    expect(redone[2]).not.toMatch(/^Redone/);
  });
});
