/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Module-level state for tracking pending keyboard operations.
 *
 * This replaces setTimeout-based flag clearing with proper event-driven
 * synchronization. The pattern is:
 *
 * 1. Command handler sets the pending operation type
 * 2. Update listener fires AFTER Lexical processes the operation
 * 3. Update listener reads and clears the pending operation
 *
 * This is module-level because React refs don't work reliably with
 * Lexical's synchronous mutation listener callbacks.
 */

export type PendingOperationType =
  | 'delete' // DELETE key (forward delete)
  | 'enter-code-block' // Enter pressed inside code block
  | 'enter-empty-list-item' // Enter on empty nested list item
  | 'indent' // Tab/indent operation
  | 'outdent' // Shift+Tab/outdent operation
  | null;

/**
 * Pending operation state with optional metadata
 */
interface PendingOperation {
  type: PendingOperationType;
  /** For enter-code-block: the line number we'll be on after Enter */
  codeBlockLineNumber?: number;
}

let __pendingOperation: PendingOperation = {type: null};

/**
 * Get the current pending operation type
 */
export function getPendingOperationType(): PendingOperationType {
  return __pendingOperation.type;
}

/**
 * Get full pending operation state including metadata
 */
export function getPendingOperation(): PendingOperation {
  return __pendingOperation;
}

/**
 * Set the pending operation (called by command handlers)
 */
export function setPendingOperation(
  type: PendingOperationType,
  metadata?: Omit<PendingOperation, 'type'>,
): void {
  __pendingOperation = {type, ...metadata};
}

/**
 * Clear the pending operation (called by update listener after processing)
 */
export function clearPendingOperation(): void {
  __pendingOperation = {type: null};
}

/**
 * Check if a DELETE key operation is pending.
 * This is a convenience function for backwards compatibility with emoji config.
 */
export function getIsDeleteKeyOperation(): boolean {
  return __pendingOperation.type === 'delete';
}
