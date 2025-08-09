// Jest polyfills for browser APIs

// TextEncoder/TextDecoder polyfill for Node.js
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Fetch polyfill
require('whatwg-fetch')

// URL polyfill
const { URL, URLSearchParams } = require('url')
global.URL = URL
global.URLSearchParams = URLSearchParams

// Web Streams polyfill
try {
  const { ReadableStream, WritableStream, TransformStream } = require('node:stream/web')
  if (!global.ReadableStream) global.ReadableStream = ReadableStream
  if (!global.WritableStream) global.WritableStream = WritableStream
  if (!global.TransformStream) global.TransformStream = TransformStream
} catch (e) {
  // Fallback for older Node versions - provide minimal implementations
  console.warn('Web streams not available, using minimal polyfills')
  if (!global.ReadableStream) {
    global.ReadableStream = class ReadableStream {}
  }
  if (!global.TransformStream) {
    global.TransformStream = class TransformStream {}
  }
}

// AbortController polyfill
if (!global.AbortController) {
  global.AbortController = require('abort-controller').AbortController
}

// BroadcastChannel polyfill (minimal implementation for testing)
if (!global.BroadcastChannel) {
  global.BroadcastChannel = class BroadcastChannel {
    constructor(name) {
      this.name = name
    }
    postMessage() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
  }
}