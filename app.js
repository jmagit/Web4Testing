const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const ficherosRouter = require('./routes/ficheros');
const seguridadRouter = require('./routes/seguridad');
const apiRouter = require('./routes/apirest');

const app = express();
app.disable("x-powered-by");

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', ficherosRouter);
app.use('/', seguridadRouter);
app.use('/', indexRouter);
app.use('/api', apiRouter.router);

app.all('/eco(/*)?', function (req, res) {
  res.status(200).json({
    url: req.url,
    method: req.method,
    headers: req.headers,
    authentication: res.locals,
    cookies: req.cookies,
    params: req.params,
    query: req.query,
    body: req.body,
    path: path.parse('../')
  }).end();
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // CSRF token errors
  if (err.code === 'EBADCSRFTOKEN') err.status = 403

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
