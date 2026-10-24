# CafÃ© Central â€” sistema de pedidos

AplicaciÃ³n universitaria de pedidos para cafeterÃ­a. Incluye catÃ¡logo con precio y disponibilidad, carrito editable, validaciÃ³n de cantidades, cÃ¡lculo de total, confirmaciÃ³n persistida, estados de Ã©xito/error y reinicio de datos de prueba.

## Arquitectura

```text
Navegador
  â””â”€ Frontend TypeScript compilado (HTML/CSS/JS)
       â””â”€ Express + API REST en TypeScript
            â””â”€ SQLite (data/cafeteria.sqlite)
```

- `src/server.ts`: servidor HTTP, archivos estÃ¡ticos y endpoints REST.
- `src/db.ts`: esquema SQLite, semillas, transacciones y consultas de pedidos.
- `public/`: interfaz del catÃ¡logo y carrito.
- `cypress/e2e/orders.cy.ts`: tres escenarios E2E independientes.
- `.github/workflows/cypress.yml`: instalaciÃ³n, build, servidor, Cypress y artefactos.

La API expone `GET /api/products`, `POST /api/orders`, `GET /api/orders/:id`, `GET /api/health` y `POST /api/test/reset`. El Ãºltimo endpoint estÃ¡ destinado al aislamiento de pruebas y al botÃ³n de reinicio de la demo.

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

La aplicaciÃ³n queda en `http://localhost:3000`. El archivo SQLite se crea en `data/cafeteria.sqlite` al iniciar.

## Estrategia de datos de prueba

Cada `beforeEach` ejecuta `POST /api/test/reset` antes de visitar la aplicaciÃ³n. El reset borra pedidos e Ã­tems, vuelve a sembrar el catÃ¡logo y deja disponibles tres productos conocidos. AsÃ­ no se depende del orden de ejecuciÃ³n ni de datos de una corrida anterior. La prueba exitosa, ademÃ¡s de revisar la respuesta del POST mediante alias, consulta `GET /api/orders/:id` para demostrar que el ID y el total quedaron persistidos en SQLite.

Los selectores funcionales usan `data-testid`. La sincronizaciÃ³n usa `cy.intercept()` y alias (`cy.wait('@...')`); no hay esperas numÃ©ricas. El caso de carrito vacÃ­o comprueba que el alias del POST tiene cero solicitudes. El caso de error usa un intercept con `times: 1` y HTTP 500, deja el carrito intacto y luego verifica que un segundo intento llega al servidor real.

## Dependencias reales y simuladas

- Reales: Express, better-sqlite3, TypeScript, Cypress y la API HTTP local.
- Simuladas: Ãºnicamente el fallo HTTP 500 del tercer E2E, mediante `cy.intercept()`. No se simulan el catÃ¡logo, la persistencia ni la confirmaciÃ³n exitosa.

## Cypress, Playwright y Agent Browser

| Herramienta | Ventaja principal | Trade-off para este proyecto |
|---|---|---|
| Cypress | Excelente feedback local, intercepts sencillos, snapshots y runner visual | Corre principalmente dentro del navegador y su paralelizaciÃ³n avanzada requiere configuraciÃ³n adicional |
| Playwright | Multi-navegador sÃ³lido, contextos aislados y API potente de red | Tiene una curva inicial algo mayor y menos enfoque en el runner interactivo dentro de la app |
| Agent Browser | Ãštil para agentes que exploran interfaces y flujos reales con acciones de alto nivel | No sustituye una suite determinista de regresiÃ³n con fixtures, alias y artefactos CI |

Para esta entrega se eligiÃ³ Cypress porque el objetivo acadÃ©mico exige explÃ­citamente `cy.intercept()`, alias, verificaciÃ³n de ausencia de POST y evidencias de screenshots/videos.

## Uso de IA

Se utilizÃ³ un asistente de IA como apoyo para proponer la estructura inicial, redactar cÃ³digo repetitivo, revisar la estrategia de aislamiento de datos y sugerir casos E2E. La soluciÃ³n fue revisada, ejecutada y ajustada manualmente; las decisiones de arquitectura, selectores, validaciones, escenarios y documentaciÃ³n pertenecen a esta entrega. No se incorporaron credenciales, datos personales ni cÃ³digo de terceros con licencia desconocida.

