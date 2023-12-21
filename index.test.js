'use strict'

const test = require('node:test')
const assert = require('node:assert')
const inspect = require('./index')

test('only accepts node:http or node:https', async t => {
  try {
    inspect({ mod: test })
  } catch (error) {
    assert.equal(error.message, 'mod must be either node:http or node:https')
  }

  try {
    inspect({ mod: require('http') })
    assert.ok(true)

    inspect({ mod: require('https') })
    assert.ok(true)
  } catch (error) {
    assert.ifError(error)
  }
})
