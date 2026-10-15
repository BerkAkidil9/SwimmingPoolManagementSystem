const { TextEncoder, TextDecoder } = require('node:util');

Object.assign(globalThis, { TextEncoder, TextDecoder });
