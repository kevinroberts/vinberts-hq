const debug = require('debug')('vinberts-hq');
var CronJob = require('cron').CronJob;
var moment = require('moment');
var _ = require('lodash');
var weather = require('./weather');
var colors = require('ansi-colors');

function getDefaultTz() {
  var timezoneEnv = process.env.TIMEZONE;
  if (timezoneEnv == null) {
    return 'America/Chicago';
  } else {
    return timezoneEnv;
  }
}

var scheduledMessages = function (firebase, client) {

  var hourlyUpdateJob = new CronJob({
    cronTime: '00 00 * * * 1-5',
    onTick: function () {
      /*
       * Runs every hour on week days
       *
       */
      debug('hourly scheduled messages job started.');
      var usersRef = firebase.database().ref('users');
      var numbers = appCache.get("subscribedNumbers");

      var currentDate = new Date();
      var currentHour = currentDate.getHours();

      _.forEach(numbers, function (number) {
        usersRef.orderByChild('phone').startAt(number)
          .endAt(number)
          .once('value', function (snap) {
            if (snap) {
              var fireUser = snap.val()[Object.keys(snap.val())[0]];
              if (fireUser.updateHour === currentHour) {
                debug('current hour equals subscribers update hour User: ', fireUser);

                // grab weather data from service
                if (_.has(fireUser, 'city')) {
                  weather.getWeatherConditionsResponse(fireUser.state, fireUser.city, function (response) {
                    if (response != null) {
                      var nowFormat = moment().format("ddd, hA");
                      client.messages.create({
                        to: fireUser.phone,
                        from: process.env.TWILIO_NUMBER,
                        body: "scheduled message for " + nowFormat + " : " + response.message
                      }, function (err, message) {
                        if (!err) {
                          debug('message sent', message.sid);
                        } else {
                          console.error('error sending message', err);
                        }
                      });

                    }

                  });
                } else {
                  weather.getWeatherConditionsResponse("IL", "Chicago", function (response) {
                    if (response != null) {
                      var nowFormat = moment().format("ddd, hA");
                      client.messages.create({
                        to: fireUser.phone,
                        from: process.env.TWILIO_NUMBER,
                        body: "scheduled message for " + nowFormat + " : " + response.message
                      }, function (err, message) {
                        if (!err) {
                          debug('message sent', message.sid);
                        } else {
                          console.error('error sending message', err);
                        }
                      });

                    }

                  });
                }

              } else {
                debug('current hour ' + currentHour + ' does not match the subscribers set hour of ' + fireUser.updateHour);
              }
            }
          });
      });

      debug('hourly scheduled messages job finished.');

    },
    start: false,
    timeZone: getDefaultTz()
  });

  hourlyUpdateJob.start();
  debug(colors.green('hourly update job initiated'));

};

module.exports = scheduledMessages;