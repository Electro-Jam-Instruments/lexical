/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {AccessibilityConfig} from '../../types';

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
  type LexicalEditor,
} from 'lexical';
import * as React from 'react';
import {act, useEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, describe, expect, test} from 'vitest';

import {
  ACCESSIBLE_TEXT_NODE_REPLACEMENT,
  AccessibleTextNode,
} from '../../AccessibleTextNode';
import {createEmojiConfig} from '../../emojiConfig';
import {EmojiNode} from '../../EmojiNode';
import {EmojisPlugin} from '../../EmojisPlugin';
import {AccessibilityPlugin} from '../../LexicalAccessibilityPlugin';

// The live region adds one to a repeated message so the browser notices it.
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);

const emojiConfig = createEmojiConfig(EmojiNode);

const Extension = defineExtension({
  dependencies: [
    RichTextExtension,
    configExtension(AriaLiveRegionExtension, {politeness: 'polite'}),
  ],
  name: 'EmojiAnnounceTest',
  namespace: 'EmojiAnnounceTest',
  nodes: [AccessibleTextNode, ACCESSIBLE_TEXT_NODE_REPLACEMENT, EmojiNode],
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

afterEach(async () => {
  if (reactRoot !== null) {
    const root = reactRoot;
    await act(async () => root.unmount());
    reactRoot = null;
  }
  document.body.replaceChildren();
});

/** Mounts the consumer-shaped editor and types `text` into it. */
async function typeIntoEditor(
  text: string,
  config?: AccessibilityConfig,
): Promise<string> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let editor: LexicalEditor | null = null;
  reactRoot = createRoot(container);
  await act(async () => {
    reactRoot!.render(
      <LexicalExtensionComposer
        contentEditable={<ContentEditable />}
        extension={Extension}>
        <AccessibilityPlugin
          additionalNodeConfigs={[emojiConfig]}
          config={config}
        />
        <EmojisPlugin />
        <GrabEditor onEditor={e => void (editor = e)} />
      </LexicalExtensionComposer>,
    );
  });
  await act(async () => {
    editor!.update(
      () => {
        const paragraph = $createParagraphNode();
        const node = $createTextNode(text);
        paragraph.append(node);
        $getRoot().clear().append(paragraph);
        node.selectEnd();
      },
      {discrete: true},
    );
    await new Promise(resolve => setTimeout(resolve, 400));
  });
  return (document.body.querySelector('[aria-live]')?.textContent ?? '')
    .split(ZERO_WIDTH_SPACE)
    .join('')
    .trim();
}

describe('emoji shortcuts are announced', () => {
  test(':) says what the smiley is', async () => {
    expect(await typeIntoEditor('hello :)')).toContain('slightly smiling face');
  });

  test('--> says right arrow', async () => {
    expect(await typeIntoEditor('go -->')).toContain('right arrow');
  });

  test('announceIndent: false leaves the emoji announcement on', async () => {
    expect(await typeIntoEditor('go -->', {announceIndent: false})).toContain(
      'right arrow',
    );
  });

  test('announceStructural: false silences it, which is why it is not the switch to use', async () => {
    expect(await typeIntoEditor('go -->', {announceStructural: false})).toBe(
      '',
    );
  });
});
