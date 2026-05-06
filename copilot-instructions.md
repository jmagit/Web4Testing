# Instrucciones para Copilot en el proyecto Web4Testing

## Introducción

Este archivo define las convenciones y mejores prácticas para el desarrollo en el proyecto Web4Testing, un servidor de demostración para pruebas de frontend basado en Node.js/Express. Como experto desarrollador fullstack y tester, debes seguir estas instrucciones al generar código, asegurando que se apliquen las mejores prácticas en JavaScript/NodeJS, pruebas, seguridad, principios SOLID, DRY, self-documenting, refactor y mockable. Todo código generado debe incluir pruebas correspondientes que incluyan mocks. Evita dependencias nuevas salvo que sean necesarias y estén justificadas. Las comunicaciones en el chat deben estar en español.

## Convenciones de Código

### Estructura de Módulos
- Usa CommonJS: `require()` y `module.exports`.
- Separa responsabilidades: rutas en `routes/`, vistas en `views/`, datos en `data/`, pruebas en `spec/`.
- Punto de entrada: `./bin/www`.

### Nomenclatura
- Clases: PascalCase (e.g., `DbJSON`, `ApiError`).
- Funciones: camelCase (e.g., `generaFiltro`, `encriptaPassword`).
- Constantes: UPPER_SNAKE_CASE (e.g., `EXPIRACION_MIN`).
- Propiedades/funciones privadas: prefijo `__` (e.g., `__filename`, `__comparaValores`).

### Patrones de Código
- Manejo de errores centralizado: Usa `ApiError` con RFC 7807 (type, title, status, detail, instance).
- Async/await para operaciones I/O.
- Higher-order functions para composición (e.g., funciones que retornan funciones).
- Inyección de dependencias ligera: pasa dependencias como parámetros o inyecta en objetos.
- Funciones puras donde sea posible.

### Ejemplo de Estructura de Módulo
```javascript
// routes/ejemplo.js
const express = require('express');
const router = express.Router();

// Función pura para lógica reutilizable
const procesaDatos = (datos) => {
  return datos.map(item => ({ ...item, procesado: true }));
};

// Handler con try/catch y delegación de errores
router.get('/api/ejemplo', async (req, res, next) => {
  try {
    const datos = await cargaDatos();
    const resultado = procesaDatos(datos);
    res.json(resultado);
  } catch (error) {
    next(generateErrorByError(req, error));
  }
});

module.exports = router;
```

## Pruebas

### Framework
- Usa Jest para unitarias e integración.
- Supertest para pruebas HTTP.
- Mocks con `jest.mock()` y spies con `jest.spyOn()`.

### Estructura de Tests
- Agrupa con `describe()` por módulo/funcionalidad.
- Usa `it()` o `it.each()` para casos individuales.
- `beforeAll()` para setup global, `afterEach()` para cleanup.
- Separa casos OK (éxito) vs KO (error).
- Incluye fixtures de datos al inicio.
- Cobertura obligatoria >80%.

### Mocks
- Todo código debe ser mockable: diseña para inyección de dependencias.
- Usa mocks para módulos externos (e.g., fs/promises, como en `spec/__mocks__/fs/promises.js`).
- Spies para funciones internas.

### Ejemplo de Test
```javascript
// spec/backend/ejemplo.spec.js
const request = require('supertest');
const app = require('../../app');

describe('API Ejemplo', () => {
  describe('GET /api/ejemplo', () => {
    describe('OK', () => {
      it('Retorna datos procesados', async () => {
        const response = await request(app)
          .get('/api/ejemplo')
          .expect(200);
        expect(response.body).toHaveProperty('procesado', true);
      });
    });
    describe('KO', () => {
      it('Maneja errores correctamente', async () => {
        // Mock error
        jest.spyOn(servicio, 'cargaDatos').mockRejectedValue(new Error('Error simulado'));
        await request(app)
          .get('/api/ejemplo')
          .expect(500);
      });
    });
  });
});
```

## Seguridad

### Autenticación
- JWT: RS256 para access tokens (corta duración), HMAC256 para refresh tokens.
- Claims: sub, roles, iss, aud, exp, nbf.

### Hashing
- Usa bcrypt con salt rounds >=10 para passwords.

### Validación
- Entrada: validator.js o ajv para JSON Schema.
- CORS: valida origen, evita '*' con credentials.
- XSRF: protección opcional.

### Ejemplo de Seguridad
```javascript
// routes/seguridad.js
const bcrypt = require('bcrypt');

async function encriptaPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Validación
const isValidPassword = await bcrypt.compare(inputPassword, hashedPassword);
```

## Principios de Diseño

### SOLID
- **Single Responsibility**: Un módulo por responsabilidad (e.g., dbJSON solo persistencia).
- **Open/Closed**: Extensible sin modificar (e.g., middleware pattern).
- **Liskov Substitution**: Mocks sustituibles por implementaciones reales.
- **Interface Segregation**: Métodos específicos, no god objects.
- **Dependency Inversion**: Inyección de dependencias.

### DRY
- Reutiliza funciones compartidas (e.g., `generateErrorByError` en utils.js).
- Evita repetición en handlers similares.

### Self-Documenting
- Comentarios JSDoc para funciones públicas.
- Nombres descriptivos.
- Documentación OpenAPI generada automáticamente.

### Refactor
- Evita código monolítico: separa en módulos.
- Mejora continuamente: refactor después de tests.
- Usa factory patterns para creación de objetos.

### Mockable
- Diseña para testing: inyección de dependencias, funciones puras.
- Evita singletons difíciles de mockear.

## Dependencias

- Mantén mínimas: justifica nuevas (e.g., si mejora seguridad o testing sin alternativas).
- Actuales: express, jwt, bcrypt, multer, ajv, validator, jest, supertest, eslint.

## Checklist para Nuevas Características

Al generar código:
- [ ] Endpoint documentado en OpenAPI.
- [ ] Tests en `spec/backend/` (OK y KO, con mocks).
- [ ] Validación de entrada.
- [ ] Manejo de errores con `ApiError`.
- [ ] Autenticación si aplica.
- [ ] Logging de operaciones importantes.
- [ ] Cobertura >80%.
- [ ] ESLint sin errores (`npm run lint`).
- [ ] SonarQube sin issues críticos (`npm run sonar`).

## Comunicación

- Responde en español.
- Explica cambios y justifica decisiones.