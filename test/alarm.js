var Alarm = require('../lib/alarm');

var assert = require('chai').assert;
var chai = require('chai');
var expect = require('chai').expect;
var spies = require('chai-spies');

chai.use(spies);

describe('Bloodhound Alarms', function() {

  // TODO: create a stream of values with timestamps
  // so it can be replayed
  function generateData(alarm, average, interval) {
    var value = average * interval;
    alarm.update('key', value);
  }

  describe('Initial State', function() {
    it('does not have any alarms triggered when created', function() {
      var alarm = new Alarm();
      expect(alarm.hasActiveAlarms()).to.equal(false);
    });
  });

  describe('Triggering an Alam', function() {
    this.timeout(5000);

    it('does not trigger an alarm if the data is under the threshold', function(done) {
      var alarm = new Alarm();
      var errTimeout = setTimeout(function() {
        alarm.stop();
        assert(true);
        done();
      }, 1500);
      alarm.on('triggered', function() {
        clearTimeout(errTimeout);
        alarm.stop();
        assert(false, 'Alarm was triggered');
        done();
      });

      alarm.start(1000, 333, 20);
      generateData(alarm, 19, 3);
    });

    it('does trigger an alarm if the data is above the threshold', function(done) {
      var alarm = new Alarm();
      var errTimeout = setTimeout(function() {
        alarm.stop();
        assert(false, 'Alarm was NOT triggered');
        done();
      }, 1500);
      alarm.on('triggered', function() {
        clearTimeout(errTimeout);
        alarm.stop();
        assert(true);
        done();
      });

      alarm.start(1000, 333, 20);
      generateData(alarm, 30, 3);
    });

    it('does not trigger an alarm if the alarm is already triggered', function(done) {
      var alarm = new Alarm();
      var spy = chai.spy();
      alarm.on('triggered', spy);

      setTimeout(function() {
        alarm.stop();
        clearInterval(interval);

        expect(spy).to.have.been.called.once;
        done();
      }, 1500);

      alarm.start(1000, 333, 20);

      var interval = setInterval(function() {
        generateData(alarm, 30, 3);
      }, 100);

    });
  });

  describe('Resolving an Alarm', function() {
    this.timeout(5000);

    it('does resolve an alarm if the data is now under the threshold', function(done) {
      var alarm = new Alarm();
      var errTimeout = setTimeout(function() {
        alarm.stop();
        assert(false, 'Alarm was NOT resolved');
        done();
      }, 1000);
      alarm.on('resolved', function() {
        clearTimeout(errTimeout);
        alarm.stop();
        assert(true);
        done();
      });

      alarm.start(300, 100, 20);
      generateData(alarm, 30, 3);
      setTimeout(function() {
        generateData(alarm, 20, 3);
      }, 400);
    });

    it('does not resolve an alarm if the data is above the threshold', function(done) {
      var alarm = new Alarm();
      var errTimeout = setTimeout(function() {
        clearInterval(interval);
        alarm.stop();
        assert(true);
        done();
      }, 1000);
      alarm.on('resolved', function() {
        clearTimeout(errTimeout);
        clearInterval(interval);
        alarm.stop();
        assert(false, 'Alarm should NOT have been resolved');
        done();
      });

      alarm.start(300, 100, 20);
      generateData(alarm, 30, 3);
      var interval = setInterval(function() {
        generateData(alarm, 30, 3);
      }, 200);
    });

    it('does not resolve an alarm if the alarm is not already triggered', function() {
      var alarm = new Alarm();
      var errTimeout = setTimeout(function() {
        clearInterval(interval);
        alarm.stop();
        assert(true);
        done();
      }, 1000);
      alarm.on('resolved', function() {
        clearTimeout(errTimeout);
        clearInterval(interval);
        alarm.stop();
        assert(false, 'Alarm should NOT have been resolved');
        done();
      });

      alarm.start(300, 100, 20);
      generateData(alarm, 15, 3);
      var interval = setInterval(function() {
        generateData(alarm, 5, 3);
      }, 200);
    });
  });
});
