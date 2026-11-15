/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {AriaLiveRegionExtension} from '@lexical/a11y';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  configExtension,
  defineExtension,
  KEY_ESCAPE_COMMAND,
  type LexicalEditor,
} from 'lexical';
import * as React from 'react';
import {act, useEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeAll, describe, expect, test} from 'vitest';

import {type Emoji, EmojiPickerPlugin} from '../../EmojiPickerPlugin';

const emoji = (glyph: string, alias: string): Emoji => ({
  aliases: [alias],
  category: 'Smileys',
  description: alias,
  emoji: glyph,
  ios_version: '6.0',
  tags: [],
  unicode_version: '6.0',
});
const EMOJI = [
  emoji('😅', 'sweat_smile'),
  emoji('😄', 'smile'),
  emoji('😪', 'sleepy'),
];

const Extension = defineExtension({
  dependencies: [
    RichTextExtension,
    configExtension(AriaLiveRegionExtension, {politeness: 'polite'}),
  ],
  name: 'EmojiPickerStructureTest',
  namespace: 'EmojiPickerStructureTest',
  onError: error => {
    throw error;
  },
});

function GrabEditor({onEditor}: {onEditor: (editor: LexicalEditor) => void}) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => onEditor(editor), [editor, onEditor]);
  return null;
}

let reactRoot: Root | null = null;
let pickerEditor: LexicalEditor | null = null;

// jsdom has no layout, and the menu watches its anchor for size changes.
beforeAll(() => {
  globalThis.ResizeObserver = class {
    disconnect() {}
    observe() {}
    unobserve() {}
  };
});

afterEach(async () => {
  if (reactRoot !== null) {
    const root = reactRoot;
    await act(async () => root.unmount());
    reactRoot = null;
  }
  document.body.replaceChildren();
});

/** Mounts the editor with the picker and types "::s", which opens the menu. */
async function openPicker(): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let editor: LexicalEditor | null = null;
  reactRoot = createRoot(container);
  await act(async () => {
    reactRoot!.render(
      <LexicalExtensionComposer
        contentEditable={<ContentEditable />}
        extension={Extension}>
        <EmojiPickerPlugin emojiData={EMOJI} />
        <GrabEditor onEditor={e => void (editor = e)} />
      </LexicalExtensionComposer>,
    );
  });
  await act(async () => {
    editor!.update(
      () => {
        const paragraph = $createParagraphNode();
        const node = $createTextNode('::s');
        paragraph.append(node);
        $getRoot().clear().append(paragraph);
        node.selectEnd();
      },
      {discrete: true},
    );
    await new Promise(resolve => setTimeout(resolve, 300));
  });
  pickerEditor = editor;
  const listbox = document.querySelector<HTMLElement>('[role="listbox"]');
  expect(listbox).not.toBeNull();
  return listbox!;
}

/** True for an element that would add a list or group of its own. */
function addsARole(el: Element): boolean {
  const role = el.getAttribute('role');
  if (role === 'presentation' || role === 'none') {
    return false;
  }
  return role !== null || el.tagName === 'UL' || el.tagName === 'OL';
}

describe('EmojiPickerPlugin menu structure', () => {
  test('the options belong directly to the one listbox', async () => {
    const listbox = await openPicker();
    expect(document.querySelectorAll('[role="listbox"]')).toHaveLength(1);
    const options = [...listbox.querySelectorAll('[role="option"]')];
    expect(options).toHaveLength(3);
    for (const option of options) {
      for (
        let el = option.parentElement;
        el !== null && el !== listbox;
        el = el.parentElement
      ) {
        // A list or group between the listbox and its options takes the
        // options away from it, and the screen reader loses "3 of 10".
        expect(addsARole(el), `<${el.tagName.toLowerCase()}>`).toBe(false);
      }
    }
  });

  test('only the highlighted option is marked selected', async () => {
    const listbox = await openPicker();
    expect(
      listbox.querySelectorAll('[role="option"][aria-selected="true"]'),
    ).toHaveLength(1);
    expect(
      listbox.querySelectorAll('[role="option"][aria-selected="false"]'),
    ).toHaveLength(0);
  });

  test('an option is read by its shortcode, not the glyph twice', async () => {
    const listbox = await openPicker();
    const labels = [...listbox.querySelectorAll('[role="option"]')].map(o =>
      o.getAttribute('aria-label'),
    );
    expect(labels).toEqual(['sweat smile', 'smile', 'sleepy']);
  });
});

describe('EmojiPickerPlugin and an app-wide Escape shortcut', () => {
  test('the editor is marked as owning Escape only while the menu is open', async () => {
    await openPicker();
    const root = pickerEditor!.getRootElement()!;
    expect(root.hasAttribute('data-owns-escape')).toBe(true);
    await act(async () => {
      pickerEditor!.dispatchCommand(
        KEY_ESCAPE_COMMAND,
        new KeyboardEvent('keydown', {key: 'Escape'}),
      );
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(root.hasAttribute('data-owns-escape')).toBe(false);
  });
});
