import pool from "./connection.js";

export async function initializeDatabase() {
  try {
    console.log("Initializing database schema...");

    // Disable foreign key checks during schema initialization
    await pool.query("SET FOREIGN_KEY_CHECKS=0");

    // Create users table (non-destructive - only creates if not exists)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        userCode VARCHAR(50) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        location VARCHAR(100) NOT NULL,
        department VARCHAR(100) NOT NULL,
        phoneNumber VARCHAR(20) NOT NULL,
        role ENUM('ADMIN', 'STAFF') DEFAULT 'STAFF',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_user_code (userCode),
        INDEX idx_username (username),
        INDEX idx_role (role)
      )
    `);

    // Compatibility migration for older schemas that were created without the
    // camelCase user fields required by the current backend queries.
    await ensureUsersTableCompatibility();

    // Create laptops table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS laptops (
        id VARCHAR(36) PRIMARY KEY,
        asset_tag VARCHAR(100) UNIQUE,
        serial_number VARCHAR(255) UNIQUE NOT NULL,
        model VARCHAR(255) NOT NULL,
        brand VARCHAR(255) NOT NULL,
        purchase_date TIMESTAMP NOT NULL,
        warranty_expiry TIMESTAMP NOT NULL,
        status ENUM('AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED') DEFAULT 'AVAILABLE',
        department VARCHAR(255),
        specifications JSON,
        purchase_price DECIMAL(10, 2),
        notes LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_serial (serial_number),
        INDEX idx_department (department),
        INDEX idx_asset_tag (asset_tag)
      )
    `);

    // Create staff table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        department VARCHAR(255) NOT NULL,
        position VARCHAR(255) NOT NULL,
        join_date TIMESTAMP NOT NULL,
        phone_number VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_department (department)
      )
    `);

    // Create assignments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id VARCHAR(36) PRIMARY KEY,
        laptop_id VARCHAR(36) NOT NULL,
        staff_id VARCHAR(36) NOT NULL,
        receiver_user_id VARCHAR(36),
        assigned_date TIMESTAMP NOT NULL,
        assigned_by VARCHAR(36) NOT NULL,
        status ENUM('PENDING_ACCEPTANCE', 'ACTIVE', 'REFUSED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'CANCELLED') DEFAULT 'PENDING_ACCEPTANCE',
        terms_version VARCHAR(20),
        terms_accepted TINYINT(1) DEFAULT 0,
        terms_accepted_at TIMESTAMP NULL,
        accepted_by_user_id VARCHAR(36) NULL,
        accepted_at TIMESTAMP NULL,
        refused_at TIMESTAMP NULL,
        refused_reason VARCHAR(255) NULL,
        return_requested_at TIMESTAMP NULL,
        return_requested_by_user_id VARCHAR(36) NULL,
        return_approved_at TIMESTAMP NULL,
        return_approved_by_admin_id VARCHAR(36) NULL,
        return_rejected_at TIMESTAMP NULL,
        return_rejected_reason VARCHAR(255) NULL,
        issue_condition_json LONGTEXT,
        return_condition_json LONGTEXT,
        accessories_issued_json LONGTEXT,
        accessories_returned_json LONGTEXT,
        condition_at_issue VARCHAR(255) DEFAULT 'GOOD',
        returned_date TIMESTAMP,
        condition_at_return VARCHAR(255),
        returned_by VARCHAR(36),
        notes LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_assignments_laptop FOREIGN KEY (laptop_id) REFERENCES laptops(id) ON DELETE RESTRICT,
        CONSTRAINT fk_assignments_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE RESTRICT,
        CONSTRAINT fk_assignments_receiver_user FOREIGN KEY (receiver_user_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_assignments_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT,
        CONSTRAINT fk_assignments_accepted_by FOREIGN KEY (accepted_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_assignments_return_requested_by FOREIGN KEY (return_requested_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_assignments_return_approved_by FOREIGN KEY (return_approved_by_admin_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_assignments_returned_by FOREIGN KEY (returned_by) REFERENCES users(id) ON DELETE RESTRICT,
        INDEX idx_laptop (laptop_id),
        INDEX idx_staff (staff_id),
        INDEX idx_receiver_user (receiver_user_id),
        INDEX idx_assignment_status (status),
        INDEX idx_status (returned_date)
      )
    `);

    await ensureAssignmentsTableCompatibility();

    // Create assignments_history table for audit trail
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assignments_history (
        id VARCHAR(36) PRIMARY KEY,
        assignment_id VARCHAR(36) NOT NULL,
        action VARCHAR(50) NOT NULL,
        changed_by VARCHAR(36) NOT NULL,
        old_values JSON,
        new_values JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assignment_id) REFERENCES assignments(id),
        FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT,
        INDEX idx_assignment (assignment_id),
        INDEX idx_action (action)
      )
    `);

    // Create issues table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS issues (
        id VARCHAR(36) PRIMARY KEY,
        laptop_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description LONGTEXT NOT NULL,
        category VARCHAR(100) NOT NULL DEFAULT 'GENERAL',
        status ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') DEFAULT 'OPEN',
        priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
        reported_by_user_id VARCHAR(36) NOT NULL,
        reported_by VARCHAR(36),
        assigned_to VARCHAR(255),
        resolution_notes LONGTEXT,
        reported_date TIMESTAMP NOT NULL,
        resolved_date TIMESTAMP,
        resolved_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (laptop_id) REFERENCES laptops(id),
        FOREIGN KEY (reported_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
        INDEX idx_laptop (laptop_id),
        INDEX idx_status (status),
        INDEX idx_priority (priority),
        INDEX idx_reported_by_user_id (reported_by_user_id)
      )
    `);

    await ensureIssuesTableCompatibility();

    // Create issues_history table for audit trail
    await pool.query(`
      CREATE TABLE IF NOT EXISTS issues_history (
        id VARCHAR(36) PRIMARY KEY,
        issue_id VARCHAR(36) NOT NULL,
        action VARCHAR(50) NOT NULL,
        changed_by VARCHAR(36) NOT NULL,
        old_values JSON,
        new_values JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (issue_id) REFERENCES issues(id),
        FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT,
        INDEX idx_issue (issue_id),
        INDEX idx_action (action)
      )
    `);

    // Create accessories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accessories (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description LONGTEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_active (is_active)
      )
    `);

    // Create laptop_accessories junction table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS laptop_accessories (
        id VARCHAR(36) PRIMARY KEY,
        laptop_id VARCHAR(36) NOT NULL,
        accessory_id VARCHAR(36) NOT NULL,
        quantity INT DEFAULT 1,
        added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (laptop_id) REFERENCES laptops(id) ON DELETE CASCADE,
        FOREIGN KEY (accessory_id) REFERENCES accessories(id),
        UNIQUE KEY unique_laptop_accessory (laptop_id, accessory_id),
        INDEX idx_laptop (laptop_id),
        INDEX idx_accessory (accessory_id)
      )
    `);

    // Create reports table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        generated_by VARCHAR(36) NOT NULL,
        generated_at TIMESTAMP NOT NULL,
        data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE RESTRICT,
        INDEX idx_type (type),
        INDEX idx_generated_at (generated_at)
      )
    `);

    // Ensure staff directory contains profiles for existing STAFF accounts.
    await ensureStaffProfilesForUsers();

    // Create/update settings table with new schema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT PRIMARY KEY,
        organization_name VARCHAR(255) NOT NULL,
        primary_department VARCHAR(100) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Migrate old settings table data if it exists and has the old schema
    await migrateSettingsTable();

    // Re-enable foreign key checks
    await pool.query("SET FOREIGN_KEY_CHECKS=1");

    // Seed demo data
    await seedDemoData();

    console.log("Database schema initialized successfully");
  } catch (error) {
    console.error("Error initializing database schema:", error);
    throw error;
  }
}

async function ensureUsersTableCompatibility() {
  const [rows] = await pool.query("SHOW COLUMNS FROM users");
  const existingColumns = new Set(
    Array.isArray(rows) ? rows.map((row: any) => row.Field) : []
  );

  const addColumnIfMissing = async (columnName: string, definition: string) => {
    if (existingColumns.has(columnName)) return;
    await pool.query(`ALTER TABLE users ADD COLUMN \`${columnName}\` ${definition}`);
    existingColumns.add(columnName);
  };

  await addColumnIfMissing("userCode", "VARCHAR(50) NULL");
  await addColumnIfMissing("username", "VARCHAR(100) NULL");
  await addColumnIfMissing("location", "VARCHAR(100) NULL");
  await addColumnIfMissing("department", "VARCHAR(100) NULL");
  await addColumnIfMissing("phoneNumber", "VARCHAR(20) NULL");
  await addColumnIfMissing("is_active", "BOOLEAN DEFAULT true");
  await addColumnIfMissing("created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  await addColumnIfMissing(
    "updated_at",
    "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
  );

  // Backfill new fields for legacy rows so reads and uniqueness constraints work.
  if (existingColumns.has("userCode")) {
    await pool.query(`
      UPDATE users
      SET userCode = CONCAT('USR-', LPAD(CAST(id AS CHAR), 4, '0'))
      WHERE (userCode IS NULL OR userCode = '')
    `);
  }

  if (existingColumns.has("username")) {
    await pool.query(`
      UPDATE users
      SET username = SUBSTRING_INDEX(email, '@', 1)
      WHERE (username IS NULL OR username = '')
    `);
  }

  if (existingColumns.has("location")) {
    await pool.query(`
      UPDATE users
      SET location = 'Head Office'
      WHERE (location IS NULL OR location = '')
    `);
  }

  if (existingColumns.has("department")) {
    await pool.query(`
      UPDATE users
      SET department = 'General'
      WHERE (department IS NULL OR department = '')
    `);
  }

  if (existingColumns.has("phoneNumber")) {
    await pool.query(`
      UPDATE users
      SET phoneNumber = 'N/A'
      WHERE (phoneNumber IS NULL OR phoneNumber = '')
    `);
  }

  // Add indexes if they are missing.
  const [indexRows] = await pool.query("SHOW INDEX FROM users");
  const existingIndexes = new Set(
    Array.isArray(indexRows) ? indexRows.map((row: any) => row.Key_name) : []
  );

  const addIndexIfMissing = async (indexName: string, ddl: string) => {
    if (existingIndexes.has(indexName)) return;
    await pool.query(ddl);
    existingIndexes.add(indexName);
  };

  await addIndexIfMissing(
    "idx_user_code",
    "ALTER TABLE users ADD INDEX idx_user_code (`userCode`)"
  );
  await addIndexIfMissing(
    "idx_username",
    "ALTER TABLE users ADD INDEX idx_username (`username`)"
  );
  await addIndexIfMissing(
    "idx_email",
    "ALTER TABLE users ADD INDEX idx_email (`email`)"
  );
  await addIndexIfMissing("idx_role", "ALTER TABLE users ADD INDEX idx_role (`role`)");
}

async function ensureStaffProfilesForUsers() {
  await pool.query(`
    INSERT INTO staff (id, name, email, department, position, join_date, phone_number)
    SELECT
      UUID(),
      u.full_name,
      u.email,
      COALESCE(NULLIF(u.department, ''), 'General'),
      'Staff',
      CURRENT_TIMESTAMP,
      NULLIF(u.phoneNumber, '')
    FROM users u
    LEFT JOIN staff s ON LOWER(s.email) = LOWER(u.email)
    WHERE u.role = 'STAFF'
      AND u.is_active = true
      AND s.id IS NULL
  `);
}

async function ensureIssuesTableCompatibility() {
  const [rows] = await pool.query("SHOW COLUMNS FROM issues");
  const existingColumns = new Set(
    Array.isArray(rows) ? rows.map((row: any) => row.Field) : []
  );

  const addColumnIfMissing = async (columnName: string, definition: string) => {
    if (existingColumns.has(columnName)) return;
    await pool.query(`ALTER TABLE issues ADD COLUMN \`${columnName}\` ${definition}`);
    existingColumns.add(columnName);
  };

  await addColumnIfMissing("category", "VARCHAR(100) NOT NULL DEFAULT 'GENERAL'");
  await addColumnIfMissing("reported_by_user_id", "VARCHAR(36) NULL");
  await addColumnIfMissing("assigned_to", "VARCHAR(255) NULL");
  await addColumnIfMissing("resolution_notes", "LONGTEXT NULL");

  if (existingColumns.has("reported_by") && existingColumns.has("reported_by_user_id")) {
    await pool.query(`
      UPDATE issues
      SET reported_by_user_id = reported_by
      WHERE reported_by_user_id IS NULL AND reported_by IS NOT NULL
    `);
  }

  if (existingColumns.has("category")) {
    await pool.query(`
      UPDATE issues
      SET category = 'GENERAL'
      WHERE category IS NULL OR category = ''
    `);
  }

  const [indexRows] = await pool.query("SHOW INDEX FROM issues");
  const existingIndexes = new Set(
    Array.isArray(indexRows) ? indexRows.map((row: any) => row.Key_name) : []
  );

  if (!existingIndexes.has("idx_reported_by_user_id")) {
    await pool.query(
      "ALTER TABLE issues ADD INDEX idx_reported_by_user_id (`reported_by_user_id`)"
    );
  }
}

async function ensureAssignmentsTableCompatibility() {
  const [rows] = await pool.query("SHOW COLUMNS FROM assignments");
  const existingColumns = new Set(
    Array.isArray(rows) ? rows.map((row: any) => row.Field) : []
  );

  const addColumnIfMissing = async (columnName: string, definition: string) => {
    if (existingColumns.has(columnName)) return;
    await pool.query(`ALTER TABLE assignments ADD COLUMN \`${columnName}\` ${definition}`);
    existingColumns.add(columnName);
  };

  await addColumnIfMissing("receiver_user_id", "VARCHAR(36) NULL");
  await addColumnIfMissing(
    "status",
    "ENUM('PENDING_ACCEPTANCE', 'ACTIVE', 'REFUSED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'CANCELLED') DEFAULT 'PENDING_ACCEPTANCE'"
  );
  await addColumnIfMissing("terms_version", "VARCHAR(20) NULL");
  await addColumnIfMissing("terms_accepted", "TINYINT(1) DEFAULT 0");
  await addColumnIfMissing("terms_accepted_at", "TIMESTAMP NULL");
  await addColumnIfMissing("accepted_by_user_id", "VARCHAR(36) NULL");
  await addColumnIfMissing("accepted_at", "TIMESTAMP NULL");
  await addColumnIfMissing("refused_at", "TIMESTAMP NULL");
  await addColumnIfMissing("refused_reason", "VARCHAR(255) NULL");
  await addColumnIfMissing("return_requested_at", "TIMESTAMP NULL");
  await addColumnIfMissing("return_requested_by_user_id", "VARCHAR(36) NULL");
  await addColumnIfMissing("return_approved_at", "TIMESTAMP NULL");
  await addColumnIfMissing("return_approved_by_admin_id", "VARCHAR(36) NULL");
  await addColumnIfMissing("return_rejected_at", "TIMESTAMP NULL");
  await addColumnIfMissing("return_rejected_reason", "VARCHAR(255) NULL");
  await addColumnIfMissing("issue_condition_json", "LONGTEXT NULL");
  await addColumnIfMissing("return_condition_json", "LONGTEXT NULL");
  await addColumnIfMissing("accessories_issued_json", "LONGTEXT NULL");
  await addColumnIfMissing("accessories_returned_json", "LONGTEXT NULL");

  if (existingColumns.has("status")) {
    await pool.query(`
      UPDATE assignments
      SET status = CASE
        WHEN status IS NULL AND returned_date IS NULL THEN 'ACTIVE'
        WHEN status IS NULL AND returned_date IS NOT NULL THEN 'RETURN_APPROVED'
        ELSE status
      END
    `);
  }

  if (existingColumns.has("receiver_user_id")) {
    await pool.query(`
      UPDATE assignments a
      JOIN staff s ON s.id = a.staff_id
      JOIN users u ON LOWER(u.email) = LOWER(s.email)
      SET a.receiver_user_id = u.id
      WHERE a.receiver_user_id IS NULL
    `);
  }

  if (existingColumns.has("status")) {
    await pool.query(`
      UPDATE assignments a
      JOIN (
        SELECT id
        FROM (
          SELECT
            id,
            ROW_NUMBER() OVER (
              PARTITION BY laptop_id
              ORDER BY assigned_date DESC, created_at DESC
            ) AS rn
          FROM assignments
          WHERE status = 'PENDING_ACCEPTANCE'
        ) ranked
        WHERE ranked.rn > 1
      ) duplicates ON duplicates.id = a.id
      SET a.status = 'CANCELLED',
          a.updated_at = CURRENT_TIMESTAMP
    `);
  }

  const [indexRows] = await pool.query("SHOW INDEX FROM assignments");
  const existingIndexes = new Set(
    Array.isArray(indexRows) ? indexRows.map((row: any) => row.Key_name) : []
  );

  const addIndexIfMissing = async (indexName: string, ddl: string) => {
    if (existingIndexes.has(indexName)) return;
    await pool.query(ddl);
    existingIndexes.add(indexName);
  };

  await addIndexIfMissing(
    "idx_assignment_status",
    "ALTER TABLE assignments ADD INDEX idx_assignment_status (`status`)"
  );
  await addIndexIfMissing(
    "idx_receiver_user",
    "ALTER TABLE assignments ADD INDEX idx_receiver_user (`receiver_user_id`)"
  );

  const [fkRows] = await pool.query(`
    SELECT CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'assignments'
      AND REFERENCED_TABLE_NAME IS NOT NULL
  `);
  const existingFKs = new Set(
    Array.isArray(fkRows) ? fkRows.map((row: any) => row.CONSTRAINT_NAME) : []
  );

  const addForeignKeyIfMissing = async (constraintName: string, ddl: string) => {
    if (existingFKs.has(constraintName)) return;
    await pool.query(ddl);
    existingFKs.add(constraintName);
  };

  await addForeignKeyIfMissing(
    "fk_assignments_receiver_user",
    "ALTER TABLE assignments ADD CONSTRAINT fk_assignments_receiver_user FOREIGN KEY (`receiver_user_id`) REFERENCES users(`id`) ON DELETE SET NULL"
  );
  await addForeignKeyIfMissing(
    "fk_assignments_accepted_by",
    "ALTER TABLE assignments ADD CONSTRAINT fk_assignments_accepted_by FOREIGN KEY (`accepted_by_user_id`) REFERENCES users(`id`) ON DELETE SET NULL"
  );
  await addForeignKeyIfMissing(
    "fk_assignments_return_requested_by",
    "ALTER TABLE assignments ADD CONSTRAINT fk_assignments_return_requested_by FOREIGN KEY (`return_requested_by_user_id`) REFERENCES users(`id`) ON DELETE SET NULL"
  );
  await addForeignKeyIfMissing(
    "fk_assignments_return_approved_by",
    "ALTER TABLE assignments ADD CONSTRAINT fk_assignments_return_approved_by FOREIGN KEY (`return_approved_by_admin_id`) REFERENCES users(`id`) ON DELETE SET NULL"
  );
}

// Migrate old settings table to new schema
async function migrateSettingsTable() {
  try {
    // Check if old columns exist
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'settings'
    `);
    
    const columnNames = new Set(
      Array.isArray(columns) ? columns.map((col: any) => col.COLUMN_NAME) : []
    );

    // If old schema exists (key_name, value_json), migrate the data
    if (columnNames.has("key_name") && columnNames.has("value_json")) {
      // Try to migrate "app" settings to new schema
      const [oldData] = await pool.query(
        `SELECT value_json FROM settings WHERE key_name = 'app' LIMIT 1`
      );

      const oldRows = Array.isArray(oldData) ? (oldData as any[]) : [];

      if (oldRows.length > 0) {
        try {
          const raw = oldRows[0] as any;
          const oldSettings = typeof raw.value_json === "string"
            ? JSON.parse(raw.value_json)
            : raw.value_json;

          if (oldSettings) {
            // If the old settings table lacks the new columns, add them so
            // we can populate a row with id=1. This handles legacy schemas
            // that used (key_name, value_json) without an `id` column.
            try {
              await pool.query(`ALTER TABLE settings
                ADD COLUMN IF NOT EXISTS id INT NULL,
                ADD COLUMN IF NOT EXISTS organization_name VARCHAR(255) NULL,
                ADD COLUMN IF NOT EXISTS primary_department VARCHAR(100) NULL,
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL`);
            } catch (alterErr) {
              // MySQL older versions don't support IF NOT EXISTS on ADD COLUMN;
              // fallback to attempting to add columns individually and ignore failures.
              try { await pool.query("ALTER TABLE settings ADD COLUMN id INT NULL"); } catch(e) {}
              try { await pool.query("ALTER TABLE settings ADD COLUMN organization_name VARCHAR(255) NULL"); } catch(e) {}
              try { await pool.query("ALTER TABLE settings ADD COLUMN primary_department VARCHAR(100) NULL"); } catch(e) {}
              try { await pool.query("ALTER TABLE settings ADD COLUMN updated_at TIMESTAMP NULL"); } catch(e) {}
            }

            // Try to update a row corresponding to the old 'app' key if present
            const org = oldSettings.orgName || "Browns Plantations";
            const dept = oldSettings.primaryDepartment || "IT Department";

            const [updateResult] = await pool.query(
              `UPDATE settings SET id = 1, organization_name = ?, primary_department = ? WHERE key_name = 'app'`,
              [org, dept]
            );

            // If no rows were updated, insert a new row with id=1 into the table.
            const updatedRows = (updateResult as any).affectedRows || 0;
            if (updatedRows === 0) {
              try {
                await pool.query(
                  `INSERT INTO settings (id, organization_name, primary_department) VALUES (1, ?, ?)`,
                  [org, dept]
                );
              } catch (insertErr) {
                // If insert fails (e.g., because table still has a different layout),
                // ignore and let the later default ensure a usable row exists.
              }
            }
          }
        } catch (parseError) {
          console.warn("[Settings Migration] Could not parse old settings JSON, using defaults");
        }
      }

      // Drop old columns if they exist (optional - can keep for backward compatibility)
      // await pool.query(`ALTER TABLE settings DROP COLUMN key_name, DROP COLUMN value_json`);
    }

    // Ensure default row exists
    const [existingRow] = await pool.query(
      `SELECT id FROM settings WHERE id = 1`
    );
    
    if (!Array.isArray(existingRow) || existingRow.length === 0) {
      await pool.query(
        `INSERT INTO settings (id, organization_name, primary_department) 
         VALUES (1, 'Browns Plantations', 'IT Department')`
      );
    }
  } catch (error) {
    console.warn("[Settings Migration] Warning during migration:", error);
    // Don't throw - this is a migration, let the app continue
  }
}

// Seed demo data
async function seedDemoData() {
  try {
    // Import here to avoid circular dependency
    const { UserModel } = await import("../models/User.js");
    
    // Check if admin user already exists
    const adminExists = await UserModel.findByEmail("admin@example.com");
    
    if (!adminExists) {
      // Create demo admin user
      await UserModel.create({
        email: "admin@example.com",
        password: "password123",
        fullName: "Admin User",
        userCode: "ADM-001",
        username: "admin.user",
        location: "Head Office",
        department: "IT",
        phoneNumber: "555-0001",
        role: "ADMIN"
      });
      
      console.log(`✓ Created demo admin user: admin@example.com`);
      
      // Create demo staff user
      await UserModel.create({
        email: "staff@example.com",
        password: "password123",
        fullName: "Staff User",
        userCode: "STF-001",
        username: "staff.user",
        location: "Head Office",
        department: "Operations",
        phoneNumber: "555-0002",
        role: "STAFF"
      });
      
      console.log(`✓ Created demo staff user: staff@example.com`);
    }
  } catch (error) {
    console.error("Error seeding demo data:", error);
    // Don't throw - let app start even if seeding fails
  }
}
