'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { Writable } = require('node:stream')
const Collector = require('./collector')

test('dumps human readable output', () => {
  const c = new Collector()

  c.outgoing.method = 'GET'
  c.outgoing.path = '/foo'
  c.outgoing.headers = {
    foo: 'foo',
    bar: 'bar'
  }
  c.outgoing.body = Buffer.from('sent')

  c.incoming.statusCode = 200
  c.incoming.headers = {
    hello: 'world'
  }
  c.incoming.body = Buffer.from('received')

  let result = ''
  const stream = new Writable({
    write (chunk, encoding, callback) {
      result += chunk.toString('utf8')
      callback()
    }
  })
  c.dump(stream)

  const expected = 'Sent request:\nGET /foo\nfoo: foo\nbar: bar\n\nsent\n\nReceived response:\n200hello: world\n\nreceived'
  assert.equal(result, expected)
})
