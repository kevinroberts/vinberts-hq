var express = require('express');
var router = express.Router();
const debug = require('debug')('vinberts-hq');
const matcher = require('matcher');
var _ = require('lodash');
var S = require('string');
var weather = require('../core/weather');
var validStates = require('../resources/states_hash.json');

/* GET NOT USED  */
router.get('/', function (req, res, next) {
  res.send('Not used.');
});

router.post('/', function (req, res) {
  var usersRef = req.app.locals.firebase.database().ref('users');
  var numbers = appCache.get("subscribedNumbers");

  var resp = new req.app.locals.twilio.TwimlResponse();
  if (_.has(req.body, "From")) {

    processResponse(req, resp, usersRef, numbers, function (result) {
      res.writeHead(200, {
        'Content-Type': 'text/xml'
      });
      res.end(result.toString());
    });

  } else {
    res.sendStatus(401);
  }
});

function processResponse(req, resp, usersRef, numbers, cb) {
  var fromNum = req.body.From;
  var bodyText = req.body.Body.trim().toLowerCase();
  if (bodyText === 'subscribe') {
    if (numbers.indexOf(fromNum) !== -1) {
      resp.message('You are already subscribed!');
      cb(resp);
    } else {
      resp.message('Thank you, you are now subscribed. Reply "stop" to stop receiving updates. Reply "hour x" to change hour of daily update.');
      var userObj = {};
      userObj.phone = fromNum;
      userObj.updateHour = _.toSafeInteger(process.env.DEFAULT_HOUR);
      usersRef.push(userObj);
      cb(resp);
    }
  } else if (matcher.isMatch(bodyText, 'hour *')) {
    var hourStr = bodyText.split("hour ")[1];
    var hourNumber = _.toSafeInteger(hourStr);
    if (_.isInteger(hourNumber) && hourNumber > 0 && hourNumber < 25) {
      resp.message('Thank you, your daily update hour has been updated to ' + hourStr);
      // process hour preference change
      usersRef.orderByChild('phone').startAt(fromNum)
        .endAt(fromNum)
        .once('value', function (snap) {
          if (snap) {
            var updatedUser = {};
            updatedUser.updateHour = hourNumber;
            usersRef.child(Object.keys(snap.val())[0]).update(updatedUser, function (resp) {
              debug("updated subscribed user's hour to " + hourNumber);
            });
          }
          cb(resp);
        });
    } else {
      resp.message('Sorry, that is not a valid input. Please use an hour between 1-24');
      cb(resp);
    }

  } else if (matcher.isMatch(bodyText, 'weather')) {

    usersRef.orderByChild('phone').startAt(fromNum)
      .endAt(fromNum)
      .once('value', function (snap) {
        if (snap) {
          var fireUser = snap.val()[Object.keys(snap.val())[0]];
          if (_.has(fireUser, 'city')) {
            weather.getWeatherConditionsResponse(fireUser.state, fireUser.city, function (response) {
              if (response != null) {
                resp.message({}, function() {
                  this.body(response.message);
                  this.media(response.icon);
                });

                cb(resp);
              } else {
                resp.message("Sorry, weather service is currently down.");
                cb(resp);
              }
            });
          } else {
            weather.getWeatherConditionsResponse("IL", "Chicago", function (response) {
              if (response != null) {
                resp.message({}, function() {
                  this.body(response.message);
                  this.media(response.icon);
                });

                cb(resp);
              } else {
                resp.message("Sorry, weather service is currently down.");
                cb(resp);
              }
            });
          }
        }

      });

  } else if (matcher.isMatch(bodyText, 'astro')) {

    usersRef.orderByChild('phone').startAt(fromNum)
      .endAt(fromNum)
      .once('value', function (snap) {
        if (snap) {
          var fireUser = snap.val()[Object.keys(snap.val())[0]];
          if (_.has(fireUser, 'city')) {
            weather.getAstronomyResponse(fireUser.state, fireUser.city, function (response) {
              if (response != null) {
                resp.message(response.message);

                cb(resp);
              } else {
                resp.message("Sorry, weather service is currently down.");
                cb(resp);
              }
            });
          } else {
            weather.getAstronomyResponse("IL", "Chicago", function (response) {
              if (response != null) {
                resp.message(response.message);

                cb(resp);
              } else {
                resp.message("Sorry, weather service is currently down.");
                cb(resp);
              }
            });
          }
        }

      });

  } else if (matcher.isMatch(bodyText, 'forecast')) {

    usersRef.orderByChild('phone').startAt(fromNum)
      .endAt(fromNum)
      .once('value', function (snap) {
        if (snap) {
          var fireUser = snap.val()[Object.keys(snap.val())[0]];
          if (_.has(fireUser, 'city')) {
            weather.getWeatherForecastResponse(fireUser.state, fireUser.city, function (response) {
              if (response != null) {
                resp.message(response.message.substring(0, 160));

                cb(resp);
              } else {
                resp.message("Sorry, weather service is currently down.");
                cb(resp);
              }
            });
          } else {
            weather.getWeatherForecastResponse("IL", "Chicago", function (response) {
              if (response != null) {
                resp.message(response.message.substring(0, 160));

                cb(resp);
              } else {
                resp.message("Sorry, weather service is currently down.");
                cb(resp);
              }
            });
          }
        }

      });

  } else if (matcher.isMatch(bodyText, 'location * *')) {
    // change users default location
    var newLocation = S(bodyText).replaceAll("location ", '').s;

    if (!S(newLocation).contains(' ')) {
      resp.message('Sorry, that is not a valid input. Say something like "location IL Chicago" STATE CITY');
      cb(resp);
    } else {
      var state = newLocation.split(" ")[0].toUpperCase();
      var city = S(newLocation).replaceAll(newLocation.split(" ")[0] + ' ', '').replaceAll(' ', '_').titleCase().s;

      var validState = validStates[state];

      if (validState) {
        usersRef.orderByChild('phone').startAt(fromNum)
          .endAt(fromNum)
          .once('value', function (snap) {
            if (snap) {
              var updatedUser = {};
              updatedUser.city = city;
              updatedUser.state = state;
              usersRef.child(Object.keys(snap.val())[0]).update(updatedUser, function (resp) {
                debug("updated subscribed user's city / state to " + city + " " + state);
              });
              resp.message('Thanks. Your default location has been updated to ' + city + ', ' + state);
              cb(resp);
            }
          });
      } else {
        // not a valid state code
        resp.message('Sorry, that is not a valid state. Say something like "location IL Chicago" STATE CITY');
        cb(resp);
      }

    }

  } else if (bodyText === 'stopdaily') {
    if (numbers.indexOf(fromNum) !== -1) {
      resp.message('You are now unsubscribed from the daily updates');
      // process unsubscribe
      usersRef.orderByChild('phone').startAt(fromNum)
        .endAt(fromNum)
        .once('value', function (snap) {
          if (snap) {
            usersRef.child(Object.keys(snap.val())[0]).remove(function (complete) {
              debug("removed number from subscribed list");
            });
            cb(resp);
          }
        });
    } else {
      resp.message('You are not subscribed - if you would like to, text "Subscribe"');
      cb(resp);
    }
  }
  else {
    resp.message('Welcome to Daily Updates. Text "Subscribe" receive updates. Change daily update hour by "hour x"');
    cb(resp);
  }

}

module.exports = router;
