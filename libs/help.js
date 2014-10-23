'use strict';

var help = {};

help.getHelp = function(defaultConfig) {
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
};

module.exports = help;
