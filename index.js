#!/usr/bin/env node

'use strict';

var http = require('http');
var url = require('url');
var RssToFullRss = require('./libs/rss-to-fullrss');
var winston = require('winston');
var nconf = require('nconf');
var _ = require('lodash');

var logger = new (winston.Logger)({
  transports: [new (winston.transports.Console)({colorize: true})]
});

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
    help: false
  };

nconf.argv()
  .file({ file: 'config.json' })
  .defaults(defaultConfig);

if (nconf.get('help') !== false) {
  console.log('Rss to Full Rss converter.');
  console.log('');
  console.log('--port [port]                          default: ' + defaultConfig.port);
  console.log('--cacheProvider [none|memcached]       default: ' + defaultConfig.cacheProvider);
  console.log('--memcached:host [host]                default: ' + defaultConfig.memcached[0].host);
  console.log('--memcached:port [port]                default: ' + defaultConfig.memcached[0].port);
  console.log('--backend [cli|inApp|readability.com]  default: ' + defaultConfig.backend);
  console.log('--readability.com:token [token]        default: ' + defaultConfig['readability.com'].token);
  console.log('');
  console.log('You can use the config.json to set up the config as well.');
  console.log('See config.json.example');
  process.exit(0);
}

var rssHandler = new RssToFullRss();
rssHandler.logger = logger;

// Add caching if configured.
if (nconf.get('cacheProvider') === 'memcache' || nconf.get('cacheProvider') === 'memcached') {
  logger.info('[cache] Adding Memcached cache provider', nconf.get('memcached'));

  var Memcached = require('memcached');

  var memcachedConfig = _.map(nconf.get('memcached'), function(item) {
    return item.host + ':' + item.port;
  });

  var memcached = new Memcached(memcachedConfig);
  rssHandler.useCache(memcached);
}

// Set up backend.
var BackendProvider;
var backendInstance;
switch (nconf.get('backend')) {
  case 'cli':
    BackendProvider = require('./libs/readability-backend/cli.js');
    backendInstance = new BackendProvider();
    break;

  case 'inApp':
    BackendProvider = require('./libs/readability-backend/in-app.js');
    backendInstance = new BackendProvider();
    break;

  case 'readability.com':
    // Set up readability.com with token.
    BackendProvider = require('./libs/readability-backend/readability-com.js');
    backendInstance = new BackendProvider(nconf.get('readability.com:token'));

    // Command line backend if readability.com is unavailable or if we
    // exhausted their api limit.
    var FallbackBackend = require('./libs/readability-backend/cli.js');
    backendInstance.setFallback(new FallbackBackend());
}

rssHandler.setReadabilityBackend(backendInstance);
logger.info('Using %s backend', nconf.get('backend'));

/**
 * Request processor callback.
 */
var processRequest = function(req, res) {
  var urlParts = url.parse(req.url, true);
  var query = urlParts.query;

  if (query.url === undefined || query.url === '') {
    res.end('Provide a ?url=... parameter to get the full-text for the rss.');
    logger.warn('Invalid request', {url: req.url});
    return;
  }

  logger.info('Request Full RSS for %s', query.url);

  var requestStart = new Date();

  rssHandler.processRss(query.url, function(err, data) {
    if (err) {
      logger.error('Error requesting url', query.url, err);
      res.statusCode = 400;
      res.end('Invalid request.');
      return;
    }

    res.end(data);
    logger.info('Served Full RSS for %s in %s ms', query.url, (new Date() - requestStart));
  });
};

/**
 * Create server.
 */
var port = nconf.get('port');
var server = http.createServer(processRequest).listen(port);
server.on('error', function(error) {
  logger.error('Error on creating http server ::', error);
});
logger.info('Listening on port %d', port);
