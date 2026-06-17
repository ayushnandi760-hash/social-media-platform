const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a connection pool (better than single connections for performance)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,       // Max 10 simultaneous connections
    queueLimit: 0              // Unlimited queue
});

// Test the connection on startup
pool.getConnection()
    .then(connection => {
        console.log('✅ MySQL Database connected successfully!');
        connection.release(); // Release back to pool
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    });

module.exports = pool;
