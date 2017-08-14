'use strict'
const fs = require('fs')

/**
 * fs.existsSync is deprecated
 */
module.exports = function existsSync(path) {
  var exists = false

  try {
    fs.accessSync(path, fs.F_OK)
    exists = true
  } catch(e) {}

  return exists
}
