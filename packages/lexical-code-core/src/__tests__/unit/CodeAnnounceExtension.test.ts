/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {CodeAnnounceExtension, CodeExtension} from '@lexical/code';
import {
  $createCodeHighlightNode,
  $createCodeNode,
  $isCodeNode,
} from '@lexical/code-core';
import {
  buildEditorFromExtensions,
  defineExtension,
  getExtensionDependencyFromEditor,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {
  $createHeadingNode,
  $createQuoteNode,
  RichTextExtension,
} from '@lexical/rich-text';
import {$setBlocksType} from '@lexical/selection';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
} from 'lexical';
import {afterEach, describe, expect, onTestFinished, test} from 'vitest';

afterEach(() => {
  document.body.replaceChildren();
});

function mountRoot(editor: LexicalEditorWithDispose): void {
  const root = document.createElement('div');
  root.contentEditable = 'true';
  document.body.appendChild(root);
  editor.setRootElement(root);
  onTestFinished(() => root.remove());
}

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

function buildEditor(): LexicalEditorWithDispose {
  const editor = buildEditorFromExtensions(
    defineExtension({
      dependencies: [RichTextExtension, CodeExtension],
      name: '[root]',
    }),
  );
  mountRoot(editor);
  return editor;
}

function addCode(editor: LexicalEditorWithDispose, text = 'line'): void {
  editor.update(
    () => {
      const code = $createCodeNode();
      const line = $createCodeHighlightNode(text);
      code.append(line);
      $getRoot().append(code);
      line.selectEnd();
    },
    {discrete: true},
  );
}

describe('CodeAnnounceExtension', () => {
  test('announces a block becoming a code block', () => {
    using editor = buildEditor();
    addCode(editor);

    expect(readLiveRegion()).toBe('Code block');
  });

  test('announces a code block being removed', () => {
    using editor = buildEditor();
    addCode(editor);
    clearLiveRegion();

    editor.update(() => void $getRoot().getLastChild()?.remove(), {
      discrete: true,
    });

    expect(readLiveRegion()).toBe('Code block removed');
  });

  test('stays silent when a code block is created away from the caret', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode('here'));
        $getRoot().append(paragraph);
        paragraph.selectEnd();
      },
      {discrete: true},
    );
    clearLiveRegion();

    editor.update(
      () => {
        const code = $createCodeNode();
        code.append($createCodeHighlightNode('elsewhere'));
        $getRoot().append(code);
      },
      {discrete: true},
    );

    expect(readLiveRegion()).toBe('');
  });

  test('stays silent when a code block is removed away from the caret', () => {
    using editor = buildEditor();
    addCode(editor, 'elsewhere');
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode('here'));
        $getRoot().append(paragraph);
        paragraph.selectEnd();
      },
      {discrete: true},
    );
    clearLiveRegion();

    editor.update(() => void $getRoot().getFirstChild()?.remove(), {
      discrete: true,
    });

    expect(readLiveRegion()).toBe('');
  });

  test('stays silent while typing inside a code block', () => {
    using editor = buildEditor();
    addCode(editor);
    clearLiveRegion();

    editor.update(
      () => {
        const code = $getRoot().getLastChild();
        if ($isCodeNode(code)) {
          code.append($createCodeHighlightNode(' more'));
        }
      },
      {discrete: true},
    );

    expect(readLiveRegion()).toBe('');
  });

  test('announces leaving when the block after the code block is new', () => {
    using editor = buildEditor();
    addCode(editor);
    clearLiveRegion();

    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        $getRoot().append(paragraph);
        paragraph.selectEnd();
      },
      {discrete: true},
    );

    expect(readLiveRegion()).toBe('Exiting code block');
  });

  test('stays silent when the caret only moves across the edge', () => {
    using editor = buildEditor();
    addCode(editor);
    editor.update(() => void $getRoot().append($createParagraphNode()), {
      discrete: true,
    });
    clearLiveRegion();

    editor.update(() => void $getRoot().getLastChild()?.selectEnd(), {
      discrete: true,
    });
    expect(readLiveRegion()).toBe('');

    editor.update(() => void $getRoot().getFirstChild()?.selectEnd(), {
      discrete: true,
    });
    expect(readLiveRegion()).toBe('');
  });

  test('announces entering when the block the caret came from goes away', () => {
    using editor = buildEditor();
    addCode(editor);
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        $getRoot().append(paragraph);
        paragraph.selectEnd();
      },
      {discrete: true},
    );
    clearLiveRegion();

    editor.update(
      () => {
        const root = $getRoot();
        root.getLastChild()?.remove();
        root.getLastChild()?.selectEnd();
      },
      {discrete: true},
    );

    expect(readLiveRegion()).toBe('Code block');
  });

  test('says both the removal and where the caret landed', () => {
    using editor = buildEditor();
    addCode(editor, 'first');
    addCode(editor, 'second');
    clearLiveRegion();

    editor.update(
      () => {
        const root = $getRoot();
        root.getLastChild()?.remove();
        root.getLastChild()?.selectEnd();
      },
      {discrete: true},
    );

    expect(readLiveRegion()).toBe('Code block removed, in code block');
  });

  test('names the code block first when a heading becomes one', async () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const heading = $createHeadingNode('h2');
        const text = $createTextNode('title');
        heading.append(text);
        $getRoot().append(heading);
        text.selectEnd();
      },
      {discrete: true},
    );
    clearLiveRegion();

    const region = document.body.querySelector('[aria-live]')!;
    const seen: string[] = [];
    const observer = new MutationObserver(() => {
      seen.push((region.textContent ?? '').replace(/\u200B/g, ''));
    });
    observer.observe(region, {
      characterData: true,
      childList: true,
      subtree: true,
    });

    editor.update(
      () => $setBlocksType($getSelection(), () => $createCodeNode()),
      {discrete: true},
    );
    await Promise.resolve();
    observer.disconnect();

    expect({final: readLiveRegion(), seen}).toEqual({
      final: 'Code block, heading level 2 removed',
      seen: ['Code block, heading level 2 removed'],
    });
  });

  test('names the heading first when a code block becomes one', async () => {
    using editor = buildEditor();
    addCode(editor);
    clearLiveRegion();

    const region = document.body.querySelector('[aria-live]')!;
    const seen: string[] = [];
    const observer = new MutationObserver(() => {
      seen.push((region.textContent ?? '').replace(/\u200B/g, ''));
    });
    observer.observe(region, {
      characterData: true,
      childList: true,
      subtree: true,
    });

    editor.update(
      () => $setBlocksType($getSelection(), () => $createHeadingNode('h2')),
      {discrete: true},
    );
    await Promise.resolve();
    observer.disconnect();

    expect({final: readLiveRegion(), seen}).toEqual({
      final: 'Heading level 2, code block removed',
      seen: ['Heading level 2, code block removed'],
    });
  });

  test('lets the quote announcer speak when a code block becomes a quote', () => {
    using editor = buildEditor();
    addCode(editor);
    clearLiveRegion();

    editor.update(
      () => $setBlocksType($getSelection(), () => $createQuoteNode()),
      {discrete: true},
    );

    // The code announcer says nothing about the code block going away, and the
    // quote announcer says what the block became.
    expect(readLiveRegion()).toBe('Block quote');
  });

  test('says nothing while disabled, and resumes when turned back on', () => {
    using editor = buildEditor();
    const {disabled} = getExtensionDependencyFromEditor(
      editor,
      CodeAnnounceExtension,
    ).output;

    disabled.value = true;
    addCode(editor);
    expect(readLiveRegion()).toBe('');

    disabled.value = false;
    addCode(editor, 'again');
    expect(readLiveRegion()).toBe('Code block');
  });
});
