/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  NodeAnnouncementConfig,
  NodeMetadata,
  Verbosity,
} from './nodeConfigTypes';
import type {Klass, TextNode} from 'lexical';

import {getIsDeleteKeyOperation} from './deleteKeyState';
import {
  generateEmojiCreationAnnouncement,
  generateEmojiDeletionAnnouncement,
} from './emojiAnnouncementGenerator';

export interface EmojiMetadata extends NodeMetadata {
  nodeType: 'emoji';
  emoji: string;
  className: string;
}

/**
 * Interface for EmojiNode-like nodes.
 * The node must extend TextNode and have a getClassName method.
 */
export interface EmojiNodeLike extends TextNode {
  getClassName(): string;
}

/**
 * Creates an emoji announcement config for a given EmojiNode class.
 *
 * Since EmojiNode is typically defined in the application (not a core Lexical package),
 * this factory function allows you to pass your own EmojiNode class.
 *
 * @example
 * ```tsx
 * import {EmojiNode} from './nodes/EmojiNode';
 * import {createEmojiConfig} from '@lexical/accessibility';
 *
 * const emojiConfig = createEmojiConfig(EmojiNode);
 * ```
 */
export function createEmojiConfig<T extends EmojiNodeLike>(
  EmojiNodeClass: Klass<T>,
): NodeAnnouncementConfig<T> {
  // Track recently created emoji keys to avoid double announcements
  // When an emoji is created and immediately destroyed (e.g., undo),
  // we only want to announce the destruction, not both
  const recentlyCreated = new Map<string, number>();
  // Track recently destroyed emojis to prevent spurious creation announcements
  // during deletion (Lexical may fire transforms before mutation listeners)
  const recentlyDestroyed = new Map<string, number>();
  const CREATION_DEBOUNCE_MS = 100;
  const DESTRUCTION_DEBOUNCE_MS = 100;

  return {
    extractMetadata: (node: T): EmojiMetadata => {
      return {
        className: node.getClassName(),
        emoji: node.getTextContent().trim(),
        nodeType: 'emoji',
      };
    },

    nodeClass: EmojiNodeClass,

    nodeType: 'emoji',

    onCreated: (
      metadata: NodeMetadata,
      verbosity: Verbosity,
    ): string | null => {
      const emojiMeta = metadata as EmojiMetadata;
      const now = Date.now();

      // Check if this emoji was recently destroyed (within debounce window)
      // This prevents spurious creation announcements during deletion operations
      const destructionTime = recentlyDestroyed.get(emojiMeta.emoji);
      if (destructionTime && now - destructionTime < DESTRUCTION_DEBOUNCE_MS) {
        return null;
      }

      // Track creation time for this emoji (used for destruction debounce)
      recentlyCreated.set(emojiMeta.emoji, now);
      return generateEmojiCreationAnnouncement(emojiMeta.emoji, verbosity);
    },

    onDestroyed: (
      metadata: NodeMetadata,
      verbosity: Verbosity,
    ): string | null => {
      const emojiMeta = metadata as EmojiMetadata;
      const now = Date.now();

      // Track destruction time to suppress spurious creation announcements
      recentlyDestroyed.set(emojiMeta.emoji, now);
      // Clean up old entries after debounce window
      setTimeout(() => {
        recentlyDestroyed.delete(emojiMeta.emoji);
      }, DESTRUCTION_DEBOUNCE_MS + 50);

      // Check if this emoji was JUST created (within debounce window)
      // This handles undo right after creation - we don't want both announcements
      const creationTime = recentlyCreated.get(emojiMeta.emoji);
      if (creationTime && now - creationTime < CREATION_DEBOUNCE_MS) {
        recentlyCreated.delete(emojiMeta.emoji);
        return null; // Skip - undo right after creation
      }

      recentlyCreated.delete(emojiMeta.emoji);
      return generateEmojiDeletionAnnouncement(emojiMeta.emoji, verbosity);
    },

    // Only announce creation for NEW emoji nodes, not when they're transformed/updated
    shouldAnnounceCreation: (): boolean => true,

    // Only announce destruction for DELETE key (forward delete)
    // - DELETE key: screen reader says "blank", so we need to announce
    // - Backspace: screen reader announces the character (cursor moves to it first),
    //   so we stay silent to avoid double announcement
    shouldAnnounceDestruction: (): boolean => getIsDeleteKeyOperation(),
  };
}
