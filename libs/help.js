'use strict';

var chalk = require('chalk');

var help = {};

/**
 */
help._getEngines = function() {
  return [
    require('./readability-backend/cli.js'),
    require('./readability-backend/in-app.js'),
    require('./readability-backend/readability-com.js'),
    require('./readability-backend/unfluff.js')
  ];
};

help.getHelp = function(defaultConfig) {
  console.log('Rss to Full Rss converter.');
  console.log('');
  console.log('--port [port]                                  default: ' + defaultConfig.port);
  console.log('--cacheProvider [none|memcached]               default: ' + defaultConfig.cacheProvider);
  console.log('--memcached:host [host]                        default: ' + defaultConfig.memcached[0].host);
  console.log('--memcached:port [port]                        default: ' + defaultConfig.memcached[0].port);
  console.log('--backend [cli|inApp|readability.com|unfluff]  default: ' + defaultConfig.backend);
  console.log('  For more info use --help backend');
  console.log('--readability.com:token [token]                default: ' + defaultConfig['readability.com'].token);
  console.log('--verbose');
  console.log('');
  console.log('You can use the config.json to set up the config as well.');
  console.log('See config.json.example');
};

help.getBackendHelp = function() {
  console.log('Available backends:');
  help._getEngines().forEach(function(engine) {
    var e = new engine();

    console.log('');
    console.log(chalk.bold(e.getName()));
      if (typeof e.getDescription === 'function') {
        console.log(e.getDescription());
    }
  });
};

module.exports = help;
