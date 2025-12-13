/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Module-level flag for tracking when DELETE key (forward delete) is pressed.
 *
 * This is needed because:
 * - Backspace: Screen reader announces the character (cursor moves to it first)
 * - DELETE: Screen reader says "blank" (no cursor movement)
 *
 * For emojis, we only want to announce on DELETE key, not on backspace
 * (to avoid double announcement from screen reader + our plugin).
 *
 * This is module-level because React refs don't work reliably with
 * Lexical's synchronous mutation listener callbacks.
 */
let __isDeleteKeyOperation = false;

export function getIsDeleteKeyOperation(): boolean {
  return __isDeleteKeyOperation;
}

export function setIsDeleteKeyOperation(value: boolean): void {
  __isDeleteKeyOperation = value;
}
