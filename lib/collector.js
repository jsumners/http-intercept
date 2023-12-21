'use strict'

/**
 * @typedef {object} OutgoingData
 * @property {string} method The request type, e.g. "GET".
 * @property {string} path The path portion of the request, e.g. "/foo".
 * @property {object} headers A hash of all headers used in the request.
 * @property {Buffer} body Bytes sent as the request body.
 */

/**
 * @typedef {object} IncomingData
 * @property {number} statusCode The response status code.
 * @property {object} headers A hash of all headers received in the response.
 * @property {Buffer} body Bytes received as the response body.
 */

/**
 * Collects information seen when sending and receiving an HTTP(S) request.
 *
 * @type {Collector}
 */
class Collector {
  /**
   * @type {OutgoingData}
   */
  outgoing = {
    method: '',
    path: '',
    headers: {},
    body: Buffer.alloc(0)
  }

  /**
   * @type {IncomingData}
   */
  incoming = {
    statusCode: 0,
    headers: {},
    body: Buffer.alloc(0)
  }

  /**
   * Write a human-readable report of the collected data to a specified
   * writable stream.
   *
   * Note: body buffers are assumed to be utf-8 text. If it is known they
   * contain different data, the information should be processed manually.
   *
   * @param {Writable} [dest=process.stdout]
   */
  dump (dest = process.stdout) {
    dest.write('Sent request:\n')
    dest.write(`${this.outgoing.method} ${this.outgoing.path}\n`)
    for (const [key, value] of Object.entries(this.outgoing.headers)) {
      dest.write(`${key}: ${value}\n`)
    }
    // TODO: inspect content type and do fancier stuff?
    dest.write(`\n${this.outgoing.body.toString('utf8')}`)

    dest.write('\n\nReceived response:\n')
    dest.write(`${this.incoming.statusCode}`)
    for (const [key, value] of Object.entries(this.incoming.headers)) {
      dest.write(`${key}: ${value}\n`)
    }
    dest.write(`\n${this.incoming.body.toString('utf8')}`)
  }
}

module.exports = Collector
