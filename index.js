'use strict'

const coreHTTP = require('node:http')
const coreHTTPS = require('node:https')
const { LRUMap } = require('lru_map')
const hyperid = require('hyperid')()
const Collector = require('./lib/collector')
const chunkToBuffer = require('./lib/chunk-to-buffer')
const symInstrumented = Symbol('http-inspector.attached')

const DEFAULT_MAX_REQUESTS = 10
/**
 * A set of inspected requests. The keys are ordered in a sequentially
 * increasing order. Therefore, request order can be determined by key order.
 *
 * @typedef {LRUMap<string, Collector>} InspectionData
 */
const collection = new LRUMap(DEFAULT_MAX_REQUESTS)

/**
 * @typedef {object} InspectParams
 * @property {object} mod The module to instrument for inspection. Must be
 * one of `node:http` or `node:https`.
 * @property {number} [maxRequests] The maximum number of requests to keep
 * in the collector. Due to the singleton nature of the collector, any
 * subsequent invocation that sets a new `maxRequests` will affect all
 * inspector instances.
 */

/**
 * Setup inspection on a given module and return a collection instance that
 * will provide access to all inspected requests.
 *
 * @param {InspectParams} params
 * @returns {InspectionData}
 */
module.exports = function inspect ({
  mod,
  maxRequests = DEFAULT_MAX_REQUESTS
}) {
  if (mod !== coreHTTP && mod !== coreHTTPS) {
    throw Error('mod must be either node:http or node:https')
  }

  if (maxRequests !== DEFAULT_MAX_REQUESTS) {
    collection.limit = maxRequests
  }

  if (mod[symInstrumented] === true) {
    return collection
  }

  const request = mod.request
  mod.request = function interceptor (options, callback) {
    const data = new Collector()
    collection.set(hyperid(), data)

    const req = request.call(mod, options, callback)
    data.outgoing.method = req.method
    data.outgoing.path = req.path
    data.outgoing.headers = req.getHeaders()

    const setHeader = req.setHeader
    req.setHeader = function interceptorSetHeader (name, value) {
      data.outgoing.headers[name] = value
      setHeader.call(req, name, value)
    }

    req.on('response', function interceptorResponseHandler (res) {
      data.incoming.statusCode = res.statusCode
      data.incoming.headers = res.headers

      res.on('data', function interceptorResData (chunk) {
        chunk = chunkToBuffer(chunk)
        data.incoming.body = Buffer.concat([data.incoming.body, chunk])
      })
    })

    const write = req.write
    req.write = function interceptorReqWrite (chunk, enc, cb) {
      chunk = chunkToBuffer(chunk, enc)
      data.outgoing.body = Buffer.concat([data.outgoing.body, chunk])
      write.call(req, chunk, enc, cb)
    }

    const end = req.end
    req.end = function interceptorReqEnd (chunk, enc, cb) {
      if (chunk) {
        chunk = chunkToBuffer(chunk, enc)
        data.outgoing.body = Buffer.concat([data.outgoing.body, chunk])
      }
      end.call(req, chunk, enc, cb)
    }

    return req
  }

  mod[symInstrumented] = true
  return collection
}
