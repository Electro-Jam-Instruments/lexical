/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

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
import {useCallback, useEffect, useMemo, useState} from 'react';

class EmojiOption extends MenuOption {
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

type Emoji = {
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

// Custom trigger function that requires exactly "::" (two consecutive colons)
// This avoids triggering on patterns like "list:" followed by ":" on another line
function useDoubleColonTriggerMatch() {
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

export default function EmojiPickerPlugin() {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);
  const [emojis, setEmojis] = useState<Array<Emoji>>([]);

  useEffect(() => {
    import('../../utils/emoji-list').then((file) => setEmojis(file.default));
  }, []);

  const emojiOptions = useMemo(
    () =>
      emojis != null
        ? emojis.map(
            ({emoji, aliases, tags}) =>
              new EmojiOption(`${emoji} ${aliases[0]}`, emoji, {
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
      .slice(0, MAX_EMOJI_SUGGESTION_COUNT);
  }, [emojiOptions, queryString]);

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
    />
  );
}
