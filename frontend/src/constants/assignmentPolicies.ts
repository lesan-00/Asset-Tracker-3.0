export const STAFF_ASSIGNABLE_TYPES = ["LAPTOP", "DESKTOP", "SYSTEM_UNIT"] as const;
export const ACCESSORIES_ALLOWED_TYPES = ["LAPTOP"] as const;

export type AssignmentTargetType = "STAFF" | "LOCATION" | "DEPARTMENT";
