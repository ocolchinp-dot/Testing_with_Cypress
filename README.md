# Café Central — sistema de pedidos

Aplicación universitaria de pedidos para cafetería. Incluye catálogo con precio y disponibilidad, carrito editable, validación de cantidades, cálculo de total, confirmación persistida, estados de éxito/error y reinicio de datos de prueba.

## Arquitectura

```text
Navegador
  └─ Frontend TypeScript compilado (HTML/CSS/JS)
       └─ Express + API REST en TypeScript
            └─ SQLite (data/cafeteria.sqlite)
```

- `src/server.ts`: servidor HTTP, archivos estáticos y endpoints REST.
- `src/db.ts`: esquema SQLite, semillas, transacciones y consultas de pedidos.
- `public/`: interfaz del catálogo y carrito.
- `cypress/e2e/orders.cy.ts`: tres escenarios E2E independientes.
- `.github/workflows/cypress.yml`: instalación, build, servidor, Cypress y artefactos.

La API expone `GET /api/products`, `POST /api/orders`, `GET /api/orders/:id`, `GET /api/health` y `POST /api/test/reset`. El último endpoint está destinado al aislamiento de pruebas y al botón de reinicio de la demo.

## Requisitos y comandos

Requiere Node.js 22+ y npm.

```bash
npm ci
npm run build
npm run start
```

En otra terminal:

```bash
npm run cy:run       # Cypress headless
npm run cy:open      # Cypress interactivo
npm run test:e2e     # build + servidor + Cypress
```

La aplicación queda en `http://localhost:3000`. El archivo SQLite se crea en `data/cafeteria.sqlite` al iniciar.

## Estrategia de datos de prueba

Cada `beforeEach` ejecuta `POST /api/test/reset` antes de visitar la aplicación. El reset borra pedidos e ítems, vuelve a sembrar el catálogo y deja disponibles tres productos conocidos. Así no se depende del orden de ejecución ni de datos de una corrida anterior. La prueba exitosa, además de revisar la respuesta del POST mediante alias, consulta `GET /api/orders/:id` para demostrar que el ID y el total quedaron persistidos en SQLite.

Los selectores funcionales usan `data-testid`. La sincronización usa `cy.intercept()` y alias (`cy.wait('@...')`); no hay esperas numéricas. El caso de carrito vacío comprueba que el alias del POST tiene cero solicitudes. El caso de error usa un intercept con `times: 1` y HTTP 500, deja el carrito intacto y luego verifica que un segundo intento llega al servidor real.

## Dependencias reales y simuladas

- Reales: Express, better-sqlite3, TypeScript, Cypress y la API HTTP local.
- Simuladas: únicamente el fallo HTTP 500 del tercer E2E, mediante `cy.intercept()`. No se simulan el catálogo, la persistencia ni la confirmación exitosa.

## Cypress, Playwright y Agent Browser

| Herramienta | Ventaja principal | Trade-off para este proyecto |
|---|---|---|
| Cypress | Excelente feedback local, intercepts sencillos, snapshots y runner visual | Corre principalmente dentro del navegador y su paralelización avanzada requiere configuración adicional |
| Playwright | Multi-navegador sólido, contextos aislados y API potente de red | Tiene una curva inicial algo mayor y menos enfoque en el runner interactivo dentro de la app |
| Agent Browser | Útil para agentes que exploran interfaces y flujos reales con acciones de alto nivel | No sustituye una suite determinista de regresión con fixtures, alias y artefactos CI |

Para esta entrega se eligió Cypress porque el objetivo académico exige explícitamente `cy.intercept()`, alias, verificación de ausencia de POST y evidencias de screenshots/videos.

## Uso de IA

Se utilizó un asistente de IA como apoyo para proponer la estructura inicial, redactar código repetitivo, revisar la estrategia de aislamiento de datos y sugerir casos E2E. La solución fue revisada, ejecutada y ajustada manualmente; las decisiones de arquitectura, selectores, validaciones, escenarios y documentación pertenecen a esta entrega. No se incorporaron credenciales, datos personales ni código de terceros con licencia desconocida.

