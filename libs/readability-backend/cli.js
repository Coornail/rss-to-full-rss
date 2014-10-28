'use strict';
/**
 * Fetches articles by spawning a command-line helper utility.
 *
 * This utilizes more processors and protects from the memory leaks in
 * node-readability/jsdom.
 */

var spawn = require('child_process').spawn;
var appRoot = require('app-root-path');

function ReadabilityCliBackend() {
  // Limit number of cli executors to 2x of the number of CPUs we have.
  // This is to not waste cpu by waiting for the network, but not spawn too
  // many processes either.
  this.parallelLimit = require('os').cpus().length * 2;
}

/**
 * Get the readable name of the backend.
 *
 * @returns {string}
 */
ReadabilityCliBackend.prototype.getName = function() {
  return 'Command-line backend (max subprocesses: '+ this.parallelLimit +')';
};

ReadabilityCliBackend.prototype.getDescription = function() {
  var description = 'Spawns command line programs of node-readability.\n';
  description += 'The separate process ensures that no memory leaks from the module.\n';
  description += 'Exports html.';

  return description;
};

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

  var readabilityCli = spawn(appRoot + '/readability-cli.js', [item.link]);

  readabilityCli.stdout.on('data', function (data) {
    result += data;
  });

  readabilityCli.on('close', function (code, signal) {
    if(code === 0) {
      item.description = result;
      cb(null, item);
    } else {
      cb('Child process error code:' + code);
    }
  });
};

module.exports = ReadabilityCliBackend;