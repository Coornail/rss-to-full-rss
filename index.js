var http = require('http');
var url = require('url');
var RssToFullRss = require('./libs/rss-to-fullrss');

var rssHandler = new RssToFullRss();

/**
 * Request processor callback.
 */
var processRequest = function(req, res) {
  var url_parts = url.parse(req.url, true);
  var query = url_parts.query;

  if (query.url === undefined) {
    res.end('Provide a ?url=... parameter to get the full-text for the rss.');
    return;
  }

  rssHandler.processRss(query.url, function(err, data) {
    res.write(data);
    res.end();
  });
};

http.createServer(processRequest).listen(8000);
