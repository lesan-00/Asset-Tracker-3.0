import { z } from "zod";

export const CreateLaptopSchema = z.object({
  assetTag: z.string().min(1),
  serialNumber: z.string().min(1),
  model: z.string().min(1),
  brand: z.string().min(1),
  purchaseDate: z.string().datetime(),
  warrantyExpiry: z.string().datetime(),
  status: z.enum(["AVAILABLE", "ASSIGNED", "MAINTENANCE", "LOST", "RETIRED"]),
  department: z.string().min(1),
  specifications: z
    .object({
      cpu: z.string().optional(),
      ram: z.string().optional(),
      storage: z.string().optional(),
    })
    .optional(),
  purchasePrice: z.number().optional(),
  notes: z.string().optional(),
});

export const UpdateLaptopSchema = CreateLaptopSchema.partial();

export const CreateStaffSchema = z.object({
  employeeName: z.string().trim().min(2),
  epfNo: z
    .preprocess(
      (value) => (typeof value === "string" ? value.trim() : value),
      z.string().optional().nullable()
    )
    .transform((value) => {
      const normalized = (value || "").trim().toUpperCase();
      return normalized.length > 0 ? normalized : null;
    }),
  email: z.string().trim().email().optional(),
  department: z.string().trim().optional(),
  location: z.string().trim().optional(),
  phoneNumber: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "DISABLED", "INACTIVE"]).default("ACTIVE"),
  position: z.string().trim().optional(),
  joinDate: z.string().datetime().optional(),
});

export const UpdateStaffSchema = CreateStaffSchema.partial();

export const CreateAssignmentSchema = z.object({
  assetId: z.coerce.number().int().positive().optional(),
  laptopId: z.string().optional(),
  staffId: z.string().uuid().optional(),
  targetType: z.enum(["STAFF", "LOCATION", "DEPARTMENT"]).optional(),
  location: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  issueDate: z.string().datetime().optional(),
  assignedDate: z.string().datetime().optional(),
  issueCondition: z.record(z.any()).optional(),
  accessoriesIssued: z.array(z.string()).optional(),
  bundleAssetIds: z.array(z.coerce.number().int().positive()).optional(),
  notes: z.string().optional(),
});

export const UpdateAssignmentSchema = z.object({
  returnedDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const AssignmentStatusSchema = z.enum([
  "PENDING_ACCEPTANCE",
  "ACTIVE",
  "REFUSED",
  "RETURN_REQUESTED",
  "RETURN_APPROVED",
  "RETURN_REJECTED",
  "CANCELLED",
  "REVERTED",
]);

export const AcceptAssignmentSchema = z.object({
  termsAccepted: z.literal(true),
  termsVersion: z.string().min(1).max(20),
  acceptedTerms: z.array(z.boolean()).length(5),
});

export const RefuseAssignmentSchema = z.object({
  reason: z.string().max(255).optional(),
});

export const RequestReturnSchema = z.object({
  returnCondition: z.record(z.any()).optional(),
  accessoriesReturned: z.array(z.string()).optional(),
});

export const AdminApproveReturnSchema = z.object({
  finalReturnCondition: z.record(z.any()),
  finalAccessoriesReturned: z.array(z.string()),
  decisionNote: z.string().max(500).optional(),
  nextLaptopStatus: z.enum(["IN_STOCK", "IN_REPAIR"]),
});

export const AdminRejectReturnSchema = z.object({
  reason: z.string().min(1).max(255),
});

export const RevertAssignmentSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const CreateIssueSchema = z.object({
  assetId: z
    .union([z.string().min(1), z.coerce.number().int().positive()])
    .transform((value) => String(value)),
  reportedForStaffId: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
});

export const UpdateIssueSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  assignedTo: z.string().min(1).max(255).optional(),
  resolutionNotes: z.string().max(2000).optional(),
});

export const AssetTypeSchema = z.enum([
  "LAPTOP",
  "PRINTER",
  "SWITCH",
  "ROUTER",
  "DESKTOP",
  "MOBILE_PHONE",
  "SYSTEM_UNIT",
  "MONITOR",
  "KEYBOARD",
  "MOUSE",
  "HEADSET",
]);
export const AssetStatusSchema = z.enum(["IN_STOCK", "ASSIGNED", "IN_REPAIR", "RETIRED"]);

export const CreateAssetSchema = z.object({
  assetTag: z.string().min(1),
  assetType: AssetTypeSchema,
  brand: z.string().min(1),
  model: z.string().min(1),
  imeiNo: z.string().optional(),
  serialNumber: z.string().optional(),
  specifications: z.string().optional(),
  department: z.string().optional(),
  status: AssetStatusSchema.default("IN_STOCK"),
  location: z.string().min(1),
  purchaseDate: z.string().optional(),
  warrantyEndDate: z.string().optional(),
  notes: z.string().optional(),
});

export const UpdateAssetSchema = CreateAssetSchema.partial();

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
  userCode: z.string().min(1),
  username: z.string().min(1),
  location: z.string().min(1),
  department: z.string().min(1),
  phoneNumber: z.string().min(1),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type CreateLaptop = z.infer<typeof CreateLaptopSchema>;
export type UpdateLaptop = z.infer<typeof UpdateLaptopSchema>;
export type CreateStaff = z.infer<typeof CreateStaffSchema>;
export type UpdateStaff = z.infer<typeof UpdateStaffSchema>;
export type CreateAssignment = z.infer<typeof CreateAssignmentSchema>;
export type UpdateAssignment = z.infer<typeof UpdateAssignmentSchema>;
export type CreateIssue = z.infer<typeof CreateIssueSchema>;
export type UpdateIssue = z.infer<typeof UpdateIssueSchema>;
export type CreateAsset = z.infer<typeof CreateAssetSchema>;
export type UpdateAsset = z.infer<typeof UpdateAssetSchema>;
export type Register = z.infer<typeof RegisterSchema>;
export type Login = z.infer<typeof LoginSchema>;
