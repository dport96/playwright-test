const { Client } = require('pg');

const pgclient = new Client({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: 'postgres',       // Matches service container's default user
    password: 'postgres',   // Matches POSTGRES_PASSWORD in workflow
    database: 'postgres'    // Default database in PostgreSQL image
});

async function runQueries() {
    try {
        await pgclient.connect();
        
        // Fix: Use quotes for table name (User is a reserved keyword)
        await pgclient.query(`
            CREATE TABLE "User"(
                id SERIAL PRIMARY KEY,
                email VARCHAR(40) NOT NULL,
                password VARCHAR(40) NOT NULL,
                role VARCHAR(10)  -- Changed ROLE type to VARCHAR
            )
        `);
        
        // Fix: Remove explicit ID (SERIAL auto-generates) and use correct table name
        const insertRes = await pgclient.query(
            'INSERT INTO "User"(email, password, role) VALUES($1, $2, $3) RETURNING *',
            ['john@foo.com', 'changeme', 'USER']
        );
        
        // Fix: Query the correct table
        const selectRes = await pgclient.query('SELECT * FROM "User"');
        console.log('Users:', selectRes.rows);
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pgclient.end();
    }
}

runQueries();
