import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
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

const DB_SQLITE_PATH = path.join(process.cwd(), 'database.sqlite');
const LEGACY_JSON_PATH = path.join(process.cwd(), 'data', 'db.json');

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
    id: 'user-ismael',
    username: 'ismael',
    passwordHash: hashPassword('Lokaloka44'),
    fullName: 'إسماعيل (مدير النظام)',
    roleId: 'admin',
    isActive: true,
    createdAt: new Date().toISOString()
  },
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
    name: 'تغيير على الجروح المعقدة والحروق',
    defaultPrice: 250,
    description: 'تنظيف وتغيير معقم للجروح والحروق باستخدام أحدث المواد المعقمة',
    isActive: true
  },
  {
    id: 'srv-7',
    name: 'تركيب وتغيير القسطرة البولية بالمنزل',
    defaultPrice: 150,
    description: 'خدمة التمريض المنزلي لتركيب أو العناية بالقسطرة البولية بصورة معقمة',
    isActive: true
  },
  {
    id: 'srv-8',
    name: 'سحب العينات التحليلية المنزلية',
    defaultPrice: 100,
    description: 'سحب الدم والعينات المخبرية وتوصيلها للمختبر المعتمد مع إرسال النتائج',
    isActive: true
  },
  {
    id: 'srv-9',
    name: 'علاج صنيدارون (Sunnydarone)',
    defaultPrice: 35,
    description: 'دواء صنيدارون للمريض',
    isActive: true
  },
  {
    id: 'srv-10',
    name: 'جلوكوز 25%',
    defaultPrice: 60,
    description: 'محلول جلوكوز تركيز 25%',
    isActive: true
  },
  {
    id: 'srv-11',
    name: 'محلول بوتاسيوم (Potassium)',
    defaultPrice: 30,
    description: 'أمبول / محلول بوتاسيوم وريدي',
    isActive: true
  },
  {
    id: 'srv-12',
    name: 'أمبول ماغنسيوم',
    defaultPrice: 40,
    description: 'محلول / أمبول ماغنسيوم وريدي',
    isActive: true
  },
  {
    id: 'srv-13',
    name: 'جلوكوز 10%',
    defaultPrice: 50,
    description: 'محلول جلوكوز تركيز 10%',
    isActive: true
  },
  {
    id: 'srv-14',
    name: 'زيارة طبيب استشاري منزلي',
    defaultPrice: 2000,
    description: 'زيارة طبيب استشاري للمنزل للمتابعة والكشف الدقيق',
    isActive: true
  },
  {
    id: 'srv-15',
    name: 'طبيب مقيم 24 ساعة',
    defaultPrice: 4500,
    description: 'مرافقة طبيب مقيم بالمنزل لمتابعة الحالة على مدار 24 ساعة',
    isActive: true
  },
  {
    id: 'srv-16',
    name: 'إيجار جهاز تنفس صناعي منزلي',
    defaultPrice: 4000,
    description: 'إيجار وتوفير جهاز تنفس صناعي للرعاية المنزلية',
    isActive: true
  },
  {
    id: 'srv-17',
    name: 'تحليل غازات الدم (ABG)',
    defaultPrice: 700,
    description: 'سحب وعمل تحليل غازات بالدم الشرياني',
    isActive: true
  },
  {
    id: 'srv-18',
    name: 'ملء اسطوانة أكسجين',
    defaultPrice: 400,
    description: 'إعادة تعبئة وملء اسطوانة الأكسجين الطبي',
    isActive: true
  },
  {
    id: 'srv-19',
    name: 'نقل اسطوانة أكسجين',
    defaultPrice: 450,
    description: 'خدمة نقل وتوصيل اسطوانات الأكسجين للمنزل',
    isActive: true
  },
  {
    id: 'srv-20',
    name: 'إيجار اسطوانة أكسجين',
    defaultPrice: 800,
    description: 'إيجار اسطوانة أكسجين بالمنزل مع المنظم',
    isActive: true
  },
  {
    id: 'srv-21',
    name: 'إيجار سيرنج بمب (مضخة محاليل)',
    defaultPrice: 1500,
    description: 'إيجار مضخة المحاليل والأدوية الوريدية الإلكترونية',
    isActive: true
  },
  {
    id: 'srv-22',
    name: 'إيجار سرير طبي منزلي',
    defaultPrice: 5000,
    description: 'إيجار سرير طبي كهربائي / يدوي للرعاية المنزلية',
    isActive: true
  },
  {
    id: 'srv-23',
    name: 'توصيل سرير طبي',
    defaultPrice: 500,
    description: 'نقل وتوصيل السرير الطبي لموقع العميل',
    isActive: true
  },
  {
    id: 'srv-24',
    name: 'نقل ومشال سرير طبي للأدوار العليا',
    defaultPrice: 600,
    description: 'خدمة رفع ونقل السرير الطبي للأدوار العليا',
    isActive: true
  },
  {
    id: 'srv-25',
    name: 'رسم قلب منزلي (ECG)',
    defaultPrice: 450,
    description: 'عمل فحص رسم قلب كهربائي للمريض بالمنزل',
    isActive: true
  },
  {
    id: 'srv-26',
    name: 'أشعة عادية على الصدر منزلي (Chest X-Ray)',
    defaultPrice: 800,
    description: 'تصوير أشعة سينية على الصدر بجهاز متنقل بالمنزل',
    isActive: true
  },
  {
    id: 'srv-27',
    name: 'أشعة دوبلر طرف واحد',
    defaultPrice: 2100,
    description: 'فحص الأشعة التلفزيونية الدوبلر للأوعية الدموية بالمنزل',
    isActive: true
  },
  {
    id: 'srv-28',
    name: 'تحاليل طبية منزلية عامة',
    defaultPrice: 650,
    description: 'مجموعة تحاليل طبية وشاملة من المنزل',
    isActive: true
  },
  {
    id: 'srv-29',
    name: 'تمريض منزلي 24 ساعة',
    defaultPrice: 2000,
    description: 'خدمة التمريض المنزلي اليومية الكاملة 24 ساعة',
    isActive: true
  },
  {
    id: 'srv-30',
    name: 'زيارة طبيب عناية مركزة',
    defaultPrice: 1800,
    description: 'زيارة منزلية بواسطة أخصائي عناية مركزة للحالات الحرجة',
    isActive: true
  },
  {
    id: 'srv-31',
    name: 'إيجار جهاز مونيتور علامات حيوية',
    defaultPrice: 1500,
    description: 'إيجار شاشة مراقبة نبض وضغط وأكسجين المريض بالمنزل',
    isActive: true
  },
  {
    id: 'srv-32',
    name: 'توصيل وضبط أجهزة طبية',
    defaultPrice: 120,
    description: 'توصيل وتشغيل الأجهزة الطبية المنزلية ومعايرتها',
    isActive: true
  },
  {
    id: 'srv-33',
    name: 'إيجار جهاز شفاط مخاط (سكشن)',
    defaultPrice: 850,
    description: 'إيجار جهاز شفط الإفرازات والمخاط للرعاية المنزلية',
    isActive: true
  },
  {
    id: 'srv-34',
    name: 'تركيب قسطرة وريد مركزي (CVP)',
    defaultPrice: 3500,
    description: 'إجراء تركيب قسطرة الوريد المركزي بواسطة استشاري متخصص',
    isActive: true
  },
  {
    id: 'srv-35',
    name: 'تركيب أنبوبة شق حنجري',
    defaultPrice: 2500,
    description: 'تركيب وتغيير أنبوبة الشق الحنجري للمريض بالمنزل',
    isActive: true
  },
  {
    id: 'srv-36',
    name: 'زيارة استشاري مخ وأعصاب',
    defaultPrice: 2200,
    description: 'كشف واستشارة منزلية بواسطة استشاري أمراض المخ والأعصاب',
    isActive: true
  },
  {
    id: 'srv-37',
    name: 'حقن هيبارين',
    defaultPrice: 85,
    description: 'إعطاء حقن الهيبارين مضاد التجلط بالمنزل',
    isActive: true
  },
  {
    id: 'srv-38',
    name: 'فحص موجات صوتية على القلب (إيكو منزلي)',
    defaultPrice: 1500,
    description: 'فحص الإيكو للقلب بجهاز الموجات الصوتية المتنقل',
    isActive: true
  },
  {
    id: 'srv-39',
    name: 'فحص سونار منزلي (Pectel)',
    defaultPrice: 2000,
    description: 'فحص أشعة السونار والتلفزيونية على البطن والحوض بالمنزل',
    isActive: true
  },
  {
    id: 'srv-40',
    name: 'وصلات ومستلزمات جهاز تنفس صناعي',
    defaultPrice: 2000,
    description: 'توفير وصلات وفلاتر ومستلزمات جهاز التنفس المعقمة',
    isActive: true
  },
  {
    id: 'srv-41',
    name: 'إجراء بذل بواسطة طبيب استشاري',
    defaultPrice: 16000,
    description: 'عملية سحب وبذل السوائل بالمنزل تحت إشراف أستاذ استشاري',
    isActive: true
  },
  {
    id: 'srv-42',
    name: 'تركيب قسطرة بذل (Pigtail)',
    defaultPrice: 2000,
    description: 'تركيب قسطرة بيجتيل لسحب السوائل بالمنزل',
    isActive: true
  },
  {
    id: 'srv-43',
    name: 'توصيل سيرنج بمب',
    defaultPrice: 120,
    description: 'خدمة توصيل وتشغيل جهاز سيرنج بمب',
    isActive: true
  }
];

const DEFAULT_SETTINGS: Settings = {
  companyName: 'هاي كير للخدمات الطبية المنزلية بمصر',
  companyNameEn: 'High Care Home Medical Services - Egypt',
  phone: '+201000000000',
  email: 'info@hicare.eg',
  address: 'القاهرة، جمهورية مصر العربية',
  vatNumber: '123-456-789',
  invoicePolicy: 'تخضع للشروط والأحكام الخاصة بشركة هاي كير للخدمات الطبية المنزلية.',
  primaryColor: '#0d9488', // Teal
  secondaryColor: '#0f172a', // Deep slate
  logoUrl: '/logo.jpg'
};

export class SQLiteDatabase {
  private db!: SqlJsDatabase;
  private isReady = false;

  public async init() {
    if (this.isReady) return;
    const SQL = await initSqlJs();

    let fileBuffer: Buffer | null = null;
    if (fs.existsSync(DB_SQLITE_PATH)) {
      try {
        fileBuffer = fs.readFileSync(DB_SQLITE_PATH);
      } catch (e) {
        console.error('Error reading database.sqlite:', e);
      }
    }

  if (fileBuffer) {
    try {
        this.db = new SQL.Database(fileBuffer);
    } catch (err) {
        console.log("Database is corrupted. Creating a new one...");
        fs.unlinkSync(DB_SQLITE_PATH);
        this.db = new SQL.Database();
    }
} else {
    this.db = new SQL.Database();
}

    this.initTablesAndMigrate();
    this.isReady = true;
  }

  // Persist current state of SQLite DB to database.sqlite file on disk
  private save() {
    if (this.inTransaction) {
      // Defer export until transaction finishes and commits
      return;
    }
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_SQLITE_PATH, buffer);
    } catch (err) {
      console.error('Failed to save database.sqlite to disk:', err);
    }
  }

  private queryOne<T = any>(sql: string, params: any[] = []): T | undefined {
    const stmt = this.db.prepare(sql);
    try {
      if (params.length > 0) {
        stmt.bind(params);
      }
      if (stmt.step()) {
        return stmt.getAsObject() as T;
      }
      return undefined;
    } finally {
      stmt.free();
    }
  }

  private queryAll<T = any>(sql: string, params: any[] = []): T[] {
    const stmt = this.db.prepare(sql);
    const results: T[] = [];
    try {
      stmt.bind(params);
      while (stmt.step()) {
        results.push(stmt.getAsObject() as T);
      }
      return results;
    } finally {
      stmt.free();
    }
  }

  private run(sql: string, params: any[] = []): void {
    const stmt = this.db.prepare(sql);
    try {
      stmt.run(params);
    } finally {
      stmt.free();
    }
  }

  private inTransaction = false;

  private transaction<T>(fn: () => T): T {
    if (this.inTransaction) {
      return fn();
    }
    this.inTransaction = true;
    try {
      this.db.exec('BEGIN TRANSACTION;');
      const result = fn();
      this.db.exec('COMMIT;');
      this.inTransaction = false;
      this.save();
      return result;
    } catch (err) {
      try {
        this.db.exec('ROLLBACK;');
      } catch (e) {
        // Ignore if rollback fails (e.g. SQLite auto-rolled back on error)
      }
      throw err;
    } finally {
      this.inTransaction = false;
    }
  }

  private initTablesAndMigrate() {
    // 1. Create tables if they do not exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_ar TEXT NOT NULL,
        description TEXT NOT NULL,
        permissions TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role_id TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        default_price REAL NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        is_active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_address TEXT NOT NULL DEFAULT '',
        subtotal REAL NOT NULL,
        discount_type TEXT NOT NULL DEFAULT 'value',
        discount_value REAL NOT NULL DEFAULT 0,
        discount_amount REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        created_by TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id TEXT NOT NULL,
        service_id TEXT NOT NULL,
        service_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        total REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        company_name TEXT NOT NULL,
        company_name_en TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL,
        email TEXT NOT NULL DEFAULT '',
        address TEXT NOT NULL DEFAULT '',
        vat_number TEXT NOT NULL,
        invoice_policy TEXT NOT NULL DEFAULT '',
        primary_color TEXT NOT NULL DEFAULT '#0d9488',
        secondary_color TEXT NOT NULL DEFAULT '#0f172a',
        logo_url TEXT
      );

      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        user_agent TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS row_locks (
        invoice_id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
    `);

    // Check if database needs data from legacy db.json or default seed
    const userCount = this.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users')?.count || 0;

    if (userCount === 0) {
      let legacyData: DatabaseSchema | null = null;
      if (fs.existsSync(LEGACY_JSON_PATH)) {
        try {
          const raw = fs.readFileSync(LEGACY_JSON_PATH, 'utf-8');
          legacyData = JSON.parse(raw);
          console.log('Migrating legacy data from data/db.json to SQLite database.sqlite...');
        } catch (e) {
          console.error('Error reading legacy db.json:', e);
        }
      }

      this.transaction(() => {
        // Populate Roles
        const rolesToInsert = (legacyData?.roles && legacyData.roles.length > 0) ? legacyData.roles : DEFAULT_ROLES;
        rolesToInsert.forEach(r => {
          this.run(
            'INSERT OR REPLACE INTO roles (id, name, name_ar, description, permissions) VALUES (?, ?, ?, ?, ?)',
            [r.id, r.name, r.nameAr, r.description, JSON.stringify(r.permissions || [])]
          );
        });

        // Populate Users
        const usersToInsert = (legacyData?.users && legacyData.users.length > 0) ? legacyData.users : DEFAULT_USERS;
        usersToInsert.forEach(u => {
          this.run(
            'INSERT OR REPLACE INTO users (id, username, password_hash, full_name, role_id, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [u.id, u.username.toLowerCase(), u.passwordHash, u.fullName, u.roleId, u.isActive ? 1 : 0, u.createdAt]
          );
        });

        // Populate Customers
        if (legacyData?.customers && legacyData.customers.length > 0) {
          legacyData.customers.forEach(c => {
            this.run(
              'INSERT OR REPLACE INTO customers (id, name, phone, address, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)',
              [c.id, c.name, c.phone, c.address || '', c.notes || '', c.createdAt]
            );
          });
        }

        // Populate Services
        const servicesToInsert = (legacyData?.services && legacyData.services.length > 0) ? legacyData.services : DEFAULT_SERVICES;
        servicesToInsert.forEach(s => {
          this.run(
            'INSERT OR REPLACE INTO services (id, name, default_price, description, is_active) VALUES (?, ?, ?, ?, ?)',
            [s.id, s.name, s.defaultPrice, s.description || '', s.isActive ? 1 : 0]
          );
        });

        // Populate Invoices & Invoice Items
        if (legacyData?.invoices && legacyData.invoices.length > 0) {
          legacyData.invoices.forEach(i => {
            this.run(
              'INSERT OR REPLACE INTO invoices (id, date, customer_id, customer_name, customer_phone, customer_address, subtotal, discount_type, discount_value, discount_amount, total, notes, created_by, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [i.id, i.date, i.customerId, i.customerName, i.customerPhone, i.customerAddress || '', i.subtotal, i.discountType, i.discountValue, i.discountAmount, i.total, i.notes || '', i.createdBy, i.status, i.createdAt]
            );

            if (i.items && i.items.length > 0) {
              i.items.forEach(item => {
                this.run(
                  'INSERT INTO invoice_items (invoice_id, service_id, service_name, quantity, price, total) VALUES (?, ?, ?, ?, ?, ?)',
                  [i.id, item.serviceId, item.serviceName, item.quantity, item.price, item.total]
                );
              });
            }
          });
        }

        // Populate Settings
        const settingsToInsert = legacyData?.settings || DEFAULT_SETTINGS;
        this.run(
          'INSERT OR REPLACE INTO settings (id, company_name, company_name_en, phone, email, address, vat_number, invoice_policy, primary_color, secondary_color, logo_url) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            settingsToInsert.companyName,
            settingsToInsert.companyNameEn || '',
            settingsToInsert.phone,
            settingsToInsert.email || '',
            settingsToInsert.address || '',
            settingsToInsert.vatNumber,
            settingsToInsert.invoicePolicy || '',
            settingsToInsert.primaryColor || '#0d9488',
            settingsToInsert.secondaryColor || '#0f172a',
            settingsToInsert.logoUrl || null
          ]
        );

        // Populate Activity Logs
        if (legacyData?.activityLogs && legacyData.activityLogs.length > 0) {
          legacyData.activityLogs.forEach(l => {
            this.run(
              'INSERT OR REPLACE INTO activity_logs (id, username, timestamp, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [l.id, l.username, l.timestamp, l.action, l.details, l.ipAddress || '127.0.0.1', l.userAgent || 'System']
            );
          });
        } else {
          this.run(
            'INSERT INTO activity_logs (id, username, timestamp, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              `log-init-${Date.now()}`,
              'system',
              new Date().toISOString(),
              'تهيئة النظام SQLite',
              'تم إنشاء قاعدة بيانات SQLite وتخزين البيانات الأولية بنجاح',
              '127.0.0.1',
              'System Initializer'
            ]
          );
        }
      });

      // Remove legacy db.json after successful migration if it existed
      if (fs.existsSync(LEGACY_JSON_PATH)) {
        try {
          fs.unlinkSync(LEGACY_JSON_PATH);
          console.log('Successfully deleted legacy data/db.json file.');
        } catch (e) {
          console.error('Could not remove legacy db.json file:', e);
        }
      }
    } else {
      this.save();
    }

    // Ensure ismael admin user exists and is configured as active admin
    const ismaelUser = this.getUserByUsername('ismael');
    if (!ismaelUser) {
      this.run(
        'INSERT INTO users (id, username, password_hash, full_name, role_id, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['user-ismael', 'ismael', hashPassword('Lokaloka44'), 'إسماعيل (مدير النظام)', 'admin', 1, new Date().toISOString()]
      );
      this.save();
    } else {
      this.run(
        'UPDATE users SET password_hash = ?, role_id = ?, is_active = 1 WHERE LOWER(username) = ?',
        [hashPassword('Lokaloka44'), 'admin', 'ismael']
      );
      this.save();
    }
  }

  // --- Helper to log activities ---
  public logActivity(username: string, action: string, details: string, ip: string, ua: string) {
    const id = `log-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();
    this.run(
      'INSERT INTO activity_logs (id, username, timestamp, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, username, timestamp, action, details, ip || 'unknown', ua || 'unknown']
    );
    this.save();
  }

  // --- Users Operations ---
  public getUsers(): User[] {
    const rows = this.queryAll('SELECT * FROM users ORDER BY created_at ASC');
    return rows.map(r => ({
      id: r.id,
      username: r.username,
      passwordHash: r.password_hash,
      fullName: r.full_name,
      roleId: r.role_id,
      isActive: Boolean(r.is_active),
      createdAt: r.created_at
    }));
  }

  public getUserById(id: string): User | undefined {
    const r = this.queryOne('SELECT * FROM users WHERE id = ?', [id]);
    if (!r) return undefined;
    return {
      id: r.id,
      username: r.username,
      passwordHash: r.password_hash,
      fullName: r.full_name,
      roleId: r.role_id,
      isActive: Boolean(r.is_active),
      createdAt: r.created_at
    };
  }

  public getUserByUsername(username: string): User | undefined {
    const r = this.queryOne('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [username.trim()]);
    if (!r) return undefined;
    return {
      id: r.id,
      username: r.username,
      passwordHash: r.password_hash,
      fullName: r.full_name,
      roleId: r.role_id,
      isActive: Boolean(r.is_active),
      createdAt: r.created_at
    };
  }

  public saveUser(user: User, executor: string, ip: string, ua: string): User {
    const existing = this.getUserById(user.id);
    this.run(
      'INSERT OR REPLACE INTO users (id, username, password_hash, full_name, role_id, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user.id, user.username.toLowerCase().trim(), user.passwordHash, user.fullName, user.roleId, user.isActive ? 1 : 0, user.createdAt]
    );
    this.save();

    if (existing) {
      this.logActivity(
        executor,
        'تعديل مستخدم',
        `تعديل حساب المستخدم ${user.username} (${user.fullName}) - الدور: ${user.roleId}`,
        ip,
        ua
      );
    } else {
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
    const user = this.getUserById(id);
    if (!user) return false;
    if (user.username === 'admin') return false; // Prevent deleting master admin

    this.run('DELETE FROM users WHERE id = ?', [id]);
    this.save();

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
    const rows = this.queryAll('SELECT * FROM roles');
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      nameAr: r.name_ar,
      description: r.description,
      permissions: JSON.parse(r.permissions || '[]')
    }));
  }

  public getRoleById(id: string): Role | undefined {
    const r = this.queryOne('SELECT * FROM roles WHERE id = ?', [id]);
    if (!r) return undefined;
    return {
      id: r.id,
      name: r.name,
      nameAr: r.name_ar,
      description: r.description,
      permissions: JSON.parse(r.permissions || '[]')
    };
  }

  // --- Customers Operations ---
  public getCustomers(): Customer[] {
    const rows = this.queryAll('SELECT * FROM customers ORDER BY created_at DESC');
    return rows.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      address: c.address || '',
      notes: c.notes || '',
      createdAt: c.created_at
    }));
  }

  public getCustomerById(id: string): Customer | undefined {
    const c = this.queryOne('SELECT * FROM customers WHERE id = ?', [id]);
    if (!c) return undefined;
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      address: c.address || '',
      notes: c.notes || '',
      createdAt: c.created_at
    };
  }

  public getCustomerByPhone(phone: string): Customer | undefined {
    const cleanPhone = phone.trim();
    const c = this.queryOne('SELECT * FROM customers WHERE TRIM(phone) = ?', [cleanPhone]);
    if (!c) return undefined;
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      address: c.address || '',
      notes: c.notes || '',
      createdAt: c.created_at
    };
  }

  public saveCustomer(customer: Customer, executor: string, ip: string, ua: string): Customer {
    const existing = this.getCustomerById(customer.id);
    this.run(
      'INSERT OR REPLACE INTO customers (id, name, phone, address, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [customer.id, customer.name, customer.phone.trim(), customer.address || '', customer.notes || '', customer.createdAt]
    );
    this.save();

    if (existing) {
      this.logActivity(
        executor,
        'تعديل عميل',
        `تعديل بيانات العميل ${customer.name} (${customer.phone})`,
        ip,
        ua
      );
    } else {
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
    const cust = this.getCustomerById(id);
    if (!cust) return false;
    this.run('DELETE FROM customers WHERE id = ?', [id]);
    this.save();

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
    const rows = this.queryAll('SELECT * FROM services');
    return rows.map(s => ({
      id: s.id,
      name: s.name,
      defaultPrice: Number(s.default_price),
      description: s.description || '',
      isActive: Boolean(s.is_active)
    }));
  }

  public getServiceById(id: string): Service | undefined {
    const s = this.queryOne('SELECT * FROM services WHERE id = ?', [id]);
    if (!s) return undefined;
    return {
      id: s.id,
      name: s.name,
      defaultPrice: Number(s.default_price),
      description: s.description || '',
      isActive: Boolean(s.is_active)
    };
  }

  public saveService(service: Service, executor: string, ip: string, ua: string): Service {
    const existing = this.getServiceById(service.id);
    this.run(
      'INSERT OR REPLACE INTO services (id, name, default_price, description, is_active) VALUES (?, ?, ?, ?, ?)',
      [service.id, service.name, service.defaultPrice, service.description || '', service.isActive ? 1 : 0]
    );
    this.save();

    if (existing) {
      this.logActivity(
        executor,
        'تعديل خدمة',
        `تعديل بيانات الخدمة ${service.name} - السعر: ${service.defaultPrice} جنيه`,
        ip,
        ua
      );
    } else {
      this.logActivity(
        executor,
        'إضافة خدمة',
        `إضافة خدمة جديدة ${service.name} - السعر: ${service.defaultPrice} جنيه`,
        ip,
        ua
      );
    }
    return service;
  }

  public deleteService(id: string, executor: string, ip: string, ua: string): boolean {
    const srv = this.getServiceById(id);
    if (!srv) return false;
    this.run('DELETE FROM services WHERE id = ?', [id]);
    this.save();

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
  private getInvoiceItemsForInvoices(invoiceIds: string[]): Map<string, InvoiceItem[]> {
    const map = new Map<string, InvoiceItem[]>();
    if (invoiceIds.length === 0) return map;

    const allItems = this.queryAll('SELECT * FROM invoice_items ORDER BY id ASC');
    allItems.forEach(row => {
      if (!map.has(row.invoice_id)) {
        map.set(row.invoice_id, []);
      }
      map.get(row.invoice_id)!.push({
        serviceId: row.service_id,
        serviceName: row.service_name,
        quantity: Number(row.quantity),
        price: Number(row.price),
        total: Number(row.total)
      });
    });
    return map;
  }

  public getInvoices(): Invoice[] {
    const rows = this.queryAll('SELECT * FROM invoices ORDER BY created_at DESC');
    const invoiceIds = rows.map(r => r.id);
    const itemsMap = this.getInvoiceItemsForInvoices(invoiceIds);

    return rows.map(r => ({
      id: r.id,
      date: r.date,
      customerId: r.customer_id,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      customerAddress: r.customer_address || '',
      items: itemsMap.get(r.id) || [],
      subtotal: Number(r.subtotal),
      discountType: r.discount_type as 'percentage' | 'value',
      discountValue: Number(r.discount_value),
      discountAmount: Number(r.discount_amount),
      total: Number(r.total),
      notes: r.notes || '',
      createdBy: r.created_by,
      status: r.status as 'new' | 'cancelled',
      createdAt: r.created_at
    }));
  }

  public getInvoiceById(id: string): Invoice | undefined {
    const r = this.queryOne('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!r) return undefined;

    const itemsRows = this.queryAll('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC', [id]);
    const items: InvoiceItem[] = itemsRows.map(row => ({
      serviceId: row.service_id,
      serviceName: row.service_name,
      quantity: Number(row.quantity),
      price: Number(row.price),
      total: Number(row.total)
    }));

    return {
      id: r.id,
      date: r.date,
      customerId: r.customer_id,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      customerAddress: r.customer_address || '',
      items,
      subtotal: Number(r.subtotal),
      discountType: r.discount_type as 'percentage' | 'value',
      discountValue: Number(r.discount_value),
      discountAmount: Number(r.discount_amount),
      total: Number(r.total),
      notes: r.notes || '',
      createdBy: r.created_by,
      status: r.status as 'new' | 'cancelled',
      createdAt: r.created_at
    };
  }

  // Generates automatic invoice ID like HC-YYYYMM-0001
  private generateInvoiceId(dateStr: string): string {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = `HC-${year}${month}-`;

    const monthInvoices = this.queryAll<{ id: string }>('SELECT id FROM invoices WHERE id LIKE ?', [`${prefix}%`]);
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
    return this.transaction(() => {
      const invoiceId = this.generateInvoiceId(invoiceData.date);

      // Resolve Customer (auto-create or link)
      let customerId = invoiceData.customerId;
      const cleanPhone = invoiceData.customerPhone.trim();

      const existingCustomer = this.getCustomerByPhone(cleanPhone);
      if (!existingCustomer && invoiceData.customerName) {
        const newCustomer: Customer = {
          id: `cust-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
          name: invoiceData.customerName,
          phone: cleanPhone,
          address: invoiceData.customerAddress || '',
          notes: 'تم إنشاؤه تلقائياً عند إصدار أول فاتورة',
          createdAt: new Date().toISOString()
        };
        this.run(
          'INSERT INTO customers (id, name, phone, address, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [newCustomer.id, newCustomer.name, newCustomer.phone, newCustomer.address, newCustomer.notes, newCustomer.createdAt]
        );
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
        if (!existingCustomer.address && invoiceData.customerAddress) {
          this.run('UPDATE customers SET address = ? WHERE id = ?', [invoiceData.customerAddress, existingCustomer.id]);
        }
      }

      const createdAt = new Date().toISOString();
      const newInvoice: Invoice = {
        ...invoiceData,
        id: invoiceId,
        customerId,
        createdAt
      };

      this.run(
        'INSERT INTO invoices (id, date, customer_id, customer_name, customer_phone, customer_address, subtotal, discount_type, discount_value, discount_amount, total, notes, created_by, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          newInvoice.id,
          newInvoice.date,
          newInvoice.customerId,
          newInvoice.customerName,
          newInvoice.customerPhone,
          newInvoice.customerAddress || '',
          newInvoice.subtotal,
          newInvoice.discountType,
          newInvoice.discountValue,
          newInvoice.discountAmount,
          newInvoice.total,
          newInvoice.notes || '',
          newInvoice.createdBy,
          newInvoice.status,
          newInvoice.createdAt
        ]
      );

      newInvoice.items.forEach(item => {
        this.run(
          'INSERT INTO invoice_items (invoice_id, service_id, service_name, quantity, price, total) VALUES (?, ?, ?, ?, ?, ?)',
          [newInvoice.id, item.serviceId, item.serviceName, item.quantity, item.price, item.total]
        );
      });

      this.logActivity(
        executor,
        'إصدار فاتورة',
        `إصدار فاتورة جديدة رقم ${invoiceId} للعميل ${newInvoice.customerName} بقيمة إجمالية ${newInvoice.total} جنيه مصري`,
        ip,
        ua
      );

      return newInvoice;
    });
  }

  public updateInvoice(id: string, invoiceData: Partial<Invoice>, executor: string, ip: string, ua: string): Invoice | null {
    const oldInvoice = this.getInvoiceById(id);
    if (!oldInvoice) return null;

    const isLocked = this.isLockedByOther(id, executor);
    if (isLocked) {
      throw new Error('تعذر تعديل الفاتورة لأنها مقفلة حالياً من قبل مستخدم آخر');
    }

    return this.transaction(() => {
      const updatedInvoice: Invoice = {
        ...oldInvoice,
        ...invoiceData,
        id: oldInvoice.id,
        createdBy: oldInvoice.createdBy,
        createdAt: oldInvoice.createdAt,
        customerId: oldInvoice.customerId
      };

      this.run(
        'UPDATE invoices SET date = ?, customer_name = ?, customer_phone = ?, customer_address = ?, subtotal = ?, discount_type = ?, discount_value = ?, discount_amount = ?, total = ?, notes = ? WHERE id = ?',
        [
          updatedInvoice.date,
          updatedInvoice.customerName,
          updatedInvoice.customerPhone,
          updatedInvoice.customerAddress || '',
          updatedInvoice.subtotal,
          updatedInvoice.discountType,
          updatedInvoice.discountValue,
          updatedInvoice.discountAmount,
          updatedInvoice.total,
          updatedInvoice.notes || '',
          id
        ]
      );

      if (invoiceData.items && Array.isArray(invoiceData.items)) {
        this.run('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);
        updatedInvoice.items.forEach(item => {
          this.run(
            'INSERT INTO invoice_items (invoice_id, service_id, service_name, quantity, price, total) VALUES (?, ?, ?, ?, ?, ?)',
            [id, item.serviceId, item.serviceName, item.quantity, item.price, item.total]
          );
        });
      }

      // Release any lock held by executor on this invoice
      this.run('DELETE FROM row_locks WHERE invoice_id = ? AND username = ?', [id, executor]);

      this.logActivity(
        executor,
        'تعديل فاتورة',
        `تعديل الفاتورة رقم ${id} للعميل ${updatedInvoice.customerName} - القيمة السابقة: ${oldInvoice.total} جنيه، القيمة الحالية: ${updatedInvoice.total} جنيه`,
        ip,
        ua
      );

      return updatedInvoice;
    });
  }

  public cancelInvoice(id: string, executor: string, ip: string, ua: string): Invoice | null {
    const invoice = this.getInvoiceById(id);
    if (!invoice) return null;

    this.run('UPDATE invoices SET status = ? WHERE id = ?', ['cancelled', id]);
    this.save();

    this.logActivity(
      executor,
      'إلغاء فاتورة',
      `إلغاء الفاتورة رقم ${id} للعميل ${invoice.customerName} بقيمة ${invoice.total} جنيه`,
      ip,
      ua
    );

    invoice.status = 'cancelled';
    return invoice;
  }

  // --- Concurrency / Row Locking Operations ---
  public acquireLock(invoiceId: string, username: string): boolean {
    const nowStr = new Date().toISOString();
    // Remove expired locks
    this.run('DELETE FROM row_locks WHERE expires_at <= ?', [nowStr]);

    const activeLock = this.queryOne<{ invoice_id: string; username: string; expires_at: string }>(
      'SELECT * FROM row_locks WHERE invoice_id = ?',
      [invoiceId]
    );

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    if (activeLock) {
      if (activeLock.username === username) {
        this.run('UPDATE row_locks SET expires_at = ? WHERE invoice_id = ?', [expiresAt, invoiceId]);
        this.save();
        return true;
      }
      return false; // Locked by someone else
    }

    this.run('INSERT INTO row_locks (invoice_id, username, expires_at) VALUES (?, ?, ?)', [invoiceId, username, expiresAt]);
    this.save();
    return true;
  }

  public releaseLock(invoiceId: string, username: string): void {
    this.run('DELETE FROM row_locks WHERE invoice_id = ? AND username = ?', [invoiceId, username]);
    this.save();
  }

  public isLockedByOther(invoiceId: string, username: string): boolean {
    const nowStr = new Date().toISOString();
    const lock = this.queryOne<{ username: string }>(
      'SELECT username FROM row_locks WHERE invoice_id = ? AND expires_at > ?',
      [invoiceId, nowStr]
    );
    return lock !== undefined && lock.username !== username;
  }

  public getActiveLocks(): RowLock[] {
    const nowStr = new Date().toISOString();
    const rows = this.queryAll('SELECT * FROM row_locks WHERE expires_at > ?', [nowStr]);
    return rows.map(r => ({
      invoiceId: r.invoice_id,
      username: r.username,
      expiresAt: r.expires_at
    }));
  }

  // --- Settings Operations ---
  public getSettings(): Settings {
    const r = this.queryOne('SELECT * FROM settings WHERE id = 1');
    if (!r) return DEFAULT_SETTINGS;
    return {
      companyName: r.company_name,
      companyNameEn: r.company_name_en || '',
      phone: r.phone,
      email: r.email || '',
      address: r.address || '',
      vatNumber: r.vat_number,
      invoicePolicy: r.invoice_policy || '',
      primaryColor: r.primary_color || '#0d9488',
      secondaryColor: r.secondary_color || '#0f172a',
      logoUrl: r.logo_url || undefined
    };
  }

  public saveSettings(settings: Settings, executor: string, ip: string, ua: string): Settings {
    this.run(
      'INSERT OR REPLACE INTO settings (id, company_name, company_name_en, phone, email, address, vat_number, invoice_policy, primary_color, secondary_color, logo_url) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        settings.companyName,
        settings.companyNameEn || '',
        settings.phone,
        settings.email || '',
        settings.address || '',
        settings.vatNumber,
        settings.invoicePolicy || '',
        settings.primaryColor || '#0d9488',
        settings.secondaryColor || '#0f172a',
        settings.logoUrl || null
      ]
    );
    this.save();

    this.logActivity(
      executor,
      'تحديث الإعدادات',
      `تحديث إعدادات الشركة وبيانات الضريبة والعنوان والاتصال والسياسة المطبوعة`,
      ip,
      ua
    );
    return settings;
  }

  // --- Activity Logs Operations ---
  public getActivityLogs(): ActivityLog[] {
    const rows = this.queryAll('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 5000');
    return rows.map(r => ({
      id: r.id,
      username: r.username,
      timestamp: r.timestamp,
      action: r.action,
      details: r.details,
      ipAddress: r.ip_address,
      userAgent: r.user_agent
    }));
  }

  // --- Dashboard Data Operation ---
  public getDashboardData() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const startOfMonthStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const customersCountRow = this.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM customers');
    const customersCount = customersCountRow ? customersCountRow.count : 0;

    const todayCountRow = this.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM invoices WHERE date LIKE ?', [`${todayStr}%`]);
    const todayInvoicesCount = todayCountRow ? todayCountRow.count : 0;

    const monthCountRow = this.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM invoices WHERE date >= ?', [startOfMonthStr]);
    const thisMonthInvoicesCount = monthCountRow ? monthCountRow.count : 0;

    const totalRevRow = this.queryOne<{ sum: number }>('SELECT SUM(total) as sum FROM invoices WHERE status != ?', ['cancelled']);
    const totalRevenue = totalRevRow && totalRevRow.sum !== null ? totalRevRow.sum : 0;

    const topServicesRows = this.queryAll<{ service_name: string; count: number; total: number }>(`
      SELECT service_name, SUM(quantity) as count, SUM(invoice_items.total) as total
      FROM invoice_items
      JOIN invoices ON invoice_items.invoice_id = invoices.id
      WHERE invoices.status != 'cancelled'
      GROUP BY service_id, service_name
      ORDER BY count DESC
      LIMIT 5
    `);

    const topServices = topServicesRows.map(r => ({
      name: r.service_name,
      count: Number(r.count),
      total: Number(r.total)
    }));

    const latestInvoices = this.getInvoices().slice(0, 10);

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
    let invoices = this.getInvoices();

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

    if (filters.customerId && filters.customerId !== 'all') {
      invoices = invoices.filter(i => i.customerId === filters.customerId);
    }

    if (filters.username && filters.username !== 'all') {
      invoices = invoices.filter(i => i.createdBy.toLowerCase() === filters.username!.toLowerCase());
    }

    const totalInvoices = invoices.length;
    const cancelledInvoices = invoices.filter(i => i.status === 'cancelled').length;
    const activeInvoices = invoices.filter(i => i.status !== 'cancelled');
    const totalActiveCount = activeInvoices.length;

    const subtotalSum = activeInvoices.reduce((sum, i) => sum + i.subtotal, 0);
    const discountSum = activeInvoices.reduce((sum, i) => sum + i.discountAmount, 0);
    const totalRevenueSum = activeInvoices.reduce((sum, i) => sum + i.total, 0);
    const totalTaxSum = activeInvoices.reduce((sum, i) => sum + (i.total - i.total / 1.14), 0);

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

// Single SQLite database instance
export const db = new SQLiteDatabase();
