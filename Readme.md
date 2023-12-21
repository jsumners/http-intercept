# HTTP Request Inspector

This module can be used to trace HTTP(S) requests that utilize the core
[Node.js](https://nodejs.org) `http` and `https` modules. This module is not
intended for any sort of "production" usage. It is designed to provide
inspection of requests in order to understand the details of those requests
so that some application can be written against them.

For example, let's assume you need to write an HTTP server to provide mock
responses for a remote service in order to facilitate local unit testing,
and that the remote service only provides HTTPS access. Utilizing this module,
you can write a client to interact with that remote service and get all
request details without needing to utilize some sort of self-signed TLS
certificate in the middle of the conversation.

> ### Important
> The nature of this module necessitates a singleton based design. This
> has the consequence of the internal request collection being universal.

## Example

```js
const http = require('node:http')
const inspect = require('./index')
const requests = inspect({ mod: http })

const req = http.request('https://httpbin.org/stream/5', (res) => {
  res.on('end', () => {
    const [, data] = requests.shift()
    console.dir(data)
    /*
    {
      outgoing: {
        method: 'GET',
        path: '/stream/5',
        headers: {
          host: 'httpbin.org'
        },
        body: Buffer(0)
      },
      incoming: {
        statusCode: 200,
        headers: {
          // all incoming response headers
        },
        body: Buffer(940)
      }
    }
    */
  })
})
req.end()
```
