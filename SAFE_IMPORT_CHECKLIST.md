# SAFE IMPORT CHECKLIST

## 1) Pre-Import Preparation
- Take a full MySQL backup (`mysqldump`) before any import.
- Run imports in staging first with production-like volumes.
- Verify backend startup succeeds (it now fails fast if required unique indexes are missing).
- Confirm these unique constraints exist:
  - `assets.asset_tag`
  - `assets.imei_no` (nullable unique)
  - `staff.epf_no`
  - `users.email`

## 2) File Format Requirements

### Assets import required columns
- `asset_tag`
- `asset_type`
- `brand` (or `make`)
- `model`
- `status`
- `location`

### Assets import optional columns
- `imei_no`
- `serial_number`
- `department`
- `specifications`
- `purchase_date`
- `warranty_end_date`
- `notes`

### Staff import required columns
- `employee_name`
- `epf_no`
- `email`
- `department`

### Staff import optional columns
- `phone`
- `status`

## 3) Allowed Enum Values
- Asset status: `IN_STOCK`, `ASSIGNED`, `IN_REPAIR`, `RETIRED`
- Asset types: `LAPTOP`, `DESKTOP`, `PRINTER`, `SWITCH`, `ROUTER`, `MOBILE_PHONE`, `SYSTEM_UNIT`, `MONITOR`, `KEYBOARD`, `MOUSE`
- Staff status: `ACTIVE`, `INACTIVE`

## 4) Import Execution Flow
1. Open Data Import panel.
2. Download latest template.
3. Upload file and run **Preview**.
4. Fix all row-level errors shown (missing required fields, invalid enums, duplicates).
5. Re-run preview until `invalidRows = 0`.
6. Run **Confirm Import**.

## 5) Duplicate Safety Checks (Now Enforced)
- In-file duplicates are blocked for:
  - assets: `asset_tag`, `serial_number`, `imei_no`
  - staff: `epf_no`, `email`
- Database duplicates are blocked in preview and confirm.

## 6) Post-Import Verification
- Validate record counts:
  - `SELECT COUNT(*) FROM assets;`
  - `SELECT COUNT(*) FROM staff;`
- Validate dashboard summary and assets-by-type counts.
- Validate a few spot records by `asset_tag`, `serial_number`, `imei_no`, and `epf_no`.
- Validate reports export for expected subsets.

## 7) Rollback Procedure
- If data quality issues are detected post-import:
  1. Stop backend writes.
  2. Restore DB from pre-import backup.
  3. Fix source file errors.
  4. Re-run preview and confirm in staging before retrying production.
