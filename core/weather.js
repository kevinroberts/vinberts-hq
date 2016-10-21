const debug = require('debug')('vinberts-hq');
var unirest = require('unirest');
var S = require('string');
var _ = require('lodash');

module.exports = {

  getWeatherConditionsResponse: function (callback) {
    var response = {};
    var url = S(process.env.WUNDERGROUND_URL).replaceAll("$KEY$", process.env.WUNDERGROUND_KEY).s;

    url = S(url).replaceAll("$TYPE$", 'conditions').s;

    unirest.get(url)
      .header("Accept", "application/json")
      .end(function (result) {
        if (result && result.status == 200) {
          if (result.body.current_observation) {
            var weatherStatus = result.body.current_observation;
            var responseMsg = '';
            responseMsg += "The weather today is " + weatherStatus.weather;
            responseMsg += " with temperatures currently at " + weatherStatus.temperature_string;
            var precipToday = _.toSafeInteger(weatherStatus.precip_today_in);
            if (precipToday > 0) {
              responseMsg += " precipitation in inches predicted: " + weatherStatus.precip_today_in;
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
  }
};