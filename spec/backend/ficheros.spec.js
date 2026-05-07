const path = require('path');
const fs = require('fs/promises');
const express = require('express');
const cookieParser = require('cookie-parser');
const request = require('supertest');

const uploadsDir = path.join(process.cwd(), 'uploads');
const ficherosPath = '../../routes/ficheros';

const crearApp = () => {
    const app = express();
    app.set('views', path.join(process.cwd(), 'views'));
    app.set('view engine', 'pug');
    app.use(cookieParser());
    app.use('/', require(ficherosPath));
    return app;
};

describe('Ficheros', () => {
    const creados = new Set();

    const registrarFichero = async (nombre, contenido = 'contenido de prueba') => {
        const destino = path.join(uploadsDir, nombre);
        await fs.mkdir(uploadsDir, { recursive: true });
        await fs.writeFile(destino, contenido);
        creados.add(destino);
        return destino;
    };

    afterEach(async () => {
        for (const fichero of creados) {
            await fs.rm(fichero, { force: true });
        }
        creados.clear();
        jest.resetModules();
        jest.unmock('fs/promises');
    });

    describe('Inicialización del router', () => {
        it('crea la carpeta uploads si no existe', async () => {
            const access = jest.fn().mockRejectedValue(new Error('No existe'));
            const mkdir = jest.fn().mockResolvedValue();

            jest.resetModules();
            jest.doMock('fs/promises', () => ({
                access,
                mkdir,
                constants: { F_OK: 0 },
            }));

            jest.isolateModules(() => {
                require(ficherosPath);
            });
            await new Promise(resolve => setImmediate(resolve));

            expect(access).toHaveBeenCalledWith('uploads/', 0);
            expect(mkdir).toHaveBeenCalledWith('uploads/');
        });

        it('informa por consola si falla la creación de uploads', async () => {
            const access = jest.fn().mockRejectedValue(new Error('No existe'));
            const mkdirError = new Error('Sin permisos');
            const mkdir = jest.fn().mockRejectedValue(mkdirError);
            const out = jest.spyOn(console, 'error').mockImplementation(() => {});

            jest.resetModules();
            jest.doMock('fs/promises', () => ({
                access,
                mkdir,
                constants: { F_OK: 0 },
            }));

            jest.isolateModules(() => {
                require(ficherosPath);
            });
            await new Promise(resolve => setImmediate(resolve));

            expect(out).toHaveBeenCalledWith(mkdirError);
            out.mockRestore();
        });
    });

    describe('Rutas HTTP', () => {
        it('GET /fileupload muestra los ficheros subidos', async () => {
            const nombre = 'qa-listado.txt';
            await registrarFichero(nombre);
            const app = crearApp();

            const response = await request(app)
                .get('/fileupload')
                .set('Cookie', ['Authorization=token-de-prueba']);

            expect(response.statusCode).toBe(200);
            expect(response.text).toContain('Subir ficheros');
            expect(response.text).toContain(nombre);
        });

        it('POST /fileupload responde JSON cuando se solicita application/json', async () => {
            const app = crearApp();
            const nombre = 'qa-upload-json.txt';

            const response = await request(app)
                .post('/fileupload')
                .set('Accept', 'application/json')
                .attach('filestoupload', Buffer.from('hola mundo'), nombre);

            creados.add(path.join(uploadsDir, nombre));

            expect(response.statusCode).toBe(200);
            expect(response.body).toEqual([
                { url: `http://127.0.0.1:${response.request.url.split(':')[2]?.split('/')[0] ?? '80'}/files/${nombre}` }
            ]);
        });

        it('POST /fileupload redirige al listado para clientes HTML', async () => {
            const app = crearApp();
            const nombre = 'qa-upload-html.txt';

            const response = await request(app)
                .post('/fileupload')
                .attach('filestoupload', Buffer.from('hola html'), nombre);

            creados.add(path.join(uploadsDir, nombre));

            expect(response.statusCode).toBe(302);
            expect(response.headers.location).toBe('/fileupload');
        });

        it('GET /deleteupload elimina el fichero indicado', async () => {
            const nombre = 'qa-delete.txt';
            const fichero = await registrarFichero(nombre);
            const app = crearApp();

            const response = await request(app)
                .get(`/deleteupload?file=${nombre}`);

            expect(response.statusCode).toBe(302);
            expect(response.headers.location).toBe('/fileupload');
            await expect(fs.access(fichero)).rejects.toThrow();
            creados.delete(fichero);
        });

        it('GET /deleteupload sin parámetro no falla y redirige', async () => {
            const app = crearApp();

            const response = await request(app)
                .get('/deleteupload');

            expect(response.statusCode).toBe(302);
            expect(response.headers.location).toBe('/fileupload');
        });
    });

    describe('Control de errores del POST', () => {
        it('devuelve error RFC 7807 cuando falla el procesamiento interno', () => {
            jest.resetModules();
            const router = require(ficherosPath);
            const capa = router.stack.find(layer => layer.route && layer.route.path === '/fileupload' && layer.route.methods.post);
            const handler = capa.route.stack[capa.route.stack.length - 1].handle;
            const req = {
                files: undefined,
                protocol: 'http',
                headers: {
                    host: 'localhost:8181',
                    accept: 'application/json',
                },
                originalUrl: '/fileupload',
            };
            const res = {
                statusCode: undefined,
                payload: undefined,
                status(code) {
                    this.statusCode = code;
                    return this;
                },
                json(body) {
                    this.payload = body;
                    return this;
                },
                end() {
                    return this;
                },
            };

            handler(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.payload.status).toBe(500);
            expect(res.payload.title).toBe('Internal Server Error');
            expect(res.payload.instance).toBe('/fileupload');
        });
    });
});
