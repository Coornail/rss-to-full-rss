'use strict';

var request = require('request');
var FeedParser = require('feedparser');
var RSS = require('rss');
var async = require('async');
var _ = require('lodash');
var validator = require('validator');
var prettyMs = require('pretty-ms');

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
 * @see ReadabilityCliBackend.fetch()
 */
RssToFullRss.prototype.getFullDescription = function(item, cb) {
  var that = this;
  var k = item.link;
  var fetchStart = new Date();

  if (!this.isValidUrl(item.link)) {
    cb('Invalid url: ' + item.link);
    return;
  }

  this.logger.verbose('[article-fetch] Getting full content for %s', k);

  if (this.cache === null || this.cache === undefined) {
    this.readabilityBackend.fetch(item, cb);
    return;
  }

  this.cache.get(k, function(err, data) {
    var time;
    if (err || data === undefined) {
      that.logger.debug('[cache] Miss for %s', k);

      that.readabilityBackend.fetch(item, function(err, data) {
        if (err) {
          that.logger.warn('[article-fetch] Error fetching full content for %s: %s', k, err);
          cb(err);
        } else {
          time = prettyMs(new Date() - fetchStart);
          that.logger.info('[article-fetch] Fetched and processed article %s in %s', k, time);
          that.cache.set(k, data, 100000, function() {});
          cb(null, data);
        }
      });

      return;
    }

    time = prettyMs(new Date() - fetchStart);
    that.logger.debug('[cache] Hit for %s in %s', k, time);
    cb(null, data);
  });
};

/**
 * Helper function to validate a url.
 *
 * @param url
 * @returns {bool}
 */
RssToFullRss.prototype.isValidUrl = function(url) {
  var validatorOptions = {
    require_protocol: true,
    protocols: ['http', 'https']
  };

  return validator.isURL(url , validatorOptions);
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
      /* jshint camelcase:false */
      site_url: meta.link
    };

    rssSettings = _.merge(meta, rssSettings);

    var responseFeed = new RSS(rssSettings);

    var asyncIterator = function(item, cb) {
      self.getFullDescription(item, cb);
    };

    var asyncCallback = function (error, items) {
      if (error) {
        self.logger.error(error);
      }

      items.forEach(function (item) {
        responseFeed.item(item);
      });
      callback(null, responseFeed.xml());
    };

    // Ask the readability backend if we can parse the feed items parallel or
    // maybe we should put a limit.
    var parallelLimit = self.readabilityBackend.parallelLimit || 0;
    if (parallelLimit > 0) {
      async.mapLimit(items, parallelLimit, asyncIterator, asyncCallback);
    } else {
      async.map(items, asyncIterator, asyncCallback);
    }
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
  var req;

  try {
    req = request({url: url, gzip: true});
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
