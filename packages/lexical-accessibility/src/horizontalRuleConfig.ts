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

import {HorizontalRuleNode} from '@lexical/react/LexicalHorizontalRuleNode';

export interface HorizontalRuleMetadata extends NodeMetadata {
  nodeType: 'horizontalRule';
}

function generateHorizontalRuleAnnouncement(
  verbosity: Verbosity,
  isDeleted: boolean,
): string {
  if (isDeleted) {
    switch (verbosity) {
      case 'minimal':
        return 'Rule removed';
      case 'standard':
        return 'Horizontal rule removed';
      case 'verbose':
        return 'Removed horizontal rule';
      default:
        return 'Horizontal rule removed';
    }
  }

  switch (verbosity) {
    case 'minimal':
      return 'Rule';
    case 'standard':
      return 'Horizontal rule';
    case 'verbose':
      return 'Inserted horizontal rule';
    default:
      return 'Horizontal rule';
  }
}

export const horizontalRuleConfig: NodeAnnouncementConfig<HorizontalRuleNode> =
  {
    extractMetadata: (): HorizontalRuleMetadata => {
      return {
        nodeType: 'horizontalRule',
      };
    },
    nodeClass: HorizontalRuleNode,

    nodeType: 'horizontalRule',

    onCreated: (_metadata, verbosity): string | null => {
      return generateHorizontalRuleAnnouncement(verbosity, false);
    },

    onDestroyed: (_metadata, verbosity): string | null => {
      return generateHorizontalRuleAnnouncement(verbosity, true);
    },

    shouldAnnounceCreation: (): boolean => true,

    shouldAnnounceDestruction: (): boolean => true,
  };
