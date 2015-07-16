var Alarm = require('./alarm');
var CaptureHttp = require('./captureHttp');

var geoip = require('geoip-lite');
var sort = require('./sort');
var ui = require('./ui');
var url = require('url');

var TOPK_SITES = 10;
var TOPK_PAGES = 10;

var alarm;
var capture;
var sites = {};
var pagesPerSite = {};
var reportInterval;

function onAlarmTriggered(message) {
  ui.addMessage(message);
}

function onAlarmResolved(message) {
  ui.addMessage(message);
}

function reportStatistics() {
  var currentSites = sites;
  var currentPages = pagesPerSite;
  sites = {};
  pagesPerSite = {};

  // calculate the top websites, get topK
  var topSites = sort.topK(currentSites, TOPK_SITES, function(data) {
    alarm.update(data.key, data.value);
  });

  // calculate the top pages in the site, get topK
  topSites.forEach(function(site) {
    var pages = currentPages[site.key];
    if (pages) {
      site.pages = sort.topK(pages, TOPK_PAGES);
    }
  });

  ui.setTopSites(topSites);
  ui.setMap(topSites);
}

 // TODO: analyze HTTP response codes
// function onResponse(session, request, response) {
// }

function onRequest(session, request) {
  var headers = request && request.headers || {};
  var host = headers.Host;
  var pageUrl = url.parse(request.url);

  // simple attempt to skip files, we only want pages
  var hasExtension = pageUrl.pathname.match(/\.[a-z]{1,5}$/i);
  if (hasExtension) {
    return;
  }

  // grab geoip data
  var src = session && session.tcp_session && session.tcp_session.src && session.tcp_session.src.split(':')[0];
  var dest = session && session.tcp_session && session.tcp_session.dst && session.tcp_session.dst.split(':')[0];

  // track top sites, it looks nice to always have a / in the front
  var page = pageUrl.pathname.split('/')[1] || '/';
  if (page[0] !== '/') {
    page = '/' + page;
  }

  // add the site to the list with its default values
  var site = sites[host];
  if (!site) {
    site = {key:host, value:0, src: {}, dest: {}};
    sites[host] = site;
  }
  site.value += 1;

  // add in geoIP data for the map
  if (dest && (!(dest in site.dest))) {
    var dlookup = geoip.lookup(dest);
    if (dlookup) {
      site.dest[dest] = dlookup;
    }
  }

  if (src && (!(src in site.src))) {
    var slookup = geoip.lookup(src);
    if (slookup) {
      site.src[src] = slookup;
    }
  }

  // track top pages
  if (!pagesPerSite[host]) {
    pagesPerSite[host] = {};
  }

  if (!pagesPerSite[host][page]) {
    pagesPerSite[host][page] = {key:page, value:0};
  }
  pagesPerSite[host][page].value += 1;
}

function onStart(interface, filter) {
  ui.addMessage('.. Listening on ' + this.session.device_name);
  ui.addMessage('.. Using filter ' + filter);
}

function isRunning() {
  return capture && capture.isRunning() || false;
}

function start(options) {
  ui.render();

  capture = new CaptureHttp(options.interface);
  capture.on('request', onRequest);
  //capture.on('response', onResponse);
  capture.on('start', onStart);
  capture.start();

  alarm = new Alarm();
  alarm.on('triggered', onAlarmTriggered);
  alarm.on('resolved', onAlarmResolved);
  alarm.start(options.alarmInterval, options.alarmThreshold, options.reportingInterval);

  reportInterval = setInterval(reportStatistics, options.reportingInterval);
}

function stop() {
  if (reportInterval) {
    clearInterval(reportInterval);
  }

  if (alarm) {
    alarm.stop();
    alarm.removeListener('triggered', onAlarmTriggered);
    alarm.removeListener('resolved', onAlarmResolved);
  }

  if (capture) {
    capture.stop();
    capture.removeListener('request', onRequest);
    //capture.removeListener('response', onResponse);
    capture.removeListener('start', onStart);
  }
}

module.exports = {
  isRunning: isRunning,
  start:start,
  stop: stop
};
