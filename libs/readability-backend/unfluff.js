'use strict';

var unfluff = require('unfluff');
var request = require('request');

function ReadabilityUnfluffBackend() {
}

ReadabilityUnfluffBackend.prototype.getDescription = function() {
  var description = 'Uses node-unfluff to get the content.\n';
  description += 'Exports clear-text.';

  return description;
};

/**
 * Get the readable name of the backend.
 *
 * @returns {string}
 */
ReadabilityUnfluffBackend.prototype.getName = function() {
  return 'Unfluff backend';
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
ReadabilityUnfluffBackend.prototype.fetch = function(item, cb) {
  var url = item.link;

  var handleResponse = function (error, response, body) {
    if (!error && response.statusCode === 200) {
      var article = unfluff(body);
      item.description = article.text;
      cb(null, item);
      return;
    }

    cb('[backend] Http error: ' + error + '(' + response.statusCode + ') ' + url);
  };

  request(url, handleResponse);
};

module.exports = ReadabilityUnfluffBackend;
