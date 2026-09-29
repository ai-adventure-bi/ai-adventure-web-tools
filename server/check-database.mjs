import {database} from './database.mjs';
try {
  await database('topbot_schools?select=classCode&limit=1');
  console.log('Database connection OK. TopBot schools table is available.');
} catch(error) {
  console.error(error.status ? error.message : 'Database connection check failed. No credentials have been printed.');
  process.exitCode=1;
}
