'use strict';

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
  this.cache = null;
}

RssToFullRss.prototype.useCache = function(cache) {
  this.cache = cache;
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
RssToFullRss.prototype.fetchFullDescription = function(item, cb) {
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
 * Callback to get the full description for an rss item via the cache.
 *
 * @see RssToFullRss.fetchFullDescription();
 */
RssToFullRss.prototype.getFullDescription = function(item, cb) {
  var that = this;
  var k = item.link;

  if (this.cache === null || this.cache === undefined) {
    this.fetchFullDescription(item, cb);
    return;
  }

  this.cache.get(k, function(err, data) {
    if (err || data === undefined) {
      that.fetchFullDescription(item, function(err, data) {
        that.cache.set(k, data, 100000, function() {});
        cb(null, data);
      });
      return;
    }

    cb(null, data);
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

    // We potentially can process many items at one.
    stream.setMaxListeners(100);

    var rssSettings = {
      generator: 'Rss to Full Rss',
      site_url: meta.link
    };

    rssSettings = _.merge(meta, rssSettings);

    var responseFeed = new RSS(rssSettings);

    var items = [];
    stream.pipe(through(function write(item) {
        items.push(item);
      },
      function end() {
        async.map(items, function(item, cb) {self.getFullDescription(item, cb);}, function (error, items) {
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
    if (res.statusCode !== 200) {
      return this.emit('error', new Error('Bad status code'));
    }
    stream.pipe(self.getFeedProcessor(callback));
  });

};

module.exports = RssToFullRss;
