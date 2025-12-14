/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Main plugin export
export {AccessibilityPlugin} from './LexicalAccessibilityPlugin';

// Accessible text node (CSS-based formatting)
export {
  $createAccessibleTextNode,
  $isAccessibleTextNode,
  AccessibleTextNode,
} from './AccessibleTextNode';

// Types
export type {
  AccessibilityConfig,
  AccessibilityPluginProps,
  Announcement,
} from './types';
export {DEFAULT_CONFIG, SUPPRESS_A11Y_ANNOUNCEMENTS_TAG} from './types';

// Components (for advanced usage)
export {AccessibilityLiveRegion} from './AccessibilityLiveRegion';

// Hooks (for advanced usage)
export {useAnnounce} from './useAnnouncementQueue';

// Utilities (for advanced usage)
export {
  generateFormatAnnouncement,
  generateHeadingAnnouncement,
  generateIndentAnnouncement,
  generateListAnnouncement,
  mergeFormatAnnouncements,
} from './announcementGenerator';

// Node configs (for extensibility)
export {headingConfig} from './headingConfig';
export {horizontalRuleConfig} from './horizontalRuleConfig';
export {listItemConfig} from './listItemConfig';
export type {
  AnnouncementContext,
  NodeAnnouncementConfig,
  NodeMetadata,
  Verbosity,
} from './nodeConfigTypes';
export {quoteConfig} from './quoteConfig';
export {nodeConfigs, useNodeRegistry} from './useNodeRegistry';

// Emoji Node and Plugins
export type {SerializedEmojiNode} from './EmojiNode';
export {$createEmojiNode, $isEmojiNode, EmojiNode} from './EmojiNode';
export {
  type Emoji,
  EmojiMenuItem,
  type EmojiMenuItemProps,
  EmojiOption,
  EmojiPickerPlugin,
  type EmojiPickerPluginProps,
  useDoubleColonTriggerMatch,
} from './EmojiPickerPlugin';
export {
  DEFAULT_EMOJI_PATTERNS,
  EmojisPlugin,
  type EmojisPluginProps,
} from './EmojisPlugin';
// Built-in emoji list (top 100 common emojis)
// For full list (~1800), copy from: lexical-playground/src/utils/emoji-list.ts
export {default as emojiList} from './emoji-list';

// Emoji accessibility announcements
export {
  generateEmojiCreationAnnouncement,
  generateEmojiDeletionAnnouncement,
  getEmojiName,
  registerEmojiName,
} from './emojiAnnouncementGenerator';
export type {EmojiMetadata, EmojiNodeLike} from './emojiConfig';
export {createEmojiConfig} from './emojiConfig';

// Markdown utilities
export type {InsertMarkdownOptions} from './markdownUtils';
export {
  $insertMarkdownAtSelection,
  $replaceWithMarkdown,
} from './markdownUtils';

// Transformers
export {ACCESSIBILITY_TRANSFORMERS, HR} from './transformers';

// AutoLink plugin and utilities
export {
  AccessibilityAutoLinkPlugin,
  type AccessibilityAutoLinkPluginProps,
  DEFAULT_LINK_MATCHERS,
  type LinkMatcher,
  type LinkMatcherResult,
} from './AccessibilityAutoLinkPlugin';

// Re-export link nodes from @lexical/link for convenience
export {
  $createAutoLinkNode,
  $createLinkNode,
  $isAutoLinkNode,
  $isLinkNode,
  AutoLinkNode,
  LinkNode,
} from '@lexical/link';
