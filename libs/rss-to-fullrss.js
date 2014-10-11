var http = require('http');
var url = require('url');
var request = require('request');
var FeedParser = require('feedparser');
var RSS = require('rss');
var through = require('through');
var async = require('async');
var readability = require('node-readability');

function RssToFullRss() {
}

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

RssToFullRss.prototype.getFeedProcessor = function(callback) {
  var self = this;

  var feedParser = new FeedParser();
  feedParser.on('error', function(error) {
    callback(error.toString());
  });

  feedParser.on('readable', function() {
    // This is where the action is!
    var stream = this
      , meta = this.meta // **NOTE** the "meta" is always available in the context of the feedparser instance
      , item;

    // We potentially can process many items at one.
    stream.setMaxListeners(100);

    var responseFeed = new RSS(meta);

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