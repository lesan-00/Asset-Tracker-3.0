export type LaptopStatus = 'AVAILABLE' | 'ASSIGNED' | 'MAINTENANCE' | 'LOST' | 'RETIRED';

export type LaptopCondition = 'excellent' | 'good' | 'fair' | 'poor';

export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';

export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type IssueCategory = 'hardware' | 'software' | 'battery' | 'screen' | 'accessories' | 'theft_loss';

export type AccessoryType = 
  | 'charger' 
  | 'laptop_bag' 
  | 'mouse' 
  | 'hdmi_adapter' 
  | 'usb_c_adapter' 
  | 'docking_station' 
  | 'other';

export interface Laptop {
  id: string;
  assetTag: string;
  serialNumber: string;
  brand: string;
  model: string;
  specifications: {
    ram: string;
    storage: string;
    cpu: string;
  };
  purchaseDate: string;
  purchasePrice?: number;
  warrantyExpiry: string;
  department: string;
  status: LaptopStatus;
  notes?: string;
}

export interface Staff {
  id: string;
  staffId: string;
  fullName: string;
  department: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
}

export interface Assignment {
  id: string;
  laptopId: string;
  staffId: string;
  issueDate: string;
  returnDate?: string;
  conditionAtIssue: {
    screen: LaptopCondition;
    battery: LaptopCondition;
    keyboard: LaptopCondition;
    body: LaptopCondition;
  };
  conditionAtReturn?: {
    screen: LaptopCondition;
    battery: LaptopCondition;
    keyboard: LaptopCondition;
    body: LaptopCondition;
  };
  accessoriesIssued: AccessoryType[];
  accessoriesReturned?: AccessoryType[];
  issuedBy: string;
  notes?: string;
  isActive: boolean;
}

export interface Issue {
  id: string;
  laptopId: string;
  assignmentId?: string;
  category: IssueCategory;
  priority: IssuePriority;
  status: IssueStatus;
  description: string;
  assignedTechnician?: string;
  resolutionNotes?: string;
  repairCost?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalLaptops: number;
  availableLaptops: number;
  assignedLaptops: number;
  underRepair: number;
  openIssues: number;
  lostOrStolen: number;
}
