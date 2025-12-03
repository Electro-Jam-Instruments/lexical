/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

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
