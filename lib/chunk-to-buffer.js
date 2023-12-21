'use strict'

module.exports = function chunkToBuffer (chunk, enc) {
  if (Object.prototype.toString.call(chunk) === '[object String]') {
    return Buffer.from(chunk, enc ?? 'utf8')
  }
  return chunk
}
