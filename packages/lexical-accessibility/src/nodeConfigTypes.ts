/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {AccessibilityConfig} from './types';
import type {Klass, LexicalNode} from 'lexical';

export type Verbosity = NonNullable<AccessibilityConfig['verbosity']>;

/**
 * Metadata extracted from a node for announcement purposes.
 * Each node type can store whatever details it needs.
 */
export interface NodeMetadata {
  nodeType: string;
  [key: string]: unknown;
}

/**
 * Configuration for how a specific node type should be announced.
 *
 * This pattern allows us to:
 * 1. Add new node types without modifying core plugin code
 * 2. Keep announcement logic co-located with node-specific code
 * 3. Test each node's announcements independently
 * 4. Maintain consistent behavior across all node types
 */
export interface NodeAnnouncementConfig<T extends LexicalNode = LexicalNode> {
  /**
   * The Lexical node class this config handles
   */
  nodeClass: Klass<T>;

  /**
   * Unique identifier for this node type (e.g., 'list-item', 'heading', 'image')
   */
  nodeType: string;

  /**
   * Extract metadata from a node when it's created/transformed.
   * This metadata is stored and used later for deletion announcements.
   * Return null to skip tracking this node.
   */
  extractMetadata: (node: T) => NodeMetadata | null;

  /**
   * Generate announcement when node is created/transformed.
   * Return null to skip announcement.
   */
  onCreated?: (metadata: NodeMetadata, verbosity: Verbosity) => string | null;

  /**
   * Generate announcement when node is destroyed.
   * Return null to skip announcement.
   * Context is optional for backwards compatibility.
   */
  onDestroyed?: (
    metadata: NodeMetadata,
    verbosity: Verbosity,
    context?: AnnouncementContext,
  ) => string | null;

  /**
   * Optional: Check if this creation should be announced.
   * Useful for filtering (e.g., only announce new lists, not new items in existing lists)
   */
  shouldAnnounceCreation?: (node: T, context: AnnouncementContext) => boolean;

  /**
   * Optional: Check if this destruction should be announced.
   * Useful for filtering (e.g., don't announce during indent operations)
   */
  shouldAnnounceDestruction?: (
    metadata: NodeMetadata,
    context: AnnouncementContext,
  ) => boolean;
}

/**
 * Context passed to announcement decision functions.
 * Contains shared state that affects announcement decisions.
 */
export interface AnnouncementContext {
  /**
   * Set of known container node keys (e.g., ListNode keys)
   * Used to determine if a list is new vs existing
   */
  knownContainers: Set<string>;

  /**
   * Whether an indent/outdent operation is in progress
   */
  isIndentOperation: boolean;

  /**
   * Whether an Enter-on-empty operation is in progress
   * (pressing Enter on an empty nested list item causes outdent-like restructuring)
   */
  isEnterOnEmpty: boolean;
}
