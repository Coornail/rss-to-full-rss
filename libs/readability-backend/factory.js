'use strict';

var readabilityBackend = {};

/**
 * Factory to get the readability backend based on command line arguments.
 *
 * @param config
 *   nconf configuration
 *
 * @returns
 *   Readability backend.
 */
readabilityBackend.get = function(config) {
// Set up backend.
  var BackendProvider;
  var backendInstance;

  switch (config.get('backend')) {
    case 'cli':
      BackendProvider = require('./cli.js');
      backendInstance = new BackendProvider();
      break;

    case 'inApp':
      BackendProvider = require('./in-app.js');
      backendInstance = new BackendProvider();
      break;

    case 'readability.com':
      // Set up readability.com with token.
      BackendProvider = require('./readability-com.js');
      backendInstance = new BackendProvider(config.get('readability.com:token'));

      // Command line backend if readability.com is unavailable or if we
      // exhausted their api limit.
      var FallbackBackend = require('./cli.js');
      backendInstance.setFallback(new FallbackBackend());
      break;

    case 'unfluff':
      BackendProvider = require('./unfluff.js');
      backendInstance = new BackendProvider();
  }

  return backendInstance;
};

module.exports = readabilityBackend;
