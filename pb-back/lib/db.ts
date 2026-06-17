import mysql from "mysql2"


export const sql_con = mysql.createPool({
    host: process.env.HOST || '127.0.0.1',
    port: Number(process.env.DBPORT) || 3306,
    user: 'root',
    password: process.env.DBPWD,
    database: process.env.SHEMA,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
})
