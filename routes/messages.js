var express = require('express');
var router = express.Router();
const debug = require('debug')('vinberts-hq');
const matcher = require('matcher');
var _ = require('lodash');
var weather = require('../core/weather');

/* GET NOT USED  */
router.get('/', function (req, res, next) {
  res.send('Not used.');
});

router.post('/', function (req, res) {
  var usersRef = req.app.locals.firebase.database().ref('users');
  var numbers = appCache.get("subscribedNumbers");

  var resp = new req.app.locals.twilio.TwimlResponse();
  if (_.has(req.body, "From")) {
    var fromNum = req.body.From;
    var bodyText = req.body.Body.trim().toLowerCase();
    if (bodyText === 'subscribe') {
      if (numbers.indexOf(fromNum) !== -1) {
        resp.message('You are already subscribed!');
      } else {
        resp.message('Thank you, you are now subscribed. Reply "stop" to stop receiving updates. Reply "hour 8" to change hour of daily update.');
        var userObj = {};
        userObj.phone = fromNum;
        userObj.updateHour = _.toSafeInteger(process.env.DEFAULT_HOUR);
        usersRef.push(userObj);
      }
    } else if (matcher.isMatch(bodyText, 'hour *')) {

      var hourStr = bodyText.split("hour ")[1];
      var hourNumber = _.toSafeInteger(hourStr);
      if (_.isInteger(hourNumber) && hourNumber < 25) {
        resp.message('Thank you, your daily update hour has been updated to ' + hourStr);
        // process hour preference change
        usersRef.orderByChild('phone').startAt(fromNum)
          .endAt(fromNum)
          .once('value', function (snap) {
            if (snap) {
              var updatedUser = snap.val();
              updatedUser.updateHour = hourNumber;
              usersRef.child(Object.keys(snap.val())[0]).update(updatedUser, function (resp) {
                debug("updated subscribed user's hour to " + hourNumber);
              });
            }
          });
      } else {
        resp.message('Sorry, that is not a valid input. Please use an hour between 1-24');
      }

    } else if (matcher.isMatch(bodyText, 'weather')) {
      weather.getWeatherResponse(function (response) {
        if (response != null) {
          resp.message(response.message);
        } else {
          resp.message("Sorry, weather service is currently down.")
        }
      });
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
            }
          });
      } else {
        resp.message('You are not subscribed - if you would like to, text "Subscribe"');
      }
    }
    else {
      resp.message('Welcome to Daily Updates. Text "Subscribe" receive updates.');
    }

    res.writeHead(200, {
      'Content-Type': 'text/xml'
    });
    res.end(resp.toString());
  } else {
    res.sendStatus(401);
  }
});

module.exports = router;
