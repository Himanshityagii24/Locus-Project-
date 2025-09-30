const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Alternatively, you can use individual properties:
  // user: process.env.DB_USER || 'postgres',
  // host: process.env.DB_HOST || 'localhost',
  // database: process.env.DB_NAME || 'canteen_db',
  // password: process.env.DB_PASSWORD || 'admin123',
  // port: process.env.DB_PORT || 5432,
});

pool.on('connect', () => {
  console.log(' Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error(' Unexpected database error:', err);
  process.exit(-1);
});

module.exports = pool;