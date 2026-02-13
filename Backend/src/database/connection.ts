import mysql from "mysql2/promise";
import { config } from "dotenv";

config();

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "asset_buddy",
  waitForConnections: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

export const query = async (sql: string, params?: unknown[]) => {
  const connection = await pool.getConnection();
  try {
    const normalizedParams = Array.isArray(params)
      ? params.map((value) => (value === undefined ? null : value))
      : [];
    const hasPlaceholders = sql.includes("?");

    console.log("[DB] SQL:", sql);
    console.log("[DB] Params:", normalizedParams);

    let rows: unknown;
    if (hasPlaceholders) {
      const [resultRows] = await connection.execute(sql, normalizedParams);
      rows = resultRows;
    } else if (normalizedParams.length > 0) {
      const [resultRows] = await connection.query(sql, normalizedParams);
      rows = resultRows;
    } else {
      const [resultRows] = await connection.query(sql);
      rows = resultRows;
    }

    return { rows: rows as any, rowCount: Array.isArray(rows) ? rows.length : 0 };
  } finally {
    connection.release();
  }
};

export const getConnection = async () => {
  return pool.getConnection();
};

export default pool;
