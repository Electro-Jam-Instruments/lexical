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

import {HeadingNode} from '@lexical/rich-text';

export interface HeadingMetadata extends NodeMetadata {
  nodeType: 'heading';
  level: string;
}

function generateHeadingAnnouncement(
  level: string,
  verbosity: Verbosity,
  isDeleted: boolean,
): string {
  if (isDeleted) {
    switch (verbosity) {
      case 'minimal':
        return `Heading ${level} removed`;
      case 'standard':
        return `Heading level ${level} removed`;
      case 'verbose':
        return `Removed heading level ${level}`;
      default:
        return `Heading level ${level} removed`;
    }
  }

  switch (verbosity) {
    case 'minimal':
      return `Heading ${level}`;
    case 'standard':
      return `Heading level ${level}`;
    case 'verbose':
      return `Changed to heading level ${level}`;
    default:
      return `Heading level ${level}`;
  }
}

export const headingConfig: NodeAnnouncementConfig<HeadingNode> = {
  extractMetadata: (node): HeadingMetadata => {
    const tag = node.getTag();
    const level = tag.charAt(1);

    return {
      level,
      nodeType: 'heading',
    };
  },
  nodeClass: HeadingNode,

  nodeType: 'heading',

  onCreated: (metadata, verbosity): string | null => {
    const headingMeta = metadata as HeadingMetadata;
    return generateHeadingAnnouncement(headingMeta.level, verbosity, false);
  },

  onDestroyed: (metadata, verbosity): string | null => {
    const headingMeta = metadata as HeadingMetadata;
    return generateHeadingAnnouncement(headingMeta.level, verbosity, true);
  },

  shouldAnnounceCreation: (): boolean => true,

  shouldAnnounceDestruction: (): boolean => true,
};
