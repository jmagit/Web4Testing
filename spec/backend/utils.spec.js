const utils = require('../../routes/utils');

const resFake = { protocol: 'http', hostname: 'localhost', connection: { localPort: 8080 }, originalUrl: '/api/fake' }

describe('utilidades', () => {

    it('extractURL', () => {
        expect(utils.extractURL(resFake)).toBe('http://localhost:8080/api/fake')
    })

    it('formatLocation', () => {
        expect(utils.formatLocation(resFake, 55)).toBe('http://localhost:8080/api/fake/55')
    })

    it('emptyPropertiesToNull', () => {
        const result = utils.emptyPropertiesToNull({ lleno: 'dato', nulo: null, blanco: '' })
        expect(result.lleno).toBe('dato')
        expect(result.nulo).toBeNull()
        expect(result.blanco).toBeNull()
    })

    it('emptyPropertiesToNull empty', () => {
        const result = utils.emptyPropertiesToNull()
        expect(result).toBeUndefined()
    })

    it('generateProjection', () => {
        const result = utils.generateProjection({ lleno: 'dato', nulo: null, blanco: '', dato: true }, 'nulo, dato,desconocido')
        expect(Object.keys(result).length).toBe(2)
        expect(result.lleno).toBeUndefined()
        expect(result.nulo).toBeNull()
        expect(result.blanco).toBeUndefined()
        expect(result.dato).toBeTruthy()
    })

    it('generateProjection empty', () => {
        const result = utils.generateProjection()
        expect(result).toBeUndefined()
    })

    it('generateProjection devuelve el original si no encuentra propiedades', () => {
        const source = { lleno: 'dato', activo: true }
        const result = utils.generateProjection(source, 'inventado,otro')

        expect(result).toEqual(source)
    })

    it('parseBoolFromString interpreta true', () => {
        expect(utils.parseBoolFromString('TrUe')).toBeTruthy()
    })

    it('parseBoolFromString interpreta false', () => {
        expect(utils.parseBoolFromString('FALSE')).toBeFalsy()
    })

    it('parseBoolFromString mantiene otros valores y undefined', () => {
        expect(utils.parseBoolFromString('quizas')).toBe('quizas')
        expect(utils.parseBoolFromString()).toBeUndefined()
    })

    it('getServiciosConfig devuelve la configuración cargada', () => {
        const result = utils.getServiciosConfig()

        expect(Array.isArray(result)).toBeTruthy()
        expect(result.length).toBeGreaterThan(0)
    })
})

describe('tratamiento de errores', () => {
    describe('problemDetails', () => {
        it('añade detail, errors y source fuera de producción', () => {
            const result = utils.problemDetails(resFake, 400, 'Detalle', [{ campo: 'obligatorio' }], 'stack trace')

            expect(result.status).toBe(400)
            expect(result.instance).toBe('/api/fake')
            expect(result.detail).toBe('Detalle')
            expect(result.errors).toEqual([{ campo: 'obligatorio' }])
            expect(result.source).toBe('stack trace')
        })

        it('usa about:blank para estados desconocidos', () => {
            const result = utils.problemDetails(resFake, 499, 'Inventado')

            expect(result.type).toBe('about:blank')
            expect(result.title).toBe('Unknown error')
            expect(result.detail).toBe('Inventado')
        })

        it('no repite detail cuando coincide con el title', () => {
            const result = utils.problemDetails(resFake, 404, 'Not Found')

            expect(result.detail).toBeUndefined()
        })

        it('oculta source en producción', () => {
            const originalEnv = process.env.NODE_ENV
            process.env.NODE_ENV = 'production'
            jest.resetModules()
            const productionUtils = require('../../routes/utils')

            const result = productionUtils.problemDetails(resFake, 400, 'Detalle', undefined, 'stack trace')

            expect(result.source).toBeUndefined()

            process.env.NODE_ENV = originalEnv
            jest.resetModules()
        })

    });

    it('generateError construye un ApiError con payload RFC 7807', () => {
        const result = utils.generateError(resFake, 'Fallo de validación', 400, [{ campo: 'id' }], 'stack')

        expect(result).toBeInstanceOf(utils.ApiError)
        expect(result.status).toBe(400)
        expect(result.message).toBe('Bad Request')
        expect(result.payload.detail).toBe('Fallo de validación')
        expect(result.payload.errors).toEqual([{ campo: 'id' }])
    })

    it('generateErrorByStatus', () => {
        const result = utils.generateErrorByStatus(resFake)
        expect(result).toBeDefined()
        expect(result.status).toBe(500)
    })

    describe('generateErrorByError', () => {
        it('mapea dbJSONError con su código', () => {
            const error = { name: 'dbJSONError', message: 'No encontrado', code: 404 }
            const result = utils.generateErrorByError(resFake, error)

            expect(result.status).toBe(404)
            expect(result.payload.title).toBe('Not Found')
            expect(result.payload.detail).toBe('No encontrado')
        })

        it.each([
            'SequelizeValidationError',
            'SequelizeUniqueConstraintError',
            'Bad Request',
        ])('mapea %s a error de validación estándar', (name) => {
            const error = {
                name,
                errors: [{ path: 'email', message: 'duplicado' }],
                trace: 'trace',
            }
            const result = utils.generateErrorByError(resFake, error)

            expect(result.status).toBe(400)
            expect(result.payload.title).toBe('Bad Request')
            expect(result.payload.detail).toBe('One or more validation errors occurred.')
            expect(result.payload.errors).toEqual({ email: 'duplicado' })
            expect(result.payload.source).toBe('trace')
        })

        it('usa statusCode y errores del caso por defecto', () => {
            const error = {
                name: 'Error',
                message: 'Conflicto funcional',
                statusCode: 409,
                errors: [{ motivo: 'duplicado' }],
                stack: 'stack',
            }
            const result = utils.generateErrorByError(resFake, error)

            expect(result.status).toBe(409)
            expect(result.payload.title).toBe('Conflict')
            expect(result.payload.detail).toBe('Conflicto funcional')
            expect(result.payload.errors).toEqual([{ motivo: 'duplicado' }])
            expect(result.payload.source).toBe('stack')
        })

        it('usa el status de fallback cuando el error no trae código', () => {
            const error = {
                name: 'Error',
                message: 'Fallo interno',
            }
            const result = utils.generateErrorByError(resFake, error, 501)

            expect(result.status).toBe(501)
            expect(result.payload.status).toBe(501)
            expect(result.payload.detail).toBe('Fallo interno')
        })
    });

});
