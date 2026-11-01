/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import {
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  TextNode,
} from 'lexical';
import * as React from 'react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import * as ReactDOM from 'react-dom';

import builtInEmojiList from './emoji-list';

export class EmojiOption extends MenuOption {
  title: string;
  emoji: string;
  keywords: Array<string>;

  constructor(
    title: string,
    emoji: string,
    options: {
      keywords?: Array<string>;
    },
  ) {
    super(title);
    this.title = title;
    this.emoji = emoji;
    this.keywords = options.keywords || [];
  }
}

export interface EmojiMenuItemProps {
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  option: EmojiOption;
}

/**
 * Default emoji menu item component.
 * Can be customized by providing your own menuRenderFn to EmojiPickerPlugin.
 */
export function EmojiMenuItem({
  index,
  isSelected,
  onClick,
  onMouseEnter,
  option,
}: EmojiMenuItemProps): JSX.Element {
  let className = 'item';
  if (isSelected) {
    className += ' selected';
  }
  return (
    <li
      key={option.key}
      tabIndex={-1}
      className={className}
      ref={option.setRefElement}
      role="option"
      aria-selected={isSelected}
      id={'typeahead-item-' + index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}>
      <span className="text">
        {option.emoji} {option.title}
      </span>
    </li>
  );
}

export type Emoji = {
  emoji: string;
  description: string;
  category: string;
  aliases: Array<string>;
  tags: Array<string>;
  unicode_version: string;
  ios_version: string;
  skin_tones?: boolean;
};

const MAX_EMOJI_SUGGESTION_COUNT = 10;

/**
 * Custom trigger function that requires exactly "::" (two consecutive colons).
 * This avoids triggering on patterns like "list:" followed by ":" on another line.
 */
export function useDoubleColonTriggerMatch() {
  return useCallback((text: string) => {
    // Look for :: followed by valid identifier characters at the end
    const match = /(?:^|\s|[([{])(::[a-zA-Z0-9_-]*)$/.exec(text);
    if (match !== null) {
      const fullMatch = match[1]; // e.g., "::smile" or "::"
      const queryString = fullMatch.slice(2); // remove the "::" prefix
      return {
        leadOffset: match.index + (match[0].length - fullMatch.length),
        matchingString: queryString,
        replaceableString: fullMatch,
      };
    }
    return null;
  }, []);
}

export interface EmojiPickerPluginProps {
  /**
   * Emoji data array. Defaults to built-in list of 100 common emojis.
   * Each emoji should have: emoji, description, category, aliases, tags.
   *
   * For the full list (~1800 emojis), copy from playground:
   * lexical-playground/src/utils/emoji-list.ts
   *
   * @example
   * ```tsx
   * // Use built-in list (default - 100 common emojis)
   * <EmojiPickerPlugin />
   *
   * // Use full list from playground (copy file first)
   * import fullEmojiList from './emoji-list';
   * <EmojiPickerPlugin emojiData={fullEmojiList} />
   * ```
   */
  emojiData?: Array<Emoji>;
  /**
   * Dynamic import function for emoji data (for code splitting).
   * Takes precedence over emojiData if provided.
   *
   * @example
   * ```tsx
   * <EmojiPickerPlugin
   *   emojiDataLoader={() => import('./emoji-list')}
   * />
   * ```
   */
  emojiDataLoader?: () => Promise<{default: Array<Emoji>}>;
  /**
   * Maximum number of suggestions to show.
   * Default: 10
   */
  maxSuggestions?: number;
}

/**
 * Emoji picker plugin with typeahead search.
 *
 * Triggered by typing "::" followed by a search term (e.g., "::smile").
 *
 * By default, uses a built-in list of 100 common emojis. For the full list
 * (~1800 emojis), copy from: lexical-playground/src/utils/emoji-list.ts
 *
 * @example
 * ```tsx
 * // Use built-in list (100 common emojis)
 * <EmojiPickerPlugin />
 *
 * // Use custom/full emoji data
 * import fullEmojiList from './emoji-list';
 * <EmojiPickerPlugin emojiData={fullEmojiList} />
 *
 * // Use dynamic import (code splitting)
 * <EmojiPickerPlugin
 *   emojiDataLoader={() => import('./emoji-list')}
 * />
 * ```
 */
export function EmojiPickerPlugin({
  emojiData,
  emojiDataLoader,
  maxSuggestions = MAX_EMOJI_SUGGESTION_COUNT,
}: EmojiPickerPluginProps = {}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);
  const [emojis, setEmojis] = useState<Array<Emoji>>(
    // Use built-in list as initial state if no loader/data provided
    !emojiDataLoader && !emojiData ? builtInEmojiList : [],
  );

  useEffect(() => {
    if (emojiDataLoader) {
      emojiDataLoader().then((file) => setEmojis(file.default));
    } else if (emojiData) {
      setEmojis(emojiData);
    }
    // If neither is provided, we use the built-in list (set in initial state)
  }, [emojiData, emojiDataLoader]);

  const emojiOptions = useMemo(
    () =>
      emojis != null
        ? emojis.map(
            ({emoji, aliases, tags}) =>
              new EmojiOption(aliases[0], emoji, {
                keywords: [...aliases, ...tags],
              }),
          )
        : [],
    [emojis],
  );

  const checkForTriggerMatch = useDoubleColonTriggerMatch();

  const options: Array<EmojiOption> = useMemo(() => {
    return emojiOptions
      .filter((option: EmojiOption) => {
        return queryString != null
          ? new RegExp(queryString, 'gi').exec(option.title) ||
            option.keywords != null
            ? option.keywords.some((keyword: string) =>
                new RegExp(queryString, 'gi').exec(keyword),
              )
            : false
          : emojiOptions;
      })
      .slice(0, maxSuggestions);
  }, [emojiOptions, queryString, maxSuggestions]);

  const onSelectOption = useCallback(
    (
      selectedOption: EmojiOption,
      nodeToRemove: TextNode | null,
      closeMenu: () => void,
    ) => {
      editor.update(() => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection) || selectedOption == null) {
          return;
        }

        if (nodeToRemove) {
          nodeToRemove.remove();
        }

        selection.insertNodes([$createTextNode(selectedOption.emoji)]);

        closeMenu();
      });
    },
    [editor],
  );

  return (
    <LexicalTypeaheadMenuPlugin
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForTriggerMatch}
      options={options}
      menuAriaLabel="Emoji"
      menuRenderFn={(
        anchorElementRef,
        {selectedIndex, selectOptionAndCleanUp, setHighlightedIndex},
      ) => {
        if (anchorElementRef.current == null || options.length === 0) {
          return null;
        }

        return anchorElementRef.current && options.length
          ? ReactDOM.createPortal(
              <div className="typeahead-popover emoji-menu">
                <ul>
                  {options.map((option: EmojiOption, index) => (
                    <EmojiMenuItem
                      key={option.key}
                      index={index}
                      isSelected={selectedIndex === index}
                      onClick={() => {
                        setHighlightedIndex(index);
                        selectOptionAndCleanUp(option);
                      }}
                      onMouseEnter={() => {
                        setHighlightedIndex(index);
                      }}
                      option={option}
                    />
                  ))}
                </ul>
              </div>,
              anchorElementRef.current,
            )
          : null;
      }}
    />
  );
}
