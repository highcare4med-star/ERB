import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
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
  id: string; // e.g., HC-202607-0001
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
  createdBy: string; // username
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

export interface RowLock {
  invoiceId: string;
  username: string;
  expiresAt: string;
}

export interface DatabaseSchema {
  users: User[];
  roles: Role[];
  customers: Customer[];
  services: Service[];
  invoices: Invoice[];
  activityLogs: ActivityLog[];
  settings: Settings;
  rowLocks: RowLock[];
}

const DB_FILE_PATH = path.join(process.cwd(), 'data', 'db.json');

// Helper to encrypt passwords using SHA-256
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const DEFAULT_ROLES: Role[] = [
  {
    id: 'admin',
    name: 'Admin',
    nameAr: 'مدير النظام',
    description: 'صلاحيات كاملة للتحكم في النظام والمستخدمين والتقارير',
    permissions: [
      'create_invoice',
      'edit_invoice',
      'cancel_invoice',
      'view_invoices',
      'print_pdf',
      'send_whatsapp',
      'manage_services',
      'manage_customers',
      'manage_users',
      'view_reports',
      'view_logs',
      'manage_settings'
    ]
  },
  {
    id: 'financial',
    name: 'Financial Manager',
    nameAr: 'المدير المالي',
    description: 'عرض الفواتير والتقارير وإدارة الخدمات والعملاء وسجل العمليات دون إدارة المستخدمين',
    permissions: [
      'view_invoices',
      'print_pdf',
      'send_whatsapp',
      'manage_services',
      'manage_customers',
      'view_reports',
      'view_logs'
    ]
  },
  {
    id: 'billing',
    name: 'Billing Officer',
    nameAr: 'موظف إصدار فواتير',
    description: 'إنشاء وتعديل الفواتير وإدارة الخدمات والعملاء دون صلاحيات الإلغاء أو الإعدادات',
    permissions: [
      'create_invoice',
      'edit_invoice',
      'view_invoices',
      'print_pdf',
      'send_whatsapp',
      'manage_customers'
    ]
  },
  {
    id: 'readonly',
    name: 'Read Only',
    nameAr: 'موظف قراءة فقط',
    description: 'استعراض الفواتير وطباعتها فقط دون إمكانية الإضافة أو التعديل',
    permissions: [
      'view_invoices',
      'print_pdf'
    ]
  }
];

const DEFAULT_USERS: User[] = [
  {
    id: 'user-admin',
    username: 'admin',
    passwordHash: hashPassword('admin123'),
    fullName: 'مدير النظام الرئيسي',
    roleId: 'admin',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'user-financial',
    username: 'financial',
    passwordHash: hashPassword('fin123'),
    fullName: 'أحمد المالي',
    roleId: 'financial',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'user-billing',
    username: 'billing',
    passwordHash: hashPassword('bill123'),
    fullName: 'سعيد الفواتير',
    roleId: 'billing',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'user-readonly',
    username: 'readonly',
    passwordHash: hashPassword('read123'),
    fullName: 'خالد الزائر',
    roleId: 'readonly',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_SERVICES: Service[] = [
  {
    id: 'srv-1',
    name: 'زيارة طبيب منزلية للكشف العام',
    defaultPrice: 300,
    description: 'زيارة طبيب عام للمنزل للكشف السريري وتشخيص الحالة وتحديد الخطة العلاجية',
    isActive: true
  },
  {
    id: 'srv-2',
    name: 'جلسة علاج طبيعي منزلي (60 دقيقة)',
    defaultPrice: 200,
    description: 'جلسة إعادة تأهيل وعلاج طبيعي منزلي بواسطة أخصائيين مؤهلين',
    isActive: true
  },
  {
    id: 'srv-3',
    name: 'رعاية تمريضية منزلية - نوبة 12 ساعة',
    defaultPrice: 500,
    description: 'مرافقة تمريضية منزلية متكاملة تشمل قياس العلامات الحيوية وإعطاء الأدوية',
    isActive: true
  },
  {
    id: 'srv-4',
    name: 'رعاية تمريضية منزلية - نوبة 24 ساعة',
    defaultPrice: 900,
    description: 'رعاية تمريضية على مدار الساعة لخدمة الحالات الحرجة ومتابعة المرضى',
    isActive: true
  },
  {
    id: 'srv-5',
    name: 'رعاية كبار السن المنزلية اليومية',
    defaultPrice: 400,
    description: 'تقديم العناية الشخصية اليومية والمساعدة المعيشية والنفسية للمسنين في منازلهم',
    isActive: true
  },
  {
    id: 'srv-6',
    name: 'رعاية الأطفال وحديثي الولادة المنزلية',
    defaultPrice: 350,
    description: 'عناية تمريضية ورعاية شاملة للأطفال وحديثي الولادة والخدج تحت إشراف متخصص',
    isActive: true
  },
  {
    id: 'srv-7',
    name: 'تركيب مغذي ومحلول وريدي منزلي',
    defaultPrice: 150,
    description: 'تركيب الكانيولا وإعطاء المحاليل الطبية والوريدية الموصوفة من الطبيب بالمنزل',
    isActive: true
  },
  {
    id: 'srv-8',
    name: 'سحب عينات تحاليل مخبرية منزلية',
    defaultPrice: 100,
    description: 'سحب الدم والعينات المخبرية وتوصيلها للمختبر المعتمد مع إرسال النتائج',
    isActive: true
  }
];

const DEFAULT_SETTINGS: Settings = {
  companyName: 'هاي كير للخدمات الطبية المنزلية',
  companyNameEn: 'Hi Care Home Medical Services',
  phone: '+966500000000',
  email: 'info@hicare.sa',
  address: 'الرياض، المملكة العربية السعودية - طريق الملك فهد',
  vatNumber: '310123456789003',
  invoicePolicy: 'الفاتورة صالحة لمدة 30 يوماً من تاريخ الإصدار. الأسعار تشمل ضريبة القيمة المضافة 15%. الخدمات الطبية المنزلية تخضع للشروط والأحكام الخاصة بشركة هاي كير للخدمات الطبية المنزلية.',
  primaryColor: '#0284c7', // Sky blue
  secondaryColor: '#0f172a', // Deep slate
};

export class JSONDatabase {
  private cache: DatabaseSchema | null = null;

  constructor() {
    this.init();
  }

  private init() {
    try {
      const dir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (!fs.existsSync(DB_FILE_PATH)) {
        const initialSchema: DatabaseSchema = {
          users: DEFAULT_USERS,
          roles: DEFAULT_ROLES,
          customers: [],
          services: DEFAULT_SERVICES,
          invoices: [],
          activityLogs: [
            {
              id: 'log-init',
              username: 'system',
              timestamp: new Date().toISOString(),
              action: 'تهيئة النظام',
              details: 'تم إنشاء قاعدة البيانات وتهيئة الحسابات والخدمات الافتراضية بنجاح',
              ipAddress: '127.0.0.1',
              userAgent: 'System Initializer'
            }
          ],
          settings: DEFAULT_SETTINGS,
          rowLocks: []
        };
        fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initialSchema, null, 2), 'utf-8');
        this.cache = initialSchema;
      } else {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        this.cache = JSON.parse(fileContent);
      }
    } catch (error) {
      console.error('Error initializing JSON DB:', error);
    }
  }

  private read(): DatabaseSchema {
    if (this.cache) return this.cache;
    try {
      const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      this.cache = JSON.parse(fileContent);
      return this.cache!;
    } catch (error) {
      console.error('Error reading JSON DB, using cache:', error);
      this.init();
      return this.cache || {
        users: [],
        roles: [],
        customers: [],
        services: [],
        invoices: [],
        activityLogs: [],
        settings: DEFAULT_SETTINGS,
        rowLocks: []
      };
    }
  }

  private write(schema: DatabaseSchema) {
    try {
      this.cache = schema;
      // Atomic write using a temporary file
      const tempPath = `${DB_FILE_PATH}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(schema, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE_PATH);
    } catch (error) {
      console.error('Error writing JSON DB:', error);
    }
  }

  // Activity log helper
  public logActivity(username: string, action: string, details: string, ip: string, ua: string) {
    const db = this.read();
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      username,
      timestamp: new Date().toISOString(),
      action,
      details,
      ipAddress: ip || 'unknown',
      userAgent: ua || 'unknown'
    };
    db.activityLogs.unshift(newLog); // Prepend so latest are first
    if (db.activityLogs.length > 5000) {
      db.activityLogs = db.activityLogs.slice(0, 5000); // Limit log size
    }
    this.write(db);
  }

  // --- Users Operations ---
  public getUsers(): User[] {
    return this.read().users;
  }

  public getUserById(id: string): User | undefined {
    return this.read().users.find(u => u.id === id);
  }

  public getUserByUsername(username: string): User | undefined {
    return this.read().users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  public saveUser(user: User, executor: string, ip: string, ua: string): User {
    const db = this.read();
    const index = db.users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      const old = db.users[index];
      db.users[index] = { ...user };
      this.write(db);
      this.logActivity(
        executor,
        'تعديل مستخدم',
        `تعديل حساب المستخدم ${user.username} (${user.fullName}) - الدور: ${user.roleId}`,
        ip,
        ua
      );
    } else {
      db.users.push(user);
      this.write(db);
      this.logActivity(
        executor,
        'إنشاء مستخدم',
        `إنشاء حساب مستخدم جديد ${user.username} (${user.fullName}) - الدور: ${user.roleId}`,
        ip,
        ua
      );
    }
    return user;
  }

  public deleteUser(id: string, executor: string, ip: string, ua: string): boolean {
    const db = this.read();
    const user = db.users.find(u => u.id === id);
    if (!user) return false;
    if (user.username === 'admin') return false; // Prevent deleting master admin

    db.users = db.users.filter(u => u.id !== id);
    this.write(db);
    this.logActivity(
      executor,
      'حذف مستخدم',
      `حذف حساب المستخدم ${user.username} (${user.fullName})`,
      ip,
      ua
    );
    return true;
  }

  // --- Roles & Permissions ---
  public getRoles(): Role[] {
    return this.read().roles;
  }

  public getRoleById(id: string): Role | undefined {
    return this.read().roles.find(r => r.id === id);
  }

  // --- Customers Operations ---
  public getCustomers(): Customer[] {
    return this.read().customers;
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.read().customers.find(c => c.id === id);
  }

  public getCustomerByPhone(phone: string): Customer | undefined {
    const cleanPhone = phone.trim();
    return this.read().customers.find(c => c.phone.trim() === cleanPhone);
  }

  public saveCustomer(customer: Customer, executor: string, ip: string, ua: string): Customer {
    const db = this.read();
    const index = db.customers.findIndex(c => c.id === customer.id);
    if (index !== -1) {
      db.customers[index] = { ...customer };
      this.write(db);
      this.logActivity(
        executor,
        'تعديل عميل',
        `تعديل بيانات العميل ${customer.name} (${customer.phone})`,
        ip,
        ua
      );
    } else {
      db.customers.push(customer);
      this.write(db);
      this.logActivity(
        executor,
        'إنشاء عميل',
        `إضافة عميل جديد ${customer.name} (${customer.phone})`,
        ip,
        ua
      );
    }
    return customer;
  }

  public deleteCustomer(id: string, executor: string, ip: string, ua: string): boolean {
    const db = this.read();
    const cust = db.customers.find(c => c.id === id);
    if (!cust) return false;
    db.customers = db.customers.filter(c => c.id !== id);
    this.write(db);
    this.logActivity(
      executor,
      'حذف عميل',
      `حذف العميل ${cust.name} (${cust.phone})`,
      ip,
      ua
    );
    return true;
  }

  // --- Services Operations ---
  public getServices(): Service[] {
    return this.read().services;
  }

  public getServiceById(id: string): Service | undefined {
    return this.read().services.find(s => s.id === id);
  }

  public saveService(service: Service, executor: string, ip: string, ua: string): Service {
    const db = this.read();
    const index = db.services.findIndex(s => s.id === service.id);
    if (index !== -1) {
      db.services[index] = { ...service };
      this.write(db);
      this.logActivity(
        executor,
        'تعديل خدمة',
        `تعديل بيانات الخدمة ${service.name} - السعر: ${service.defaultPrice} ريال`,
        ip,
        ua
      );
    } else {
      db.services.push(service);
      this.write(db);
      this.logActivity(
        executor,
        'إضافة خدمة',
        `إضافة خدمة جديدة ${service.name} - السعر: ${service.defaultPrice} ريال`,
        ip,
        ua
      );
    }
    return service;
  }

  public deleteService(id: string, executor: string, ip: string, ua: string): boolean {
    const db = this.read();
    const srv = db.services.find(s => s.id === id);
    if (!srv) return false;
    db.services = db.services.filter(s => s.id !== id);
    this.write(db);
    this.logActivity(
      executor,
      'حذف خدمة',
      `حذف الخدمة ${srv.name}`,
      ip,
      ua
    );
    return true;
  }

  // --- Invoices Operations ---
  public getInvoices(): Invoice[] {
    return this.read().invoices;
  }

  public getInvoiceById(id: string): Invoice | undefined {
    return this.read().invoices.find(i => i.id === id);
  }

  // Generates automatic invoice ID like HC-YYYYMM-0001
  private generateInvoiceId(dateStr: string): string {
    const db = this.read();
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = `HC-${year}${month}-`;
    
    // Filter invoices from the same month
    const monthInvoices = db.invoices.filter(i => i.id.startsWith(prefix));
    
    let maxNum = 0;
    monthInvoices.forEach(i => {
      const parts = i.id.split('-');
      const numPart = parts[2];
      if (numPart) {
        const num = parseInt(numPart, 10);
        if (num > maxNum) maxNum = num;
      }
    });

    const nextNum = maxNum + 1;
    const paddedNum = String(nextNum).padStart(4, '0');
    return `${prefix}${paddedNum}`;
  }

  public createInvoice(invoiceData: Omit<Invoice, 'id' | 'createdAt'>, executor: string, ip: string, ua: string): Invoice {
    const db = this.read();
    
    // 1. Auto generate invoice ID
    const invoiceId = this.generateInvoiceId(invoiceData.date);
    
    // 2. Resolve Customer (auto-create or link)
    let customerId = invoiceData.customerId;
    const cleanPhone = invoiceData.customerPhone.trim();
    
    let existingCustomer = db.customers.find(c => c.phone.trim() === cleanPhone);
    if (!existingCustomer && invoiceData.customerName) {
      // Auto-create customer
      const newCustomer: Customer = {
        id: `cust-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        name: invoiceData.customerName,
        phone: cleanPhone,
        address: invoiceData.customerAddress || '',
        notes: 'تم إنشاؤه تلقائياً عند إصدار أول فاتورة',
        createdAt: new Date().toISOString()
      };
      db.customers.push(newCustomer);
      customerId = newCustomer.id;
      this.logActivity(
        executor,
        'إنشاء عميل تلقائي',
        `تم إنشاء حساب عميل تلقائي ${newCustomer.name} (${newCustomer.phone}) مع الفاتورة ${invoiceId}`,
        ip,
        ua
      );
    } else if (existingCustomer) {
      customerId = existingCustomer.id;
      // Optionally update address if customer didn't have one
      if (!existingCustomer.address && invoiceData.customerAddress) {
        existingCustomer.address = invoiceData.customerAddress;
      }
    }

    const newInvoice: Invoice = {
      ...invoiceData,
      id: invoiceId,
      customerId,
      createdAt: new Date().toISOString()
    };

    db.invoices.push(newInvoice);
    this.write(db);

    this.logActivity(
      executor,
      'إصدار فاتورة',
      `إصدار فاتورة جديدة رقم ${invoiceId} للعميل ${newInvoice.customerName} بقيمة إجمالية ${newInvoice.total} ريال`,
      ip,
      ua
    );

    return newInvoice;
  }

  public updateInvoice(id: string, invoiceData: Partial<Invoice>, executor: string, ip: string, ua: string): Invoice | null {
    const db = this.read();
    const index = db.invoices.findIndex(i => i.id === id);
    if (index === -1) return null;

    const oldInvoice = db.invoices[index];
    
    // Check if locked by someone else
    const isLocked = this.isLockedByOther(id, executor);
    if (isLocked) {
      throw new Error('تعذر تعديل الفاتورة لأنها مقفلة حالياً من قبل مستخدم آخر');
    }

    // Preserve immutable fields like id, createdBy, createdAt, customerId
    const updatedInvoice: Invoice = {
      ...oldInvoice,
      ...invoiceData,
      id: oldInvoice.id,
      createdBy: oldInvoice.createdBy,
      createdAt: oldInvoice.createdAt,
      customerId: oldInvoice.customerId
    };

    db.invoices[index] = updatedInvoice;
    
    // Release any locks held by this user on this invoice
    db.rowLocks = db.rowLocks.filter(l => !(l.invoiceId === id && l.username === executor));
    
    this.write(db);

    this.logActivity(
      executor,
      'تعديل فاتورة',
      `تعديل الفاتورة رقم ${id} للعميل ${updatedInvoice.customerName} - القيمة السابقة: ${oldInvoice.total} ريال، القيمة الحالية: ${updatedInvoice.total} ريال`,
      ip,
      ua
    );

    return updatedInvoice;
  }

  public cancelInvoice(id: string, executor: string, ip: string, ua: string): Invoice | null {
    const db = this.read();
    const index = db.invoices.findIndex(i => i.id === id);
    if (index === -1) return null;

    const invoice = db.invoices[index];
    invoice.status = 'cancelled';
    this.write(db);

    this.logActivity(
      executor,
      'إلغاء فاتورة',
      `إلغاء الفاتورة رقم ${id} للعميل ${invoice.customerName} بقيمة ${invoice.total} ريال`,
      ip,
      ua
    );

    return invoice;
  }

  // --- Concurrency / Row Locking Operations ---
  public acquireLock(invoiceId: string, username: string): boolean {
    const db = this.read();
    const now = new Date();
    
    // Remove expired locks
    db.rowLocks = db.rowLocks.filter(l => new Date(l.expiresAt) > now);

    // Check if locked by someone else
    const existingLock = db.rowLocks.find(l => l.invoiceId === invoiceId);
    if (existingLock) {
      if (existingLock.username === username) {
        // Extend lock
        existingLock.expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes lock
        this.write(db);
        return true;
      }
      return false; // Locked by someone else
    }

    // Create new lock
    db.rowLocks.push({
      invoiceId,
      username,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes lock
    });
    this.write(db);
    return true;
  }

  public releaseLock(invoiceId: string, username: string): void {
    const db = this.read();
    db.rowLocks = db.rowLocks.filter(l => !(l.invoiceId === invoiceId && l.username === username));
    this.write(db);
  }

  public isLockedByOther(invoiceId: string, username: string): boolean {
    const db = this.read();
    const now = new Date();
    const activeLock = db.rowLocks.find(l => l.invoiceId === invoiceId && new Date(l.expiresAt) > now);
    return activeLock !== undefined && activeLock.username !== username;
  }

  public getActiveLocks(): RowLock[] {
    const db = this.read();
    const now = new Date();
    return db.rowLocks.filter(l => new Date(l.expiresAt) > now);
  }

  // --- Settings Operations ---
  public getSettings(): Settings {
    return this.read().settings;
  }

  public saveSettings(settings: Settings, executor: string, ip: string, ua: string): Settings {
    const db = this.read();
    db.settings = { ...settings };
    this.write(db);
    this.logActivity(
      executor,
      'تحديث الإعدادات',
      `تحديث إعدادات الشركة وبيانات الضريبة والعنوان والاتصال والسياسة المطبوعة`,
      ip,
      ua
    );
    return db.settings;
  }

  // --- Activity Logs Operations ---
  public getActivityLogs(): ActivityLog[] {
    return this.read().activityLogs;
  }

  // --- Dashboard Data Operation ---
  public getDashboardData() {
    const db = this.read();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Customers count
    const customersCount = db.customers.length;

    // Filter invoices (excluding cancelled ones for revenue calculations)
    const activeInvoices = db.invoices.filter(i => i.status !== 'cancelled');
    const allInvoices = db.invoices;

    // Today's invoices (both active & all count)
    const todayInvoices = allInvoices.filter(i => i.date.startsWith(todayStr));
    const todayInvoicesCount = todayInvoices.length;

    // This Month's invoices
    const thisMonthInvoices = allInvoices.filter(i => {
      const iDate = new Date(i.date);
      return iDate >= startOfMonth;
    });
    const thisMonthInvoicesCount = thisMonthInvoices.length;

    // Total Revenue (all non-cancelled invoices)
    const totalRevenue = activeInvoices.reduce((sum, i) => sum + i.total, 0);

    // Top services used
    const serviceCounts: Record<string, { name: string; count: number; total: number }> = {};
    activeInvoices.forEach(inv => {
      inv.items.forEach(item => {
        if (!serviceCounts[item.serviceId]) {
          serviceCounts[item.serviceId] = { name: item.serviceName, count: 0, total: 0 };
        }
        serviceCounts[item.serviceId].count += item.quantity;
        serviceCounts[item.serviceId].total += item.total;
      });
    });

    const topServices = Object.values(serviceCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Latest 10 Invoices
    const latestInvoices = [...db.invoices]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return {
      customersCount,
      todayInvoicesCount,
      thisMonthInvoicesCount,
      totalRevenue,
      topServices,
      latestInvoices
    };
  }

  // --- Reports Query Operation ---
  public getReports(filters: {
    startDate?: string;
    endDate?: string;
    customerId?: string;
    username?: string;
    period?: 'day' | 'week' | 'month' | 'year';
  }) {
    const db = this.read();
    let invoices = [...db.invoices];

    // Filter by Date Range or Period
    if (filters.startDate) {
      invoices = invoices.filter(i => i.date >= filters.startDate!);
    }
    if (filters.endDate) {
      invoices = invoices.filter(i => i.date <= filters.endDate!);
    }

    if (filters.period) {
      const now = new Date();
      let borderDate = new Date();
      if (filters.period === 'day') {
        borderDate.setHours(0, 0, 0, 0);
      } else if (filters.period === 'week') {
        borderDate.setDate(now.getDate() - 7);
      } else if (filters.period === 'month') {
        borderDate.setMonth(now.getMonth() - 1);
      } else if (filters.period === 'year') {
        borderDate.setFullYear(now.getFullYear() - 1);
      }
      const borderStr = borderDate.toISOString().split('T')[0];
      invoices = invoices.filter(i => i.date >= borderStr);
    }

    // Filter by Customer
    if (filters.customerId && filters.customerId !== 'all') {
      invoices = invoices.filter(i => i.customerId === filters.customerId);
    }

    // Filter by User (Creator)
    if (filters.username && filters.username !== 'all') {
      invoices = invoices.filter(i => i.createdBy.toLowerCase() === filters.username!.toLowerCase());
    }

    // Compute Summaries
    const totalInvoices = invoices.length;
    const cancelledInvoices = invoices.filter(i => i.status === 'cancelled').length;
    const activeInvoices = invoices.filter(i => i.status !== 'cancelled');
    const totalActiveCount = activeInvoices.length;
    
    const subtotalSum = activeInvoices.reduce((sum, i) => sum + i.subtotal, 0);
    const discountSum = activeInvoices.reduce((sum, i) => sum + i.discountAmount, 0);
    const totalRevenueSum = activeInvoices.reduce((sum, i) => sum + i.total, 0);
    const totalTaxSum = activeInvoices.reduce((sum, i) => sum + (i.total - i.total / 1.15), 0); // Assuming 15% VAT is included in total

    // Grouping by Date for visual charts
    const chartDataMap: Record<string, { date: string; revenue: number; count: number }> = {};
    activeInvoices.forEach(i => {
      const dateKey = i.date;
      if (!chartDataMap[dateKey]) {
        chartDataMap[dateKey] = { date: dateKey, revenue: 0, count: 0 };
      }
      chartDataMap[dateKey].revenue += i.total;
      chartDataMap[dateKey].count += 1;
    });

    const chartData = Object.values(chartDataMap).sort((a, b) => a.date.localeCompare(b.date));

    return {
      summary: {
        totalInvoices,
        activeInvoices: totalActiveCount,
        cancelledInvoices,
        subtotal: subtotalSum,
        discount: discountSum,
        totalRevenue: totalRevenueSum,
        vatAmount: totalTaxSum
      },
      invoices,
      chartData
    };
  }
}

// Single database instance
export const db = new JSONDatabase();
