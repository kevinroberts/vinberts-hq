const debug = require('debug')('vinberts-hq');
var unirest = require('unirest');
var S = require('string');
var _ = require('lodash');
var moment = require('moment');
require('moment-precise-range-plugin');

module.exports = {

  getWeatherConditionsResponse: function (state, city, callback) {
    var response = {};

    // Format of url looks like http://api.wunderground.com/api/$KEY$/$TYPE$/q/$STATE$/$CITY$.json
    var url = S(process.env.WUNDERGROUND_URL).replaceAll("$KEY$", process.env.WUNDERGROUND_KEY).s;

    url = S(url).replaceAll("$TYPE$", 'conditions').s;
    url = S(url).replaceAll("$STATE$", state).s;
    url = S(url).replaceAll("$CITY$", city).s;

    unirest.get(url)
      .header("Accept", "application/json")
      .end(function (result) {
        if (result && result.status == 200) {
          if (result.body.current_observation) {
            var weatherStatus = result.body.current_observation;
            var responseMsg = '';
            responseMsg += "The weather today is " + weatherStatus.weather;
            responseMsg += " with temps currently at " + weatherStatus.temperature_string;
            var precipToday = _.toNumber(weatherStatus.precip_today_in);
            if (precipToday > 0) {
              responseMsg += " precip predicted: " + weatherStatus.precip_today_in + " inches ☔";
            }
            response.message = responseMsg;
            if (_.has(weatherStatus, 'icon_url')) {
              response.icon = weatherStatus.icon_url;
            }
            if (_.has(weatherStatus, 'forecast_url')) {
              response.url = weatherStatus.forecast_url;
            } else {
              response.url = 'http://www.wunderground.com';
            }

            callback(response);
          }
        } else {
          console.error("could not get weather from wunderground ", result.status);
          callback(null);
        }
      });
  },

  getWeatherForecastResponse: function (state, city, callback) {
    var response = {};
    var url = S(process.env.WUNDERGROUND_URL).replaceAll("$KEY$", process.env.WUNDERGROUND_KEY).s;

    url = S(url).replaceAll("$TYPE$", 'forecast').s;
    url = S(url).replaceAll("$STATE$", state).s;
    url = S(url).replaceAll("$CITY$", city).s;

    unirest.get(url)
      .header("Accept", "application/json")
      .end(function (result) {
        if (result && result.status == 200) {
          if (_.has(result.body, 'forecast')) {
            var weatherForecastDays = result.body.forecast.txt_forecast.forecastday;

            var responseMsg = '';

            _.each(weatherForecastDays, function (day) {
              // limit to 4 day forecast
              if (day.period < 4) {
                responseMsg += day.title + ": ";
                responseMsg += day.fcttext + "\n";
              }
            });

            response.message = responseMsg;

            callback(response);
          }
        } else {
          console.error("could not get weather from wunderground ", result.status);
          callback(null);
        }
      });
  },

  getAstronomyResponse: function(state, city, callback) {
    var response = {};
    var url = S(process.env.WUNDERGROUND_URL).replaceAll("$KEY$", process.env.WUNDERGROUND_KEY).s;

    url = S(url).replaceAll("$TYPE$", 'astronomy').s;
    url = S(url).replaceAll("$STATE$", state).s;
    url = S(url).replaceAll("$CITY$", city).s;

    unirest.get(url)
      .header("Accept", "application/json")
      .end(function (result) {
        if (result && result.status == 200) {
          if (_.has(result.body, 'moon_phase')) {
            var moonFacts = result.body.moon_phase;

            var now = moment();
            var sunset = moment();
            sunset.hours(moonFacts.sunset.hour);
            sunset.minutes(moonFacts.sunset.minute);

            var responseMsg = '';

            responseMsg += 'Sunrise is at ' + moonFacts.sunrise.hour + ':' + moonFacts.sunrise.minute + ' am\n';
            responseMsg += 'Sunset is at ' + sunset.format("h:mm A");

            if (now.diff(sunset) < 0) {
              // if now() is before sunset - how many hours till sunset?
              var hoursFromNow = moment.preciseDiff(now, sunset);
              responseMsg += " in " + hoursFromNow + " from now\n";
            } else {
              responseMsg += "\n";
            }

            responseMsg += 'moon phase is ' + moonFacts.phaseofMoon;

            response.message = responseMsg;

            callback(response);
          }
        } else {
          console.error("could not get weather from wunderground ", result.status);
          callback(null);
        }
      });
  }
};