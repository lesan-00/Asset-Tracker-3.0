-- ============================================================================
-- Asset Buddy Database Schema - MySQL 8.0
-- Clean, production-ready schema with no conditional logic
-- ============================================================================

-- Users table: stores admin and staff accounts
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  UNIQUE KEY idx_users_email (email),
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'STAFF') NOT NULL DEFAULT 'STAFF',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

-- Laptops table: tracks laptop inventory and status
CREATE TABLE laptops (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_name VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  serial_number VARCHAR(100) NOT NULL,
  UNIQUE KEY idx_laptops_serial (serial_number),
  mac_address VARCHAR(17),
  operating_system VARCHAR(50),
  processor VARCHAR(100),
  ram_gb INT,
  storage_gb INT,
  purchase_date DATE,
  warranty_expiry DATE,
  status ENUM('AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED') NOT NULL DEFAULT 'AVAILABLE',
  device_condition VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

-- Staff table: tracks employee information
CREATE TABLE staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  UNIQUE KEY idx_staff_employee_id (employee_id),
  department VARCHAR(100),
  designation VARCHAR(100),
  phone VARCHAR(20),
  office_location VARCHAR(100),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Assignments table: tracks laptop assignments to staff
CREATE TABLE assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  laptop_id INT NOT NULL,
  staff_id INT NOT NULL,
  assigned_by INT,
  assigned_date DATE NOT NULL,
  due_date DATE,
  status ENUM('PENDING', 'ACTIVE', 'RETURNED', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (laptop_id) REFERENCES laptops(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Assignments history table: audit trail for assignment changes
CREATE TABLE assignments_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT,
  staff_id INT,
  laptop_id INT,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  changed_by INT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE SET NULL,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Accessories table: manages laptop peripherals and add-ons
CREATE TABLE accessories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  quantity INT NOT NULL DEFAULT 0,
  unit_cost DECIMAL(10, 2),
  supplier VARCHAR(100),
  date_added DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

-- Laptop accessories junction table: maps accessories to laptops
CREATE TABLE laptop_accessories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  laptop_id INT NOT NULL,
  accessory_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  assigned_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (laptop_id) REFERENCES laptops(id) ON DELETE CASCADE,
  FOREIGN KEY (accessory_id) REFERENCES accessories(id) ON DELETE CASCADE,
  UNIQUE KEY idx_laptop_accessory (laptop_id, accessory_id)
);

-- Issues table: tracks technical issues and maintenance requests
CREATE TABLE issues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  laptop_id INT NOT NULL,
  reported_by INT,
  assigned_to INT,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  status ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  priority INT DEFAULT 0,
  resolution_notes TEXT,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (laptop_id) REFERENCES laptops(id) ON DELETE CASCADE,
  FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_issues_status (status),
  KEY idx_issues_severity (severity)
);

-- Issues history table: audit trail for issue updates
CREATE TABLE issues_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  issue_id INT,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  old_severity VARCHAR(50),
  new_severity VARCHAR(50),
  changed_by INT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE SET NULL,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Reports table: stores generated reports
CREATE TABLE reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  description TEXT,
  generated_by INT,
  content LONGTEXT,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_range_start DATE,
  data_range_end DATE,
  FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_reports_type (report_type),
  KEY idx_reports_generated (generated_at)
);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Seed admin user (password: admin123 hashed with bcrypt)
INSERT INTO users (full_name, email, password_hash, role, is_active) VALUES
('Admin User', 'admin@assetbuddy.com', '$2b$10$8zcbCEMVIv8k.PYh4oXxPuqL5vJqvQxhV2W3mK.1X7gN0j5e5m5F6', 'ADMIN', 1),
('John Smith', 'john@assetbuddy.com', '$2b$10$8zcbCEMVIv8k.PYh4oXxPuqL5vJqvQxhV2W3mK.1X7gN0j5e5m5F6', 'STAFF', 1),
('Sarah Johnson', 'sarah@assetbuddy.com', '$2b$10$8zcbCEMVIv8k.PYh4oXxPuqL5vJqvQxhV2W3mK.1X7gN0j5e5m5F6', 'STAFF', 1);

-- Seed laptop records
INSERT INTO laptops (device_name, model, serial_number, mac_address, operating_system, processor, ram_gb, storage_gb, status, device_condition) VALUES
('Laptop-001', 'Dell XPS 13', 'SN001', '00:1A:2B:3C:4D:5E', 'Windows 11', 'Intel i7', 16, 512, 'ASSIGNED', 'Good'),
('Laptop-002', 'MacBook Pro', 'SN002', '00:1A:2B:3C:4D:5F', 'macOS Sonoma', 'Apple M2', 8, 256, 'AVAILABLE', 'Excellent'),
('Laptop-003', 'HP Pavilion', 'SN003', '00:1A:2B:3C:4D:60', 'Windows 11', 'Intel i5', 8, 256, 'MAINTENANCE', 'Fair');

-- Seed staff records
INSERT INTO staff (user_id, employee_id, department, designation, phone, office_location, is_active) VALUES
(2, 'EMP001', 'Engineering', 'Senior Engineer', '555-0101', 'New York', 1),
(3, 'EMP002', 'Design', 'UX Designer', '555-0102', 'San Francisco', 1);

-- Seed assignment records
INSERT INTO assignments (laptop_id, staff_id, assigned_by, assigned_date, status) VALUES
(1, 1, 1, '2025-01-15', 'ACTIVE'),
(2, 2, 1, '2025-02-01', 'PENDING');

-- Seed accessories
INSERT INTO accessories (name, type, description, quantity, unit_cost) VALUES
('USB-C Charger', 'Power', 'Universal USB-C charger', 10, 29.99),
('HDMI Cable', 'Cable', '6ft HDMI 2.1 cable', 15, 12.99),
('Laptop Stand', 'Accessory', 'Adjustable aluminum stand', 5, 49.99);

-- Seed issues
INSERT INTO issues (laptop_id, reported_by, title, description, severity, status) VALUES
(1, 2, 'Battery not charging', 'Laptop battery not charging when plugged in', 'HIGH', 'OPEN'),
(3, 3, 'Screen flickering', 'Display flickers intermittently', 'MEDIUM', 'IN_PROGRESS');
