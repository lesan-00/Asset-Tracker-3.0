-- Assignment acceptance/return approval workflow migration
-- Apply on MySQL 8+.

ALTER TABLE assignments
  MODIFY COLUMN status ENUM(
    'PENDING_ACCEPTANCE',
    'ACTIVE',
    'REFUSED',
    'RETURN_REQUESTED',
    'RETURN_APPROVED',
    'RETURN_REJECTED',
    'CANCELLED'
  ) DEFAULT 'PENDING_ACCEPTANCE';

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS terms_accepted TINYINT(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS terms_accepted_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS receiver_user_id VARCHAR(36) NULL,
  ADD COLUMN IF NOT EXISTS accepted_by_user_id VARCHAR(36) NULL,
  ADD COLUMN IF NOT EXISTS accepted_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS refused_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS refused_reason VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS return_requested_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS return_requested_by_user_id VARCHAR(36) NULL,
  ADD COLUMN IF NOT EXISTS return_approved_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS return_approved_by_admin_id VARCHAR(36) NULL,
  ADD COLUMN IF NOT EXISTS return_rejected_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS return_rejected_reason VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS issue_condition_json TEXT NULL,
  ADD COLUMN IF NOT EXISTS return_condition_json TEXT NULL,
  ADD COLUMN IF NOT EXISTS accessories_issued_json TEXT NULL,
  ADD COLUMN IF NOT EXISTS accessories_returned_json TEXT NULL;

ALTER TABLE assignments
  ADD INDEX IF NOT EXISTS idx_assignment_status (status),
  ADD INDEX IF NOT EXISTS idx_receiver_user (receiver_user_id);

-- Backfill receiver_user_id for existing records based on staff email -> users email.
UPDATE assignments a
JOIN staff s ON s.id = a.staff_id
JOIN users u ON LOWER(u.email) = LOWER(s.email)
SET a.receiver_user_id = u.id
WHERE a.receiver_user_id IS NULL;

-- Cleanup existing duplicate pending rows per laptop:
-- keep newest pending and cancel older pending rows.
UPDATE assignments a
JOIN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (PARTITION BY laptop_id ORDER BY assigned_date DESC, created_at DESC) AS rn
    FROM assignments
    WHERE status = 'PENDING_ACCEPTANCE'
  ) ranked
  WHERE ranked.rn > 1
) old_pending ON old_pending.id = a.id
SET a.status = 'CANCELLED', a.updated_at = CURRENT_TIMESTAMP;

-- Add these FKs only if they are missing in your environment:
-- ALTER TABLE assignments
--   ADD CONSTRAINT fk_assignments_accepted_by
--     FOREIGN KEY (accepted_by_user_id) REFERENCES users(id) ON DELETE SET NULL;
-- ALTER TABLE assignments
--   ADD CONSTRAINT fk_assignments_return_requested_by
--     FOREIGN KEY (return_requested_by_user_id) REFERENCES users(id) ON DELETE SET NULL;
-- ALTER TABLE assignments
--   ADD CONSTRAINT fk_assignments_return_approved_by
--     FOREIGN KEY (return_approved_by_admin_id) REFERENCES users(id) ON DELETE SET NULL;
