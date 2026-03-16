const { pool } = require('./database');
const { migrate } = require('./migrate');
const { seed } = require('./seed');
require('dotenv').config();

async function reset() {
  try {
    console.log('Resetting database...');
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
    console.log('Schema reset.');
    await pool.end();
    
    await migrate();
    await seed();
    console.log('Database reset complete.');
  } catch (error) {
    console.error('Reset failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  reset();
}

module.exports = { reset };
