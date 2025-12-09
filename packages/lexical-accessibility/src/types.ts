/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {Transformer} from '@lexical/markdown';

/**
 * Configuration options for the AccessibilityPlugin
 */
export interface AccessibilityConfig {
  /**
   * Enable or disable the plugin
   * @default true
   */
  enabled?: boolean;

  /**
   * Level of detail in announcements
   * - minimal: "Heading 2"
   * - standard: "Heading level 2"
   * - verbose: "Changed to heading level 2"
   * @default 'standard'
   */
  verbosity?: 'minimal' | 'standard' | 'verbose';

  /**
   * Announce text format changes (bold, italic, code, etc.)
   * @default true
   */
  announceFormats?: boolean;

  /**
   * Announce structural changes (headings, lists, etc.)
   * @default true
   */
  announceStructural?: boolean;

  /**
   * Use CSS styling for bold, italic, underline, strikethrough instead of
   * semantic HTML tags. This prevents "selected/unselected" announcements
   * that occur when DOM nodes are replaced during formatting changes.
   * @default true
   */
  useCSSFormatting?: boolean;
}

/**
 * Props for the AccessibilityPlugin component
 */
export interface AccessibilityPluginProps {
  config?: AccessibilityConfig;
  /**
   * Custom markdown transformers for paste operations.
   * Defaults to ACCESSIBILITY_TRANSFORMERS which includes HR + standard transformers.
   * Pass your own array to add app-specific transformers or override defaults.
   */
  transformers?: Array<Transformer>;
}

/**
 * Internal announcement type
 */
export interface Announcement {
  type: 'structural' | 'format';
  message: string;
  timestamp: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Required<AccessibilityConfig> = {
  announceFormats: true,
  announceStructural: true,
  enabled: true,
  useCSSFormatting: true,
  verbosity: 'standard',
};

/**
 * Update tag to suppress accessibility announcements during bulk operations.
 *
 * Use this tag when performing operations that would trigger many announcements
 * that aren't useful to the user, such as clearing the editor or bulk deletions.
 *
 * @example
 * ```typescript
 * import { SUPPRESS_A11Y_ANNOUNCEMENTS_TAG } from '@lexical/accessibility';
 *
 * // Clear editor without announcing each deleted node
 * editor.update(() => {
 *   $getRoot().clear();
 * }, { tag: SUPPRESS_A11Y_ANNOUNCEMENTS_TAG });
 * ```
 */
export const SUPPRESS_A11Y_ANNOUNCEMENTS_TAG = 'suppress-a11y-announcements';
