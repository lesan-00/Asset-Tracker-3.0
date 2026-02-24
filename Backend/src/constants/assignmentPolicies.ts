export const STAFF_ASSIGNABLE_TYPES = ["LAPTOP", "DESKTOP", "SYSTEM_UNIT"] as const;
export const ACCESSORIES_ALLOWED_TYPES = ["LAPTOP"] as const;

export type AssignmentTargetType = "STAFF" | "LOCATION" | "DEPARTMENT";

export function isStaffAssignableType(assetType: string): boolean {
  return STAFF_ASSIGNABLE_TYPES.includes(assetType as (typeof STAFF_ASSIGNABLE_TYPES)[number]);
}

export function isAccessoriesAllowedType(assetType: string): boolean {
  return ACCESSORIES_ALLOWED_TYPES.includes(
    assetType as (typeof ACCESSORIES_ALLOWED_TYPES)[number]
  );
}
