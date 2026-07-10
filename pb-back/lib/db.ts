import mysql from "mysql2"

const dbHost = process.env.DB_HOST || '127.0.0.1'
const dbPort = Number(process.env.DBPORT) || 3306
const dbSchema = process.env.DB_SCHEMA
console.log(`[db] connecting to ${dbHost}:${dbPort}/${dbSchema}`)

export const sql_con = mysql.createPool({
    host: dbHost,
    port: dbPort,
    user: 'root',
    password: process.env.DBPWD,
    database: dbSchema,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
})
