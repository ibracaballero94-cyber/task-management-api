# API de tareas

API REST para gestionar tareas, hecha con **Node.js, TypeScript, Express 5 y SQLite**.

Cada tarea tiene título, descripción, estado (`pending`, `in_progress` o `done`), responsable y fecha límite. Se pueden crear, listar, ver, editar y borrar, y el listado se puede filtrar por estado y por responsable, con paginación.

## Cómo ejecutarlo

**Necesita Node.js 22.12 o superior**. No hace falta instalar ninguna base de datos: SQLite va dentro del proyecto.

```bash
npm install
npm run dev        # modo desarrollo, se recarga al guardar
```

La API queda en `http://localhost:3000`. Al arrancar aplica sola las migraciones pendientes y crea `data/tasks.db`.

Otros comandos:

```bash
npm test           # tests (vitest + supertest)
npm run migrate    # aplicar migraciones sin arrancar el servidor
npm run build      # compilar a dist/
npm start          # arrancar la versión compilada
npm run typecheck  # comprobar tipos
```

Variables de entorno opcionales:

| Variable        | Por defecto     | Para qué sirve           |
| --------------- | --------------- | ------------------------ |
| `PORT`          | `3000`          | Puerto HTTP              |
| `DATABASE_FILE` | `data/tasks.db` | Fichero de la base SQLite |

## Endpoints

| Método   | Ruta         | Qué hace                         | Respuesta correcta |
| -------- | ------------ | -------------------------------- | ------------------ |
| `POST`   | `/tasks`     | Crear una tarea                  | `201` + cabecera `Location` |
| `GET`    | `/tasks`     | Listar, con filtros y paginación | `200` |
| `GET`    | `/tasks/:id` | Ver una tarea                    | `200` |
| `PATCH`  | `/tasks/:id` | Editar uno o varios campos       | `200` |
| `DELETE` | `/tasks/:id` | Borrar una tarea                 | `204` |
| `GET`    | `/health`    | Comprobar que la API está viva   | `200` |

### Crear

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Preparar la demo","assignee":"Ana","dueDate":"2026-12-01"}'
```

```json
{
  "id": 1,
  "title": "Preparar la demo",
  "description": "",
  "status": "pending",
  "assignee": "Ana",
  "dueDate": "2026-12-01",
  "createdAt": "2026-11-17T18:53:21.755Z",
  "updatedAt": "2026-11-17T18:53:21.755Z"
}
```

| Campo         | Obligatorio | Reglas |
| ------------- | ----------- | ------ |
| `title`       | Sí          | Texto de 1 a 200 caracteres (se recortan espacios) |
| `assignee`    | Sí          | Texto de 1 a 100 caracteres |
| `description` | No          | Hasta 2000 caracteres. Por defecto `""` |
| `status`      | No          | `pending`, `in_progress` o `done`. Por defecto `pending` |
| `dueDate`     | No          | Fecha real en formato `YYYY-MM-DD`, o `null` |

### Listar

```bash
curl "http://localhost:3000/tasks?status=pending&assignee=ana&page=1&limit=20"
```

```json
{
  "data": [ { "id": 1, "title": "Preparar la demo", "...": "..." } ],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

- `status`: filtra por estado.
- `assignee`: filtra por responsable, sin distinguir mayúsculas.
- `page` (desde 1) y `limit` (de 1 a 100, por defecto 20).
- Orden: primero la fecha límite más cercana; las tareas sin fecha van al final.

### Editar

`PATCH` solo cambia los campos que se envían. Para quitar la fecha límite se envía `"dueDate": null`.

```bash
curl -X PATCH http://localhost:3000/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}'
```

### Errores

Todos los errores tienen el mismo formato:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son válidos",
    "details": [ { "field": "dueDate", "message": "No es una fecha válida" } ]
  }
}
```

| Código | `code`                   | Cuándo |
| ------ | ------------------------ | ------ |
| `400`  | `VALIDATION_ERROR`       | Campos inválidos o desconocidos, PATCH vacío, filtros o paginación incorrectos, id no numérico |
| `400`  | `INVALID_JSON`           | El cuerpo no es un JSON válido |
| `404`  | `NOT_FOUND`              | La tarea o la ruta no existen |
| `413`  | `PAYLOAD_TOO_LARGE`      | Cuerpo de más de 100 KB |
| `415`  | `UNSUPPORTED_MEDIA_TYPE` | `POST` o `PATCH` sin `Content-Type: application/json` |
| `500`  | `INTERNAL_ERROR`         | Error inesperado (el detalle va al log, no al cliente) |

## Estructura

```
migrations/              SQL de cada versión del esquema (001, 002...)
src/
  app.ts                 Monta la app Express (recibe la base de datos ya abierta)
  server.ts              Arranque: abre la base, migra y escucha
  config.ts              Variables de entorno
  errors.ts              HttpError
  middleware.ts          Exigir JSON, 404 de rutas y traducción de errores
  db/                    Conexión SQLite y runner de migraciones
  tasks/
    task.schemas.ts      Validación (zod) y tipos
    task.repository.ts   Acceso a datos (SQL)
    task.routes.ts       Rutas HTTP
tests/                   Tests de integración con supertest
```

## Decisiones

- **Express en vez de NestJS.** Para cinco endpoints, NestJS añade módulos, decoradores e inyección de dependencias que aquí no aportan. Con Express el código es corto y se lee de arriba abajo. Aun así está separado en capas (rutas, validación, repositorio), así que pasarlo a NestJS sería sobre todo mover piezas. Uso Express 5 porque recoge solo los errores de los handlers y no hace falta envolverlos.
- **SQLite con better-sqlite3.** No hay que instalar ni levantar nada para probar la API, y los tests usan una base en memoria por test, así que son rápidos e independientes. El driver es síncrono, algo que en SQLite es lo normal y simplifica el código. Para producción con varios procesos usaría PostgreSQL (ver más abajo).
- **Migraciones en SQL propias en vez de un ORM.** Son unas 30 líneas: cada fichero de `migrations/` se aplica una vez, en orden y dentro de una transacción, y queda registrado en `schema_migrations`. Con un esquema de una tabla, Prisma o TypeORM pesan más de lo que ayudan, y así el SQL queda a la vista. Los índices van en una segunda migración en vez de editar la primera, porque una migración ya aplicada no se toca.
- **Validación con zod, y además restricciones en la base.** zod valida la entrada y de paso da los tipos de TypeScript. Los esquemas son estrictos: un campo desconocido es un 400, no se ignora en silencio, porque así un error de escritura (`asignee`) no pasa desapercibido. La tabla tiene sus propios `CHECK` como segunda defensa por si alguien escribe sin pasar por la API.
- **La fecha límite se valida como fecha real.** Que tenga formato `YYYY-MM-DD` no basta: `2026-02-30` se rechaza.
- **`PATCH` y no `PUT`** para editar: lo normal es cambiar un campo (el estado, sobre todo), no reenviar la tarea entera.
- **Nombres de la API en inglés** (`status: "in_progress"`, `dueDate`) por convención; los mensajes de error están en español.
- **Responsable como texto libre.** El enunciado no habla de usuarios; con más tiempo sería una relación con una tabla de usuarios.
- **Paginación por página y límite**, con `total` y `totalPages`, porque es lo más fácil de consumir desde un listado con páginas. Una página fuera de rango devuelve una lista vacía, no un error.

## Qué haría con más tiempo

- **PostgreSQL** con Docker Compose para un despliegue real, manteniendo el mismo repositorio (es lo único que toca SQL).
- **Usuarios y autenticación** (JWT), con el responsable como relación y permisos sobre quién puede editar o borrar.
- **Documentación OpenAPI** generada desde los esquemas de zod, con Swagger UI.
- Más filtros: rango de fechas límite, tareas vencidas, búsqueda por texto, y elegir el orden.
- Paginación por cursor si las listas crecen mucho.
- Logs estructurados (pino), `helmet`, límite de peticiones y CI en GitHub Actions que pase tests y tipos en cada push.
- Más tests: unitarios del repositorio y casos límite de concurrencia.

##  Cómo he usado la IA

He utilizado Claude Code como asistente de programación durante el desarrollo del proyecto.

**Qué le pedí.** Le proporcioné el enunciado de la prueba y lo utilicé como apoyo para diseñar e implementar la API, organizar el código, resolver problemas y preparar las pruebas.

**Qué revisé.** Revisé las decisiones técnicas, la estructura por capas, las validaciones, el acceso a datos, el tratamiento de errores y las migraciones.

**Qué se corrigió durante el desarrollo:**
- Se tradujeron al español los mensajes de validación de Zod.
- Se mejoró la validación del parámetro `id` para identificar correctamente los errores.
- Se ajustó la estrategia de pruebas para utilizar Supertest contra la aplicación en memoria.
- Se añadieron pruebas automatizadas para verificar el CRUD, las validaciones, los filtros, la paginación y las migraciones.

La IA fue una herramienta de apoyo; revisé y ejecuté las pruebas y comprobaciones del proyecto.