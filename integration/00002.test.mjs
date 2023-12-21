'use strict'

import test from 'node:test'
import assert from 'node:assert'
import https from 'node:https'
import { Readable } from 'node:stream'
import fastify from 'fastify'
import selfCert from 'self-cert'
import inspect from '../index.js'

const certDetails = selfCert({
  attrs: {
    stateName: 'Georgia',
    locality: 'Atlanta',
    orgName: 'Acme Widgets',
    shortName: 'widget42'
  },
  expires: new Date('2050-12-31')
})

const server = fastify({
  logger: false,
  forceCloseConnections: true,
  https: {
    key: certDetails.privateKey,
    cert: certDetails.certificate
  }
})
server.route({
  method: 'get',
  path: '/',
  handler (req, res) {
    res.header('foo', 'foo')
    res.send('hello')
  }
})
server.route({
  method: 'post',
  path: '/',
  handler (req, res) {
    res.send({
      received: req.body
    })
  }
})

await server.listen({ host: '127.0.0.1', port: 0 })
const addy = server.addresses()[0]
const reqOpts = {
  hostname: addy.address,
  port: addy.port,
  rejectUnauthorized: false
}

test.after(() => {
  server.close()
})

test('instruments basic get request', (t, done) => {
  const requests = inspect({ mod: https })
  const req = https.request(reqOpts, (res) => {
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

test('instruments basic post request', (t, done) => {
  const requests = inspect({ mod: https })
  const opts = {
    ...reqOpts,
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': 5
    }
  }

  const req = https.request(opts, (res) => {
    res.on('end', () => {
      const [, data] = requests.shift()
      assert.equal(data.outgoing.method, 'POST')

      assert.equal(data.incoming.statusCode, 200)
      const payload = JSON.parse(data.incoming.body.toString('utf8'))
      assert.equal(payload.received, 'foo')

      done()
    })
  })

  req.write('"foo"')
  req.end()
})

test('instruments a piped post request', (t, done) => {
  const requests = inspect({ mod: https })
  const opts = {
    ...reqOpts,
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'transfer-encoding': 'chunked'
    }
  }

  const req = https.request(opts, (res) => {
    res.on('end', () => {
      const [, data] = requests.shift()
      assert.equal(data.outgoing.method, 'POST')

      assert.equal(data.incoming.statusCode, 200)
      const payload = JSON.parse(data.incoming.body.toString('utf8'))
      assert.equal(payload.received, 'bar')

      done()
    })
  })

  req.on('error', error => {
    assert.ifError(error)
  })

  let sent = false
  const stream = new Readable({
    read () {
      if (sent === true) {
        this.push(null)
        return
      }
      this.push('"bar"')
      sent = true
    }
  }).pause()
  req.flushHeaders()
  stream.pipe(req)
})
