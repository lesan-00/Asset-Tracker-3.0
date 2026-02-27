import mysql from "mysql2/promise";
import { config } from "dotenv";

config();

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME,
  waitForConnections: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

export const query = async (sql: string, params?: unknown[]) => {
  const connection = await pool.getConnection();
  try {
    const providedParams = Array.isArray(params) ? params : [];
    const normalizedParams = providedParams.map((value) =>
      value === undefined ? null : value
    );
    const placeholderCount = (sql.match(/\?/g) || []).length;
    const hasPlaceholders = placeholderCount > 0;
    const effectiveParams = hasPlaceholders
      ? normalizedParams.length === placeholderCount
        ? normalizedParams
        : normalizedParams.length < placeholderCount
          ? [...normalizedParams, ...Array(placeholderCount - normalizedParams.length).fill(null)]
          : normalizedParams.slice(0, placeholderCount)
      : [];

    console.log("[DB] SQL:", sql);
    console.log("[DB] Params:", hasPlaceholders ? effectiveParams : []);

    let rows: unknown;
    if (hasPlaceholders) {
      const [resultRows] = await connection.query(sql, effectiveParams);
      rows = resultRows;
    } else {
      const [resultRows] = await connection.query(sql);
      rows = resultRows;
    }

    const rowCount = Array.isArray(rows)
      ? rows.length
      : Number((rows as any)?.affectedRows || (rows as any)?.changedRows || 0);

    return { rows: rows as any, rowCount };
  } finally {
    connection.release();
  }
};

export const getConnection = async () => {
  return pool.getConnection();
};

export default pool;
