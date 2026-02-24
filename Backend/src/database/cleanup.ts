import pool from "./connection.js";

type DeleteResult = {
  table: string;
  deleted: number;
};

export async function cleanupOperationalData() {
  const connection = await pool.getConnection();
  const results: DeleteResult[] = [];

  try {
    await connection.beginTransaction();
    await connection.query("SET FOREIGN_KEY_CHECKS=0");

    const [adminRows] = await connection.query(
      `SELECT id, email
       FROM users
       WHERE role = 'ADMIN'
       ORDER BY created_at ASC
       LIMIT 1`
    );
    const primaryAdmin = Array.isArray(adminRows) ? (adminRows as any[])[0] : null;
    if (!primaryAdmin?.id) {
      throw new Error("No ADMIN account found. Cleanup aborted to prevent lockout.");
    }

    const deleteTables = [
      "notifications",
      "asset_activity_logs",
      "issues_history",
      "issues",
      "assignments_history",
      "assignments",
      "assets",
      "staff",
      "reports",
      "password_reset_audit_logs",
    ];

    for (const table of deleteTables) {
      const [result] = await connection.query(`DELETE FROM ${table}`);
      const affected = Number((result as any)?.affectedRows || 0);
      results.push({ table, deleted: affected });
    }

    const [deleteNonPrimaryResult] = await connection.query(
      `DELETE FROM users
       WHERE id <> ?`,
      [primaryAdmin.id]
    );
    results.push({
      table: "users",
      deleted: Number((deleteNonPrimaryResult as any)?.affectedRows || 0),
    });

    await connection.query("SET FOREIGN_KEY_CHECKS=1");
    await connection.commit();

    console.log("[DB CLEAN] Primary admin preserved:", primaryAdmin.email);
    for (const item of results) {
      console.log(`[DB CLEAN] ${item.table}: ${item.deleted} rows deleted`);
    }
    console.log("[DB CLEAN] Cleanup completed successfully.");
    return results;
  } catch (error) {
    await connection.rollback();
    try {
      await connection.query("SET FOREIGN_KEY_CHECKS=1");
    } catch {
      // ignore secondary restore error
    }
    console.error("[DB CLEAN] Cleanup failed:", error);
    throw error;
  } finally {
    connection.release();
  }
}

const invokedDirectly =
  import.meta.url === `file://${process.argv[1]}` ||
  (process.argv[1] || "").endsWith("cleanup.ts") ||
  (process.argv[1] || "").endsWith("cleanup.js");

if (invokedDirectly) {
  cleanupOperationalData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
