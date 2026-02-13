# Database Data Loss Fix - Changes Summary

## Problem
The backend was deleting all laptop (and other table) data on every restart because `initializeDatabase()` was executing `DROP TABLE` statements.

## Root Cause
In [src/database/init.ts](src/database/init.ts), the initialization function had destructive operations:
```typescript
// REMOVED - This code was deleting all data on startup
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
```

## Changes Made

### 1. **Fixed [src/database/init.ts](src/database/init.ts)** ✅
- **REMOVED**: All `DROP TABLE IF EXISTS` statements (lines 12-27)
- **KEPT**: All `CREATE TABLE IF NOT EXISTS` statements (non-destructive)
- **KEPT**: Foreign key and seed data logic
- **Result**: Tables are now created only if they don't exist; existing data is preserved

**Before:**
```typescript
// First, drop all tables without IF EXISTS to force recreation
const dropQueries = [
  "DROP TABLE IF EXISTS reports",
  "DROP TABLE IF EXISTS laptop_accessories",
  ...
  "DROP TABLE IF EXISTS laptops",
  ...
];

for (const query of dropQueries) {
  try {
    await pool.query(query);
  } catch (error) {
    // Silently continue if table doesn't exist
  }
}

// Create users table
await pool.query(`
  CREATE TABLE IF NOT EXISTS users (...)
`);
```

**After:**
```typescript
// Disable foreign key checks during schema initialization
await pool.query("SET FOREIGN_KEY_CHECKS=0");

// Create users table (non-destructive - only creates if not exists)
await pool.query(`
  CREATE TABLE IF NOT EXISTS users (...)
`);
```

### 2. **Created [src/database/reset.ts](src/database/reset.ts)** ✅ (New File)
A separate manual reset script that:
- Only runs when explicitly called with `npm run db:reset`
- NOT executed during normal startup
- Safely wipes the database with warning messages
- Reinitializes schema and demo data after deletion
- Includes safety warnings about data loss

**Key features:**
```typescript
/**
 * MANUAL DATABASE RESET - Use only when you want to completely wipe and reinitialize the database
 * This is NOT called automatically on startup - it must be run manually
 * Usage: npm run db:reset
 */
export async function resetDatabase() {
  // Performs DROP TABLE operations only when explicitly run
}
```

### 3. **Updated [package.json](package.json)** ✅
Added npm script for manual database reset:
```json
"scripts": {
  "dev": "tsx watch src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "test": "vitest",
  "lint": "eslint src",
  "db:reset": "tsx src/database/reset.ts"  // ← NEW
}
```

## Result
✅ **Data persistence fixed!** Laptops and other data will now persist across backend restarts.

- Normal startup: `npm run dev` → Creates schema if missing, **preserves all existing data**
- Manual reset: `npm run db:reset` → Completely wipes database and reinitializes with demo data

## How to Use

### Normal Development (preserves data)
```bash
npm run dev
```

### Reset Database Completely (when needed)
```bash
npm run db:reset
```

This is a **manual operation** - it won't run automatically.
