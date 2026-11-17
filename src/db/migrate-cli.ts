import { config } from '../config';
import { openDatabase } from './connection';
import { migrate } from './migrate';

const db = openDatabase(config.databaseFile);
const applied = migrate(db);
console.log(applied.length ? `Migraciones aplicadas: ${applied.join(', ')}` : 'La base de datos ya está al día.');
db.close();
