'use strict';

var http = require('http');
var url = require('url');
var RssToFullRss = require('./libs/rss-to-fullrss');
var winston = require('winston');

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({colorize: true, level: 'debug'})
    //new (winston.transports.File)({ filename: 'somefile.log' })
  ]
});

var rssHandler = new RssToFullRss();
rssHandler.logger = logger;

/**
 * Request processor callback.
 */
var processRequest = function(req, res) {
  var urlParts = url.parse(req.url, true);
  var query = urlParts.query;

  if (query.url === undefined) {
    res.end('Provide a ?url=... parameter to get the full-text for the rss.');
    logger.warn('Invalid request', {url: req.url});
    return;
  }

  logger.info('Request Full RSS for %s', query.url);

  var requestStart = new Date();
  rssHandler.processRss(query.url, function(err, data) {
    res.end(data);
    logger.info('Served Full RSS for %s in %s ms', query.url, (new Date() - requestStart));
  });
};

http.createServer(processRequest).listen(8000);