// Copyright (c) 2022 Pestras
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { Validall } from "@pestras/validall";

new Validall('createSwot', {
  socket: { $type: 'string', $nullable: true, $message: 'invalidSocketId' },
  factors: { $each: { $type: 'string' }, $default: [] },
  name: { $type: 'string', $required: true, $message: 'nameRequired' },
  desc: { $type: 'string', $required: true, $message: 'descRequired' },
  type: { $type: 'number', $inRange: [0, 3], $required: true, $message: 'typeRequired' },
  classifications: { $each: { $type: 'number', $inRange: [0, 11] }, $default: [] },
  aspects: { $each: { $type: 'number', $inRange: [0, 30] }, $length: { $gt: 0 }, $required: true, $message: 'aspectsRequired' }
});

new Validall("updateSwot", {
  socket: { $type: 'string', $message: 'invalidSocketId' },
  name: { $type: 'string', $message: 'invalidName' },
  desc: { $type: 'string', $message: 'invalidDesc' },
  classifications: { $each: { $type: 'number', $inRange: [0, 11] }, $message: 'invalidClassifications' },
  aspects: { $each: { $type: 'number', $inRange: [0, 30] }, $length: { $gt: 0 }, $message: 'invalidAspects' },
  factors: { $each: { $type: 'string' }, $default: [], $message: 'invalidFactors' }
});

new Validall("createTTR", {
  socket: { $type: 'string', $nullable: true, $message: 'invalidSocketId' },
  swot: { $type: 'string', $required: true, $message: 'swotRequired' },
  project: { $type: 'string', $required: true, $message: 'projectRequired' },
  type: { $type: 'number', $enum: [0, 1, 2], $required: true, $message: 'typeRequired' },
  desc: { $type: 'string', $required: true, $message: 'descRequired' }
});

new Validall('updateTTR', {
  socket: { $type: 'string', $message: 'invalidSocketId' },
  desc: { $type: 'string', $required: true, $message: 'descRequired' }
});