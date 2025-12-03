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

import {ListItemNode, ListNode} from '@lexical/list';

export interface ListItemMetadata extends NodeMetadata {
  nodeType: 'list-item';
  listType: 'bullet' | 'number' | 'check';
  parentKey: string;
  itemValue: number;
  isEmpty: boolean;
  hasNestedList: boolean;
  nestingDepth: number;
}

function generateListDeletionAnnouncement(
  listType: 'bullet' | 'number' | 'check',
  verbosity: Verbosity,
  itemValue: number,
): string {
  if (listType === 'number') {
    switch (verbosity) {
      case 'minimal':
        return `${itemValue} deleted list item`;
      case 'standard':
        return `${itemValue} deleted list item`;
      case 'verbose':
        return `Deleted list item ${itemValue}`;
      default:
        return `${itemValue} deleted list item`;
    }
  }

  const typeLabels = {
    bullet: 'Bullet',
    check: 'Checklist',
  };
  const label = typeLabels[listType] || 'List';

  switch (verbosity) {
    case 'minimal':
      return `${label} deleted list item`;
    case 'standard':
      return `${label} deleted list item`;
    case 'verbose':
      return `Deleted ${label.toLowerCase()} list item`;
    default:
      return `${label} deleted list item`;
  }
}

function generateListAnnouncement(
  listType: 'bullet' | 'number' | 'check',
  verbosity: Verbosity,
  isNewList: boolean,
): string {
  const typeLabels = {
    bullet: 'Bullet',
    check: 'Checklist',
    number: 'Numbered',
  };

  const label = typeLabels[listType] || 'List';

  if (isNewList) {
    switch (verbosity) {
      case 'minimal':
        return `${label} list`;
      case 'standard':
        return `${label} list started`;
      case 'verbose':
        return `Started ${label.toLowerCase()} list`;
      default:
        return `${label} list started`;
    }
  }

  switch (verbosity) {
    case 'minimal':
      return `${label} list`;
    case 'standard':
      return `${label} list item`;
    case 'verbose':
      return `Created ${label.toLowerCase()} list item`;
    default:
      return `${label} list item`;
  }
}

export const listItemConfig: NodeAnnouncementConfig<ListItemNode> = {
  extractMetadata: (node): ListItemMetadata | null => {
    const parent = node.getParent();
    if (!(parent instanceof ListNode)) {
      return null;
    }

    const listType = parent.getListType();
    if (
      listType !== 'bullet' &&
      listType !== 'number' &&
      listType !== 'check'
    ) {
      return null;
    }

    const textContent = node.getTextContent().trim();
    const isEmpty = textContent.length === 0;

    let nestingDepth = 0;
    let currentParent: ReturnType<typeof node.getParent> = parent;
    while (currentParent !== null) {
      if (currentParent instanceof ListNode) {
        nestingDepth++;
      }
      currentParent = currentParent.getParent();
    }

    const children = node.getChildren();
    const hasNestedList = children.some((child) => child instanceof ListNode);

    let nestedItemPosition: number | null = null;
    if (hasNestedList) {
      for (const child of children) {
        if (child instanceof ListNode) {
          const nestedChildren = child.getChildren();
          if (nestedChildren.length >= 1) {
            const firstNestedItem = nestedChildren[0];
            if (firstNestedItem instanceof ListItemNode) {
              nestedItemPosition = 1;
            }
          }
          break;
        }
      }
    }

    const siblings = parent.getChildren();
    let displayPosition = 1;

    for (const sibling of siblings) {
      if (sibling.getKey() === node.getKey()) {
        break;
      }
      if (sibling instanceof ListItemNode) {
        displayPosition++;
      }
    }

    const effectivePosition =
      hasNestedList && nestedItemPosition !== null
        ? nestedItemPosition
        : displayPosition;

    return {
      hasNestedList,
      isEmpty,
      itemValue: effectivePosition,
      listType,
      nestingDepth,
      nodeType: 'list-item',
      parentKey: parent.getKey(),
    };
  },
  nodeClass: ListItemNode,

  nodeType: 'list-item',

  onCreated: (metadata, verbosity): string | null => {
    const listMeta = metadata as ListItemMetadata;
    return generateListAnnouncement(listMeta.listType, verbosity, true);
  },

  onDestroyed: (metadata, verbosity): string | null => {
    const listMeta = metadata as ListItemMetadata;

    if (!listMeta.isEmpty) {
      return null;
    }
    return generateListDeletionAnnouncement(
      listMeta.listType,
      verbosity,
      listMeta.itemValue,
    );
  },

  shouldAnnounceCreation: (node, context): boolean => {
    const parent = node.getParent();
    if (!(parent instanceof ListNode)) {
      return false;
    }

    if (context.isIndentOperation) {
      return false;
    }

    if (context.isEnterOnEmpty) {
      return false;
    }

    const parentKey = parent.getKey();
    const isNewList = !context.knownContainers.has(parentKey);
    context.knownContainers.add(parentKey);

    return isNewList;
  },

  shouldAnnounceDestruction: (metadata, context): boolean => {
    // During indent/outdent operations, don't announce "deleted list item"
    // The outdent announcement is handled separately in useNodeRegistry.ts
    // and we don't want duplicate/confusing announcements
    if (context.isIndentOperation) {
      return false;
    }

    return true;
  },
};
