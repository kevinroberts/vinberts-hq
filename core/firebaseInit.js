var firebase = require('firebase');
var _ = require('lodash');
const debug = require('debug')('vinberts-hq');

if (!process.env.FIREBASEURI) {
  console.error('Error: Specify FIREBASEURI in node environment');
  process.exit(1);
}
if (!process.env.SERVICE_ACCOUNT_LOCATION) {
  console.error('Error: SERVICE_ACCOUNT_LOCATION path missing in node environment');
  process.exit(1);
}

var config = {
  databaseURL: process.env.FIREBASEURI,
  serviceAccount: process.env.SERVICE_ACCOUNT_LOCATION
};

firebase.initializeApp(config);

var usersRef = firebase.database().ref('users');

var numbersArr = [];

appCache.set("subscribedNumbers", numbersArr);

usersRef.on('child_added', function (snapshot) {
  numbersArr.push(snapshot.val().phone);
  debug('Added number ' + snapshot.val().phone);
  appCache.set("subscribedNumbers", numbersArr, function (err, success) {
    if (!err && success) {
      debug("loaded subscribed numbers into app cache");
    }
  });
});

usersRef.on('child_removed', function (snapshot) {
  _.remove(numbersArr, function (n) {
    return n === snapshot.val().phone
  });
  debug('removed number ' + snapshot.val().phone);
  appCache.set("subscribedNumbers", numbersArr, function (err, success) {
    if (!err && success) {
      debug("loaded subscribed numbers into app cache");
    }
  });
});


module.exports = firebase;