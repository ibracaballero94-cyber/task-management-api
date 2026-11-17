import { createApp } from './app';
import { config } from './config';
import { openDatabase } from './db/connection';
import { migrate } from './db/migrate';

const db = openDatabase(config.databaseFile);
const applied = migrate(db);
if (applied.length) console.log(`Migraciones aplicadas: ${applied.join(', ')}`);

const server = createApp(db).listen(config.port, () => {
  console.log(`API de tareas escuchando en http://localhost:${config.port}`);
});

const shutdown = () => {
  server.close(() => {
    db.close();
    process.exit(0);
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
