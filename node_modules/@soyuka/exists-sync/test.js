'use strict'
const existsSync = require('./index.js')
const assert = require('assert')

describe('exists', function() {
  it('should exists', function() {
   assert(existsSync('./package.json')) 
  })

  it('should not exists', function() {
   assert(!existsSync('./nonexistant')) 
  })
})
