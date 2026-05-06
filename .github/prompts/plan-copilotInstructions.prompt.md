## Plan: Crear archivo copilot-instructions.md con convenciones del proyecto Web4Testing

Basado en la exploración del codebase, crear un archivo de instrucciones para Copilot que capture las mejores prácticas en desarrollo JavaScript/NodeJS, pruebas, seguridad, SOLID, DRY, self-documenting, refactor y mockable, asegurando que todo código generado incluya pruebas con mocks.

**Steps**
1. Analizar el informe de convenciones del proyecto para identificar patrones clave.
2. Diseñar el contenido del copilot-instructions.md, incluyendo secciones para estructura de código, pruebas, seguridad, principios de diseño, y ejemplos específicos del proyecto.
3. Crear el archivo copilot-instructions.md en la raíz del proyecto con el contenido diseñado.
4. Verificar que el archivo siga las mejores prácticas y esté completo.

**Relevant files**
- `copilot-instructions.md` — Archivo a crear con instrucciones para Copilot.
- Archivos existentes como `package.json`, `eslint.config.mjs`, `routes/`, `spec/` — Referencias para convenciones.

**Verification**
1. Ejecutar `npm run lint` para asegurar que el archivo no introduzca errores de linting.
2. Revisar manualmente que el contenido cubra todas las áreas solicitadas: mejores prácticas, pruebas con mocks, seguridad, SOLID/DRY, etc.
3. Confirmar que las instrucciones promuevan código self-documenting y refactorable.

**Decisions**
- Incluir ejemplos específicos del proyecto (e.g., uso de ApiError, mocks de fs/promises) para contextualizar.
- Mantener dependencias mínimas, justificando cualquier nueva.
- Asegurar que las instrucciones estén en español, como solicitado.

**Further Considerations**
1. ¿Hay alguna convención específica de nomenclatura o patrón que no esté cubierto en el informe y deba incluirse?