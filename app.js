const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const rfs = require('rotating-file-stream')
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml')
const OpenApiValidator = require('express-openapi-validator');
const validator = require('validator');

const config = require('./config')
const indexRouter = require('./routes/index');
const ficherosRouter = require('./routes/ficheros');
const seguridad = require('./routes/seguridad');
const apiRouter = require('./routes/apirest');
const { generaSwaggerSpecification } = require('./routes/openapi-generator');
const { generateErrorByError } = require('./routes/utils')

let VALIDATE_XSRF_TOKEN = false;

const app = express();
app.disable("x-powered-by");
app.PUERTO = process.env.PORT || '8181';
app.set('port', app.PUERTO);

const shutdown = () => {
  if (app.server) {
    app.server.close()
  }
  process.kill(process.pid, 'SIGTERM');
}

// eslint-disable-next-line no-unused-vars
const extraeURL = req => (
  {
    protocol: req.protocol,
    hostname: req.hostname,
    port: req.connection.localPort,
  }
);

// Argumentos de entrada
process.argv.forEach(val => {
  if (val.toLocaleLowerCase().startsWith('--port='))
    app.set('port', val.substring('--port='.length))
  else if (val.toLocaleLowerCase().startsWith('--xsrf')) {
    VALIDATE_XSRF_TOKEN = true
    console.info('Activada protección XSRF.')
  }
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(logger('combined', {
  stream: rfs.createStream("file.log", {
    path: path.join(__dirname, 'log'), // directory
    size: "10M", // rotate every 10 MegaBytes written
    interval: "1d", // rotate daily
    compress: "gzip" // compress rotated files
  })
}))
app.use(express.json());

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', ficherosRouter);

// Cross-origin resource sharing (CORS)
app.use(seguridad.useCORS)

// Cookie-to-Header Token
if (VALIDATE_XSRF_TOKEN) {
  app.use(seguridad.useXSRF)
}

// Autenticación
app.use(seguridad.useAuthentication)

// Validación OpenApi
app.use(
  OpenApiValidator.middleware({
    apiSpec: generaSwaggerSpecification(app.PUERTO, config.paths.API_REST, shutdown, config.paths.API_AUTH ?? '/'),
    validateRequests: {
      allowUnknownQueryParameters: true,
    },
    validateResponses: true, // false by default
    validateSecurity: false,
    ignoreUndocumented: true,
    formats: [
      { name: 'nif', type: 'string', validate: (v) => validator.isIdentityCard(v, 'ES') },
    ]
  })
)

// Control de acceso
app.use(config.paths.API_AUTH, seguridad)

// Servicios web
app.use(config.paths.API_REST, apiRouter.router);

// Documentación OpenApi
app.all('/api-docs/v1/openapi.json', function (_req, res) {
  let result = generaSwaggerSpecification(app.PUERTO, config.paths.API_REST, shutdown, config.paths.API_AUTH ?? '/')
  res.json(result)
});
app.all('/api-docs/v1/openapi.yaml', function (_req, res) {
  let result = generaSwaggerSpecification(app.PUERTO, config.paths.API_REST, shutdown, config.paths.API_AUTH ?? '/')
  res.contentType('text/yaml').end(YAML.stringify(result))
});

// Swaggger-ui
const options = {
  explorer: true,
  swaggerOptions: {
    url: '/api-docs/v1/openapi.json',
    docExpansion: 'none',
    tagsSorter: 'alpha',
    operationsSorter: 'alpha',
  }
};
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(null, options));

app.all('/eco(/*)?', function (req, res) {
  res.status(200).json({
    url: req.url,
    method: req.method,
    headers: req.headers,
    authentication: res.locals,
    "XSRF-TOKEN": VALIDATE_XSRF_TOKEN ? seguridad.generateXsrfToken(req) : 'disabled',
    cookies: req.cookies,
    params: req.params,
    query: req.query,
    body: req.body,
    path: path.parse('../')
  }).end();
});

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function (_req, _res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, _next) {
  const status = err.status ?? err.statusCode ??  500
  if(req.headers.accept && req.accepts('html')) {
    // render the error page
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(status);
    res.render('error');
  } else {
    res.status(status).json(err.payload ? err.payload : generateErrorByError(req, err, status).payload)
  }
});

module.exports = app;
