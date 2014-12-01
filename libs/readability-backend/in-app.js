'use strict';

var readability = require('node-readability');

function ReadabilityInAppBackend() {
}

ReadabilityInAppBackend.prototype.getDescription = function() {
  var description = 'In-app managed instances of node-readability.';
  description = 'This backend has sever memory-leak issues.\n';
  description += 'See https://github.com/luin/node-readability/issues/38\n';
  description += 'Exports html.';

  return description;
};

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
      article.close();
      cb(err);
      return;
    }

    item.description = article.content;
    article.close();
    cb(null, item);
  });
};

module.exports = ReadabilityInAppBackend;
