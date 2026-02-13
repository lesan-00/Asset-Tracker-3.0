import pool from "./connection.js";

/**
 * MANUAL DATABASE RESET - Use only when you want to completely wipe and reinitialize the database
 * This is NOT called automatically on startup - it must be run manually
 * Usage: npm run db:reset
 */
export async function resetDatabase() {
  try {
    console.warn("⚠️  DANGER: Wiping entire database...");
    console.warn("All data will be permanently deleted!");

    // Disable foreign key checks during reset
    await pool.query("SET FOREIGN_KEY_CHECKS=0");

    // Drop all tables
    const dropQueries = [
      "DROP TABLE IF EXISTS reports",
      "DROP TABLE IF EXISTS laptop_accessories",
      "DROP TABLE IF EXISTS accessories",
      "DROP TABLE IF EXISTS issues_history",
      "DROP TABLE IF EXISTS issues",
      "DROP TABLE IF EXISTS assignments_history",
      "DROP TABLE IF EXISTS assignments",
      "DROP TABLE IF EXISTS `Assignment`",
      "DROP TABLE IF EXISTS `Staff`",
      "DROP TABLE IF EXISTS `Laptop`",
      "DROP TABLE IF EXISTS `Issue`",
      "DROP TABLE IF EXISTS staff",
      "DROP TABLE IF EXISTS laptops",
      "DROP TABLE IF EXISTS users",
      "DROP TABLE IF EXISTS `User`"
    ];

    for (const query of dropQueries) {
      try {
        await pool.query(query);
        console.log(`✓ Executed: ${query}`);
      } catch (error) {
        // Silently continue if table doesn't exist
      }
    }

    // Re-enable foreign key checks
    await pool.query("SET FOREIGN_KEY_CHECKS=1");

    // Import and run initialization (which will recreate tables and seed demo data)
    const { initializeDatabase } = await import("./init.js");
    await initializeDatabase();

    console.log("✓ Database reset completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error resetting database:", error);
    process.exit(1);
  }
}

// Run reset if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  resetDatabase();
}
