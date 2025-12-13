/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Verbosity} from './nodeConfigTypes';

/**
 * Map of emoji characters to their accessible names.
 * Uses Unicode CLDR short names where available.
 */
const emojiNames: Map<string, string> = new Map([
  // Basic emoticons (from EmojisPlugin)
  ['🙂', 'slightly smiling face'],
  ['😀', 'grinning face'],
  ['🙁', 'slightly frowning face'],
  ['❤', 'red heart'],
  ['😉', 'winking face'],
  // Arrows
  ['➡️', 'right arrow'],
  ['⬅️', 'left arrow'],
  // Common additions
  ['😊', 'smiling face with smiling eyes'],
  ['😂', 'face with tears of joy'],
  ['😍', 'smiling face with heart-eyes'],
  ['😢', 'crying face'],
  ['😎', 'smiling face with sunglasses'],
  ['👍', 'thumbs up'],
  ['👎', 'thumbs down'],
  ['🎉', 'party popper'],
  ['🔥', 'fire'],
  ['💯', 'hundred points'],
]);

/**
 * Get the accessible name for an emoji.
 * Falls back to the emoji itself if no name is found.
 */
export function getEmojiName(emoji: string): string {
  return emojiNames.get(emoji) || emoji;
}

/**
 * Add or update an emoji name mapping.
 * Useful for extending the default set.
 */
export function registerEmojiName(emoji: string, name: string): void {
  emojiNames.set(emoji, name);
}

/**
 * Generate announcement when an emoji is created (e.g., :) converted to 🙂)
 */
export function generateEmojiCreationAnnouncement(
  emoji: string,
  verbosity: Verbosity,
): string {
  const name = getEmojiName(emoji);

  switch (verbosity) {
    case 'minimal':
      return name;
    case 'standard':
      return name;
    case 'verbose':
      return `Converted to ${name} emoji`;
    default:
      return name;
  }
}

/**
 * Generate announcement when an emoji is deleted.
 * Just announces the emoji name (no "removed") since this only fires
 * for DELETE key, and the screen reader doesn't announce forward deletes.
 */
export function generateEmojiDeletionAnnouncement(
  emoji: string,
  verbosity: Verbosity,
): string {
  const name = getEmojiName(emoji);

  // Just return the emoji name - no "removed" suffix
  // This matches how screen readers announce backspace deletions
  switch (verbosity) {
    case 'minimal':
      return name;
    case 'standard':
      return name;
    case 'verbose':
      return name;
    default:
      return name;
  }
}
