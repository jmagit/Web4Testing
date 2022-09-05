// eslint-disable-next-line node/no-unpublished-require
const request = require('supertest');
const seguridad = require('../routes/seguridad')
const utils = require('../routes/utils')

const usr = { "idUsuario": "admin", "password": "", "nombre": "Administrador", "roles": ["Usuarios", "Administradores", "Empleados"] }
const token = seguridad.generarTokenScheme(usr)
const cookie = `Authorization=${seguridad.generarTokenJWT(usr)};`

describe('API Rest: Ficheros reales', () => {
    const app = require('../app');
    const serviciosConfig = utils.getServiciosConfig()
    it.each(serviciosConfig.map(item => [item.endpoint.toUpperCase(), item.security]))('Autenticación bearer %s', async (endpoint) => {
        let response = await request(app)
            .get("/api/" + endpoint.toLowerCase())
            .set('authorization', token)
        expect(response.statusCode).toBe(200)
        expect(response.body.length).toBeGreaterThan(1)
    });
    it.each(serviciosConfig.map(item => [item.endpoint.toUpperCase(), item.security]))('Autenticación cookie %s', async (endpoint) => {
        let response = await request(app)
            .get("/api/" + endpoint.toLowerCase())
            .set('Cookie', cookie)
        expect(response.statusCode).toBe(200)
        expect(response.body.length).toBeGreaterThan(1)
    });
});
