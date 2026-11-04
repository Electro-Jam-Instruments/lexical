/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  defineExtension,
  type LexicalEditorWithDispose,
  TabIndentationExtension,
} from '@lexical/extension';
import {
  $createListItemNode,
  $createListNode,
  ListExtension,
  type ListType,
} from '@lexical/list';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  configExtension,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
} from 'lexical';
import {afterEach, describe, expect, onTestFinished, test, vi} from 'vitest';

afterEach(() => {
  document.body.replaceChildren();
});

function readLiveRegion(): string {
  return (
    document.body.querySelector('[aria-live]')!.textContent ?? ''
  ).replace(/\u200B/g, '');
}

function clearLiveRegion(): void {
  const region = document.body.querySelector('[aria-live]');
  if (region) {
    region.textContent = '';
  }
}

function buildEditor(
  hasStrictIndent = false,
  tabFirst = false,
): LexicalEditorWithDispose {
  const editor = buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        RichTextExtension,
        ...(tabFirst ? [TabIndentationExtension] : []),
        configExtension(ListExtension, {hasStrictIndent}),
      ],
      name: '[root]',
    }),
  );
  const root = document.createElement('div');
  root.contentEditable = 'true';
  document.body.appendChild(root);
  editor.setRootElement(root);
  onTestFinished(() => root.remove());
  return editor;
}

/** A list of two items, with the caret at the end of the second one. */
function addList(editor: LexicalEditorWithDispose, type: ListType): void {
  editor.update(
    () => {
      const list = $createListNode(type);
      const first = $createListItemNode();
      first.append($createTextNode('one'));
      const second = $createListItemNode();
      const text = $createTextNode('two');
      second.append(text);
      list.append(first, second);
      $getRoot().clear().append(list);
      text.selectEnd();
    },
    {discrete: true},
  );
}

function press(
  editor: LexicalEditorWithDispose,
  command: typeof INDENT_CONTENT_COMMAND | typeof OUTDENT_CONTENT_COMMAND,
): void {
  editor.update(() => void editor.dispatchCommand(command, undefined), {
    discrete: true,
  });
  vi.runAllTimers();
}

describe('ListAnnounceExtension', () => {
  test('says the level and marker when Tab moves an item', () => {
    vi.useFakeTimers();
    onTestFinished(() => void vi.useRealTimers());
    using editor = buildEditor();
    addList(editor, 'bullet');
    clearLiveRegion();

    press(editor, INDENT_CONTENT_COMMAND);

    expect(readLiveRegion()).toBe('Level 2, hollow bullet');
  });

  test('says the new level when Shift+Tab moves an item', () => {
    vi.useFakeTimers();
    onTestFinished(() => void vi.useRealTimers());
    using editor = buildEditor();
    addList(editor, 'bullet');
    press(editor, INDENT_CONTENT_COMMAND);
    clearLiveRegion();

    press(editor, OUTDENT_CONTENT_COMMAND);

    expect(readLiveRegion()).toBe('Level 1, bullet');
  });

  test('says Min when Shift+Tab cannot move', () => {
    vi.useFakeTimers();
    onTestFinished(() => void vi.useRealTimers());
    using editor = buildEditor();
    addList(editor, 'bullet');
    clearLiveRegion();

    press(editor, OUTDENT_CONTENT_COMMAND);

    expect(readLiveRegion()).toBe('Min, level 1');
  });

  test('says Max when Tab cannot move', () => {
    vi.useFakeTimers();
    onTestFinished(() => void vi.useRealTimers());
    // With strict indent an item cannot sit deeper than the one above it, so
    // Tab on the first item has nowhere to go.
    using editor = buildEditor(true);
    addList(editor, 'bullet');
    editor.update(() => void $getRoot().getFirstDescendant()?.selectEnd(), {
      discrete: true,
    });
    clearLiveRegion();

    press(editor, INDENT_CONTENT_COMMAND);

    expect(readLiveRegion()).toBe('Max, level 1');
  });

  test('still says the level when another indent handler ran first', () => {
    vi.useFakeTimers();
    onTestFinished(() => void vi.useRealTimers());
    using editor = buildEditor(false, true);
    addList(editor, 'bullet');
    clearLiveRegion();

    press(editor, INDENT_CONTENT_COMMAND);

    expect(readLiveRegion()).toBe('Level 2, hollow bullet');
  });

  test('names numbered markers by level', () => {
    vi.useFakeTimers();
    onTestFinished(() => void vi.useRealTimers());
    using editor = buildEditor();
    addList(editor, 'number');
    clearLiveRegion();

    press(editor, INDENT_CONTENT_COMMAND);

    expect(readLiveRegion()).toBe('Level 2, capital letter');
  });

  test('a Tab that nests does not also say a list started', () => {
    vi.useFakeTimers();
    onTestFinished(() => void vi.useRealTimers());
    using editor = buildEditor();
    addList(editor, 'bullet');
    clearLiveRegion();

    press(editor, INDENT_CONTENT_COMMAND);

    expect(readLiveRegion()).not.toContain('started');
  });

  test('says a list started when a paragraph becomes one', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const p = $createParagraphNode();
        p.append($createTextNode('x'));
        $getRoot().clear().append(p);
        p.selectEnd();
      },
      {discrete: true},
    );
    clearLiveRegion();

    addList(editor, 'bullet');

    expect(readLiveRegion()).toBe('Bullet list started');
  });
});
