# AGENTS.md - Web4Testing

## Comunicación
Toda comunicación, comentarios y documentación en **español**.

## Comandos
- `npm start` — Arranca el servidor (`node ./bin/www`, puerto 8181 por defecto)
- `npm run restart` — Reinicio automático con nodemon
- `npm test` — Jest con cobertura (`--collectCoverage`)
- `npm run test:snapshot` — Actualiza snapshots
- `npm run lint` — ESLint (usa config de `eslint.config.mjs`)
- Puerto configurable: `SET PORT=3000` o `node ./bin/www --port=3000`
- XSRF: `node ./bin/www --xsrf`

## Estructura clave
- **Entrypoint**: `bin/www` → `app.js`
- **`routes/`** — Controladores y rutas API (apirest.js, seguridad.js, ficheros.js, index.js)
- **`data/`** — "Base de datos" en JSON + `__servicios.json` (alta de servicios REST)
- **`spec/`** — Tests Jest + Supertest (`spec/backend/`, `spec/frontend/`, `spec/__mocks__/`)
- **`views/`** — Plantillas Pug
- **`config.js`** — Configuración centralizada (paths, JWT, seguridad)

## Convenciones de código
- **CommonJS** (`require`, `module.exports`) — no ESM
- Clases: `PascalCase`, funciones/variables: `camelCase`, constantes: `UPPER_SNAKE_CASE`
- Métodos "privados": prefijo `__`
- ESLint obligatorio, sin ignorar advertencias

## Testing
- **Jest** + **Supertest** para HTTP
- Raíces de test: `./routes/`, `./spec/`, `public/javascripts`
- Cobertura mínima: 80%
- Mocks en `spec/__mocks__/` (ej. `fs/promises`, `morgan`)
- Separar casos OK/KO, usar `describe`/`it` en español

## Seguridad y autenticación
- JWT RS256 (access) y HMAC256 (refresh) — claves en `config.js`
- Servicios configurados en `data/__servicios.json` (propiedades: `endpoint`, `model`, `pk`, `fichero`, `security`)
- Contraseñas: bcrypt (mín. 10 salt rounds), patrón obligatorio (8+ chars, mayús, minús, dígitos, símbolos)
- Errores: clase `ApiError`, estándar RFC 7807
- XSRF opcional vía `--xsrf`, token en cookie `XSRF-TOKEN`

## Servicios REST
- Documentación OpenAPI: `/api-docs` (Swagger UI), `/api-docs/v1/openapi.json`, `/api-docs/v1/openapi.yaml`
- Validación automática con `express-openapi-validator`
- Filtros: `_page`, `_rows`, `_sort`, `_search`, `_mode`, `_projection`, `propiedad=valor`
- Respuestas paginadas incluyen `totalElements`, `totalPages`, `content`, etc.
- ECO: `/eco{/*splat}` para inspeccionar peticiones

## Añadir un servicio nuevo
1. Crear `data/miservicio.json` con array de objetos
2. Dar de alta en `data/__servicios.json` (endpoint, model, pk, fichero obligatorios)
3. Reiniciar servidor
4. Probar en `/api/miservicio`

## Docker
- `docker build -t web-for-testing:latest .`
- `docker run -d -p 8181:8181 web-for-testing`
- Volúmenes: `/app/data`, `/app/public`, `/app/uploads`, `/app/log`
