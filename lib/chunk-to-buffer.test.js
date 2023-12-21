'use strict'

const test = require('node:test')
const assert = require('node:assert')
const chunkToBuffer = require('./chunk-to-buffer')

test('converts strings', async () => {
  let expected = Buffer.from('foo', 'utf8')
  let result = chunkToBuffer('foo')
  assert.equal(Buffer.compare(result, expected), 0)

  expected = Buffer.from('foo', 'ascii')
  result = chunkToBuffer('foo', 'ascii')
  assert.equal(Buffer.compare(result, expected), 0)
})

test('passes through buffers', async () => {
  let expected = Buffer.from('foo', 'utf8')
  let result = chunkToBuffer(expected)
  assert.equal(result, expected)

  expected = new Uint8Array([0x66, 0x6f, 0x6f])
  result = chunkToBuffer(expected)
  assert.equal(result, expected)
})
