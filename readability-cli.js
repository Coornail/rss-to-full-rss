#!/usr/bin/env node

'use strict';

var read = require('node-readability');
var url = process.argv[2];

read(url, function(err, article, meta) {
  process.stdout.write(article.content);
});
