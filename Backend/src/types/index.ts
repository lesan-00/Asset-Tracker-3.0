export interface User {
  id: string;
  email: string;
  fullName: string;
  userCode: string;
  username: string;
  location: string;
  department: string;
  phoneNumber: string;
  role: "ADMIN" | "STAFF";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Laptop {
  id: string;
  assetTag: string;
  serialNumber: string;
  model: string;
  brand: string;
  purchaseDate: Date;
  warrantyExpiry: Date;
  status: "AVAILABLE" | "ASSIGNED" | "MAINTENANCE" | "LOST" | "RETIRED";
  department: string;
  specifications?: {
    cpu?: string;
    ram?: string;
    storage?: string;
  };
  purchasePrice?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Staff {
  id: string;
  name: string;
  employeeName: string;
  epfNo?: string | null;
  email: string;
  department: string;
  location?: string;
  position: string;
  status: "ACTIVE" | "DISABLED";
  joinDate: Date;
  phoneNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Assignment {
  id: string;
  assetId: number;
  groupId?: string;
  laptopId?: string;
  staffId?: string;
  targetType: "STAFF" | "LOCATION" | "DEPARTMENT";
  location?: string;
  department?: string;
  receiverUserId?: string;
  assignedDate: Date;
  status:
    | "PENDING_ACCEPTANCE"
    | "ACTIVE"
    | "REFUSED"
    | "RETURN_REQUESTED"
    | "RETURN_APPROVED"
    | "RETURN_REJECTED"
    | "CANCELLED"
    | "REVERTED";
  termsVersion?: string;
  termsAccepted?: boolean;
  termsAcceptedAt?: Date;
  acceptedByUserId?: string;
  acceptedAt?: Date;
  refusedAt?: Date;
  refusedReason?: string;
  returnRequestedAt?: Date;
  returnRequestedByUserId?: string;
  returnApprovedAt?: Date;
  returnApprovedByAdminId?: string;
  returnRejectedAt?: Date;
  returnRejectedReason?: string;
  revertedAt?: Date;
  revertedByUserId?: string;
  revertReason?: string;
  issueConditionJson?: string;
  returnConditionJson?: string;
  accessoriesIssuedJson?: string;
  accessoriesReturnedJson?: string;
  returnedDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Issue {
  id: string;
  laptopId: string;
  assetId?: number;
  title: string;
  description: string;
  category: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  reportedByUserId: string;
  createdByUserId?: string;
  reportedForStaffId?: string;
  reportedForUserId?: string;
  assignedTo?: string;
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Report {
  id: string;
  title: string;
  type: "inventory" | "assignments" | "issues" | "maintenance";
  generatedAt: Date;
  data: unknown;
  createdAt: Date;
}

export interface Asset {
  id: number;
  assetTag: string;
  assetType:
    | "LAPTOP"
    | "PRINTER"
    | "SWITCH"
    | "ROUTER"
    | "DESKTOP"
    | "MOBILE_PHONE"
    | "SYSTEM_UNIT"
    | "MONITOR"
    | "KEYBOARD"
    | "MOUSE"
    | "HEADSET";
  brand: string;
  model: string;
  imeiNo?: string | null;
  serialNumber?: string | null;
  status: "IN_STOCK" | "ASSIGNED" | "IN_REPAIR" | "RETIRED";
  location: string;
  purchaseDate?: string | null;
  warrantyEndDate?: string | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}
