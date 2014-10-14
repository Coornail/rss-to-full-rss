var http = require('http');
var url = require('url');
var request = require('request');
var FeedParser = require('feedparser');
var RSS = require('rss');
var through = require('through');
var async = require('async');
var readability = require('node-readability');
var _ = require('lodash');

/**
 * Class for the RssToFullRss converter.
 *
 * @constructor
 */
function RssToFullRss() {
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
RssToFullRss.prototype.getFullDescription = function(item, cb) {
  readability(item.link, function(err, article, meta) {
    if (err) {
      cb(err);
      return;
    }

    item.description = article.content;
    cb(null, item);
  });
};

/**
 * Gets the feedProcessor object.
 *
 * @param callback
 *   Callback on finishing the stream.
 *
 * @returns {FeedParser}
 */
RssToFullRss.prototype.getFeedProcessor = function(callback) {
  var self = this;

  var feedParser = new FeedParser();
  feedParser.on('error', function(error) {
    callback(error.toString());
  });

  feedParser.on('readable', function() {
    // This is where the action is!
    var stream = this;
    var meta = this.meta;
    var item;

    // We potentially can process many items at one.
    stream.setMaxListeners(100);

    var rss_settings = {
      generator: 'Rss to Full Rss',
      site_url: meta.link
    };

    rss_settings = _.merge(meta, rss_settings);

    var responseFeed = new RSS(rss_settings);

    var items = [];
    stream.pipe(through(function write(item) {
        items.push(item);
      },
      function end() {
        async.map(items, self.getFullDescription, function (error, items) {
          items.forEach(function (item) {
            responseFeed.item(item);
          });
          callback(null, responseFeed.xml());
        });
      }));
  });

  return feedParser;
};

/**
 * Processes an rss feed.
 *
 * @param url
 *   Rss feed url.
 *
 * @param callback
 *   Callback after finishing the processing.
 */
RssToFullRss.prototype.processRss = function(url, callback) {
  var self = this;

  var req = request(url);
  req.on('error', function (error) {
    callback(error);
  });

  req.on('response', function (res) {
    var stream = this;
    if (res.statusCode != 200) {
      return this.emit('error', new Error('Bad status code'));
    }
    stream.pipe(self.getFeedProcessor(callback));
  });

};

module.exports = RssToFullRss;
