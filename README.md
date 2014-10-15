RSS to full RSS Proxy
===============

Converts truncated RSS feeds to full RSS using the readability algorithm.

Are you bothered that you cannot access the full content of sites from your rss reader?
This program fetches and parses the articles using the <a href="https://code.google.com/p/arc90labs-readability/">arc90</a> algorithm by <a href="https://www.readability.com/">readability</a>.

Usage
-----
```sh
npm install git@github.com:Coornail/rss-to-full-rss.git 
node_modules/.bin/rss-to-full-rss
```

The proxy listens on port 8000 by default.
Try your favourite rss via http://127.0.0.1:8000/?url=[rss feed].

Advanced usage
--------------
### Start daemon on a different port
```sh
node_modules/.bin/rss-to-full-rss --port [port_number]
```

### Add memcache caching backend
So you don't have to fetch the articles every time. (Assuming memcache is running on 127.0.0.1:11211)
```sh
node_modules/.bin/rss-to-full-rss --cacheProvider memcache
```

### Set up your config file
```sh
cp config.json.example config.json
vim config.json
```

License
-------
MIT
