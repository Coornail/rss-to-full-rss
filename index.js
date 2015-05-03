#!/usr/bin/env node

'use strict';

var http = require('http');
var url = require('url');

var winston = require('winston');
var nconf = require('nconf');
var _ = require('lodash');
var prettyMs = require('pretty-ms');

var RssToFullRss = require('./libs/rss-to-fullrss');
var readabilityBackend = require('./libs/readability-backend/factory.js');

// Command line arguments.
var defaultConfig = require('./libs/defaultConfig.json');

nconf.argv()
  .file({ file: 'config.json' })
  .defaults(defaultConfig);

// Show help message if --help passed.
if (nconf.get('help') !== false) {
  var help = require('./libs/help');

  if (nconf.get('help') === 'backend') {
    help.getBackendHelp();
  } else {
    help.getHelp(defaultConfig);
  }

  process.exit(0);
}

// Set up logging.
var loggingOptions = {
  colorize: true,
  level: (nconf.get('verbose')) ? 'debug' : 'info'
};
var logger = new (winston.Logger)({
  transports: [new (winston.transports.Console)(loggingOptions)]
});

var rssHandler = new RssToFullRss();
rssHandler.logger = logger;

// Add caching if configured.
if (nconf.get('cacheProvider') === 'memcache' || nconf.get('cacheProvider') === 'memcached') {
  logger.info('[cache] Memcached cache provider', nconf.get('memcached'));

  var Memcached = require('memcached');

  var memcachedConfig = _.map(nconf.get('memcached'), function(item) {
    return item.host + ':' + item.port;
  });

  var memcached = new Memcached(memcachedConfig);
  rssHandler.useCache(memcached);
}

var backendInstance = readabilityBackend.get(nconf);
if (backendInstance === undefined) {
  logger.error("[backend] Backend not found: " + nconf.get("backend"));
  process.exit(1);
}

rssHandler.setReadabilityBackend(backendInstance);
logger.info('[backend] %s', backendInstance.getName());

/**
 * Request processor callback.
 */
var processRequest = function(req, res) {
  var urlParts = url.parse(req.url, true);
  var query = urlParts.query;

  if (query.url === undefined || query.url === '') {
    res.end('Provide a ?url=... parameter to get the full-text for the rss.');
    logger.warn('[http] Invalid request', {url: req.url});
    return;
  }

  logger.info('[http] Request Full RSS for %s', query.url);

  var requestStart = new Date();

  rssHandler.processRss(query.url, function(err, data) {
    if (err) {
      logger.error('[backend] Error requesting url', query.url, err);
      res.statusCode = 400;
      res.end('Invalid request.');
      return;
    }

    res.end(data);
    var time = prettyMs(new Date() - requestStart);
    logger.info('[http] Served Full RSS for %s in %s', query.url, time);
  });
};

/**
 * Create server.
 */
var port = nconf.get('port');
var server = http.createServer(processRequest).listen(port);
server.on('error', function(error) {
  logger.error('[http] Error on creating http server ::', error);
});
logger.info('[http] Listening on port %d', port);
