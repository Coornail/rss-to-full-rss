'use strict';

var request = require('request');

function ReadabilityComBackend(token) {
  this.token = token;
  this.fallback = null;
}

ReadabilityComBackend.prototype.setFallback = function(fallback) {
  this.fallback = fallback;
  // Let's not exhaust the fallback in case we have to rely on it.
  this.parallelLimit = this.fallback.parallelLimit;
};

ReadabilityComBackend.prototype.fetch = function(item, cb) {
  var url = 'http://readability.com/api/content/v1/parser?url=' + encodeURIComponent(item.link) + '&token=' + this.token;
  var that = this;

  var handleResponse = function (error, response, body) {
    if (!error && response.statusCode === 200) {
      var article = JSON.parse(body);
      item.description = article.content;
      cb(null, item);
      return;
    }

    if (that.fallback) {
      that.fallback.fetch(item, cb);
    } else {
      cb(body);
    }
  };

  request(url, handleResponse);
};

module.exports = ReadabilityComBackend;
