'use strict';

var http = require('http');
var url = require('url');
var RssToFullRss = require('./libs/rss-to-fullrss');
var winston = require('winston');
var nconf = require('nconf');

var logger = new (winston.Logger)({
  transports: [new (winston.transports.Console)({colorize: true})]
});

nconf.argv()
  .env()
  .file({ file: 'config.json' })
  .defaults({
    'cacheProvider': null,
    'memcachedSettings': [
      {
        host: '127.0.0.1',
        port: 11211
      }
    ],
    'port': 8000
  });

var rssHandler = new RssToFullRss();
rssHandler.logger = logger;

// Add caching if configured.
if (nconf.get('cache') === 'memcache' || nconf.get('cache') === 'memcached') {
  logger.info('[cache] Adding Memcached cache provider', nconf.get('memcachedSettings'));

  var Memcached = require('memcached');

  var memcachedConfig = nconf.get('memcachedSettings:host') + ':' + nconf.get('memcachedSettings.port');
  var memcached = new Memcached(memcachedConfig);
  rssHandler.useCache(memcached);
}

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

/**
 * Create server.
 */
var port = nconf.get('port');
http.createServer(processRequest).listen(port);
logger.info('Listening on port %d', port);
