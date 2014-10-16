'use strict';
/**
 * Fetches articles by spawning a command-line helper utility.
 *
 * This utilizes more processors and protects from the memory leaks in
 * node-readability/jsdom.
 */

var spawn = require('child_process').spawn;

function ReadabilityCliBackend() {
}

/**
 * Callback to get the full description for an rss item.
 *
 * @param item
 *   Rss item from FeedParser.
 *
 * @param cb
 *   Callback.
 */
ReadabilityCliBackend.prototype.fetch = function(item, cb) {
  var result = '';

  var readabilityCli = spawn('./readability-cli.js', [item.link]);

  readabilityCli.stdout.on('data', function (data) {
    result += data;
  });

  readabilityCli.on('close', function (code, signal) {
    if(code === 0) {
      item.description = result;
      cb(null, item)
    } else {
      cb('Child process error code:' + code);
    }
  });
};

module.exports = ReadabilityCliBackend;