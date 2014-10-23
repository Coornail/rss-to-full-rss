FROM dockerfile/nodejs

EXPOSE 8000:8000

RUN apt-get update &&\
  apt-get upgrade -y &&\
  apt-get install -y git memcached supervisor &&\
  apt-get clean &&\
  apt-get autoclean

RUN git clone https://github.com/Coornail/rss-to-full-rss.git
RUN mv ./rss-to-full-rss/* .
RUN npm install

ADD supervisord.conf /etc/supervisor/conf.d/supervisord.conf
ENTRYPOINT ["/usr/bin/supervisord"]
