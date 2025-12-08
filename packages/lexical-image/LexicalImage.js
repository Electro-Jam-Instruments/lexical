/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';
const LexicalImage =
  process.env.NODE_ENV !== 'production'
    ? require('./LexicalImage.dev.js')
    : require('./LexicalImage.prod.js');

module.exports = LexicalImage;
