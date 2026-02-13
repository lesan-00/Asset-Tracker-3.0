import { Laptop, Staff, Assignment, Issue, DashboardStats } from '@/types';

export const mockLaptops: Laptop[] = [
  {
    id: '1',
    assetTag: 'LAP-001',
    serialNumber: 'SN-2024-00001',
    brand: 'Dell',
    model: 'Latitude 5540',
    specifications: { ram: '16GB', storage: '512GB SSD', cpu: 'Intel i7-1365U' },
    purchaseDate: '2024-01-15',
    warrantyExpiry: '2027-01-15',
    department: 'Engineering',
    status: 'assigned',
    notes: 'Primary development laptop'
  },
  {
    id: '2',
    assetTag: 'LAP-002',
    serialNumber: 'SN-2024-00002',
    brand: 'HP',
    model: 'EliteBook 840 G10',
    specifications: { ram: '32GB', storage: '1TB SSD', cpu: 'Intel i7-1365U' },
    purchaseDate: '2024-02-20',
    warrantyExpiry: '2027-02-20',
    department: 'Design',
    status: 'available'
  },
  {
    id: '3',
    assetTag: 'LAP-003',
    serialNumber: 'SN-2024-00003',
    brand: 'Lenovo',
    model: 'ThinkPad X1 Carbon',
    specifications: { ram: '16GB', storage: '512GB SSD', cpu: 'Intel i7-1365U' },
    purchaseDate: '2023-11-10',
    warrantyExpiry: '2026-11-10',
    department: 'Finance',
    status: 'MAINTENANCE',
    notes: 'Screen replacement in progress'
  },
  {
    id: '4',
    assetTag: 'LAP-004',
    serialNumber: 'SN-2024-00004',
    brand: 'Apple',
    model: 'MacBook Pro 14"',
    specifications: { ram: '16GB', storage: '512GB SSD', cpu: 'Apple M3 Pro' },
    purchaseDate: '2024-03-05',
    warrantyExpiry: '2027-03-05',
    department: 'Marketing',
    status: 'assigned'
  },
  {
    id: '5',
    assetTag: 'LAP-005',
    serialNumber: 'SN-2024-00005',
    brand: 'Dell',
    model: 'XPS 15',
    specifications: { ram: '32GB', storage: '1TB SSD', cpu: 'Intel i9-13900H' },
    purchaseDate: '2024-01-25',
    warrantyExpiry: '2027-01-25',
    department: 'Engineering',
    status: 'available'
  },
  {
    id: '6',
    assetTag: 'LAP-006',
    serialNumber: 'SN-2023-00006',
    brand: 'HP',
    model: 'ProBook 450 G10',
    specifications: { ram: '8GB', storage: '256GB SSD', cpu: 'Intel i5-1335U' },
    purchaseDate: '2023-06-15',
    warrantyExpiry: '2026-06-15',
    department: 'HR',
    status: 'assigned'
  },
  {
    id: '7',
    assetTag: 'LAP-007',
    serialNumber: 'SN-2023-00007',
    brand: 'Lenovo',
    model: 'ThinkPad T14s',
    specifications: { ram: '16GB', storage: '512GB SSD', cpu: 'AMD Ryzen 7 PRO' },
    purchaseDate: '2023-08-20',
    warrantyExpiry: '2026-08-20',
    department: 'Operations',
    status: 'lost',
    notes: 'Reported stolen from vehicle'
  },
  {
    id: '8',
    assetTag: 'LAP-008',
    serialNumber: 'SN-2022-00008',
    brand: 'Dell',
    model: 'Latitude 3520',
    specifications: { ram: '8GB', storage: '256GB SSD', cpu: 'Intel i5-1135G7' },
    purchaseDate: '2022-04-10',
    warrantyExpiry: '2025-04-10',
    department: 'Admin',
    status: 'retired'
  }
];

export const mockStaff: Staff[] = [
  {
    id: '1',
    staffId: 'EMP-001',
    fullName: 'Sarah Johnson',
    department: 'Engineering',
    email: 'sarah.johnson@company.com',
    phone: '+1 (555) 123-4567',
    status: 'active'
  },
  {
    id: '2',
    staffId: 'EMP-002',
    fullName: 'Michael Chen',
    department: 'Design',
    email: 'michael.chen@company.com',
    phone: '+1 (555) 234-5678',
    status: 'active'
  },
  {
    id: '3',
    staffId: 'EMP-003',
    fullName: 'Emily Rodriguez',
    department: 'Marketing',
    email: 'emily.rodriguez@company.com',
    phone: '+1 (555) 345-6789',
    status: 'active'
  },
  {
    id: '4',
    staffId: 'EMP-004',
    fullName: 'James Wilson',
    department: 'Finance',
    email: 'james.wilson@company.com',
    phone: '+1 (555) 456-7890',
    status: 'active'
  },
  {
    id: '5',
    staffId: 'EMP-005',
    fullName: 'Lisa Thompson',
    department: 'HR',
    email: 'lisa.thompson@company.com',
    phone: '+1 (555) 567-8901',
    status: 'active'
  },
  {
    id: '6',
    staffId: 'EMP-006',
    fullName: 'David Kim',
    department: 'Operations',
    email: 'david.kim@company.com',
    phone: '+1 (555) 678-9012',
    status: 'inactive'
  }
];

export const mockAssignments: Assignment[] = [
  {
    id: '1',
    laptopId: '1',
    staffId: '1',
    issueDate: '2024-01-20',
    conditionAtIssue: { screen: 'excellent', battery: 'excellent', keyboard: 'excellent', body: 'excellent' },
    accessoriesIssued: ['charger', 'laptop_bag', 'mouse'],
    issuedBy: 'IT Admin',
    isActive: true
  },
  {
    id: '2',
    laptopId: '4',
    staffId: '3',
    issueDate: '2024-03-10',
    conditionAtIssue: { screen: 'excellent', battery: 'excellent', keyboard: 'excellent', body: 'excellent' },
    accessoriesIssued: ['charger', 'usb_c_adapter', 'hdmi_adapter'],
    issuedBy: 'IT Admin',
    isActive: true
  },
  {
    id: '3',
    laptopId: '6',
    staffId: '5',
    issueDate: '2023-07-01',
    conditionAtIssue: { screen: 'good', battery: 'good', keyboard: 'excellent', body: 'good' },
    accessoriesIssued: ['charger', 'mouse'],
    issuedBy: 'IT Admin',
    isActive: true
  }
];

export const mockIssues: Issue[] = [
  {
    id: '1',
    laptopId: '3',
    category: 'screen',
    priority: 'high',
    status: 'in_progress',
    description: 'Screen flickering and occasional blackouts',
    assignedTechnician: 'Tech Support Team',
    createdAt: '2024-06-15',
    updatedAt: '2024-06-18'
  },
  {
    id: '2',
    laptopId: '1',
    assignmentId: '1',
    category: 'software',
    priority: 'medium',
    status: 'open',
    description: 'Windows updates failing to install',
    createdAt: '2024-06-20',
    updatedAt: '2024-06-20'
  },
  {
    id: '3',
    laptopId: '7',
    category: 'theft_loss',
    priority: 'critical',
    status: 'open',
    description: 'Laptop reported stolen from employee vehicle',
    createdAt: '2024-05-28',
    updatedAt: '2024-05-28'
  },
  {
    id: '4',
    laptopId: '4',
    assignmentId: '2',
    category: 'battery',
    priority: 'low',
    status: 'resolved',
    description: 'Battery draining faster than expected',
    resolutionNotes: 'Recalibrated battery, issue resolved',
    createdAt: '2024-06-01',
    updatedAt: '2024-06-05'
  }
];

export const mockDashboardStats: DashboardStats = {
  totalLaptops: 8,
  availableLaptops: 2,
  assignedLaptops: 3,
  underRepair: 1,
  openIssues: 3,
  lostOrStolen: 1
};

export const accessoryOptions = [
  { value: 'charger', label: 'Charger' },
  { value: 'laptop_bag', label: 'Laptop Bag' },
  { value: 'mouse', label: 'Mouse' },
  { value: 'hdmi_adapter', label: 'HDMI Adapter' },
  { value: 'usb_c_adapter', label: 'USB-C Adapter' },
  { value: 'docking_station', label: 'Docking Station' },
  { value: 'other', label: 'Other' }
] as const;

export const departments = [
  'Engineering',
  'Design',
  'Marketing',
  'Finance',
  'HR',
  'Operations',
  'Admin',
  'Sales'
];
