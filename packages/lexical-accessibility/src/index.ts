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
export {DEFAULT_CONFIG} from './types';

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
export {listItemConfig} from './listItemConfig';
export type {
  AnnouncementContext,
  NodeAnnouncementConfig,
  NodeMetadata,
  Verbosity,
} from './nodeConfigTypes';
export {nodeConfigs,useNodeRegistry} from './useNodeRegistry';
