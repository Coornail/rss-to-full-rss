'use strict';

var readability = require('node-readability');

function ReadabilityInAppBackend() {
  console.error('Warning, the in-app backend has sever memory-leak issues.');
  console.error('See https://github.com/luin/node-readability/issues/38');
}

/**
 * Get the readable name of the backend.
 *
 * @returns {string}
 */
ReadabilityInAppBackend.prototype.getName = function() {
  return 'In-app backend';
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
ReadabilityInAppBackend.prototype.fetch = function(item, cb) {
  readability(item.link, {gzip: true}, function(err, article, meta) {
    if (err) {
      cb(err);
      return;
    }

    item.description = article.content;
    cb(null, item);
  });
};

module.exports = ReadabilityInAppBackend;
