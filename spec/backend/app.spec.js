const request = require('supertest');
const seguridad = require('../../routes/seguridad');

const usuarioAutenticado = {
  idUsuario: 'admin@kk.kk',
  roles: ['Usuarios', 'Administradores']
};

describe("Pruebas de rutas con app original", () => {
  const app = require('../../app');
  let spy
  beforeAll(() => {
    spy = jest.spyOn(console, 'info');
    spy.mockImplementation(() => { })
    return Promise.resolve()
  });
  it("Página principal", done => {
    request(app)
      .get("/")
      .then(response => {
        expect(response.statusCode).toBe(200);
        done();
      });
  });
  it("Página principal autenticada", async () => {
    const response = await request(app)
      .get("/")
      .set('authorization', seguridad.generarTokenScheme(usuarioAutenticado))
      .expect(200);

    expect(response.text).toContain('Biblioteca (solo autenticados)');
  });
  it("NOT FOUND - HTML", async () => {
    return request(app)
      .get('/esta/ruta/no/existe')
      .accept('text/html')
      .expect(404)
      .expect('Content-Type', /html/);
  });
  it("NOT FOUND - JSON", async () => {
    return await request(app)
      .get('/esta/ruta/no/existe')
      .expect(404)
      .expect('Content-Type', /json/);
  });
  it("GET /fileupload", done => {
    request(app)
      .get("/fileupload")
      .expect(200)
      .end(done)
  });
  it("/eco", done => {
    request(app)
      .get("/eco/personas/1?_page=1&_rows=10")
      .set('referer', 'https://www.examples.com')
      .then(response => {
        expect(response.statusCode).toBe(200);
        done();
      });
  });
  it("/favicon.ico", done => {
    request(app)
      .get("/favicon.ico")
      .expect(200)
      .end(done)
  });
  it("PushState de HTML5", done => {
    request(app)
      .get("/index.html/ruta/interna")
      .expect(404)
      .end(done)
  });
  it.each([
    'calculadora',
    'compras',
    'todo',
    'biblioteca',
    'contactos',
    'navegador',
    'documentacion',
    'api',
    'privacy',
    'terms'
  ])("/%s", (path, done) => {
    request(app)
      .get(`/${path}`)
      .expect(200)
      .end(done)
  });
});

describe('Pruebas cambiando el app', () => {
  const argvOriginal = [...process.argv];
  const nodeEnvOriginal = process.env.NODE_ENV;

  afterEach(() => {
    process.argv = [...argvOriginal];
    process.env.NODE_ENV = nodeEnvOriginal;
    jest.restoreAllMocks();
    jest.resetModules();
    jest.unmock('morgan');
    jest.unmock('rotating-file-stream');
    jest.unmock('express-openapi-validator');
    jest.unmock('validator');
  });

  const cargarApp = (opciones = {}) => {
    const {
      argv = argvOriginal,
      nodeEnv = nodeEnvOriginal,
      capturarOpcionesValidador = false,
    } = opciones;

    process.argv = [...argv];
    process.env.NODE_ENV = nodeEnv;

    jest.doMock('morgan', () => () => (_req, _res, next) => next());
    jest.doMock('rotating-file-stream', () => ({
      createStream: jest.fn(() => ({ write: jest.fn() })),
    }));

    let opcionesValidador;
    if (capturarOpcionesValidador) {
      jest.doMock('express-openapi-validator', () => ({
        middleware: jest.fn((options) => {
          opcionesValidador = options;
          return (_req, _res, next) => next();
        }),
      }));
    }

    let app;
    jest.isolateModules(() => {
      app = require('../../app');
    });

    return { app, opcionesValidador };
  };

  describe('Arranque y parada', () => {
    it('aplica el puerto indicado por argumento --port', () => {
      const { app } = cargarApp({
        argv: ['node', 'app.js', '--port=3000'],
      });

      expect(app.get('port')).toBe('3000');
    });

    it('activa XSRF con el argumento --xsrf y lo refleja en /eco', async () => {
      const out = jest.spyOn(console, 'info').mockImplementation(() => { });
      const { app } = cargarApp({
        argv: ['node', 'app.js', '--xsrf'],
      });

      const response = await request(app)
        .get('/eco/demo')
        .expect(200);

      expect(out).toHaveBeenCalledWith('Activada protección XSRF.');
      expect(response.body['XSRF-TOKEN']).not.toBe('disabled');
    });

    it('expone hooks de prueba para shutdown y extraeURL', () => {
      const { app } = cargarApp();
      const close = jest.fn();
      const kill = jest.spyOn(process, 'kill').mockImplementation(() => true);

      app.server = { close };
      app.__testHooks.shutdown();

      expect(close).toHaveBeenCalled();
      expect(kill).toHaveBeenCalledWith(process.pid, 'SIGTERM');
      expect(app.__testHooks.extraeURL({
        protocol: 'https',
        hostname: 'localhost',
        connection: { localPort: 8443 },
      })).toEqual({
        protocol: 'https',
        hostname: 'localhost',
        port: 8443,
      });
    });

    it('shutdown también funciona cuando no hay servidor asociado', () => {
      const { app } = cargarApp();
      const kill = jest.spyOn(process, 'kill').mockImplementation(() => true);

      app.server = undefined;
      app.__testHooks.shutdown();

      expect(kill).toHaveBeenCalledWith(process.pid, 'SIGTERM');
    });
    it('devuelve el payload del error cuando ya viene construido', async () => {
      const express = require('express');
      const router = express.Router();
      router.get('/error-con-payload', (_req, _res, next) => {
        const err = new Error('Controlado');
        err.statusCode = 418;
        err.payload = { status: 418, title: 'Soy una tetera' };
        next(err);
      });

      jest.doMock('../../routes/ficheros', () => router);

      const { app } = cargarApp({
        capturarOpcionesValidador: true,
      });

      const response = await request(app)
        .get('/error-con-payload')
        .set('X-Requested-With', 'XMLHttpRequest')
        .expect(418);

      expect(response.body).toEqual({ status: 418, title: 'Soy una tetera' });
    });

  });

  describe('Chrome DevTools', () => {
    it('expone la ruta de Chrome DevTools fuera de producción', async () => {
      const { app } = cargarApp({
        nodeEnv: 'test',
      });

      const response = await request(app)
        .get('/.well-known/appspecific/com.chrome.devtools.json')
        .expect(200);

      expect(response.body.workspace.root).toContain('Web4Testing');
      expect(response.body.workspace.uuid).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('no publica la ruta de Chrome DevTools en producción', async () => {
      const { app } = cargarApp({
        nodeEnv: 'production',
      });

      await request(app)
        .get('/.well-known/appspecific/com.chrome.devtools.json')
        .expect(404);
    });

  });

  describe('OpenAPI', () => {
    it('publica OpenAPI en JSON y YAML', async () => {
      const { app } = cargarApp();

      const json = await request(app)
        .get('/api-docs/v1/openapi.json')
        .expect(200)
        .expect('Content-Type', /json/);

      const yaml = await request(app)
        .get('/api-docs/v1/openapi.yaml')
        .expect(200)
        .expect('Content-Type', /yaml/);

      expect(json.body.openapi).toBeDefined();
      expect(yaml.text).toContain('openapi:');
    });

    it('configura el validador OpenAPI con el formato nif', () => {
      const isIdentityCard = jest.fn(() => true);
      jest.doMock('validator', () => ({
        isIdentityCard,
      }));

      const { opcionesValidador } = cargarApp({
        capturarOpcionesValidador: true,
      });

      expect(opcionesValidador.validateResponses).toBeTruthy();
      expect(opcionesValidador.formats.nif.type).toBe('string');
      expect(opcionesValidador.formats.nif.validate('00000000T')).toBeTruthy();
      expect(isIdentityCard).toHaveBeenCalledWith('00000000T', 'ES');
    });

    it('usa / como API_AUTH por defecto cuando no existe configuración', async () => {
      const generaSwaggerSpecification = jest.fn(() => ({ openapi: '3.0.0', info: { title: 'mock' } }));

      jest.doMock('../../config', () => ({
        paths: {
          API_REST: '/api',
          API_AUTH: undefined,
        },
        security: {
          AUTHENTICATION_SCHEME: 'Bearer ',
        },
      }));
      jest.doMock('../../routes/openapi-generator', () => ({
        generaSwaggerSpecification,
      }));

      const { app } = cargarApp({
        capturarOpcionesValidador: true,
      });

      await request(app)
        .get('/api-docs/v1/openapi.json')
        .expect(200);

      expect(generaSwaggerSpecification).toHaveBeenCalled();
      expect(generaSwaggerSpecification.mock.calls[0][3]).toBe('/');
    });
  });
});
