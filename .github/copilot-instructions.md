# Instrucciones para Copilot en Web4Testing

## Introducción

Este documento define las convenciones, patrones y mejores prácticas que debe seguir Copilot (y cualquier desarrollador) al generar código para el proyecto Web4Testing. El objetivo es asegurar calidad, seguridad, mantenibilidad, testabilidad y facilidad de refactorización en todo el ciclo de vida del software. Todo el código generado debe estar acompañado de pruebas unitarias y de integración, con mocks adecuados, y cumplir con los principios SOLID, DRY y self-documenting. La comunicación y los comentarios deben ser siempre en español.

---

## 1. Estructura y Estilo del Código

- **Módulos**: Utiliza CommonJS (`require`, `module.exports`).
- **Separación de responsabilidades**:
  - `routes/`: Controladores y handlers de rutas (API REST, vistas, seguridad, utilidades).
  - `views/`: Plantillas Pug para vistas HTML.
  - `data/`: Archivos JSON como "base de datos".
  - `spec/`: Pruebas unitarias, integración y mocks.
  - `public/`: Recursos estáticos (JS, CSS, imágenes).
  - `config.js`: Configuración centralizada.
  - `app.js` y `bin/www`: Inicialización y arranque del servidor.
- **Nomenclatura**:
  - Clases: PascalCase (`DbJSON`, `ApiError`).
  - Funciones y variables: camelCase (`generaFiltro`, `encriptaPassword`).
  - Constantes: UPPER_SNAKE_CASE (`EXPIRACION_MIN`).
  - Propiedades/métodos "privados": prefijo `__` (`__filename`, `__comparaValores`).
- **Linting**: Aplica las reglas de ESLint del proyecto. No ignores advertencias ni errores.
- **Comentarios**: Usa JSDoc para documentar funciones públicas y describe la intención del código.

---

## 2. Pruebas (Testing) y Mocking

- **Frameworks**: Usa Jest para pruebas unitarias e integración, y Supertest para pruebas HTTP.
- **Estructura de tests**:
  - Agrupa con `describe()` por módulo, endpoint o funcionalidad.
  - Usa `it()` o `it.each()` para casos individuales.
  - `beforeAll()` y `afterEach()` para setup y teardown.
  - Separa explícitamente casos OK (éxito) y KO (error).
  - Incluye fixtures de datos al inicio del archivo de test.
  - Cobertura mínima exigida: 80% (usa `--collectCoverage`).
- **Mocking**:
  - Todo código debe ser mockable: diseña para inyección de dependencias y funciones puras.
  - Usa `jest.mock()` para módulos externos (ejemplo: `fs/promises`).
  - Usa `jest.spyOn()` para funciones internas.
  - Los mocks deben permitir simular tanto respuestas exitosas como errores.
- **Ejemplo de test completo**:
```javascript
jest.mock('fs/promises');
const request = require('supertest');
const app = require('../../app');

describe('API Ejemplo', () => {
  describe('GET /api/ejemplo', () => {
    describe('OK', () => {
      it('Retorna datos procesados', async () => {
        const res = await request(app).get('/api/ejemplo').expect(200);
        expect(res.body).toHaveProperty('procesado', true);
      });
    });
    describe('KO', () => {
      it('Maneja errores correctamente', async () => {
        jest.spyOn(servicio, 'cargaDatos').mockRejectedValue(new Error('Error simulado'));
        await request(app).get('/api/ejemplo').expect(500);
      });
    });
  });
});
```
- **Cobertura**: Todo nuevo código debe estar cubierto por tests. Usa `npm test` y revisa el reporte de cobertura.

---

## 3. Seguridad

- **Autenticación**:
  - Usa JWT con algoritmo RS256 para access tokens (clave pública/privada, corta duración).
  - Usa HMAC256 para refresh tokens (clave simétrica, larga duración).
  - Claims obligatorios: `sub` (usuario), `roles`, `iss`, `aud`, `exp`, `nbf`.
- **Contraseñas**:
  - Hashea siempre con bcrypt, mínimo 10 salt rounds.
  - Nunca almacenes ni transmitas contraseñas en texto plano.
- **Validación de entrada**:
  - Usa `validator.js` o `ajv` para validar datos de entrada y JSON Schema.
  - Aplica patrones de contraseña segura (mínimo 8 caracteres, mayúscula, minúscula, número y símbolo).
- **CORS**:
  - Valida el origen de las peticiones.
  - No uses `*` si se permiten credenciales.
  - Permite solo los métodos necesarios.
- **XSRF**:
  - Implementa protección XSRF cuando corresponda, activable por configuración.
- **Gestión de errores**:
  - Usa la clase `ApiError` y responde siguiendo RFC 7807 (type, title, status, detail, instance).
- **Ejemplo de seguridad**:
```javascript
const bcrypt = require('bcrypt');
async function encriptaPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}
// Validación
await bcrypt.compare(inputPassword, hashedPassword);
```

---

## 4. Principios de Diseño y Refactorización

- **SOLID**:
  - Single Responsibility: Cada módulo debe tener una única responsabilidad clara.
  - Open/Closed: El código debe ser extensible sin modificar el existente (usa middlewares, patrones de fábrica, etc.).
  - Liskov Substitution: Los mocks y clases deben ser sustituibles por sus implementaciones reales.
  - Interface Segregation: Prefiere interfaces/métodos específicos y pequeños.
  - Dependency Inversion: Inyecta dependencias, no acoples módulos directamente.
- **DRY**:
  - Extrae funciones reutilizables y utilízalas en vez de duplicar lógica.
  - Centraliza la generación y manejo de errores, validaciones y utilidades.
- **Self-documenting**:
  - Usa nombres descriptivos y claros para variables, funciones y clases.
  - Documenta con JSDoc y comentarios explicativos donde la intención no sea obvia.
- **Refactor**:
  - Prefiere módulos pequeños y funciones puras.
  - Refactoriza código monolítico en componentes reutilizables.
  - Usa patrones de diseño cuando aporten claridad o extensibilidad.
- **Mockable**:
  - Evita singletons y dependencias globales.
  - Diseña para que todo pueda ser sustituido por un mock en tests.

---

## 5. Ejemplo de flujo completo (CRUD + test + seguridad)

1. **Definir servicio en config**
```json
{
  "endpoint": "contactos",
  "model": "Contacto",
  "pk": "id",
  "file": "./data/contactos.json"
}
```
2. **Crear rutas**
```javascript
router.get('/api/contactos', apis.getAll);
router.get('/api/contactos/:id', apis.getOne);
router.post('/api/contactos', apis.post);
router.put('/api/contactos/:id', apis.put);
router.patch('/api/contactos/:id', apis.patch);
router.delete('/api/contactos/:id', apis.delete);
```
3. **Implementar handlers**
```javascript
apis.getAll = async (servicio, req, res, next) => {
  try {
    await servicio.db.load();
    const list = await servicio.db.select(
      req.query._projection,
      generaFiltro(req),
      req.query._sort
    );
    res.json(list);
  } catch (error) {
    next(generateErrorByError(req, error));
  }
};
```
4. **Test de integración**
```javascript
describe('API Rest: Contactos', () => {
  describe('GET', () => {
    it('Obtener todos', done => {
      request(app)
        .get('/api/contactos')
        .expect(200)
        .end(done);
    });
    it('Con paginación', done => {
      request(app)
        .get('/api/contactos?_page=0&_rows=10')
        .expect(200)
        .end(done);
    });
  });
  describe('POST', () => {
    it('Crear nuevo contacto', done => {
      request(app)
        .post('/api/contactos')
        .send({ name: 'Juan', email: 'juan@example.com' })
        .set('Content-Type', 'application/json')
        .expect(201)
        .end(done);
    });
  });
});
```

---

## 6. Checklist para nuevas características

- [ ] Documenta endpoints en OpenAPI (Swagger).
- [ ] Incluye tests en `spec/backend/` (OK y KO, con mocks y fixtures).
- [ ] Usa mocks para dependencias externas y spies para internas.
- [ ] Valida todas las entradas y maneja errores con `ApiError`.
- [ ] Aplica autenticación y logging si corresponde.
- [ ] Mantén cobertura >80% y sin errores de linting (`npm run lint`).
- [ ] No agregues dependencias salvo que sean necesarias y justificadas.
- [ ] Usa nombres y comentarios en español.
- [ ] Refactoriza y documenta el código generado.

---

## 7. Comunicación y documentación

- Toda la comunicación en el chat y los comentarios de código deben estar en español.
- Explica los cambios y justifica las decisiones de diseño cuando generes código o tests.
- Usa ejemplos claros y contextualizados del propio proyecto.

---

## 8. Referencias y recursos

- [Jest](https://jestjs.io/docs/es-ES/getting-started)
- [Supertest](https://github.com/visionmedia/supertest)
- [Express](https://expressjs.com/es/)
- [ESLint](https://eslint.org/)
- [OpenAPI/Swagger](https://swagger.io/specification/)
- [bcrypt](https://www.npmjs.com/package/bcrypt)
- [ajv](https://ajv.js.org/)
- [validator.js](https://github.com/validatorjs/validator.js)

---

**Cumple estrictamente estas instrucciones para mantener la calidad y coherencia del proyecto.**
