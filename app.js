require('dotenv').config({silent: true});
const debug = require('debug')('vinberts-hq');

var express = require('express'),
  path = require('path'),
  favicon = require('serve-favicon'),
  logger = require('morgan'),
  cookieParser = require('cookie-parser'),
  bodyParser = require('body-parser'),
  hbs = require('express-hbs'),
  NodeCache = require( "node-cache" ),
  colors = require('ansi-colors');

appCache = new NodeCache();

var firebase = require('./core/firebaseInit');
debug(colors.green('Firebase db initiated'));

if (!process.env.TWILIO_ACCOUNTSID) {
  console.error('Error: Specify TWILIO_ACCOUNTSID in node environment');
  process.exit(1);
}

var twilio = require('twilio'),
    client = twilio(process.env.TWILIO_ACCOUNTSID, process.env.TWILIO_AUTHTOKEN);

var routes = require('./routes/index');
var messages = require('./routes/messages');

// setup scheduled messages
var scheduledMessages = require('./core/scheduledMessages');
scheduledMessages(firebase, client);

var app = express();

// view engine setup
app.engine('hbs', hbs.express4({
  defaultLayout: __dirname + '/views/layouts/default.hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials'
}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.locals.firebase = firebase;
app.locals.twilio = twilio;

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/messages', messages);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

// ---------------------Testing------------------------------

// var usersRef = firebase.database().ref('users');
// var numbers = ['+number'];
//
// var currentDate = new Date();
// var currentHour = currentDate.getHours();
// var _ = require('lodash');
//
// weather.getWeatherResponse(function (response) {
//   if (response != null) {
//     _.forEach(numbers, function (number) {
//       usersRef.orderByChild('phone').startAt(number)
//         .endAt(number)
//         .once('value', function (snap) {
//           if (snap) {
//             var fireUser = snap.val()[Object.keys(snap.val())[0]];
//
//             client.messages.create({
//               to: fireUser.phone,
//               from: process.env.TWILIO_NUMBER,
//               body: response.message
//             }, function(err, message) {
//               if (!err) {
//                 debug('message sent', message.sid);
//               } else {
//                 debug('error sending message', err);
//               }
//             });
//           }
//         });
//     });
//   }
// });

// ----------------------------------------------------------

module.exports = app;
