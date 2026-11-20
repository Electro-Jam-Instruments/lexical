/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  effect,
  namedSignals,
  type NamedSignalsOutput,
  RootElementExtension,
  signal,
} from '@lexical/extension';
import {
  $getRoot,
  $isElementNode,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  createRefCountedRegistry,
  defineExtension,
  getActiveElementDeep,
  getComposedEventTarget,
  HISTORIC_TAG,
  isDOMShadowRoot,
  isHTMLElement,
  KEY_DOWN_COMMAND,
  type LexicalEditor,
  type LexicalNode,
  mergeRegister,
  REDO_COMMAND,
  type RefCountedRegistry,
  registerEventListener,
  safeCast,
  UNDO_COMMAND,
} from 'lexical';

export type AriaPoliteness = 'polite' | 'assertive';

function applyVisuallyHidden(el: HTMLElement): void {
  const style = el.style;
  style.border = '0';
  style.clip = 'rect(0 0 0 0)';
  style.height = '1px';
  style.margin = '-1px';
  style.overflow = 'hidden';
  style.padding = '0';
  style.position = 'absolute';
  style.whiteSpace = 'nowrap';
  style.width = '1px';
}

/**
 * Creates a visually hidden live-region element as a child of `owner` and
 * returns it. WAI-ARIA status message pattern (WCAG 4.1.3). The caller owns
 * the element's lifetime (removal) and applies the `aria-live` politeness and
 * `textContent` reactively.
 */
function createLiveRegion(owner: HTMLElement): HTMLElement {
  const region = owner.ownerDocument.createElement('div');
  region.setAttribute('aria-atomic', 'true');
  region.setAttribute('role', 'status');
  applyVisuallyHidden(region);
  owner.appendChild(region);
  return region;
}

// The join is annotated by hand: a method call at module scope is a side
// effect to bundlers, and the build only injects annotations for Lexical's
// own factories.
const FOCUSABLE_SELECTOR = /* @__PURE__ */ [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
}

function containsComposed(container: Node, target: Node): boolean {
  let current: Node | null = target;
  while (current !== null) {
    if (current === container) {
      return true;
    }
    if (isDOMShadowRoot(current)) {
      current = current.host;
    } else {
      current = current.parentNode;
    }
  }
  return false;
}

export type FocusTrapInitialFocus = 'firstFocusable' | 'container';

export interface FocusTrapOptions {
  /**
   * Where to land focus when the trap activates:
   * - `'firstFocusable'` (default): focus the first focusable descendant.
   * - `'container'`: focus the container itself. The container must
   *   satisfy `tabIndex >= -1`; callers typically set `tabIndex={-1}` to
   *   keep it out of the natural Tab order while remaining programmatically
   *   focusable. Use for dialogs whose first focusable is a dismiss/close
   *   action so the user lands on the dialog body and screen readers
   *   announce the dialog label before any control.
   */
  initialFocus?: FocusTrapInitialFocus;
  /**
   * Predicate that exempts an element from the pull-back. When it
   * returns `true` for `event.target`, the focusin handler lets focus
   * stay outside the container. Useful for portaled panels (e.g.
   * autocomplete popups) that live outside the trap container yet
   * logically belong to it.
   */
  allowOutside?: (target: HTMLElement) => boolean;
}

/**
 * Traps Tab / Shift+Tab focus inside `container` and restores focus to
 * the previously-focused element when the returned dispose runs.
 * Intended for modal dialogs and other transient overlays.
 *
 * While active, *any* focus that lands outside the container is pulled
 * back inside via a document-level `focusin` listener. This recovers
 * from Safari's default Tab routing through the browser chrome, but it
 * also means descendants that mount into a portal outside `container`
 * (autocomplete panels, tooltips, toasts that auto-focus themselves)
 * will be yanked back as soon as they take focus. Portal them inside
 * `container`, or skip this helper for those dialogs. The pull-back
 * always lands on the first focusable descendant (or the container as a
 * fallback) — `initialFocus` only applies to the activation-time
 * landing, not to subsequent escape recoveries. Only one trap should be
 * mounted at a time — two active traps install competing document-level
 * `focusin` listeners and will fight over focus.
 *
 * Escape is not intercepted — the owner handles close-key behavior.
 */
function registerFocusTrap(
  container: HTMLElement,
  options: FocusTrapOptions = {},
): () => void {
  const initialFocus = options.initialFocus ?? 'firstFocusable';

  const doc = container.ownerDocument;
  const deepActive = getActiveElementDeep(doc);
  const previouslyFocused = isHTMLElement(deepActive) ? deepActive : null;

  const focusable = getFocusableElements(container);
  if (initialFocus === 'container' && container.hasAttribute('tabindex')) {
    container.focus();
  } else if (focusable.length > 0) {
    focusable[0].focus();
  } else if (container.hasAttribute('tabindex')) {
    container.focus();
  }

  // Full Tab management — every Tab / Shift+Tab is handled here.
  // Boundary-only cycling let Safari's default Tab route out to the
  // browser chrome (URL bar) between presses, producing a visible
  // focus flash. This trades contentEditable Tab indent for a reliable
  // trap; the helper is Modal-only today.
  const keydownHandler = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') {
      return;
    }
    const currentFocusable = getFocusableElements(container);
    if (currentFocusable.length === 0) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    const first = currentFocusable[0];
    const last = currentFocusable[currentFocusable.length - 1];
    const active = getActiveElementDeep(doc);
    const activeIndex =
      isHTMLElement(active) && containsComposed(container, active)
        ? currentFocusable.indexOf(active)
        : -1;
    if (event.shiftKey) {
      (activeIndex <= 0 ? last : currentFocusable[activeIndex - 1]).focus();
    } else {
      (activeIndex === -1 || activeIndex === currentFocusable.length - 1
        ? first
        : currentFocusable[activeIndex + 1]
      ).focus();
    }
  };

  // Safety net — if focus ever escapes the container (e.g. portal
  // ordering routes the browser's default Tab past the modal in
  // Safari), pull it back to the first focusable inside.
  const focusinHandler = (event: FocusEvent) => {
    const target = getComposedEventTarget(event);
    if (!isHTMLElement(target) || containsComposed(container, target)) {
      return;
    }
    if (options.allowOutside != null && options.allowOutside(target)) {
      return;
    }
    const currentFocusable = getFocusableElements(container);
    if (currentFocusable.length > 0) {
      currentFocusable[0].focus();
    } else if (container.hasAttribute('tabindex')) {
      container.focus();
    }
  };

  return mergeRegister(
    // Placed first so mergeRegister's reverse (LIFO) teardown runs it last,
    // after the focusin listener is removed — otherwise restoring focus to an
    // element outside the container would re-trigger the trap.
    () => {
      if (
        previouslyFocused !== null &&
        typeof previouslyFocused.focus === 'function' &&
        containsComposed(doc, previouslyFocused)
      ) {
        previouslyFocused.focus();
      }
    },
    registerEventListener(container, 'keydown', keydownHandler),
    registerEventListener(doc, 'focusin', focusinHandler),
  );
}

export type RovingOrientation = 'horizontal' | 'vertical' | 'both';

export interface RovingTabIndexOptions {
  /**
   * Which arrow keys move focus.
   * - `horizontal` (default): ArrowLeft / ArrowRight
   * - `vertical`: ArrowUp / ArrowDown
   * - `both`: any arrow key
   */
  orientation?: RovingOrientation;
  /**
   * Selector for the group's roving items. The default matches direct-child
   * non-disabled buttons. Pass a custom selector to include other focusables
   * or to scope to a marker attribute (e.g. `[data-roving-item]`).
   */
  itemSelector?: string;
}

const DEFAULT_ROVING_SELECTOR = ':scope > button:not([disabled])';

/**
 * Implements the WAI-ARIA roving-tabindex pattern on `container`. One
 * item carries `tabindex="0"` at a time; the rest are `-1`. Arrow keys
 * move focus inside the group; Home / End jump to the ends. Tab leaves
 * the group as a unit, matching the toolbar / menubar pattern.
 *
 * Items are queried lazily on every interaction so additions or
 * removals during the lifetime of the group are picked up without
 * extra wiring.
 */
function registerRovingTabIndex(
  container: HTMLElement,
  options: RovingTabIndexOptions = {},
): () => void {
  const orientation = options.orientation ?? 'horizontal';
  const selector = options.itemSelector ?? DEFAULT_ROVING_SELECTOR;

  const getItems = (): HTMLElement[] =>
    Array.from(container.querySelectorAll<HTMLElement>(selector));

  const applyTabIndex = (items: HTMLElement[], activeIndex: number): void => {
    items.forEach((item, i) => {
      item.tabIndex = i === activeIndex ? 0 : -1;
    });
  };

  const init = (): void => {
    const items = getItems();
    if (items.length === 0) {
      return;
    }
    const active = getActiveElementDeep(container.ownerDocument);
    const activeIdx = items.findIndex(el => el === active);
    applyTabIndex(items, activeIdx >= 0 ? activeIdx : 0);
  };

  init();

  const handler = (event: KeyboardEvent): void => {
    const items = getItems();
    if (items.length === 0) {
      return;
    }
    const active = getActiveElementDeep(container.ownerDocument);
    const currentIdx = items.findIndex(el => el === active);
    if (currentIdx < 0) {
      // Firefox can focus the container itself (e.g. role="toolbar") rather
      // than a child item. Treat any arrow/Home/End as "enter the group at
      // the first item" so the user isn't stuck.
      if (
        event.key === 'ArrowRight' ||
        event.key === 'ArrowDown' ||
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowUp' ||
        event.key === 'Home' ||
        event.key === 'End'
      ) {
        event.preventDefault();
        applyTabIndex(items, 0);
        items[0].focus();
      }
      return;
    }

    const horizontal = orientation === 'horizontal' || orientation === 'both';
    const vertical = orientation === 'vertical' || orientation === 'both';
    let nextIdx = currentIdx;
    switch (event.key) {
      case 'ArrowRight':
        if (!horizontal) {
          return;
        }
        nextIdx = currentIdx + 1;
        break;
      case 'ArrowLeft':
        if (!horizontal) {
          return;
        }
        nextIdx = currentIdx - 1;
        break;
      case 'ArrowDown':
        if (!vertical) {
          return;
        }
        nextIdx = currentIdx + 1;
        break;
      case 'ArrowUp':
        if (!vertical) {
          return;
        }
        nextIdx = currentIdx - 1;
        break;
      case 'Home':
        nextIdx = 0;
        break;
      case 'End':
        nextIdx = items.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    // Single wrap for every case: the only out-of-range value is -1 (left/up
    // from the first item), and `currentIdx >= 0` keeps `nextIdx >= -1`, so one
    // `+ length` is enough to normalize.
    nextIdx = (nextIdx + items.length) % items.length;
    applyTabIndex(items, nextIdx);
    items[nextIdx].focus();
  };

  return mergeRegister(
    registerEventListener(container, 'keydown', handler),
    () => {
      const items = getItems();
      items.forEach(item => {
        item.tabIndex = 0;
      });
    },
  );
}

const DEFAULT_TOOLBAR_FOCUSABLE_SELECTOR =
  ':scope > button:not([disabled]), :scope > [tabindex="0"]';

export interface FocusManagerOptions {
  /**
   * Selector used to find the toolbar's first focusable item when
   * activating via the shortcut. Defaults to non-disabled direct-child
   * buttons (the same scope used by `registerRovingTabIndex`), so the
   * active roving item naturally receives focus.
   */
  toolbarItemSelector?: string;
}

/**
 * Implements the editor-to-toolbar focus jump recommended by the
 * WAI-ARIA APG editor menubar pattern: Alt+F10 inside the editor moves
 * focus to the first focusable in `toolbar`, and Escape inside the
 * toolbar returns focus to the editor.
 *
 * Wires the navigation only. Selection restoration relies on the
 * editor's own focus handling; the editor's last selection is preserved
 * across the jump so toolbar commands act on the same range.
 */
function registerFocusManager(
  editor: LexicalEditor,
  toolbar: HTMLElement,
  options: FocusManagerOptions = {},
): () => void {
  const selector =
    options.toolbarItemSelector ?? DEFAULT_TOOLBAR_FOCUSABLE_SELECTOR;

  const handler = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') {
      return;
    }
    const target = getComposedEventTarget(event);
    if (isHTMLElement(target)) {
      const items = toolbar.querySelectorAll<HTMLElement>(selector);
      let isRovingItem = false;
      for (const item of items) {
        if (item === target || containsComposed(item, target)) {
          isRovingItem = true;
          break;
        }
      }
      if (!isRovingItem) {
        return;
      }
    }
    const rootElement = editor.getRootElement();
    if (rootElement === null) {
      return;
    }
    event.preventDefault();
    // Keep Escape inside the toolbar — don't let it bubble to any
    // window-level Modal close handler.
    event.stopPropagation();
    // `editor.focus()` restores the prior selection so commands resume
    // where the cursor was before the jump; the `rootElement.focus()`
    // fallback covers test environments where `editor.focus()` does not
    // also move DOM focus.
    editor.focus();
    rootElement.focus();
  };
  return mergeRegister(
    editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (!event.altKey || event.key !== 'F10') {
          return false;
        }
        const firstItem =
          toolbar.querySelector<HTMLElement>('[tabindex="0"]') ??
          toolbar.querySelector<HTMLElement>(selector);
        if (firstItem === null) {
          return false;
        }
        event.preventDefault();
        firstItem.focus();
        return true;
      },
      COMMAND_PRIORITY_LOW,
    ),
    registerEventListener(toolbar, 'keydown', handler),
  );
}

export interface AriaLiveRegionExtensionConfig {
  /** {@link AriaPoliteness} for the mounted region. */
  politeness: AriaPoliteness;
  /**
   * Owner element to append the live region to. `null` falls back to
   * `document.body`; an explicit element keeps the region in the same
   * accessibility subtree as the editor (shadow root or portaled overlay).
   */
  owner: HTMLElement | null;
}

/**
 * Public output of {@link AriaLiveRegionExtension}. The `politeness` and
 * `owner` config values are exposed as runtime-tunable signals — setting
 * `politeness` updates the mounted region's `aria-live`, setting `owner`
 * re-mounts the region — alongside a stable `announce` sink that is valid for
 * the editor's lifetime (callers never see the region element or its disposal).
 */
export type AriaLiveRegion =
  NamedSignalsOutput<AriaLiveRegionExtensionConfig> & {
    /**
     * Write a message into the editor's live region. Announcing the same
     * string back-to-back appends a zero-width space so screen readers
     * register the change and re-announce. A no-op until a region is mounted
     * (the editor has a root element, or an `owner` is configured).
     */
    announce: (message: string) => void;
  };

/**
 * Platform-independent extension that owns a single `aria-live` region for
 * the editor and exposes a stable {@link AriaLiveRegion} sink as its output.
 * Other a11y extensions (`HistoryAnnounceExtension`,
 * `EditorModeAnnounceExtension`) depend on it and announce through
 * `output.announce`.
 *
 * The sink writes to a private `message` signal created in `init`. The
 * `politeness` / `owner` config are exposed as signals (via `namedSignals`).
 * `register` tracks the editor's root element reactively and runs three
 * effects: one creates / disposes the region element as the root document (or
 * `owner`) changes, one applies the current `politeness` to the mounted region,
 * and one mirrors the current message into it. Buffering through signals
 * decouples the stable `announce` (from `build`) from the region element —
 * which comes and goes with the root — and creates the region in the editor's
 * own document (e.g. an iframe-portaled editor) rather than the top-level
 * `document`.
 */
export const AriaLiveRegionExtension = defineExtension({
  build(_editor, config, state): AriaLiveRegion {
    const message = state.getInitResult();
    return {
      ...namedSignals(config),
      announce(text) {
        // Toggle a trailing zero-width space on repeats so re-announcing the
        // same text still registers as a textContent change downstream.
        message.value = text === message.peek() ? text + '\u200B' : text;
      },
    };
  },
  config: safeCast<AriaLiveRegionExtensionConfig>({
    owner: null,
    politeness: 'polite',
  }),
  dependencies: [RootElementExtension],
  // Private reactive message buffer shared by `build` (writer) and `register`
  // (renderer); see the extension doc comment.
  init: () => signal<string>(''),
  name: '@lexical/a11y/AriaLiveRegion',
  register(_editor, _config, state) {
    const message = state.getInitResult();
    const {owner, politeness} = state.getOutput();
    const rootElement = state.getDependency(RootElementExtension).output;
    const region = signal<HTMLElement | null>(null);
    return mergeRegister(
      // Create / dispose the region as the root document (or `owner`) changes.
      // Subscribe to the root only when no explicit `owner` is configured, so a
      // fixed-owner region isn't torn down and rebuilt on unrelated root churn.
      effect(() => {
        const ownerEl = owner.value;
        const root = ownerEl ? null : rootElement.value;
        const host = ownerEl ?? (root ? root.ownerDocument.body : null);
        if (!host) {
          return undefined;
        }
        const el = createLiveRegion(host);
        region.value = el;
        return () => {
          el.remove();
          region.value = null;
        };
      }),
      // Apply the (runtime-tunable) politeness to whatever region is mounted.
      // This tracks `region` so it re-applies the attribute to a re-created
      // region (an attribute, not an announcement).
      effect(() => {
        const el = region.value;
        if (el) {
          el.setAttribute('aria-live', politeness.value);
        }
      }),
      // Mirror the current message into whatever region is mounted. Always read
      // `message.value` (to stay subscribed) but read the region with peek() so
      // this re-runs only when the message changes, not when the region is
      // (re)created: replaying the buffered message into a freshly mounted
      // region would make the screen reader re-announce it on every editor
      // remount with no user action.
      effect(() => {
        const text = message.value;
        const el = region.peek();
        if (el) {
          el.textContent = text;
        }
      }),
    );
  },
});

export interface HistoryAnnounceExtensionConfig {
  /** Message announced after an undo. */
  undone: string;
  /** Message announced after a redo. */
  redone: string;
  /** Words used after "Undone" or "Redone" to say what changed. */
  added: string;
  changed: string;
  removed: string;
  restored: string;
  /** When `true` (the default), the announcement says what the undo or redo
   * changed, for example "Undone, restored a table and 2 lists". When `false`,
   * only `undone` / `redone` are announced, immediately. */
  detail: boolean;
  /** When `true`, undo / redo are not announced. Toggle at runtime via the
   * output signal. Default `false`. */
  disabled: boolean;
}

interface BlockInfo {
  /** For each text format in use, the text that carries it. */
  formats: Record<string, string>;
  key: string;
  text: string;
  type: string;
}

// The text format bits, in the order they are spoken. These are the values
// `TextNode` uses for its format flags.
const TEXT_FORMATS: readonly (readonly [number, string])[] = [
  [1, 'bold'],
  [2, 'italic'],
  [8, 'underline'],
  [4, 'strikethrough'],
  [16, 'code'],
  [128, 'highlight'],
  [32, 'subscript'],
  [64, 'superscript'],
];
const MAX_FORMATS_SPOKEN = 2;

// Block kinds in the order they are spoken: the ones worth hearing about
// first, plain paragraphs last.
const BLOCK_NAMES: readonly (readonly [string, string, string])[] = [
  ['table', 'table', 'tables'],
  ['list', 'list', 'lists'],
  ['image', 'image', 'images'],
  ['code', 'code block', 'code blocks'],
  ['quote', 'block quote', 'block quotes'],
  ['heading', 'heading', 'headings'],
  ['horizontalrule', 'horizontal rule', 'horizontal rules'],
  ['paragraph', 'paragraph', 'paragraphs'],
];
const MAX_KINDS_SPOKEN = 5;
const MAX_WORDS_SPOKEN = 6;
const MAX_WORDS_FOR_SMALL_CHANGE = 8;

function $collectFormats(
  node: LexicalNode,
  formats: Record<string, string>,
): void {
  if ($isTextNode(node)) {
    for (const [bit, name] of TEXT_FORMATS) {
      if (node.getFormat() & bit) {
        formats[name] = (formats[name] || '') + node.getTextContent();
      }
    }
  } else if ($isElementNode(node)) {
    for (const child of node.getChildren()) {
      $collectFormats(child, formats);
    }
  }
}

function $readBlocks(): BlockInfo[] {
  return $getRoot()
    .getChildren()
    .map(node => {
      const formats: Record<string, string> = {};
      $collectFormats(node, formats);
      return {
        formats,
        key: node.getKey(),
        text: node.getTextContent(),
        type: node.getType(),
      };
    });
}

function wordsOf(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function readWords(text: string): string {
  const words = wordsOf(text);
  return words.length > MAX_WORDS_SPOKEN
    ? `${words.slice(0, MAX_WORDS_SPOKEN).join(' ')} and more`
    : words.join(' ');
}

function countPhrase(count: number, singular: string, plural: string): string {
  if (count > 1) {
    return `${count} ${plural}`;
  }
  return `${/^[aeiou]/.test(singular) ? 'an' : 'a'} ${singular}`;
}

function summarizeBlocks(blocks: BlockInfo[]): string {
  const counts = new Map<string, number>();
  for (const {type} of blocks) {
    counts.set(type, (counts.get(type) || 0) + 1);
  }
  const phrases: string[] = [];
  let other = 0;
  for (const [type, count] of counts) {
    if (!BLOCK_NAMES.some(([known]) => known === type)) {
      other += count;
    }
  }
  for (const [type, singular, plural] of BLOCK_NAMES) {
    const count = counts.get(type);
    if (count) {
      phrases.push(countPhrase(count, singular, plural));
    }
  }
  if (other) {
    phrases.push(countPhrase(other, 'block', 'blocks'));
  }
  const spoken = phrases.slice(0, MAX_KINDS_SPOKEN);
  if (phrases.length > MAX_KINDS_SPOKEN) {
    spoken.push('more');
  }
  return spoken.length > 1
    ? `${spoken.slice(0, -1).join(', ')} and ${spoken[spoken.length - 1]}`
    : spoken[0];
}

// What was typed or removed inside a block: the text between the shared start
// and the shared end of the old and new text.
function changedText(
  before: string,
  after: string,
): {added: string; removed: string} {
  let start = 0;
  while (
    start < before.length &&
    start < after.length &&
    before[start] === after[start]
  ) {
    start++;
  }
  let end = 0;
  while (
    end < before.length - start &&
    end < after.length - start &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  ) {
    end++;
  }
  return {
    added: after.slice(start, after.length - end),
    removed: before.slice(start, before.length - end),
  };
}

/** Says what an undo or redo did to the document, or `null` when it cannot
 * be put into words (a formatting-only change, for instance). */
function describeChange(
  before: BlockInfo[],
  after: BlockInfo[],
  wasUndo: boolean,
  words: {added: string; changed: string; removed: string; restored: string},
): string | null {
  const beforeByKey = new Map(before.map(block => [block.key, block]));
  const afterByKey = new Map(after.map(block => [block.key, block]));
  // An editor never lets the document go empty, so deleting everything leaves
  // one blank paragraph. Blank paragraphs are not worth saying.
  const isWorthSaying = (block: BlockInfo) =>
    block.type !== 'paragraph' || block.text.trim() !== '';
  const gone = before.filter(
    block => !afterByKey.has(block.key) && isWorthSaying(block),
  );
  const appeared = after.filter(
    block => !beforeByKey.has(block.key) && isWorthSaying(block),
  );
  const appearVerb = wasUndo ? words.restored : words.added;

  if (gone.length || appeared.length) {
    const verb =
      appeared.length && gone.length
        ? words.changed
        : appeared.length
          ? appearVerb
          : words.removed;
    const blocks = [...gone, ...appeared];
    if (blocks.length === 1 && /^(paragraph|heading)$/.test(blocks[0].type)) {
      const spoken = wordsOf(blocks[0].text);
      if (spoken.length > 0 && spoken.length <= MAX_WORDS_FOR_SMALL_CHANGE) {
        return `${verb} ${spoken.join(' ')}`;
      }
    }
    return `${verb} ${summarizeBlocks(blocks)}`;
  }

  let added = '';
  let removed = '';
  for (const block of after) {
    const old = beforeByKey.get(block.key);
    if (old && old.text !== block.text) {
      const change = changedText(old.text, block.text);
      added += ` ${change.added}`;
      removed += ` ${change.removed}`;
    }
  }
  const addedWords = readWords(added);
  const removedWords = readWords(removed);
  if (addedWords && removedWords) {
    return `${words.changed} ${addedWords}`;
  }
  if (addedWords) {
    return `${appearVerb} ${addedWords}`;
  }
  if (removedWords) {
    return `${words.removed} ${removedWords}`;
  }
  return describeFormatChange(before, after, appearVerb, words.removed);
}

// A format that now covers more text was added (or, after an undo, restored);
// one that covers less was removed. The text it moved onto is read back.
function describeFormatChange(
  before: BlockInfo[],
  after: BlockInfo[],
  appearVerb: string,
  removedVerb: string,
): string | null {
  const beforeByKey = new Map(before.map(block => [block.key, block]));
  const gained = new Map<string, string>();
  const lost = new Map<string, string>();
  for (const block of after) {
    const old = beforeByKey.get(block.key);
    if (!old) {
      continue;
    }
    for (const [, name] of TEXT_FORMATS) {
      const was = old.formats[name] || '';
      const now = block.formats[name] || '';
      if (was === now) {
        continue;
      }
      const change = changedText(was, now);
      if (now.length > was.length) {
        gained.set(name, `${gained.get(name) || ''} ${change.added}`);
      } else {
        lost.set(name, `${lost.get(name) || ''} ${change.removed}`);
      }
    }
  }
  const clauses: string[] = [];
  const clause = (
    names: Map<string, string>,
    verb: string,
    preposition: string,
  ) => {
    if (names.size === 0) {
      return;
    }
    const spoken = [...names.keys()];
    const shown = spoken.slice(0, MAX_FORMATS_SPOKEN);
    const label =
      shown.length > 1
        ? `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`
        : shown[0];
    const where = readWords(
      [...new Set([...names.values()].map(text => text.trim()))].join(' '),
    );
    clauses.push(
      `${verb} ${label}${spoken.length > shown.length ? ' and more' : ''}${
        where ? ` ${preposition} ${where}` : ''
      }`,
    );
  };
  clause(lost, removedVerb, 'from');
  clause(gained, appearVerb, 'to');
  return clauses.length ? clauses.join(', ') : null;
}

/**
 * Platform-independent extension that announces undo / redo through the
 * `AriaLiveRegionExtension`'s shared sink, and says what changed.
 */
export const HistoryAnnounceExtension = defineExtension({
  build: (_editor, config) => namedSignals(config),
  config: safeCast<HistoryAnnounceExtensionConfig>({
    added: 'added',
    changed: 'changed',
    detail: true,
    disabled: false,
    redone: 'Redone',
    removed: 'removed',
    restored: 'restored',
    undone: 'Undone',
  }),
  dependencies: [AriaLiveRegionExtension],
  name: '@lexical/a11y/HistoryAnnounce',
  register(editor, _config, state) {
    const output = state.getOutput();
    const {announce} = state.getDependency(AriaLiveRegionExtension).output;
    // Gate registration on `disabled` from an effect so a disabled announcer
    // adds no command overhead at all. Peek the message signals at dispatch
    // time so changing them doesn't re-register. Both command handlers return
    // false to keep the history command chain intact.
    return effect(() => {
      if (output.disabled.value) {
        return undefined;
      }
      let pending: 'undo' | 'redo' | null = null;
      let fallback: ReturnType<typeof setTimeout> | undefined;
      const plain = (kind: 'undo' | 'redo') =>
        kind === 'undo' ? output.undone.peek() : output.redone.peek();
      const begin = (kind: 'undo' | 'redo') => {
        if (!output.detail.peek()) {
          announce(plain(kind));
          return false;
        }
        // The history extension handles the command after this handler runs.
        // Wait for the update it makes, and fall back to the plain message
        // when nothing changes (an empty history).
        pending = kind;
        clearTimeout(fallback);
        fallback = setTimeout(() => {
          if (pending) {
            announce(plain(pending));
            pending = null;
          }
        }, 0);
        return false;
      };
      return mergeRegister(
        editor.registerCommand(
          UNDO_COMMAND,
          () => begin('undo'),
          COMMAND_PRIORITY_LOW,
        ),
        editor.registerCommand(
          REDO_COMMAND,
          () => begin('redo'),
          COMMAND_PRIORITY_LOW,
        ),
        editor.registerUpdateListener(
          ({editorState, prevEditorState, tags}) => {
            if (!pending || !tags.has(HISTORIC_TAG)) {
              return;
            }
            const kind = pending;
            const change = describeChange(
              prevEditorState.read($readBlocks),
              editorState.read($readBlocks),
              kind === 'undo',
              {
                added: output.added.peek(),
                changed: output.changed.peek(),
                removed: output.removed.peek(),
                restored: output.restored.peek(),
              },
            );
            // An undo can make more than one update, and the first may change
            // nothing. Keep waiting for one that does; the timer speaks the
            // plain message if none comes.
            if (change === null) {
              return;
            }
            pending = null;
            clearTimeout(fallback);
            announce(`${plain(kind)}, ${change}`);
          },
        ),
        () => clearTimeout(fallback),
      );
    });
  },
});

export interface EditorModeAnnounceExtensionConfig {
  /** Message announced when the editor becomes editable. */
  editable: string;
  /** Message announced when the editor becomes read-only. */
  readOnly: string;
  /** When `true`, editable / read-only transitions are not announced. Toggle
   * at runtime via the output signal. Default `false`. Announcements are
   * transition-based (like the initial mount, which is silent), so toggling
   * `disabled` back to `false` while the editor is already read-only does not
   * re-announce the current mode — the next `setEditable` transition does. */
  disabled: boolean;
}

/**
 * Platform-independent extension that announces
 * `editor.setEditable(true|false)` transitions through the
 * `AriaLiveRegionExtension`'s shared sink.
 */
export const EditorModeAnnounceExtension = defineExtension({
  build: (_editor, config) => namedSignals(config),
  config: safeCast<EditorModeAnnounceExtensionConfig>({
    disabled: false,
    editable: 'Editor is editable',
    readOnly: 'Editor is read-only',
  }),
  dependencies: [AriaLiveRegionExtension],
  name: '@lexical/a11y/EditorModeAnnounce',
  register(editor, _config, state) {
    const {disabled, editable, readOnly} = state.getOutput();
    const {announce} = state.getDependency(AriaLiveRegionExtension).output;
    // Gate registration on `disabled` from an effect so a disabled announcer
    // adds no listener overhead. Peek the message signals at dispatch time so
    // changing them doesn't re-register.
    return effect(() =>
      disabled.value
        ? undefined
        : editor.registerEditableListener(isEditable => {
            announce(isEditable ? editable.peek() : readOnly.peek());
          }),
    );
  },
});

/**
 * The public output of the focus-trap, roving-tabindex and focus-manager
 * extensions: register a container (reference counted) and get back an
 * idempotent disposer. Callers register through this method instead of a
 * mutable map and never see the container bookkeeping. It is the core
 * {@link RefCountedRegistry} keyed by `HTMLElement`.
 *
 * Each extension creates the registry in `build` (where the editor is
 * available for the per-container activation) and disposes it on `register`
 * teardown via {@link RefCountedRegistry.dispose}.
 */
export type ContainerRegistry<Options> = RefCountedRegistry<
  HTMLElement,
  Options
>;

/**
 * Platform-independent extension that traps Tab / Shift+Tab focus inside one
 * or more containers. Register a container through the extension output
 * ({@link ContainerRegistry.register}); the React adapter is
 * `useLexicalFocusTrapRef` from `@lexical/react`.
 */
export const FocusTrapExtension = defineExtension({
  build: (): ContainerRegistry<FocusTrapOptions> =>
    createRefCountedRegistry(registerFocusTrap),
  name: '@lexical/a11y/FocusTrap',
  register: (_editor, _config, state) => () => state.getOutput().dispose(),
});

/**
 * Platform-independent extension that wires the WAI-ARIA roving-tabindex
 * pattern on one or more containers. Register a container through the
 * extension output ({@link ContainerRegistry.register}); the React adapter is
 * `useLexicalRovingTabIndexRef` from `@lexical/react`.
 */
export const RovingTabIndexExtension = defineExtension({
  build: (): ContainerRegistry<RovingTabIndexOptions> =>
    createRefCountedRegistry(registerRovingTabIndex),
  name: '@lexical/a11y/RovingTabIndex',
  register: (_editor, _config, state) => () => state.getOutput().dispose(),
});

/**
 * Platform-independent extension that wires the editor-to-toolbar focus jump
 * (Alt+F10 / Escape return) on one or more toolbars. Register a toolbar
 * through the extension output ({@link ContainerRegistry.register}); the React
 * adapter is `useLexicalFocusManagerRef` from `@lexical/react`.
 */
export const FocusManagerExtension = defineExtension({
  build: (editor): ContainerRegistry<FocusManagerOptions> =>
    createRefCountedRegistry<HTMLElement, FocusManagerOptions>(
      (toolbar, options) => registerFocusManager(editor, toolbar, options),
    ),
  name: '@lexical/a11y/FocusManager',
  register: (_editor, _config, state) => () => state.getOutput().dispose(),
});
