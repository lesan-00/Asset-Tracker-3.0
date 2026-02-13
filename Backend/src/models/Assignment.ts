import { query } from "../database/connection.js";
import { Assignment } from "../types/index.js";
import { v4 as uuidv4 } from "uuid";

export type AssignmentStatus =
  | "PENDING_ACCEPTANCE"
  | "ACTIVE"
  | "REFUSED"
  | "RETURN_REQUESTED"
  | "RETURN_APPROVED"
  | "RETURN_REJECTED"
  | "CANCELLED";

type AssignmentListItem = Assignment & {
  laptop: {
    id: string;
    assetTag?: string;
    serialNumber: string;
    brand: string;
    model: string;
    status: string;
  };
  staff: {
    id: string;
    name: string;
    email: string;
    department: string;
    position: string;
    phoneNumber?: string;
  };
  receiver?: {
    id: string;
    email: string;
    fullName: string;
  };
};

export class AssignmentModel {
  static async create(data: {
    laptopId: string;
    staffId: string;
    receiverUserId?: string | null;
    assignedBy: string;
    assignedDate: Date;
    issueConditionJson?: string | null;
    accessoriesIssuedJson?: string | null;
    notes?: string;
  }): Promise<Assignment> {
    const id = uuidv4();
    await query(
      `INSERT INTO assignments (
        id, laptop_id, staff_id, receiver_user_id, assigned_date, assigned_by, status,
        issue_condition_json, accessories_issued_json, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING_ACCEPTANCE', ?, ?, ?)`,
      [
        id,
        data.laptopId,
        data.staffId,
        data.receiverUserId ?? null,
        data.assignedDate,
        data.assignedBy,
        data.issueConditionJson ?? null,
        data.accessoriesIssuedJson ?? null,
        data.notes || null,
      ]
    );
    return this.findById(id) as Promise<Assignment>;
  }

  static async findAll(options?: {
    receiverUserId?: string;
    status?: AssignmentStatus;
  }): Promise<Assignment[]> {
    const where: string[] = [];
    const values: unknown[] = [];

    if (options?.receiverUserId) {
      where.push("receiver_user_id = ?");
      values.push(options.receiverUserId);
    }
    if (options?.status) {
      where.push("status = ?");
      values.push(options.status);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const result = await query(
      `SELECT
         id,
         laptop_id as laptopId,
         staff_id as staffId,
         receiver_user_id as receiverUserId,
         assigned_date as assignedDate,
         status,
         terms_version as termsVersion,
         terms_accepted as termsAccepted,
         terms_accepted_at as termsAcceptedAt,
         accepted_by_user_id as acceptedByUserId,
         accepted_at as acceptedAt,
         refused_at as refusedAt,
         refused_reason as refusedReason,
         return_requested_at as returnRequestedAt,
         return_requested_by_user_id as returnRequestedByUserId,
         return_approved_at as returnApprovedAt,
         return_approved_by_admin_id as returnApprovedByAdminId,
         return_rejected_at as returnRejectedAt,
         return_rejected_reason as returnRejectedReason,
         issue_condition_json as issueConditionJson,
         return_condition_json as returnConditionJson,
         accessories_issued_json as accessoriesIssuedJson,
         accessories_returned_json as accessoriesReturnedJson,
         returned_date as returnedDate,
         notes,
         created_at as createdAt,
         updated_at as updatedAt
       FROM assignments
       ${whereClause}
       ORDER BY assigned_date DESC`,
      values
    );
    return (result.rows as any[]).map((row) => this.mapRow(row));
  }

  static async findById(id: string): Promise<Assignment | null> {
    const result = await query(
      `SELECT
         id,
         laptop_id as laptopId,
         staff_id as staffId,
         receiver_user_id as receiverUserId,
         assigned_date as assignedDate,
         status,
         terms_version as termsVersion,
         terms_accepted as termsAccepted,
         terms_accepted_at as termsAcceptedAt,
         accepted_by_user_id as acceptedByUserId,
         accepted_at as acceptedAt,
         refused_at as refusedAt,
         refused_reason as refusedReason,
         return_requested_at as returnRequestedAt,
         return_requested_by_user_id as returnRequestedByUserId,
         return_approved_at as returnApprovedAt,
         return_approved_by_admin_id as returnApprovedByAdminId,
         return_rejected_at as returnRejectedAt,
         return_rejected_reason as returnRejectedReason,
         issue_condition_json as issueConditionJson,
         return_condition_json as returnConditionJson,
         accessories_issued_json as accessoriesIssuedJson,
         accessories_returned_json as accessoriesReturnedJson,
         returned_date as returnedDate,
         notes,
         created_at as createdAt,
         updated_at as updatedAt
       FROM assignments
       WHERE id = ?`,
      [id]
    );
    const rows = result.rows as any[];
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  static async findAllWithDetails(options?: {
    receiverUserId?: string;
    status?: AssignmentStatus;
  }): Promise<AssignmentListItem[]> {
    const where: string[] = [];
    const values: unknown[] = [];

    if (options?.receiverUserId) {
      where.push("a.receiver_user_id = ?");
      values.push(options.receiverUserId);
    }
    if (options?.status) {
      where.push("a.status = ?");
      values.push(options.status);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const result = await query(
      `SELECT
         a.id,
         a.laptop_id as laptopId,
         a.staff_id as staffId,
         a.receiver_user_id as receiverUserId,
         a.assigned_date as assignedDate,
         a.status,
         a.terms_version as termsVersion,
         a.terms_accepted as termsAccepted,
         a.terms_accepted_at as termsAcceptedAt,
         a.accepted_by_user_id as acceptedByUserId,
         a.accepted_at as acceptedAt,
         a.refused_at as refusedAt,
         a.refused_reason as refusedReason,
         a.return_requested_at as returnRequestedAt,
         a.return_requested_by_user_id as returnRequestedByUserId,
         a.return_approved_at as returnApprovedAt,
         a.return_approved_by_admin_id as returnApprovedByAdminId,
         a.return_rejected_at as returnRejectedAt,
         a.return_rejected_reason as returnRejectedReason,
         a.issue_condition_json as issueConditionJson,
         a.return_condition_json as returnConditionJson,
         a.accessories_issued_json as accessoriesIssuedJson,
         a.accessories_returned_json as accessoriesReturnedJson,
         a.returned_date as returnedDate,
         a.notes,
         a.created_at as createdAt,
         a.updated_at as updatedAt,
         l.id as laptop_id,
         l.asset_tag as laptop_assetTag,
         l.serial_number as laptop_serialNumber,
         l.brand as laptop_brand,
         l.model as laptop_model,
         l.status as laptop_status,
         s.id as staff_id,
         s.name as staff_name,
         s.email as staff_email,
         s.department as staff_department,
         s.position as staff_position,
         s.phone_number as staff_phoneNumber,
         ru.id as receiver_id,
         ru.email as receiver_email,
         ru.full_name as receiver_fullName
       FROM assignments a
       JOIN laptops l ON l.id = a.laptop_id
       JOIN staff s ON s.id = a.staff_id
       LEFT JOIN users ru ON ru.id = a.receiver_user_id
       ${whereClause}
       ORDER BY a.assigned_date DESC`,
      values
    );

    return (result.rows as any[]).map((row) => ({
      ...this.mapRow(row),
      laptop: {
        id: row.laptop_id,
        assetTag: row.laptop_assetTag || undefined,
        serialNumber: row.laptop_serialNumber,
        brand: row.laptop_brand,
        model: row.laptop_model,
        status: row.laptop_status,
      },
      staff: {
        id: row.staff_id,
        name: row.staff_name,
        email: row.staff_email,
        department: row.staff_department,
        position: row.staff_position,
        phoneNumber: row.staff_phoneNumber || undefined,
      },
      receiver: row.receiver_id
        ? {
            id: row.receiver_id,
            email: row.receiver_email,
            fullName: row.receiver_fullName,
          }
        : undefined,
    }));
  }

  static async findConflictingForLaptop(
    laptopId: string,
    statuses: AssignmentStatus[],
    excludeAssignmentId?: string
  ): Promise<Assignment | null> {
    if (statuses.length === 0) return null;

    const placeholders = statuses.map(() => "?").join(", ");
    const values: unknown[] = [laptopId, ...statuses];
    let excludeClause = "";
    if (excludeAssignmentId) {
      excludeClause = "AND id <> ?";
      values.push(excludeAssignmentId);
    }

    const result = await query(
      `SELECT id
       FROM assignments
       WHERE laptop_id = ?
         AND status IN (${placeholders})
         ${excludeClause}
       ORDER BY assigned_date DESC
       LIMIT 1`,
      values
    );

    const rows = result.rows as Array<{ id: string }>;
    if (rows.length === 0) return null;
    return this.findById(rows[0].id);
  }

  static async hasAssignedStateForLaptop(
    laptopId: string,
    excludeAssignmentId?: string
  ): Promise<boolean> {
    const statuses: AssignmentStatus[] = ["ACTIVE", "RETURN_REQUESTED", "RETURN_REJECTED"];
    const found = await this.findConflictingForLaptop(laptopId, statuses, excludeAssignmentId);
    return Boolean(found);
  }

  static async updateById(
    id: string,
    data: Partial<{
      status: AssignmentStatus;
      termsVersion: string;
      termsAccepted: boolean;
      termsAcceptedAt: Date;
      acceptedByUserId: string;
      acceptedAt: Date;
      refusedAt: Date;
      refusedReason: string;
      returnRequestedAt: Date;
      returnRequestedByUserId: string;
      returnApprovedAt: Date;
      returnApprovedByAdminId: string;
      returnRejectedAt: Date;
      returnRejectedReason: string;
      issueConditionJson: string;
      returnConditionJson: string;
      accessoriesIssuedJson: string;
      accessoriesReturnedJson: string;
      returnedDate: Date;
      notes: string;
    }>
  ): Promise<Assignment | null> {
    const updates: string[] = [];
    const values: unknown[] = [];

    const setValue = (column: string, value: unknown) => {
      updates.push(`${column} = ?`);
      values.push(value);
    };

    if (data.status !== undefined) setValue("status", data.status);
    if (data.termsVersion !== undefined) setValue("terms_version", data.termsVersion);
    if (data.termsAccepted !== undefined) setValue("terms_accepted", data.termsAccepted ? 1 : 0);
    if (data.termsAcceptedAt !== undefined) setValue("terms_accepted_at", data.termsAcceptedAt);
    if (data.acceptedByUserId !== undefined) setValue("accepted_by_user_id", data.acceptedByUserId);
    if (data.acceptedAt !== undefined) setValue("accepted_at", data.acceptedAt);
    if (data.refusedAt !== undefined) setValue("refused_at", data.refusedAt);
    if (data.refusedReason !== undefined) setValue("refused_reason", data.refusedReason);
    if (data.returnRequestedAt !== undefined) setValue("return_requested_at", data.returnRequestedAt);
    if (data.returnRequestedByUserId !== undefined) {
      setValue("return_requested_by_user_id", data.returnRequestedByUserId);
    }
    if (data.returnApprovedAt !== undefined) setValue("return_approved_at", data.returnApprovedAt);
    if (data.returnApprovedByAdminId !== undefined) {
      setValue("return_approved_by_admin_id", data.returnApprovedByAdminId);
    }
    if (data.returnRejectedAt !== undefined) setValue("return_rejected_at", data.returnRejectedAt);
    if (data.returnRejectedReason !== undefined) {
      setValue("return_rejected_reason", data.returnRejectedReason);
    }
    if (data.issueConditionJson !== undefined) setValue("issue_condition_json", data.issueConditionJson);
    if (data.returnConditionJson !== undefined) setValue("return_condition_json", data.returnConditionJson);
    if (data.accessoriesIssuedJson !== undefined) {
      setValue("accessories_issued_json", data.accessoriesIssuedJson);
    }
    if (data.accessoriesReturnedJson !== undefined) {
      setValue("accessories_returned_json", data.accessoriesReturnedJson);
    }
    if (data.returnedDate !== undefined) setValue("returned_date", data.returnedDate);
    if (data.notes !== undefined) setValue("notes", data.notes);

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    await query(
      `UPDATE assignments SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    return this.findById(id);
  }

  static async delete(id: string): Promise<boolean> {
    const result = await query(`DELETE FROM assignments WHERE id = ?`, [id]);
    return result.rowCount > 0;
  }

  static async findReceiverUserIdForStaff(staffId: string): Promise<string | null> {
    const result = await query(
      `SELECT u.id
       FROM staff s
       JOIN users u ON LOWER(u.email) = LOWER(s.email)
       WHERE s.id = ?
       LIMIT 1`,
      [staffId]
    );
    const rows = result.rows as Array<{ id: string }>;
    return rows.length > 0 ? rows[0].id : null;
  }

  static async backfillReceiverUserIdByEmail(userId: string, email: string): Promise<void> {
    await query(
      `UPDATE assignments a
       JOIN staff s ON s.id = a.staff_id
       SET a.receiver_user_id = ?
       WHERE a.receiver_user_id IS NULL
         AND LOWER(s.email) = LOWER(?)`,
      [userId, email]
    );
  }

  private static mapRow(row: any): Assignment {
    return {
      id: row.id,
      laptopId: row.laptopId || row.laptop_id,
      staffId: row.staffId || row.staff_id,
      receiverUserId: row.receiverUserId || row.receiver_user_id || undefined,
      assignedDate: new Date(row.assignedDate || row.assigned_date),
      status: row.status,
      termsVersion: row.termsVersion || row.terms_version || undefined,
      termsAccepted:
        row.termsAccepted === undefined && row.terms_accepted === undefined
          ? undefined
          : Boolean(row.termsAccepted ?? row.terms_accepted),
      termsAcceptedAt:
        row.termsAcceptedAt || row.terms_accepted_at
          ? new Date(row.termsAcceptedAt || row.terms_accepted_at)
          : undefined,
      acceptedByUserId: row.acceptedByUserId || row.accepted_by_user_id || undefined,
      acceptedAt:
        row.acceptedAt || row.accepted_at
          ? new Date(row.acceptedAt || row.accepted_at)
          : undefined,
      refusedAt:
        row.refusedAt || row.refused_at
          ? new Date(row.refusedAt || row.refused_at)
          : undefined,
      refusedReason: row.refusedReason || row.refused_reason || undefined,
      returnRequestedAt:
        row.returnRequestedAt || row.return_requested_at
          ? new Date(row.returnRequestedAt || row.return_requested_at)
          : undefined,
      returnRequestedByUserId:
        row.returnRequestedByUserId || row.return_requested_by_user_id || undefined,
      returnApprovedAt:
        row.returnApprovedAt || row.return_approved_at
          ? new Date(row.returnApprovedAt || row.return_approved_at)
          : undefined,
      returnApprovedByAdminId:
        row.returnApprovedByAdminId || row.return_approved_by_admin_id || undefined,
      returnRejectedAt:
        row.returnRejectedAt || row.return_rejected_at
          ? new Date(row.returnRejectedAt || row.return_rejected_at)
          : undefined,
      returnRejectedReason: row.returnRejectedReason || row.return_rejected_reason || undefined,
      issueConditionJson: row.issueConditionJson || row.issue_condition_json || undefined,
      returnConditionJson: row.returnConditionJson || row.return_condition_json || undefined,
      accessoriesIssuedJson:
        row.accessoriesIssuedJson || row.accessories_issued_json || undefined,
      accessoriesReturnedJson:
        row.accessoriesReturnedJson || row.accessories_returned_json || undefined,
      returnedDate:
        row.returnedDate || row.returned_date
          ? new Date(row.returnedDate || row.returned_date)
          : undefined,
      notes: row.notes || undefined,
      createdAt: new Date(row.createdAt || row.created_at),
      updatedAt: new Date(row.updatedAt || row.updated_at),
    };
  }
}
