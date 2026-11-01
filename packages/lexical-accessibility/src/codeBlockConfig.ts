/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {NodeAnnouncementConfig, NodeMetadata} from './nodeConfigTypes';

import {CodeNode} from '@lexical/code';

export interface CodeBlockMetadata extends NodeMetadata {
  nodeType: 'code-block';
  language: string | null | undefined;
}

function generateCodeBlockAnnouncement(isDeleted: boolean): string {
  if (isDeleted) {
    return 'Code block removed';
  }
  return 'Code block started';
}

export const codeBlockConfig: NodeAnnouncementConfig<CodeNode> = {
  extractMetadata: (node): CodeBlockMetadata => {
    return {
      language: node.getLanguage(),
      nodeType: 'code-block',
    };
  },
  nodeClass: CodeNode,

  nodeType: 'code-block',

  onCreated: (): string | null => {
    return generateCodeBlockAnnouncement(false);
  },

  onDestroyed: (): string | null => {
    return generateCodeBlockAnnouncement(true);
  },

  shouldAnnounceCreation: (): boolean => true,

  shouldAnnounceDestruction: (): boolean => true,
};
