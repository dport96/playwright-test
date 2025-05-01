const { Client } = require('pg');

const pgclient = new Client({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres'
});

pgclient.connect();

const table = 'CREATE TABLE User(id SERIAL PRIMARY KEY, email VARCHAR(40) NOT NULL, password VARCHAR(40) NOT NULL, role ROLE)'
const text = 'INSERT INTO User(id, email, password, role) VALUES($1, $2, $3, $4) RETURNING *'
const values = ['0', 'john@foo.com', 'changeme', 'USER']

pgclient.query(table, (err, res) => {
    if (err) throw err
});

pgclient.query(text, values, (err, res) => {
    if (err) throw err
});

pgclient.query('SELECT * FROM student', (err, res) => {
    if (err) throw err
    console.log(err, res.rows) // Print the data in student table
    pgclient.end()
});
