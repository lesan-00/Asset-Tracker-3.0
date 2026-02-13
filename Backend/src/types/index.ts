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
  email: string;
  department: string;
  position: string;
  joinDate: Date;
  phoneNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Assignment {
  id: string;
  laptopId: string;
  staffId: string;
  receiverUserId?: string;
  assignedDate: Date;
  status:
    | "PENDING_ACCEPTANCE"
    | "ACTIVE"
    | "REFUSED"
    | "RETURN_REQUESTED"
    | "RETURN_APPROVED"
    | "RETURN_REJECTED"
    | "CANCELLED";
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
  title: string;
  description: string;
  category: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  reportedByUserId: string;
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
