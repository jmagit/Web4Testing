const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const fs = require('fs')
const jwt = require('jsonwebtoken')
const formidable = require("formidable");

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var formulariosRouter = require('./routes/formularios');
var apiRouter = require('./routes/apirest');
var seguridadRouter = require('./routes/seguridad');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/', seguridadRouter);
app.use('/users', usersRouter);
app.use('/formularios', formulariosRouter);
app.use('/api', apiRouter.router);

app.get('/calculadora', function (req, res, next) {
  res.render('calculadora', { title: 'Calculadora', baseUrl: req.path });
});
app.get('/compras', function (req, res, next) {
  res.render('carrito', { title: 'Carrito de la compra', baseUrl: req.path });
});

app.get('/biblioteca', function (req, res, next) {
  res.render('biblioteca', { title: 'Biblioteca', baseUrl: req.path });
});

app.get('/alertas', function (req, res, next) {
  res.render('alertas', { title: 'Alertas', baseUrl: req.path });
});


app.use('/files', express.static('uploads'))
app.get('/fileupload', async function (req, res) {
  const files = await fs.promises.readdir(__dirname + "/uploads/");
  res.render('fileupload', { title: 'Ficheros', baseUrl: req.path, files: files });
})
app.post('/fileupload', function (req, res) {
  let form = new formidable.IncomingForm();
  form.uploadDir = __dirname + "/uploads/";
  form.parse(req, async function (err, fields, files) {
    try {
      if (err) throw err;
      let oldpath = files.filetoupload.path;
      let newpath = `${__dirname}/uploads/${files.filetoupload.name}`;
      await fs.promises.rename(oldpath, newpath);
      res.redirect('/fileupload');
    } catch (error) {
      res.status(500).json(error).end();
    }
  });
})
app.get('/deleteupload', async function (req, res) {
  const file = req.query.file;
  if(file)
    await fs.promises.unlink(`${__dirname}/uploads/${file}`);
  res.redirect('/fileupload');
})

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
