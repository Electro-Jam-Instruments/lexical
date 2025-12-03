/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  AnnouncementContext,
  NodeAnnouncementConfig,
  NodeMetadata,
  Verbosity,
} from './nodeConfigTypes';
import type {LexicalEditor, LexicalNode} from 'lexical';
import type {MutableRefObject} from 'react';

import {$getNodeByKey} from 'lexical';
import {useEffect, useRef} from 'react';

import {generateIndentAnnouncement} from './announcementGenerator';
import {headingConfig} from './headingConfig';
import {listItemConfig} from './listItemConfig';

/**
 * All registered node announcement configurations.
 * Add new configs here to enable announcements for additional node types.
 */
export const nodeConfigs: NodeAnnouncementConfig[] = [
  listItemConfig,
  headingConfig,
];

interface UseNodeRegistryOptions {
  editor: LexicalEditor;
  configs: NodeAnnouncementConfig[];
  verbosity: Verbosity;
  enabled: boolean;
  announce: (message: string) => void;
  isIndentOperationRef: MutableRefObject<boolean>;
  isEnterOnEmptyRef: MutableRefObject<boolean>;
}

/**
 * Hook that registers all node announcement listeners based on configs.
 *
 * This centralizes the registration logic so the main plugin doesn't need
 * to know about individual node types. Adding a new node type is as simple
 * as creating a config and adding it to the configs array.
 */
export function useNodeRegistry({
  editor,
  configs,
  verbosity,
  enabled,
  announce,
  isIndentOperationRef,
  isEnterOnEmptyRef,
}: UseNodeRegistryOptions): void {
  const nodeMetadataRef = useRef(new Map<string, NodeMetadata>());
  const knownContainersRef = useRef(new Set<string>());
  const announcedCreationsRef = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const nodeMetadata = nodeMetadataRef.current;
    const knownContainers = knownContainersRef.current;
    const announcedCreations = announcedCreationsRef.current;
    const unregisterFns: Array<() => void> = [];

    configs.forEach((config) => {
      const getContext = (): AnnouncementContext => ({
        isEnterOnEmpty: isEnterOnEmptyRef.current,
        isIndentOperation: isIndentOperationRef.current,
        knownContainers,
      });

      const unregisterTransform = editor.registerNodeTransform(
        config.nodeClass,
        (node) => {
          const key = node.getKey();
          const metadata = config.extractMetadata(node);

          if (!metadata) {
            return;
          }

          nodeMetadata.set(key, metadata);

          if (config.onCreated) {
            const shouldAnnounce = config.shouldAnnounceCreation
              ? config.shouldAnnounceCreation(node, getContext())
              : !announcedCreations.has(key);

            if (shouldAnnounce && !announcedCreations.has(key)) {
              const message = config.onCreated(metadata, verbosity);
              if (message) {
                announce(message);
              }
              announcedCreations.add(key);
            }
          }
        },
      );
      unregisterFns.push(unregisterTransform);

      if (config.onDestroyed) {
        const unregisterMutation = editor.registerMutationListener(
          config.nodeClass,
          (mutations, {prevEditorState}) => {
            const destroyedEntries: Array<{
              key: string;
              metadata: NodeMetadata;
            }> = [];

            mutations.forEach((mutation, key) => {
              if (mutation === 'destroyed') {
                let metadata: NodeMetadata | null = null;

                prevEditorState.read(() => {
                  const node = $getNodeByKey(key);
                  if (node && node instanceof config.nodeClass) {
                    metadata = config.extractMetadata(
                      node as LexicalNode &
                        InstanceType<typeof config.nodeClass>,
                    );
                  }
                });

                if (!metadata) {
                  metadata = nodeMetadata.get(key) ?? null;
                }

                if (metadata) {
                  destroyedEntries.push({key, metadata});
                }
              }
            });

            let entryToAnnounce: {key: string; metadata: NodeMetadata} | null =
              null;

            if (destroyedEntries.length === 1) {
              entryToAnnounce = destroyedEntries[0];
            } else if (destroyedEntries.length === 2) {
              const listMetas = destroyedEntries.map(
                (e) =>
                  e.metadata as {
                    isEmpty?: boolean;
                    hasNestedList?: boolean;
                    itemValue?: number;
                    nestingDepth?: number;
                  },
              );

              const emptyNonWrapper = destroyedEntries.find(
                (e, i) => listMetas[i].isEmpty && !listMetas[i].hasNestedList,
              );

              if (emptyNonWrapper) {
                entryToAnnounce = emptyNonWrapper;
                const meta = emptyNonWrapper.metadata as {
                  nestingDepth?: number;
                };
                if (meta.nestingDepth && meta.nestingDepth > 1) {
                  const newIndentLevel = meta.nestingDepth - 2;
                  const message = generateIndentAnnouncement(
                    'outdent',
                    verbosity,
                    newIndentLevel,
                  );
                  announce(message);
                }
              }
            }

            if (entryToAnnounce) {
              const {metadata} = entryToAnnounce;
              const shouldAnnounce = config.shouldAnnounceDestruction
                ? config.shouldAnnounceDestruction(metadata, getContext())
                : true;

              if (shouldAnnounce && config.onDestroyed) {
                const message = config.onDestroyed(
                  metadata,
                  verbosity,
                  getContext(),
                );
                if (message) {
                  announce(message);
                }
              }
            }

            destroyedEntries.forEach(({key}) => {
              nodeMetadata.delete(key);
              announcedCreations.delete(key);
            });
          },
        );
        unregisterFns.push(unregisterMutation);
      }
    });

    return () => {
      unregisterFns.forEach((fn) => fn());
    };
  }, [
    editor,
    configs,
    verbosity,
    enabled,
    announce,
    isIndentOperationRef,
    isEnterOnEmptyRef,
  ]);
}
