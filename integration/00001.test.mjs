'use strict'

import test from 'node:test'
import assert from 'node:assert'
import http from 'node:http'
import fastify from 'fastify'
import inspect from '../index.js'

const server = fastify({
  logger: false,
  forceCloseConnections: true
})
server.route({
  method: 'get',
  path: '/',
  handler (req, res) {
    res.header('foo', 'foo')
    res.send('hello')
  }
})

await server.listen({ host: '127.0.0.1', port: 0 })
const addy = server.addresses()[0]
const baseUrl = `http://${addy.address}:${addy.port}`

test.after(() => {
  server.close()
})

test('instruments basic get request', (t, done) => {
  const requests = inspect({ mod: http })
  const req = http.request(baseUrl, (res) => {
    res.on('end', () => {
      const [, data] = requests.shift()
      assert.equal(data.outgoing.method, 'GET')
      assert.equal(data.outgoing.path, '/')
      assert.equal(data.outgoing.headers.host, `${addy.address}:${addy.port}`)

      assert.equal(data.incoming.statusCode, 200)
      assert.equal(data.incoming.headers.foo, 'foo')
      assert.equal(Buffer.compare(data.incoming.body, Buffer.from('hello', 'utf8')), 0)

      requests.clear()
      done()
    })
  })
  req.end()
})

test('response handler does not interfere with user handler', (t, done) => {
  const requests = inspect({ mod: http })
  const req = http.request(baseUrl, (res) => {
    let userData = 'user:'

    res.on('data', d => {
      userData += d.toString('utf8')
    })

    res.on('end', () => {
      const [, data] = requests.shift()
      assert.equal(data.incoming.body.toString('utf8'), 'hello')
      assert.equal(userData, 'user:hello')

      requests.clear()
      done()
    })
  })
  req.end()
})
