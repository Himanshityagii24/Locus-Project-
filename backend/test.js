require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Testing database connection...\n');
console.log('📋 Environment variables:');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('PORT:', process.env.PORT);
console.log('');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
  try {
    console.log('🔌 Attempting to connect to PostgreSQL...');
    const client = await pool.connect();
    console.log('✅ Connection successful!');
    
    const result = await client.query('SELECT NOW(), current_database(), current_user');
    console.log('');
    console.log('📊 Connection details:');
    console.log('  Time:', result.rows[0].now);
    console.log('  Database:', result.rows[0].current_database);
    console.log('  User:', result.rows[0].current_user);
    
    client.release();
    await pool.end();
    
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('\n💡 Common fixes:');
    console.error('  1. Make sure PostgreSQL is running');
    console.error('  2. Check if database "canteen_db" exists');
    console.error('  3. Verify username and password in DATABASE_URL');
    console.error('  4. Check if port 5432 is correct');
    process.exit(1);
  }
}

testConnection();