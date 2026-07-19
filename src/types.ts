export interface User {
  id: string;
  username: string;
  fullName: string;
  roleId: string;
  isActive: boolean;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  permissions: string[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  defaultPrice: number;
  description: string;
  isActive: boolean;
}

export interface InvoiceItem {
  serviceId: string;
  serviceName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Invoice {
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: InvoiceItem[];
  subtotal: number;
  discountType: 'percentage' | 'value';
  discountValue: number;
  discountAmount: number;
  total: number;
  notes: string;
  createdBy: string;
  status: 'new' | 'cancelled';
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  username: string;
  timestamp: string;
  action: string;
  details: string;
  ipAddress: string;
  userAgent: string;
}

export interface Settings {
  companyName: string;
  companyNameEn: string;
  phone: string;
  email: string;
  address: string;
  vatNumber: string;
  invoicePolicy: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
}

export interface AppState {
  token: string | null;
  user: {
    username: string;
    fullName: string;
    roleId: string;
    permissions: string[];
  } | null;
}
