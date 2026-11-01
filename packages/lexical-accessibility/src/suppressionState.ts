/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Module-level flag for suppressing announcements during bulk operations (like paste).
 * This is in a separate file to avoid circular imports between
 * LexicalAccessibilityPlugin.tsx and useNodeRegistry.ts.
 *
 * This is module-level because React refs and closures don't work reliably with
 * Lexical's synchronous node transform callbacks.
 */
let __isSuppressingAnnouncements = false;

export function getSuppressingAnnouncements(): boolean {
  return __isSuppressingAnnouncements;
}

export function setSuppressingAnnouncements(value: boolean): void {
  __isSuppressingAnnouncements = value;
}
