/**
 * Alarm module
 * @module alarm
 */

var EventEmitter = require('events').EventEmitter;
var format = require('util').format;
var inherits = require("util").inherits;
var sort = require('./sort');

/**
 * Alarm is used to track a rolling average over a set of keys
 * @constructor
 */
function Alarm() {

  // the currently active alarms
  this.active = {};

  // the current averages across all keys
  this.average = {};

  // the alarm interval (needed so it can be cleared later)
  this.interval = null;

  // the numner of currently active alarms
  this.numberOfActive = 0;

  // threshold of when to fire an alarm
  this.threshold = null;

  // the current collection window duration
  this.window = null;

  var self = this;

  /**
   * Add a new value to the averate
   * @param {number} average - The current average.
   * @param {number} newValue - The new value to add to the average.
   * @param {number} count - The number of items in the window.
   */
  this.rollingAverage = function(average, newValue, count) {
    average -= average / count;
    average += newValue / count;
    return average;
  };

  /**
   * Trigger an alarm
   * @param {string} data - The KVP with a key and value of the alarm.
   * @param {date} now - Optional value to override when the alarm was triggered
   */
  this.triggerAlarm = function(data, now) {
    now = now || new Date();
    self.numberOfActive++;
    self.active[data.key] = data;
    self.emit(
      'triggered',
      format('High traffic generated an alert for %s - hits = %d, triggered at %s', data.key, data.value, now),
      data.key,
      data.value);
  };

  /**
   * Resolve an alarm
   * @param {string} data - The KVP with a key and value of the alarm.
   * @param {date} now - Optional value to override when the alarm was resolved
   */
  this.resolveAlarm = function(data, now) {
    now = now || new Date();
    self.numberOfActive--;
    delete self.active[data.key];
    self.emit(
      'resolved',
      format('Traffic has returned to normal for site %s at %s', data.key, now),
      data.key,
      data.value);
  };

  /**
   * Check if any averages have gone other the threshold
   */
  this.checkAlarm = function() {
    var now = new Date();
    var current = self.average;
    self.average = {};

    var averageHeap = sort.toHeap(current);
    for (var i = 0, length = averageHeap.size(); i < length; i++) {
      var data = averageHeap.pop();
      var isCurrentlyAlarmed = self.isActive(data.key);

      if (data.value < self.threshold && !self.hasActiveAlarms()) {
        // shortciruit, because the heap is sorted, we can break out
        break;
      } else if (data.value < self.threshold && isCurrentlyAlarmed) {
        // active alarm is now under the thresold, resolve
        self.resolveAlarm(data, now);
      } else if (data.value >= self.threshold && !isCurrentlyAlarmed) {
        // non-active alarm is now over the threshold, trigger it
        self.triggerAlarm(data, now);
      }
    }

    // if we did not receive any data from a site, the alarm would never clear
    // so if we did not recive any data in this interval clear it the alarm
    if (self.hasActiveAlarms()) {
      Object.keys(self.active).forEach(function(key) {
        if (!(current[key])) {
          self.resolveAlarm(self.active[key], now);
        }
      });
    }
  };
  EventEmitter.call(this);
}
inherits(Alarm, EventEmitter);

/**
 * Start up alarm service to enable alarming
 * @param {number} alarmIntervalValue - The alarm window
 * @param {number} collectionIntervalValue - The interval at which we report data
 * @param {number} thresholdValue - The threshold of when an alarm should be fired
 */
Alarm.prototype.start = function(alarmIntervalValue, collectionIntervalValue, thresholdValue) {
  this.alarmInterval = alarmIntervalValue;
  this.collectionInterval = collectionIntervalValue;
  this.threshold = thresholdValue;
  this.window = alarmIntervalValue / collectionIntervalValue;

  this.interval = setInterval(this.checkAlarm, this.alarmInterval);
};

/**
 * Stop the alarm service
 */
Alarm.prototype.stop = function() {
  if (this.interval) {
    clearInterval(this.interval);
  }
};

/**
 * Get the average for an existing key
 * @param {string} the key of the entity
 */
Alarm.prototype.average = function(key) {
  return this.average[key];
};

/**
 * Are there any alarms in a triggered state
 */
Alarm.prototype.hasActiveAlarms = function() {
  return this.numberOfActive > 0;
};

/**
 * Is an existing key in a triggered state
 * @param {string} the key of the entity`
 */
Alarm.prototype.isActive = function(key) {
  return (key in this.active);
};

/**
 * Update the average of of an existing entity
 * @param {string} the key of the entity
 * @param {number} vale to add to the average
 */
Alarm.prototype.update = function(key, value) {
  if (!this.average[key]) {
    this.average[key] = { key: key, value: 0};
  }
  this.average[key].value = this.rollingAverage(this.average[key].value || 0, value || 0, this.window);
};

module.exports = Alarm;
