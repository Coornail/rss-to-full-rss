#!/usr/bin/env node

'use strict';

var http = require('http');
var url = require('url');
var RssToFullRss = require('./libs/rss-to-fullrss');
var winston = require('winston');
var nconf = require('nconf');
var _ = require('lodash');
var readabilityBackend = require('./libs/readability-backend/factory.js');

// Command line arguments.
var defaultConfig = {
    cacheProvider: 'none',
    memcached: [
      {
        host: '127.0.0.1',
        port: 11211
      }
    ],
    port: 8000,
    backend: 'cli',
    'readability.com': {
      token: ''
    },
    help: false,
    verbose: false
  };

nconf.argv()
  .file({ file: 'config.json' })
  .defaults(defaultConfig);

if (nconf.get('help') !== false) {
  console.log('Rss to Full Rss converter.');
  console.log('');
  console.log('--port [port]                                  default: ' + defaultConfig.port);
  console.log('--cacheProvider [none|memcached]               default: ' + defaultConfig.cacheProvider);
  console.log('--memcached:host [host]                        default: ' + defaultConfig.memcached[0].host);
  console.log('--memcached:port [port]                        default: ' + defaultConfig.memcached[0].port);
  console.log('--backend [cli|inApp|readability.com|unfluff]  default: ' + defaultConfig.backend);
  console.log('--readability.com:token [token]                default: ' + defaultConfig['readability.com'].token);
  console.log('--verbose');
  console.log('');
  console.log('You can use the config.json to set up the config as well.');
  console.log('See config.json.example');
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
    logger.info('[http] Served Full RSS for %s in %s ms', query.url, (new Date() - requestStart));
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
