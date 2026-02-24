import pool from "./connection.js";

export async function initializeDatabase() {
  const seedDemoData = String(process.env.SEED_DEMO_DATA || "false").toLowerCase() === "true";
  try {
    console.log("Initializing database schema...");
    console.log(`[DB INIT] SEED_DEMO_DATA=${seedDemoData}`);

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
        must_change_password TINYINT(1) NOT NULL DEFAULT 0,
        last_login_at TIMESTAMP NULL,
        password_updated_at DATETIME NULL,
        access_groups_json LONGTEXT NULL,
        access_level VARCHAR(50) NOT NULL DEFAULT 'Standard',
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
        employee_name VARCHAR(150) NOT NULL,
        epf_no VARCHAR(50) NULL UNIQUE,
        email VARCHAR(255) UNIQUE NOT NULL,
        department VARCHAR(255) NOT NULL,
        location VARCHAR(255) NULL,
        position VARCHAR(255) NOT NULL,
        status ENUM('ACTIVE', 'DISABLED') DEFAULT 'ACTIVE',
        join_date TIMESTAMP NOT NULL,
        phone_number VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_department (department),
        INDEX idx_staff_epf_no (epf_no)
      )
    `);
    await ensureStaffTableCompatibility();

    // Create assignments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id VARCHAR(36) PRIMARY KEY,
        asset_id BIGINT NULL,
        laptop_id VARCHAR(36) NULL,
        target_type ENUM('STAFF', 'LOCATION', 'DEPARTMENT') NOT NULL DEFAULT 'STAFF',
        staff_id VARCHAR(36) NULL,
        location VARCHAR(255) NULL,
        department VARCHAR(255) NULL,
        receiver_user_id VARCHAR(36),
        group_id VARCHAR(64) NULL,
        assigned_date TIMESTAMP NOT NULL,
        assigned_by VARCHAR(36) NOT NULL,
        status ENUM('PENDING_ACCEPTANCE', 'ACTIVE', 'REFUSED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'CANCELLED', 'REVERTED') DEFAULT 'PENDING_ACCEPTANCE',
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
        reverted_at TIMESTAMP NULL,
        reverted_by_user_id VARCHAR(36) NULL,
        revert_reason VARCHAR(500) NULL,
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
        CONSTRAINT fk_assignments_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE RESTRICT,
        CONSTRAINT fk_assignments_receiver_user FOREIGN KEY (receiver_user_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_assignments_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT,
        CONSTRAINT fk_assignments_accepted_by FOREIGN KEY (accepted_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_assignments_return_requested_by FOREIGN KEY (return_requested_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_assignments_return_approved_by FOREIGN KEY (return_approved_by_admin_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_assignments_reverted_by FOREIGN KEY (reverted_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_assignments_returned_by FOREIGN KEY (returned_by) REFERENCES users(id) ON DELETE RESTRICT,
        CONSTRAINT chk_assignments_target_fields CHECK (
          (target_type = 'STAFF' AND staff_id IS NOT NULL AND location IS NULL AND department IS NULL)
          OR (target_type = 'LOCATION' AND staff_id IS NULL AND location IS NOT NULL AND department IS NULL)
          OR (target_type = 'DEPARTMENT' AND staff_id IS NULL AND location IS NULL AND department IS NOT NULL)
        ),
        INDEX idx_asset (asset_id),
        INDEX idx_laptop (laptop_id),
        INDEX idx_staff (staff_id),
        INDEX idx_receiver_user (receiver_user_id),
        INDEX idx_assignments_group_id (group_id),
        INDEX idx_reverted_by_user (reverted_by_user_id),
        INDEX idx_assignment_status (status),
        INDEX idx_status (returned_date)
      )
    `);

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
        asset_id BIGINT NULL,
        laptop_id VARCHAR(36) NULL,
        title VARCHAR(255) NOT NULL,
        description LONGTEXT NOT NULL,
        category VARCHAR(100) NOT NULL DEFAULT 'GENERAL',
        status ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') DEFAULT 'OPEN',
        priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
        reported_by_user_id VARCHAR(36) NOT NULL,
        created_by_user_id VARCHAR(36) NOT NULL,
        reported_for_staff_id VARCHAR(36) NULL,
        reported_for_user_id VARCHAR(36) NULL,
        reported_by VARCHAR(36),
        assigned_to VARCHAR(255),
        resolution_notes LONGTEXT,
        reported_date TIMESTAMP NOT NULL,
        resolved_date TIMESTAMP,
        resolved_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (reported_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (reported_for_staff_id) REFERENCES staff(id) ON DELETE SET NULL,
        FOREIGN KEY (reported_for_user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_asset (asset_id),
        INDEX idx_laptop (laptop_id),
        INDEX idx_status (status),
        INDEX idx_priority (priority),
        INDEX idx_reported_by_user_id (reported_by_user_id),
        INDEX idx_created_by_user_id (created_by_user_id),
        INDEX idx_reported_for_staff_id (reported_for_staff_id),
        INDEX idx_reported_for_user_id (reported_for_user_id)
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

    // Create assets table (generic inventory)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        asset_tag VARCHAR(100) NOT NULL UNIQUE,
        asset_type ENUM('LAPTOP', 'PRINTER', 'SWITCH', 'ROUTER', 'DESKTOP', 'MOBILE_PHONE', 'SYSTEM_UNIT', 'MONITOR', 'KEYBOARD', 'MOUSE', 'HEADSET') NOT NULL,
        brand VARCHAR(255) NOT NULL,
        model VARCHAR(255) NOT NULL,
        imei_no VARCHAR(20) NULL UNIQUE,
        serial_number VARCHAR(255) NULL UNIQUE,
        specifications LONGTEXT NULL,
        department VARCHAR(255) NULL,
        status ENUM('IN_STOCK', 'ASSIGNED', 'IN_REPAIR', 'RETIRED') NOT NULL DEFAULT 'IN_STOCK',
        location VARCHAR(255) NOT NULL,
        purchase_date DATE NULL,
        warranty_end_date DATE NULL,
        notes LONGTEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_assets_type (asset_type),
        INDEX idx_assets_status (status),
        INDEX idx_assets_location (location),
        INDEX idx_assets_asset_tag (asset_tag),
        INDEX idx_assets_imei_no (imei_no),
        INDEX idx_assets_serial_number (serial_number)
      )
    `);
    await ensureAssetsTableCompatibility();
    if (seedDemoData) {
      await migrateLaptopsToAssets();
    } else {
      console.log("[DB INIT] Skipping laptop-to-asset migration (SEED_DEMO_DATA=false)");
    }
    await ensureAssignmentsTableCompatibility();
    await ensureIssuesTableCompatibility();
    await ensureRequiredUniqueConstraints();

    // Activity log for inventory dashboard summary
    await pool.query(`
      CREATE TABLE IF NOT EXISTS asset_activity_logs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        action VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(64) NOT NULL,
        message VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_asset_activity_entity (entity_type, entity_id),
        INDEX idx_asset_activity_created_at (created_at)
      )
    `);
    await ensureAssetActivityLogsTableCompatibility();

    // User-scoped notifications with read state
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        recipient_user_id VARCHAR(36) NOT NULL,
        title VARCHAR(120) NOT NULL,
        type VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(64) NOT NULL,
        message VARCHAR(255) NOT NULL,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_notifications_recipient (recipient_user_id),
        INDEX idx_notifications_unread (recipient_user_id, is_read),
        INDEX idx_notifications_entity (entity_type, entity_id),
        UNIQUE KEY uniq_notification_recipient_type_entity (recipient_user_id, type, entity_type, entity_id),
        CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await ensureNotificationsTableCompatibility();
    await backfillPendingAcceptanceNotifications();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_audit_logs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        admin_user_id VARCHAR(36) NOT NULL,
        target_user_id VARCHAR(36) NOT NULL,
        message VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_password_reset_admin (admin_user_id),
        INDEX idx_password_reset_target (target_user_id),
        CONSTRAINT fk_password_reset_admin FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE RESTRICT,
        CONSTRAINT fk_password_reset_target FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE RESTRICT
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

    // Optional development-only data bootstrap.
    if (seedDemoData) {
      await ensureStaffProfilesForUsers();
    } else {
      console.log("[DB INIT] Skipping staff profile bootstrap (SEED_DEMO_DATA=false)");
    }

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

    // Ensure at least one primary admin account exists.
    await ensurePrimaryAdminAccount();

    console.log("Database schema initialized successfully");
    return {
      seedRan: seedDemoData,
    };
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
  await addColumnIfMissing("must_change_password", "TINYINT(1) NOT NULL DEFAULT 0");
  await addColumnIfMissing("last_login_at", "TIMESTAMP NULL");
  await addColumnIfMissing("password_updated_at", "DATETIME NULL");
  await addColumnIfMissing("access_groups_json", "LONGTEXT NULL");
  await addColumnIfMissing("access_level", "VARCHAR(50) NOT NULL DEFAULT 'Standard'");
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

  if (existingColumns.has("access_level")) {
    await pool.query(`
      UPDATE users
      SET access_level = CASE
        WHEN role = 'ADMIN' THEN 'Privileged'
        ELSE 'Standard'
      END
      WHERE access_level IS NULL OR access_level = ''
    `);
  }

  if (existingColumns.has("access_groups_json")) {
    await pool.query(`
      UPDATE users
      SET access_groups_json = CASE
        WHEN role = 'ADMIN' THEN '["Administration","Inventory","Reporting"]'
        ELSE '["Assignments","Issues"]'
      END
      WHERE access_groups_json IS NULL OR access_groups_json = ''
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
    INSERT INTO staff (
      id, name, employee_name, epf_no, email, department, position, status, join_date, phone_number
    )
    SELECT
      UUID(),
      u.full_name,
      u.full_name,
      CONCAT('EPF-', UPPER(REPLACE(COALESCE(NULLIF(u.userCode, ''), u.id), ' ', '-'))),
      u.email,
      COALESCE(NULLIF(u.department, ''), 'General'),
      'Staff',
      CASE WHEN u.is_active = true THEN 'ACTIVE' ELSE 'DISABLED' END,
      CURRENT_TIMESTAMP,
      NULLIF(u.phoneNumber, '')
    FROM users u
    LEFT JOIN staff s ON LOWER(s.email) = LOWER(u.email)
    WHERE u.role = 'STAFF'
      AND u.is_active = true
      AND s.id IS NULL
  `);
}

async function ensureStaffTableCompatibility() {
  const [rows] = await pool.query("SHOW COLUMNS FROM staff");
  const existingColumns = new Set(
    Array.isArray(rows) ? rows.map((row: any) => row.Field) : []
  );

  const addColumnIfMissing = async (columnName: string, definition: string) => {
    if (existingColumns.has(columnName)) return;
    await pool.query(`ALTER TABLE staff ADD COLUMN \`${columnName}\` ${definition}`);
    existingColumns.add(columnName);
  };

  await addColumnIfMissing("employee_name", "VARCHAR(150) NULL");
  await addColumnIfMissing("epf_no", "VARCHAR(50) NULL");
  await addColumnIfMissing("location", "VARCHAR(255) NULL");
  await addColumnIfMissing("status", "ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE'");

  if (existingColumns.has("employee_name")) {
    await pool.query(`
      UPDATE staff
      SET employee_name = COALESCE(NULLIF(name, ''), 'UNKNOWN')
      WHERE employee_name IS NULL OR employee_name = ''
    `);
  }

  if (existingColumns.has("name")) {
    await pool.query(`
      UPDATE staff
      SET name = employee_name
      WHERE name IS NULL OR name = ''
    `);
  }

  if (existingColumns.has("epf_no")) {
    await pool.query(`
      UPDATE staff
      SET epf_no = NULL
      WHERE epf_no IS NOT NULL AND TRIM(epf_no) = ''
    `);
  }

  if (existingColumns.has("employee_name")) {
    await pool.query(`
      ALTER TABLE staff
      MODIFY COLUMN employee_name VARCHAR(150) NOT NULL
    `);
  }

  if (existingColumns.has("epf_no")) {
    await pool.query(`
      ALTER TABLE staff
      MODIFY COLUMN epf_no VARCHAR(50) NULL
    `);
  }

  const [indexRows] = await pool.query("SHOW INDEX FROM staff");
  const existingIndexes = new Set(
    Array.isArray(indexRows) ? indexRows.map((row: any) => row.Key_name) : []
  );

  if (!existingIndexes.has("uniq_staff_epf_no")) {
    await pool.query(
      "ALTER TABLE staff ADD UNIQUE INDEX uniq_staff_epf_no (`epf_no`)"
    );
  }
  if (!existingIndexes.has("idx_staff_employee_name")) {
    await pool.query("ALTER TABLE staff ADD INDEX idx_staff_employee_name (`employee_name`)");
  }
  if (!existingIndexes.has("idx_staff_department")) {
    await pool.query("ALTER TABLE staff ADD INDEX idx_staff_department (`department`)");
  }
  if (!existingIndexes.has("idx_staff_location")) {
    await pool.query("ALTER TABLE staff ADD INDEX idx_staff_location (`location`)");
  }
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
  await addColumnIfMissing("asset_id", "BIGINT NULL");
  await addColumnIfMissing("reported_by_user_id", "VARCHAR(36) NULL");
  await addColumnIfMissing("created_by_user_id", "VARCHAR(36) NULL");
  await addColumnIfMissing("reported_for_staff_id", "VARCHAR(36) NULL");
  await addColumnIfMissing("reported_for_user_id", "VARCHAR(36) NULL");
  await addColumnIfMissing("assigned_to", "VARCHAR(255) NULL");
  await addColumnIfMissing("resolution_notes", "LONGTEXT NULL");

  if (existingColumns.has("reported_by") && existingColumns.has("reported_by_user_id")) {
    await pool.query(`
      UPDATE issues
      SET reported_by_user_id = reported_by
      WHERE reported_by_user_id IS NULL AND reported_by IS NOT NULL
    `);
  }

  if (existingColumns.has("created_by_user_id") && existingColumns.has("reported_by_user_id")) {
    await pool.query(`
      UPDATE issues
      SET created_by_user_id = reported_by_user_id
      WHERE created_by_user_id IS NULL AND reported_by_user_id IS NOT NULL
    `);
  }

  if (existingColumns.has("category")) {
    await pool.query(`
      UPDATE issues
      SET category = 'GENERAL'
      WHERE category IS NULL OR category = ''
    `);
  }

  if (existingColumns.has("asset_id") && existingColumns.has("laptop_id")) {
    await pool.query(`
      UPDATE issues i
      JOIN laptops l ON l.id = i.laptop_id
      JOIN assets ass ON ass.asset_type = 'LAPTOP'
        AND (
          ass.asset_tag = l.asset_tag
          OR (ass.serial_number IS NOT NULL AND ass.serial_number <> '' AND ass.serial_number = l.serial_number)
        )
      SET i.asset_id = ass.id
      WHERE i.asset_id IS NULL
    `);
  }

  const [indexRows] = await pool.query("SHOW INDEX FROM issues");
  const existingIndexes = new Set(
    Array.isArray(indexRows) ? indexRows.map((row: any) => row.Key_name) : []
  );

  if (!existingIndexes.has("idx_asset")) {
    await pool.query("ALTER TABLE issues ADD INDEX idx_asset (`asset_id`)");
  }
  if (!existingIndexes.has("idx_reported_by_user_id")) {
    await pool.query(
      "ALTER TABLE issues ADD INDEX idx_reported_by_user_id (`reported_by_user_id`)"
    );
  }
  if (!existingIndexes.has("idx_created_by_user_id")) {
    await pool.query(
      "ALTER TABLE issues ADD INDEX idx_created_by_user_id (`created_by_user_id`)"
    );
  }
  if (!existingIndexes.has("idx_reported_for_user_id")) {
    await pool.query(
      "ALTER TABLE issues ADD INDEX idx_reported_for_user_id (`reported_for_user_id`)"
    );
  }
  if (!existingIndexes.has("idx_reported_for_staff_id")) {
    await pool.query(
      "ALTER TABLE issues ADD INDEX idx_reported_for_staff_id (`reported_for_staff_id`)"
    );
  }

  const [fkRows] = await pool.query(`
    SELECT CONSTRAINT_NAME, COLUMN_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'issues'
      AND REFERENCED_TABLE_NAME IS NOT NULL
  `);
  const fkRowsArray = Array.isArray(fkRows) ? (fkRows as any[]) : [];
  const existingFKs = new Set(fkRowsArray.map((row: any) => row.CONSTRAINT_NAME));

  for (const row of fkRowsArray) {
    if (row.COLUMN_NAME === "laptop_id") {
      try {
        await pool.query(`ALTER TABLE issues DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``);
      } catch {
        // Ignore if already removed.
      }
    }
  }

  if (existingColumns.has("laptop_id")) {
    try {
      await pool.query("ALTER TABLE issues MODIFY COLUMN laptop_id VARCHAR(36) NULL");
    } catch {
      // Ignore for compatibility across divergent schemas.
    }
  }

  if (!existingFKs.has("fk_issues_asset")) {
    try {
      await pool.query(
        "ALTER TABLE issues ADD CONSTRAINT fk_issues_asset FOREIGN KEY (`asset_id`) REFERENCES assets(`id`) ON DELETE RESTRICT"
      );
    } catch {
      // Ignore if FK exists with another name.
    }
  }

  if (!existingFKs.has("fk_issues_created_by")) {
    try {
      await pool.query(
        "ALTER TABLE issues ADD CONSTRAINT fk_issues_created_by FOREIGN KEY (`created_by_user_id`) REFERENCES users(`id`) ON DELETE RESTRICT"
      );
    } catch {
      // Ignore if FK exists with another name.
    }
  }

  if (!existingFKs.has("fk_issues_reported_for")) {
    try {
      await pool.query(
        "ALTER TABLE issues ADD CONSTRAINT fk_issues_reported_for FOREIGN KEY (`reported_for_user_id`) REFERENCES users(`id`) ON DELETE SET NULL"
      );
    } catch {
      // Ignore if FK exists with another name.
    }
  }

  if (!existingFKs.has("fk_issues_reported_for_staff")) {
    try {
      await pool.query(
        "ALTER TABLE issues ADD CONSTRAINT fk_issues_reported_for_staff FOREIGN KEY (`reported_for_staff_id`) REFERENCES staff(`id`) ON DELETE SET NULL"
      );
    } catch {
      // Ignore if FK exists with another name.
    }
  }

  if (existingColumns.has("created_by_user_id")) {
    try {
      await pool.query("ALTER TABLE issues MODIFY COLUMN created_by_user_id VARCHAR(36) NOT NULL");
    } catch {
      // Ignore if existing rows/constraints prevent this in older schemas.
    }
  }
}

async function ensureAssetsTableCompatibility() {
  const [rows] = await pool.query("SHOW COLUMNS FROM assets");
  const existingColumns = new Set(
    Array.isArray(rows) ? rows.map((row: any) => row.Field) : []
  );

  const addColumnIfMissing = async (columnName: string, definition: string) => {
    if (existingColumns.has(columnName)) return;
    await pool.query(`ALTER TABLE assets ADD COLUMN \`${columnName}\` ${definition}`);
    existingColumns.add(columnName);
  };

  await addColumnIfMissing("asset_tag", "VARCHAR(100) NOT NULL");
  await addColumnIfMissing(
    "asset_type",
    "ENUM('LAPTOP', 'PRINTER', 'SWITCH', 'ROUTER', 'DESKTOP', 'MOBILE_PHONE', 'SYSTEM_UNIT', 'MONITOR', 'KEYBOARD', 'MOUSE', 'HEADSET') NOT NULL DEFAULT 'LAPTOP'"
  );
  await addColumnIfMissing("brand", "VARCHAR(255) NOT NULL DEFAULT 'Unknown'");
  await addColumnIfMissing("model", "VARCHAR(255) NOT NULL DEFAULT 'Unknown'");
  await addColumnIfMissing("imei_no", "VARCHAR(20) NULL");
  await addColumnIfMissing("serial_number", "VARCHAR(255) NULL");
  await addColumnIfMissing("specifications", "LONGTEXT NULL");
  await addColumnIfMissing("department", "VARCHAR(255) NULL");
  await addColumnIfMissing(
    "status",
    "ENUM('IN_STOCK', 'ASSIGNED', 'IN_REPAIR', 'RETIRED') NOT NULL DEFAULT 'IN_STOCK'"
  );
  await addColumnIfMissing("location", "VARCHAR(255) NOT NULL DEFAULT 'Unassigned'");
  await addColumnIfMissing("purchase_date", "DATE NULL");
  await addColumnIfMissing("warranty_end_date", "DATE NULL");
  await addColumnIfMissing("notes", "LONGTEXT NULL");
  await addColumnIfMissing("created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  await addColumnIfMissing(
    "updated_at",
    "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
  );

  await pool.query(`
    ALTER TABLE assets
    MODIFY COLUMN asset_type ENUM(
      'LAPTOP',
      'PRINTER',
      'SWITCH',
      'ROUTER',
      'DESKTOP',
      'MOBILE_PHONE',
      'SYSTEM_UNIT',
      'MONITOR',
      'KEYBOARD',
      'MOUSE',
      'HEADSET'
    ) NOT NULL DEFAULT 'LAPTOP'
  `);

  const [indexRows] = await pool.query("SHOW INDEX FROM assets");
  const existingIndexes = new Set(
    Array.isArray(indexRows) ? indexRows.map((row: any) => row.Key_name) : []
  );

  const addIndexIfMissing = async (indexName: string, ddl: string) => {
    if (existingIndexes.has(indexName)) return;
    await pool.query(ddl);
    existingIndexes.add(indexName);
  };

  await addIndexIfMissing("idx_assets_type", "ALTER TABLE assets ADD INDEX idx_assets_type (`asset_type`)");
  await addIndexIfMissing("idx_assets_status", "ALTER TABLE assets ADD INDEX idx_assets_status (`status`)");
  await addIndexIfMissing("idx_assets_location", "ALTER TABLE assets ADD INDEX idx_assets_location (`location`)");
  await addIndexIfMissing("idx_assets_asset_tag", "ALTER TABLE assets ADD INDEX idx_assets_asset_tag (`asset_tag`)");
  await addIndexIfMissing("idx_assets_imei_no", "ALTER TABLE assets ADD INDEX idx_assets_imei_no (`imei_no`)");
  await addIndexIfMissing(
    "idx_assets_serial_number",
    "ALTER TABLE assets ADD INDEX idx_assets_serial_number (`serial_number`)"
  );

  // Required uniqueness guarantees for inventory identifiers.
  if (!existingIndexes.has("uniq_assets_asset_tag")) {
    await pool.query("ALTER TABLE assets ADD UNIQUE INDEX uniq_assets_asset_tag (`asset_tag`)");
    existingIndexes.add("uniq_assets_asset_tag");
  }

  if (!existingIndexes.has("uniq_assets_serial_number")) {
    await pool.query("ALTER TABLE assets ADD UNIQUE INDEX uniq_assets_serial_number (`serial_number`)");
    existingIndexes.add("uniq_assets_serial_number");
  }

  if (!existingIndexes.has("uniq_assets_imei_no")) {
    await pool.query("ALTER TABLE assets ADD UNIQUE INDEX uniq_assets_imei_no (`imei_no`)");
    existingIndexes.add("uniq_assets_imei_no");
  }
}

async function migrateLaptopsToAssets() {
  try {
    const [laptopRows] = await pool.query(`
      SELECT
        id,
        asset_tag,
        serial_number,
        brand,
        model,
        specifications,
        department,
        status,
        purchase_date,
        warranty_expiry,
        notes
      FROM laptops
    `);

    const rows = Array.isArray(laptopRows) ? (laptopRows as any[]) : [];
    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const existing = await pool.query(
        `SELECT id
         FROM assets
         WHERE asset_tag = ?
            OR (serial_number IS NOT NULL AND serial_number <> '' AND serial_number = ?)
         LIMIT 1`,
        [row.asset_tag, row.serial_number]
      );
      const existingRows = Array.isArray(existing[0]) ? (existing[0] as any[]) : [];
      if (existingRows.length > 0) {
        skipped += 1;
        console.log(`[Assets Migration] Skipped laptop ${row.id} (duplicate tag/serial)`);
        continue;
      }

      const mappedStatus =
        row.status === "AVAILABLE"
          ? "IN_STOCK"
          : row.status === "MAINTENANCE"
            ? "IN_REPAIR"
            : row.status === "ASSIGNED"
              ? "ASSIGNED"
              : "RETIRED";

      await pool.query(
        `INSERT INTO assets (
          asset_tag, asset_type, brand, model, serial_number, specifications, department,
          status, location, purchase_date, warranty_end_date, notes
        ) VALUES (?, 'LAPTOP', ?, ?, ?, ?, ?, ?, ?, DATE(?), DATE(?), ?)`,
        [
          row.asset_tag,
          row.brand,
          row.model,
          row.serial_number,
          typeof row.specifications === "string" ? row.specifications : JSON.stringify(row.specifications || null),
          row.department || null,
          mappedStatus,
          row.department || "Unassigned",
          row.purchase_date,
          row.warranty_expiry,
          row.notes || null,
        ]
      );
      inserted += 1;
    }

    console.log(`[Assets Migration] Laptops -> assets complete (inserted=${inserted}, skipped=${skipped})`);
  } catch (error) {
    console.warn("[Assets Migration] Warning while migrating laptops to assets:", error);
  }
}

async function ensureAssetActivityLogsTableCompatibility() {
  const [rows] = await pool.query("SHOW COLUMNS FROM asset_activity_logs");
  const existingColumns = new Set(
    Array.isArray(rows) ? rows.map((row: any) => row.Field) : []
  );

  const addColumnIfMissing = async (columnName: string, definition: string) => {
    if (existingColumns.has(columnName)) return;
    await pool.query(`ALTER TABLE asset_activity_logs ADD COLUMN \`${columnName}\` ${definition}`);
    existingColumns.add(columnName);
  };

  await addColumnIfMissing("action", "VARCHAR(50) NOT NULL DEFAULT 'UPDATE'");
  await addColumnIfMissing("entity_type", "VARCHAR(50) NOT NULL DEFAULT 'ASSET'");
  await addColumnIfMissing("entity_id", "VARCHAR(64) NOT NULL DEFAULT '0'");
  await addColumnIfMissing("message", "VARCHAR(255) NOT NULL DEFAULT ''");
  await addColumnIfMissing("created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");

  const [indexRows] = await pool.query("SHOW INDEX FROM asset_activity_logs");
  const existingIndexes = new Set(
    Array.isArray(indexRows) ? indexRows.map((row: any) => row.Key_name) : []
  );

  if (!existingIndexes.has("idx_asset_activity_entity")) {
    await pool.query(
      "ALTER TABLE asset_activity_logs ADD INDEX idx_asset_activity_entity (`entity_type`, `entity_id`)"
    );
  }

  if (!existingIndexes.has("idx_asset_activity_created_at")) {
    await pool.query(
      "ALTER TABLE asset_activity_logs ADD INDEX idx_asset_activity_created_at (`created_at`)"
    );
  }
}

async function ensureNotificationsTableCompatibility() {
  const [rows] = await pool.query("SHOW COLUMNS FROM notifications");
  const existingColumns = new Set(
    Array.isArray(rows) ? rows.map((row: any) => row.Field) : []
  );

  const addColumnIfMissing = async (columnName: string, definition: string) => {
    if (existingColumns.has(columnName)) return;
    await pool.query(`ALTER TABLE notifications ADD COLUMN \`${columnName}\` ${definition}`);
    existingColumns.add(columnName);
  };

  await addColumnIfMissing("recipient_user_id", "VARCHAR(36) NOT NULL");
  await addColumnIfMissing("title", "VARCHAR(120) NOT NULL DEFAULT 'Notification'");
  await addColumnIfMissing("type", "VARCHAR(50) NOT NULL DEFAULT 'ASSIGNMENT_PENDING_ACCEPTANCE'");
  await addColumnIfMissing("entity_type", "VARCHAR(50) NOT NULL DEFAULT 'ASSIGNMENT'");
  await addColumnIfMissing("entity_id", "VARCHAR(64) NOT NULL DEFAULT '0'");
  await addColumnIfMissing("message", "VARCHAR(255) NOT NULL DEFAULT ''");
  await addColumnIfMissing("is_read", "TINYINT(1) NOT NULL DEFAULT 0");
  await addColumnIfMissing("created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  await addColumnIfMissing(
    "updated_at",
    "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
  );

  const [indexRows] = await pool.query("SHOW INDEX FROM notifications");
  const existingIndexes = new Set(
    Array.isArray(indexRows) ? indexRows.map((row: any) => row.Key_name) : []
  );

  if (!existingIndexes.has("idx_notifications_recipient")) {
    await pool.query(
      "ALTER TABLE notifications ADD INDEX idx_notifications_recipient (`recipient_user_id`)"
    );
  }
  if (!existingIndexes.has("idx_notifications_unread")) {
    await pool.query(
      "ALTER TABLE notifications ADD INDEX idx_notifications_unread (`recipient_user_id`, `is_read`)"
    );
  }
  if (!existingIndexes.has("idx_notifications_entity")) {
    await pool.query(
      "ALTER TABLE notifications ADD INDEX idx_notifications_entity (`entity_type`, `entity_id`)"
    );
  }

  if (!existingIndexes.has("uniq_notification_recipient_type_entity")) {
    try {
      await pool.query(
        "ALTER TABLE notifications ADD UNIQUE INDEX uniq_notification_recipient_type_entity (`recipient_user_id`, `type`, `entity_type`, `entity_id`)"
      );
    } catch {
      // Ignore if legacy duplicate rows prevent adding unique index.
    }
  }
}

async function backfillPendingAcceptanceNotifications() {
  try {
    const [rows] = await pool.query(`
      SELECT
        a.id as assignmentId,
        a.receiver_user_id as receiverUserId,
        a.assigned_by as assignedBy,
        ass.asset_tag as assetTag
      FROM assignments a
      JOIN assets ass ON ass.id = a.asset_id
      WHERE a.status = 'PENDING_ACCEPTANCE'
        AND a.receiver_user_id IS NOT NULL
    `);

    const pendingRows = Array.isArray(rows) ? (rows as any[]) : [];
    for (const row of pendingRows) {
      await pool.query(
        `INSERT IGNORE INTO notifications (
           recipient_user_id, title, type, entity_type, entity_id, message, is_read
         ) VALUES (?, ?, 'ASSIGNMENT_PENDING_ACCEPTANCE', 'ASSIGNMENT', ?, ?, 0)`,
        [
          row.receiverUserId,
          "Assignment Pending Acceptance",
          String(row.assignmentId),
          `Assignment ${row.assetTag || row.assignmentId} is pending your acceptance`,
        ]
      );

      if (row.assignedBy) {
        await pool.query(
          `INSERT IGNORE INTO notifications (
             recipient_user_id, title, type, entity_type, entity_id, message, is_read
           ) VALUES (?, ?, 'ASSIGNMENT_AWAITING_ACCEPTANCE', 'ASSIGNMENT', ?, ?, 0)`,
          [
            row.assignedBy,
            "Assignment Awaiting Acceptance",
            String(row.assignmentId),
            `Assignment ${row.assetTag || row.assignmentId} is awaiting staff acceptance`,
          ]
        );
      }
    }
  } catch (error) {
    console.warn("[Notifications] Backfill warning:", error);
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

  await addColumnIfMissing("asset_id", "BIGINT NULL");
  await addColumnIfMissing(
    "target_type",
    "ENUM('STAFF', 'LOCATION', 'DEPARTMENT') NOT NULL DEFAULT 'STAFF'"
  );
  await addColumnIfMissing("location", "VARCHAR(255) NULL");
  await addColumnIfMissing("department", "VARCHAR(255) NULL");
  await addColumnIfMissing("receiver_user_id", "VARCHAR(36) NULL");
  await addColumnIfMissing("group_id", "VARCHAR(64) NULL");
  await addColumnIfMissing(
    "status",
    "ENUM('PENDING_ACCEPTANCE', 'ACTIVE', 'REFUSED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'CANCELLED', 'REVERTED') DEFAULT 'PENDING_ACCEPTANCE'"
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
  await addColumnIfMissing("reverted_at", "TIMESTAMP NULL");
  await addColumnIfMissing("reverted_by_user_id", "VARCHAR(36) NULL");
  await addColumnIfMissing("revert_reason", "VARCHAR(500) NULL");
  await addColumnIfMissing("issue_condition_json", "LONGTEXT NULL");
  await addColumnIfMissing("return_condition_json", "LONGTEXT NULL");
  await addColumnIfMissing("accessories_issued_json", "LONGTEXT NULL");
  await addColumnIfMissing("accessories_returned_json", "LONGTEXT NULL");

  if (existingColumns.has("asset_id") && existingColumns.has("laptop_id")) {
    await pool.query(`
      UPDATE assignments a
      JOIN laptops l ON l.id = a.laptop_id
      JOIN assets ass ON ass.asset_type = 'LAPTOP'
        AND (
          ass.asset_tag = l.asset_tag
          OR (ass.serial_number IS NOT NULL AND ass.serial_number <> '' AND ass.serial_number = l.serial_number)
        )
      SET a.asset_id = ass.id
      WHERE a.asset_id IS NULL
    `);
  }

  if (existingColumns.has("status")) {
    await pool.query(`
      ALTER TABLE assignments
      MODIFY COLUMN status ENUM(
        'PENDING_ACCEPTANCE',
        'ACTIVE',
        'REFUSED',
        'RETURN_REQUESTED',
        'RETURN_APPROVED',
        'RETURN_REJECTED',
        'CANCELLED',
        'REVERTED'
      ) DEFAULT 'PENDING_ACCEPTANCE'
    `);
  }

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

  if (existingColumns.has("target_type")) {
    await pool.query(`
      UPDATE assignments
      SET target_type = 'STAFF'
      WHERE target_type IS NULL OR target_type = ''
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
              PARTITION BY asset_id
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
    "idx_asset",
    "ALTER TABLE assignments ADD INDEX idx_asset (`asset_id`)"
  );
  await addIndexIfMissing(
    "idx_receiver_user",
    "ALTER TABLE assignments ADD INDEX idx_receiver_user (`receiver_user_id`)"
  );
  await addIndexIfMissing(
    "idx_assignments_group_id",
    "ALTER TABLE assignments ADD INDEX idx_assignments_group_id (`group_id`)"
  );
  await addIndexIfMissing(
    "idx_reverted_by_user",
    "ALTER TABLE assignments ADD INDEX idx_reverted_by_user (`reverted_by_user_id`)"
  );
  await addIndexIfMissing(
    "idx_assignments_assigned_date",
    "ALTER TABLE assignments ADD INDEX idx_assignments_assigned_date (`assigned_date`)"
  );
  await addIndexIfMissing(
    "idx_assignments_asset_status",
    "ALTER TABLE assignments ADD INDEX idx_assignments_asset_status (`asset_id`, `status`)"
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

  const [checkRows] = await pool.query(`
    SELECT CONSTRAINT_NAME
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'assignments'
      AND CONSTRAINT_TYPE = 'CHECK'
  `);
  const existingChecks = new Set(
    Array.isArray(checkRows) ? checkRows.map((row: any) => row.CONSTRAINT_NAME) : []
  );

  // Legacy transition: assignments used laptop_id as required FK.
  // Drop that FK so new writes can rely on asset_id.
  if (existingFKs.has("fk_assignments_laptop")) {
    try {
      await pool.query("ALTER TABLE assignments DROP FOREIGN KEY fk_assignments_laptop");
      existingFKs.delete("fk_assignments_laptop");
    } catch {
      // Ignore and continue; environments may already be migrated.
    }
  }

  // Legacy transition: make laptop_id nullable to avoid insert failures
  // while code writes asset_id as the source of truth.
  if (existingColumns.has("laptop_id")) {
    try {
      await pool.query("ALTER TABLE assignments MODIFY COLUMN laptop_id VARCHAR(36) NULL");
    } catch {
      // Ignore to keep startup resilient on divergent schemas.
    }
  }

  // Target compatibility: staff_id is optional for LOCATION/DEPARTMENT targets.
  if (existingColumns.has("staff_id")) {
    try {
      await pool.query("ALTER TABLE assignments MODIFY COLUMN staff_id VARCHAR(36) NULL");
    } catch {
      // Ignore to keep startup resilient on divergent schemas.
    }
  }

  const addForeignKeyIfMissing = async (constraintName: string, ddl: string) => {
    if (existingFKs.has(constraintName)) return;
    await pool.query(ddl);
    existingFKs.add(constraintName);
  };

  await addForeignKeyIfMissing(
    "fk_assignments_asset",
    "ALTER TABLE assignments ADD CONSTRAINT fk_assignments_asset FOREIGN KEY (`asset_id`) REFERENCES assets(`id`) ON DELETE RESTRICT"
  );
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
  await addForeignKeyIfMissing(
    "fk_assignments_reverted_by",
    "ALTER TABLE assignments ADD CONSTRAINT fk_assignments_reverted_by FOREIGN KEY (`reverted_by_user_id`) REFERENCES users(`id`) ON DELETE SET NULL"
  );

  if (!existingChecks.has("chk_assignments_target_fields")) {
    try {
      await pool.query(`
        ALTER TABLE assignments
        ADD CONSTRAINT chk_assignments_target_fields CHECK (
          (target_type = 'STAFF' AND staff_id IS NOT NULL AND location IS NULL AND department IS NULL)
          OR (target_type = 'LOCATION' AND staff_id IS NULL AND location IS NOT NULL AND department IS NULL)
          OR (target_type = 'DEPARTMENT' AND staff_id IS NULL AND location IS NULL AND department IS NOT NULL)
        )
      `);
    } catch {
      // Ignore on MySQL variants that reject CHECK constraints in ALTER.
    }
  }
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

async function ensureRequiredUniqueConstraints() {
  await ensureUniqueConstraint({
    table: "assets",
    column: "asset_tag",
    indexName: "uniq_assets_asset_tag",
    ignoreBlank: false,
  });
  await ensureUniqueConstraint({
    table: "assets",
    column: "imei_no",
    indexName: "uniq_assets_imei_no",
    ignoreBlank: true,
  });
  await ensureUniqueConstraint({
    table: "staff",
    column: "epf_no",
    indexName: "uniq_staff_epf_no",
    ignoreBlank: true,
  });
  await ensureUniqueConstraint({
    table: "users",
    column: "email",
    indexName: "uniq_users_email",
    ignoreBlank: false,
  });
}

async function ensureUniqueConstraint(input: {
  table: "assets" | "staff" | "users";
  column: string;
  indexName: string;
  ignoreBlank: boolean;
}) {
  const { table, column, indexName, ignoreBlank } = input;
  const hasUnique = await hasUniqueIndex(table, column);
  if (!hasUnique) {
    try {
      await pool.query(`ALTER TABLE ${table} ADD UNIQUE INDEX ${indexName} (\`${column}\`)`);
    } catch (error) {
      const duplicates = await findDuplicateValues(table, column, ignoreBlank);
      const sample = duplicates.length > 0 ? duplicates.join(", ") : "unknown";
      throw new Error(
        `[DB INIT] Missing unique constraint ${table}.${column}. Unable to create index because duplicates exist. Sample duplicate values: ${sample}. Resolve duplicates, then restart.`
      );
    }
  }

  const verified = await hasUniqueIndex(table, column);
  if (!verified) {
    throw new Error(
      `[DB INIT] Required unique constraint missing: ${table}.${column}. Startup aborted.`
    );
  }
}

async function hasUniqueIndex(table: string, column: string) {
  const [rows] = await pool.query(
    `SELECT 1
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
       AND NON_UNIQUE = 0
     LIMIT 1`,
    [table, column]
  );
  return Array.isArray(rows) && (rows as any[]).length > 0;
}

async function findDuplicateValues(table: string, column: string, ignoreBlank: boolean) {
  const where =
    ignoreBlank
      ? `WHERE ${column} IS NOT NULL AND TRIM(${column}) <> ''`
      : `WHERE ${column} IS NOT NULL`;
  const [rows] = await pool.query(
    `SELECT ${column} as value
     FROM ${table}
     ${where}
     GROUP BY ${column}
     HAVING COUNT(*) > 1
     ORDER BY COUNT(*) DESC
     LIMIT 5`
  );
  return Array.isArray(rows) ? (rows as any[]).map((row) => String(row.value)) : [];
}

async function ensurePrimaryAdminAccount() {
  try {
    const [adminRows] = await pool.query(
      `SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1`
    );
    const hasAdmin = Array.isArray(adminRows) && (adminRows as any[]).length > 0;

    if (!hasAdmin) {
      const { UserModel } = await import("../models/User.js");
      const email = (process.env.DEFAULT_ADMIN_EMAIL || "admin@assettracker.local").trim().toLowerCase();
      const password = process.env.DEFAULT_ADMIN_PASSWORD || "ChangeMe123!";
      const fullName = process.env.DEFAULT_ADMIN_NAME || "System Administrator";

      await UserModel.create({
        email,
        password,
        fullName,
        userCode: "ADM-001",
        username: "admin",
        location: "Head Office",
        department: "IT",
        phoneNumber: "N/A",
        role: "ADMIN",
      });

      console.log(`[INIT] Created primary admin account: ${email}`);
    }
  } catch (error) {
    console.error("Error ensuring primary admin account:", error);
  }
}
