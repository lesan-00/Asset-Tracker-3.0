import { RowDataPacket } from "mysql2";
import { getConnection } from "../database/connection.js";
import { AssignmentModel } from "../models/Assignment.js";
import { Assignment } from "../types/index.js";

interface RevertAssignmentInput {
  assignmentId: string;
  adminUserId: string;
  adminEmail?: string;
  reason?: string;
}

interface RevertAssignmentResult {
  assignment: Assignment;
  alreadyFinalized: boolean;
}

interface AssignmentRow extends RowDataPacket {
  id: string;
  assetId: number | null;
  status: string;
  assetTag: string | null;
  assignedDate?: string | Date | null;
  createdAt?: string | Date | null;
}

export class AssignmentService {
  static async revertAssignment(
    input: RevertAssignmentInput
  ): Promise<RevertAssignmentResult | null> {
    const connection = await getConnection();

    try {
      await connection.beginTransaction();

      const selectSql = `
        SELECT
          a.id,
          a.asset_id as assetId,
          a.status,
          ass.asset_tag as assetTag,
          a.assigned_date as assignedDate,
          a.created_at as createdAt
        FROM assignments a
        LEFT JOIN assets ass ON ass.id = a.asset_id
        WHERE a.id = ?
        FOR UPDATE
      `;
      const selectParams = [input.assignmentId];
      logSql(selectSql, selectParams);
      const [rows] = await connection.execute<AssignmentRow[]>(selectSql, selectParams);

      if (!rows.length) {
        await connection.rollback();
        return null;
      }

      const current = rows[0];
      if (!current.assetId) {
        await connection.rollback();
        throw new Error("Assignment is missing asset reference");
      }

      const finalStatuses = new Set(["REVERTED", "CANCELLED"]);
      const alreadyFinalized = finalStatuses.has(String(current.status).toUpperCase());
      const lockAssetSql = `
        SELECT id, status
        FROM assets
        WHERE id = ?
        FOR UPDATE
      `;
      const lockAssetParams = [current.assetId];
      logSql(lockAssetSql, lockAssetParams);
      await connection.execute(lockAssetSql, lockAssetParams);

      const activeStatuses = [
        "PENDING_ACCEPTANCE",
        "ACTIVE",
        "RETURN_REQUESTED",
        "RETURN_REJECTED",
      ];

      const latestOpenSql = `
        SELECT id, status
        FROM assignments
        WHERE asset_id = ?
          AND status IN (?, ?, ?, ?)
        ORDER BY assigned_date DESC, created_at DESC
        LIMIT 1
        FOR UPDATE
      `;
      const latestOpenParams = [current.assetId, ...activeStatuses];
      logSql(latestOpenSql, latestOpenParams);
      const [latestRows] = await connection.execute<AssignmentRow[]>(latestOpenSql, latestOpenParams);
      const latestOpen = Array.isArray(latestRows) ? (latestRows as any[])[0] : null;
      if (latestOpen && String(latestOpen.id) !== input.assignmentId) {
        const conflictError = new Error(
          "Cannot revert this assignment because a newer active assignment exists for the asset"
        ) as Error & { statusCode?: number };
        conflictError.statusCode = 409;
        throw conflictError;
      }

      if (!alreadyFinalized) {
        const updateAssignmentSql = `
          UPDATE assignments
          SET
            status = 'REVERTED',
            reverted_at = CURRENT_TIMESTAMP,
            reverted_by_user_id = ?,
            revert_reason = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;
        const updateAssignmentParams = [
          input.adminUserId,
          input.reason?.trim() || null,
          input.assignmentId,
        ];
        logSql(updateAssignmentSql, updateAssignmentParams);
        await connection.execute(updateAssignmentSql, updateAssignmentParams);

        const [remainingRows] = await connection.execute(
          `SELECT id
           FROM assignments
           WHERE asset_id = ?
             AND status IN (?, ?, ?, ?)
           ORDER BY assigned_date DESC, created_at DESC
           LIMIT 1
           FOR UPDATE`,
          [current.assetId, ...activeStatuses]
        );
        const hasRemainingOpen =
          Array.isArray(remainingRows) && (remainingRows as any[]).length > 0;

        const updateAssetSql = `
          UPDATE assets
          SET status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;
        const nextStatus = hasRemainingOpen ? "ASSIGNED" : "IN_STOCK";
        const updateAssetParams = [nextStatus, current.assetId];
        logSql(updateAssetSql, updateAssetParams);
        await connection.execute(updateAssetSql, updateAssetParams);

        const actor = input.adminEmail || input.adminUserId;
        const message = input.reason?.trim()
          ? `Assignment reverted for asset ${current.assetTag || current.assetId} by ${actor}: ${input.reason.trim()}`
          : `Assignment reverted for asset ${current.assetTag || current.assetId} by ${actor}`;
        const activitySql = `
          INSERT INTO asset_activity_logs (action, entity_type, entity_id, message)
          VALUES ('ASSIGNMENT_REVERTED', 'ASSET', ?, ?)
        `;
        const activityParams = [String(current.assetId), message];
        logSql(activitySql, activityParams);
        await connection.execute(activitySql, activityParams);
      }

      await connection.commit();

      const assignment = await AssignmentModel.findById(input.assignmentId);
      if (!assignment) {
        throw new Error("Assignment not found after revert");
      }

      return {
        assignment,
        alreadyFinalized,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

function logSql(sql: string, params: unknown[]) {
  const normalized = params.map((value) => (value === undefined ? null : value));
  console.log("[DB-TX] SQL:", sql);
  console.log("[DB-TX] Params:", normalized);
}
