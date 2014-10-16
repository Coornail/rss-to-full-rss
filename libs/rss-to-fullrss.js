'use strict';

var request = require('request');
var FeedParser = require('feedparser');
var RSS = require('rss');
var async = require('async');
var _ = require('lodash');

/**
 * Class for the RssToFullRss converter.
 *
 * @constructor
 */
function RssToFullRss() {
  this.cache = null;
  this.readabilityBackend = null;
  this.logger = null;
}

RssToFullRss.prototype.setReadabilityBackend = function(backend) {
  this.readabilityBackend = backend;
};

/**
 * Use a cache provider to not fetch all the articles again.
 *
 * @param cache
 *   Cache object.
 *   Should be compatible with Memcached.get() and Memcached.set().
 */
RssToFullRss.prototype.useCache = function(cache) {
  this.cache = cache;
};

/**
 * Callback to get the full description for an rss item via the cache.
 *
 * @see RssToFullRss.fetchFullDescription();
 */
RssToFullRss.prototype.getFullDescription = function(item, cb) {
  var that = this;
  var k = item.link;

  this.logger.verbose('Getting full content for %s', k);

  if (this.cache === null || this.cache === undefined) {
    this.readabilityBackend.fetch(item, cb);
    return;
  }

  this.cache.get(k, function(err, data) {
    if (err || data === undefined) {
      that.logger.debug('[cache] Miss for %s', k);

      var fetchStart = new Date();
      that.readabilityBackend.fetch(item, function(err, data) {
        if (err) {
          that.logger.warn('[article-fetch] Error fetching full content for %s: %s', k, err);
          cb(err);
        } else {
          that.logger.info('[article-fetch] Fetched and processed article %s in %s ms', k, (new Date() - fetchStart));
          that.cache.set(k, data, 100000, function() {});
          cb(null, data);
        }
      });

      return;
    }

    that.logger.debug('[cache] Hit for %s', k);
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
  var items = [];
  var self = this;

  var feedParser = new FeedParser();
  feedParser.on('error', function(error) {
    callback(error.toString());
  });

  feedParser.on('readable', function() {
    var stream = this;
    var item;

    while (item = stream.read()) {
      items.push(item);
    }
  });

  feedParser.on('end', function() {
    var meta = this.meta;

    var rssSettings = {
      generator: 'Rss to Full Rss',
      site_url: meta.link
    };

    rssSettings = _.merge(meta, rssSettings);

    var responseFeed = new RSS(rssSettings);

    async.map(items, function(item, cb) {self.getFullDescription(item, cb);}, function (error, items) {
      items.forEach(function (item) {
        responseFeed.item(item);
      });
      callback(null, responseFeed.xml());
    });
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

  try {
    var req = request({url: url, gzip: true});
  } catch(exception) {
    callback(exception);
    return;
  }

  req.on('error', function (error) {
    callback(error);
  });

  req.on('response', function (res) {
    var stream = this;
    if (res.statusCode !== 200) {
      return this.emit('error', new Error('Bad status code'));
    }

    var processor = self.getFeedProcessor(callback);
    stream.pipe(processor);
  });
};

module.exports = RssToFullRss;
