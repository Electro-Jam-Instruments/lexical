/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';
const LexicalAccessibility =
  process.env.NODE_ENV !== 'production'
    ? require('./LexicalAccessibility.dev.js')
    : require('./LexicalAccessibility.prod.js');

module.exports = LexicalAccessibility;
