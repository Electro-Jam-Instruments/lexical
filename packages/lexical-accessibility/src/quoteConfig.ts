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

import {QuoteNode} from '@lexical/rich-text';

export interface QuoteMetadata extends NodeMetadata {
  nodeType: 'quote';
}

function generateQuoteAnnouncement(
  verbosity: Verbosity,
  isDeleted: boolean,
): string {
  if (isDeleted) {
    switch (verbosity) {
      case 'minimal':
        return 'Quote removed';
      case 'standard':
        return 'Block quote removed';
      case 'verbose':
        return 'Removed block quote';
      default:
        return 'Block quote removed';
    }
  }

  switch (verbosity) {
    case 'minimal':
      return 'Quote';
    case 'standard':
      return 'Block quote';
    case 'verbose':
      return 'Changed to block quote';
    default:
      return 'Block quote';
  }
}

export const quoteConfig: NodeAnnouncementConfig<QuoteNode> = {
  extractMetadata: (): QuoteMetadata => {
    return {
      nodeType: 'quote',
    };
  },
  nodeClass: QuoteNode,

  nodeType: 'quote',

  onCreated: (_metadata, verbosity): string | null => {
    return generateQuoteAnnouncement(verbosity, false);
  },

  onDestroyed: (_metadata, verbosity): string | null => {
    return generateQuoteAnnouncement(verbosity, true);
  },

  shouldAnnounceCreation: (): boolean => true,

  shouldAnnounceDestruction: (): boolean => true,
};
