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
  code?: string;
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
  category?: string;
  isActive: boolean;
}

export interface InvoiceItem {
  serviceId: string;
  serviceName: string;
  quantity: number;
  price: number;
  total: number;
  serviceDate?: string;
  serviceEndDate?: string;
  serviceDateType?: string;
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
  // --- الخدمات الطبية ---
  { id: 'srv-1', name: 'تمريض منزلي لمده 24ساعه', defaultPrice: 2000, description: 'رعاية تمريضية منزلية متكاملة على مدار 24 ساعة', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-2', name: 'ايجار اسطوانه اكسجين', defaultPrice: 800, description: 'إيجار اسطوانة أكسجين منزلية مع المنظم', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-3', name: 'ملو اسطوانه اكسجين', defaultPrice: 400, description: 'تعبئة وملو اسطوانة أكسجين طبي', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-4', name: 'نقل اسطوانه اكسجين', defaultPrice: 450, description: 'خدمة نقل وتوصيل اسطوانة أكسجين للمنزل', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-5', name: 'زياره طبيب عنايه', defaultPrice: 1800, description: 'كشف واستشارة طبيب عناية مركزة منزلية للحالات الحرجة', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-6', name: 'ايجار مونتور', defaultPrice: 1500, description: 'إيجار جهاز مونيتور لمتابعة العلامات الحيوية', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-7', name: 'ايجار سيرنج بامب', defaultPrice: 1500, description: 'إيجار مضخة المحاليل والأدوية الوريدية (سيرنج بامب)', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-8', name: 'توصيل سيرنج بامب', defaultPrice: 120, description: 'خدمة نقل وتوصيل وتجهيز جهاز السيرنج بامب', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-9', name: 'توصيل اجهزه', defaultPrice: 120, description: 'خدمة توصيل ونقل وتشغيل الأجهزة الطبية المنزلية', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-10', name: 'طبيب مقيم لمده 24 ساعه', defaultPrice: 4500, description: 'مرافقة طبيب مقيم بالمنزل لمتابعة الحالة على مدار 24 ساعة', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-11', name: 'ايجار جهاز تنفس صناعي', defaultPrice: 4000, description: 'إيجار وتوفير جهاز التنفس الصناعي المنزلي', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-12', name: 'ايجار جهاز سكشن', defaultPrice: 850, description: 'إيجار جهاز شفط الإفرازات والمخاط (شفاط سكشن)', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-13', name: 'تركيب قسطره cvp', defaultPrice: 3500, description: 'تركيب قسطرة الوريد المركزي CVP بواسطة استشاري متخصص', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-14', name: 'تركيب انبوبه قصبه هوائيه', defaultPrice: 2500, description: 'تركيب أو العناية بأنبوبة القصبة الهوائية بالمنزل', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-15', name: 'زياره استشاري مخ واعصاب', defaultPrice: 2200, description: 'زيارة منزلية لاستشاري أمراض المخ والأعصاب', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-16', name: 'ايجار سرير طبي اوتوماتك', defaultPrice: 5000, description: 'إيجار سرير طبي كهربائي أوتوماتيك للرعاية المنزلية', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-17', name: 'نقل ومشال سرير طبي للدور 16', defaultPrice: 600, description: 'خدمات رفع ونقل السرير الطبي للأدوار العليا', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-18', name: 'توصيل سرير', defaultPrice: 500, description: 'شحن وتوصيل السرير الطبي لموقع العميل', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-19', name: 'زياره دكتور مصطفي', defaultPrice: 2000, description: 'زيارة واستشارة منزلية خاصة بواسطة طبيب استشاري', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-20', name: 'عمل بذل بواسطة طبيب استشاري', defaultPrice: 16000, description: 'إجراء عملية بذل استسقاء/سائل بالمنزل بواسطة استشاري', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-21', name: 'تحاليل', defaultPrice: 700, description: 'سحب وإجراء التحاليل الطبية الشاملة بالمنزل', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-22', name: 'Abg', defaultPrice: 700, description: 'تحليل غازات بالدم الشرياني (Arterial Blood Gas)', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-23', name: 'ايكو', defaultPrice: 1500, description: 'فحص إيكو الموجات الصوتية للقلب بالمنزل', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-24', name: 'فحص سونار', defaultPrice: 2000, description: 'فحص ألتراساوند سونار على البطن والحوض بالمنزل', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-25', name: 'رسم قلب', defaultPrice: 450, description: 'تخطيط رسم قلب كهربائي منزلي (ECG)', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-26', name: 'Chest xray', defaultPrice: 800, description: 'أشعة سينية على الصدر بجهاز متنقل بالمنزل', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-27', name: 'وصالت جهاز تنفس صناعي', defaultPrice: 2000, description: 'وصلات وفلاتر ومستلزمات تشغيل جهاز التنفس الصناعي', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-28', name: 'Pigtail', defaultPrice: 2000, description: 'تركيب ومستلزمات قسطرة بكتيل (Pigtail Drain)', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-29', name: 'دوبلر طرف واحد', defaultPrice: 2100, description: 'فحص الأشعة التلفزيونية الدوبلر للأوعية الدموية طرف واحد', category: 'الخدمات الطبية', isActive: true },
  { id: 'srv-30', name: 'مرتبه هوائيه', defaultPrice: 1800, description: 'مرتبة هوائية طبية بالمنفاخ للوقاية من قرح الفراش', category: 'الخدمات الطبية', isActive: true },

  // --- الأدوية والمستلزمات الطبية ---
  { id: 'sup-1', name: 'درسنج كبير', defaultPrice: 20, description: 'ضماد/درسنج جراحي معقم حجم كبير', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-2', name: 'ماسك', defaultPrice: 75, description: 'ماسك طبي معقم', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-3', name: 'ممر هوائي', defaultPrice: 40, description: 'ممر هوائي فموي معقم (Airway)', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-4', name: 'قسطره شفط', defaultPrice: 25, description: 'قسطرة شفط إفرازات معقمة', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-5', name: 'رباط شاش', defaultPrice: 15, description: 'رباط شاش جراحي معقم', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-6', name: 'Hydrocortisone', defaultPrice: 30, description: 'أمبولات هيدروكورتيزون مضاد للالتهاب', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-7', name: 'ماء مذيب', defaultPrice: 5, description: 'أمبولات ماء مقطر معقم للحل والأذابة', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-8', name: 'ملح %3', defaultPrice: 130, description: 'محلول كلوريد صوديوم مركز 3%', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-9', name: 'Vfeend', defaultPrice: 1600, description: 'دواء فيفيند (Vfend) مضاد للفطريات', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-10', name: 'درينكم 15جم', defaultPrice: 150, description: 'مستحضر درينكم 15 جم', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-11', name: 'البومين', defaultPrice: 1600, description: 'محلول البومين بشري معقم (Albumin)', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-12', name: 'ليدز مونتور', defaultPrice: 7, description: 'وصلات ليدز مونيتور قياس رسم القلب', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-13', name: 'قسطره cvp', defaultPrice: 1000, description: 'مستلزمات قسطرة الوريد المركزي CVP المعقمة', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-14', name: 'خيط %3', defaultPrice: 75, description: 'خيط خياطة جراحية معقم', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-15', name: 'اله جراحيه', defaultPrice: 200, description: 'آلة أدوات جراحية معقمة', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-16', name: 'كحول', defaultPrice: 100, description: 'عبوة كحول طبي معقم للتطوير', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-17', name: 'كيس بول', defaultPrice: 25, description: 'كيس جمع بول معقم بمدراج', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-18', name: 'شرايط يوويل', defaultPrice: 410, description: 'شرائط قياس تحليلي Uwell', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-19', name: 'لازكس', defaultPrice: 12, description: 'أمبولات لازكس مدرة للبول (Lasix)', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-20', name: 'Lidocaine', defaultPrice: 150, description: 'مخدر ليدوكايين موضعى', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-21', name: 'مسطره cvp', defaultPrice: 90, description: 'مسطرة قياس ضغط الوريد المركزي', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-22', name: 'Avil', defaultPrice: 20, description: 'أمبولات أفيل مضادة للحساسية', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-23', name: 'كالسيوم', defaultPrice: 45, description: 'أمبولات كالسيوم معقمة', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-24', name: 'بوتاسيوم', defaultPrice: 40, description: 'أمبولات كلوريد البوتاسيوم', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-25', name: 'ديكسا', defaultPrice: 15, description: 'أمبولات ديكساميثازون (Dexa)', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-26', name: 'بيكاربونات', defaultPrice: 40, description: 'أمبولات صوديوم بيكربونات', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-27', name: 'رينجر', defaultPrice: 30, description: 'محلول رينجر وريدي معقم', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-28', name: 'تافينك', defaultPrice: 311, description: 'عقار تافينك مضاد حيوي (Tavanic)', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-29', name: 'اتروفين', defaultPrice: 12, description: 'أمبولات اتروبين (Atropine)', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-30', name: 'بالمكورت', defaultPrice: 40, description: 'جرعات بالمكورت لجلسات الاستنشاق (Pulmicort)', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-31', name: 'لاتكس', defaultPrice: 300, description: 'قفازات طبية لاتكس فحص معقمة', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-32', name: 'ملح', defaultPrice: 30, description: 'محلول ملح طعام وريدي (Saline 0.9%)', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-33', name: 'تارجوسيد', defaultPrice: 536, description: 'حقن تارجوسيد مضاد حيوي (Targocid)', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-34', name: 'ماسك اكسجين', defaultPrice: 50, description: 'قناع ماسك أكسجين مع أنبوبة توصيل', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-35', name: 'ماسك ريسفوار', defaultPrice: 75, description: 'ماسك أكسجين مزود بخزان ريسفوار', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-36', name: 'دايل فلو', defaultPrice: 65, description: 'منظم وسيط محاليل دايل فلو (Dial-a-flow)', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-37', name: 'انبوبه شفط', defaultPrice: 25, description: 'أنبوبة شفط معقمة', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-38', name: 'قسطره سيلكون', defaultPrice: 160, description: 'قسطرة بولية سيليكون معقمة', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-39', name: 'سرنجه انسولين', defaultPrice: 5, description: 'سرنجات أنسولين معقمة', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-40', name: 'هيبارين', defaultPrice: 85, description: 'أمبولات هيبارين مضاد للتجلط', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-41', name: 'شراب فوق الركبه', defaultPrice: 800, description: 'شراب طبي ضاغط لمنع التجلط فوق الركبة', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-42', name: 'بيتادين', defaultPrice: 65, description: 'محلول مطهر بيتادين معقم', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-43', name: 'شاش معقم', defaultPrice: 25, description: 'باكيت شاش جراحي معقم', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-44', name: 'درسنج معقم', defaultPrice: 20, description: 'ضماد درسنج معقم جراحي', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-45', name: 'سرنجه 50سم', defaultPrice: 20, description: 'سرنجة كبيرة سعة 50 سم3', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-46', name: 'جيركن جل ازرق', defaultPrice: 150, description: 'جل سونار أزرق طبي', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-47', name: 'ميرونام', defaultPrice: 553, description: 'حقن ميرونام مضاد حيوي واسع المجال (Meronem)', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-48', name: 'كونترلوك', defaultPrice: 148, description: 'حقن كونترلوك لحماية المعدة (Controloc)', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-49', name: 'كلكسان', defaultPrice: 311, description: 'حقن كلكسان مضاد للتجلط (Clexane)', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-50', name: 'نور ادرينالين', defaultPrice: 75, description: 'أمبولات نور أدرينالين (Noradrenaline)', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-51', name: 'فيتانيل', defaultPrice: 550, description: 'أمبولات فينتانيل مسكن قوي (Fentanyl)', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-52', name: 'جلكوز %5', defaultPrice: 30, description: 'محلول جلوكوز تركيز 5%', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-53', name: 'صوديوم بيكارب', defaultPrice: 80, description: 'محلول صوديوم بيكربونات وريدي', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-54', name: 'كيدمين', defaultPrice: 250, description: 'محلول كيدمين تغذية وريدية (Kidmin)', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-55', name: 'ميدثتك', defaultPrice: 350, description: 'أمبولات ميدثتك مهدئ', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-56', name: 'سن سبينال اسود', defaultPrice: 100, description: 'سن إبرة بنج نصفي أسود (Spinal Needle)', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-57', name: 'وصله حرف T', defaultPrice: 80, description: 'وصلة ثلاثية اتجاهات حرف T', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-58', name: 'جاون معقم', defaultPrice: 35, description: 'رداء جاون طبي معقم استعمال مرة واحدة', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-59', name: 'جوانتي معقم', defaultPrice: 35, description: 'قفازات جراحية معقمة فردية', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-60', name: 'سالوسيت', defaultPrice: 65, description: 'محلول سالوسيت غسيل معقم', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-61', name: 'قطن', defaultPrice: 75, description: 'باكيت قطن طبي معقم', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-62', name: 'مفارش سرير', defaultPrice: 450, description: 'مفارش سرير معقمة ضد السوائل', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-63', name: 'سرنجات', defaultPrice: 10, description: 'سرنجات معقمة قياسية', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-64', name: 'وصله وريديه', defaultPrice: 45, description: 'وصلة إطالة وريدية معقمة', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-65', name: 'يورينال', defaultPrice: 25, description: 'وعاء يورينال بلاستيك طبي', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-66', name: 'سرنجه تومي', defaultPrice: 25, description: 'سرنجة تومي خاصة بالغسيل والتغذية', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-67', name: 'دايبر', defaultPrice: 700, description: 'حفاضات دايبر كبار السن عالية الامتصاص', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-68', name: 'جهاز محلول', defaultPrice: 20, description: 'جهاز نقل محاليل معقم بفلتر', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-69', name: 'ثري واي', defaultPrice: 30, description: 'محبس ثلاثي وصلة وريدية (3-Way Stopcock)', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-70', name: 'تيجاديرم', defaultPrice: 65, description: 'لاصق شفاف معقم تثبيت القساطر (Tegaderm)', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-71', name: 'وصلة دوديه', defaultPrice: 130, description: 'وصلة حلزونية دودية للمحاليل', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-72', name: 'وصله حرف Y', defaultPrice: 140, description: 'وصلة إطالة وريدية مزدوجة حرف Y', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-73', name: 'اوفر شوز', defaultPrice: 100, description: 'غطاء حذاء معقم أفر شوز', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-74', name: 'مشرط', defaultPrice: 10, description: 'شفرة مشرط جراحي معقم', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-75', name: 'شاش', defaultPrice: 15, description: 'شاش جراحي عادي', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-76', name: 'Sunnydarone', defaultPrice: 35, description: 'دواء صنيدارون', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-77', name: 'جلكوز %25', defaultPrice: 60, description: 'محلول جلوكوز 25%', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-78', name: 'ماغنسيوم', defaultPrice: 40, description: 'أمبولات سولفات ماغنسيوم', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-79', name: 'جلكوز %10', defaultPrice: 50, description: 'محلول جلوكوز 10%', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-80', name: 'ماسك نيزل', defaultPrice: 75, description: 'قناع ماسك نيزل أنفي (Nasal Mask)', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-81', name: 'جل ky', defaultPrice: 25, description: 'جل كاي واي طبي ملين معقم', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-82', name: 'بلاستر', defaultPrice: 100, description: 'بكرة بلاستر طبي معقم', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-83', name: 'Atrovent', defaultPrice: 305, description: 'بخاخ/محلول اتروفينت موسع للشعب (Atrovent)', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-84', name: 'Ensure', defaultPrice: 550, description: 'مكمل غذائي أنشور معقم (Ensure)', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-85', name: 'Pulmcort', defaultPrice: 800, description: 'مستحضر بالمكورت استنشاق (Pulmicort Package)', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-86', name: 'Duphlac', defaultPrice: 170, description: 'شراب دوفلاك ملين (Duphalac)', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-87', name: 'Acetylcistaine', defaultPrice: 90, description: 'فوار أستيل سيلستين مذيب للبلغم', category: 'الأدوية والمستلزمات الطبية', isActive: true },
  { id: 'sup-88', name: 'Medrelaximidine', defaultPrice: 365, description: 'مستحضر ميدريلاكسيميدين باسط للعضلات', category: 'الأدوية والمستلزمات الطبية', isActive: true }
];

const DEFAULT_SETTINGS: Settings = {
  companyName: 'هاي كير للخدمات الطبية',
  companyNameEn: 'High Care Medical Services',
  phone: '+201000000000',
  email: 'info@hicare.eg',
  address: 'القاهرة، جمهورية مصر العربية',
  vatNumber: '123-456-789',
  invoicePolicy: 'تخضع للشروط والأحكام الخاصة بشركة هاي كير للخدمات الطبية.',
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
        this.initTablesAndMigrate();
      } catch (e) {
        console.error('Database file is corrupt or malformed. Re-initializing new database:', e);
        try {
          if (fs.existsSync(DB_SQLITE_PATH)) {
            fs.renameSync(DB_SQLITE_PATH, DB_SQLITE_PATH + '.bak.' + Date.now());
          }
        } catch (_) {}
        this.db = new SQL.Database();
        this.initTablesAndMigrate();
      }
    } else {
      this.db = new SQL.Database();
      this.initTablesAndMigrate();
    }

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
        category TEXT NOT NULL DEFAULT 'الخدمات الطبية',
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
        total REAL NOT NULL,
        service_date TEXT,
        service_end_date TEXT,
        service_date_type TEXT
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

    // Safe column migration for services table
    try {
      this.db.exec("ALTER TABLE services ADD COLUMN category TEXT NOT NULL DEFAULT 'الخدمات الطبية';");
    } catch (e) {
      // Column category already exists
    }

    // Safe column migration for customers table
    try {
      this.db.exec("ALTER TABLE customers ADD COLUMN code TEXT;");
    } catch (e) {
      // Column code already exists
    }

    // Safe column migration for invoice_items table
    try {
      this.db.exec("ALTER TABLE invoice_items ADD COLUMN service_date TEXT;");
    } catch (e) {}
    try {
      this.db.exec("ALTER TABLE invoice_items ADD COLUMN service_end_date TEXT;");
    } catch (e) {}
    try {
      this.db.exec("ALTER TABLE invoice_items ADD COLUMN service_date_type TEXT;");
    } catch (e) {}

    // Update company settings name if legacy
    try {
      this.db.exec("UPDATE settings SET company_name = 'هاي كير للخدمات الطبية', company_name_en = 'High Care Medical Services', invoice_policy = 'تخضع للشروط والأحكام الخاصة بشركة هاي كير للخدمات الطبية.' WHERE id = 1 AND company_name LIKE '%المنزلية%';");
    } catch (e) {
      // Ignore
    }

    // Ensure all existing customers have a unique code like C101, C102...
    try {
      const customersWithoutCode = this.queryAll<{ id: string }>('SELECT id FROM customers WHERE code IS NULL OR code = "" ORDER BY created_at ASC');
      if (customersWithoutCode.length > 0) {
        let maxNum = 100;
        const existingCodes = this.queryAll<{ code: string }>('SELECT code FROM customers WHERE code IS NOT NULL AND code != ""');
        existingCodes.forEach(c => {
          const match = c.code?.match(/\d+/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (num > maxNum) maxNum = num;
          }
        });

        customersWithoutCode.forEach(c => {
          maxNum++;
          const newCode = `C${maxNum}`;
          this.run('UPDATE customers SET code = ? WHERE id = ?', [newCode, c.id]);
        });
        this.save();
      }
    } catch (e) {
      // Ignore
    }

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

    // Ensure all default services and medical supplies exist without overwriting custom database items
    this.transaction(() => {
      DEFAULT_SERVICES.forEach(s => {
        const existing = this.queryOne<{ id: string }>('SELECT id FROM services WHERE id = ? OR LOWER(name) = ?', [s.id, s.name.toLowerCase()]);
        if (!existing) {
          this.run(
            'INSERT INTO services (id, name, default_price, description, category, is_active) VALUES (?, ?, ?, ?, ?, ?)',
            [s.id, s.name, s.defaultPrice, s.description || '', s.category || 'الخدمات الطبية', s.isActive ? 1 : 0]
          );
        } else {
          this.run(
            'UPDATE services SET category = ? WHERE (id = ? OR LOWER(name) = ?) AND (category IS NULL OR category = "" OR category = "الخدمات الطبية")',
            [s.category || 'الخدمات الطبية', s.id, s.name.toLowerCase()]
          );
        }
      });
    });

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
  public generateNextCustomerCode(): string {
    const existingCodes = this.queryAll<{ code?: string }>('SELECT code FROM customers WHERE code IS NOT NULL AND code != ""');
    let maxNum = 100;
    existingCodes.forEach(c => {
      if (c.code) {
        const match = c.code.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });
    return `C${maxNum + 1}`;
  }

  public getCustomers(): Customer[] {
    const rows = this.queryAll('SELECT * FROM customers ORDER BY created_at DESC');
    return rows.map(c => ({
      id: c.id,
      code: c.code || 'C100',
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
      code: c.code || 'C100',
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
      code: c.code || 'C100',
      name: c.name,
      phone: c.phone,
      address: c.address || '',
      notes: c.notes || '',
      createdAt: c.created_at
    };
  }

  public saveCustomer(customer: Customer, executor: string, ip: string, ua: string): Customer {
    const existing = this.getCustomerById(customer.id);
    const code = customer.code || existing?.code || this.generateNextCustomerCode();

    this.run(
      'INSERT OR REPLACE INTO customers (id, code, name, phone, address, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [customer.id, code, customer.name, customer.phone.trim(), customer.address || '', customer.notes || '', customer.createdAt]
    );
    this.save();

    const saved = { ...customer, code };

    if (existing) {
      this.logActivity(
        executor,
        'تعديل عميل',
        `تعديل بيانات العميل ${saved.name} (كود: ${code} - هاتف: ${saved.phone})`,
        ip,
        ua
      );
    } else {
      this.logActivity(
        executor,
        'إنشاء عميل',
        `إضافة عميل جديد ${saved.name} (كود: ${code} - هاتف: ${saved.phone})`,
        ip,
        ua
      );
    }
    return saved;
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
    const rows = this.queryAll('SELECT * FROM services ORDER BY category ASC, name ASC');
    return rows.map(s => ({
      id: s.id,
      name: s.name,
      defaultPrice: Number(s.default_price),
      description: s.description || '',
      category: s.category || 'الخدمات الطبية',
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
      category: s.category || 'الخدمات الطبية',
      isActive: Boolean(s.is_active)
    };
  }

  public saveService(service: Service, executor: string, ip: string, ua: string): Service {
    const existing = this.getServiceById(service.id);
    this.run(
      'INSERT OR REPLACE INTO services (id, name, default_price, description, category, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [service.id, service.name, service.defaultPrice, service.description || '', service.category || 'الخدمات الطبية', service.isActive ? 1 : 0]
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
        total: Number(row.total),
        serviceDate: row.service_date || undefined,
        serviceEndDate: row.service_end_date || undefined,
        serviceDateType: row.service_date_type || undefined
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
      total: Number(row.total),
      serviceDate: row.service_date || undefined,
      serviceEndDate: row.service_end_date || undefined,
      serviceDateType: row.service_date_type || undefined
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

  // Generates automatic invoice ID using Customer Code like HC-YYYYMM-C101-01
  private generateInvoiceId(dateStr: string, customerCode: string): string {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = `HC-${year}${month}-${customerCode}-`;

    const customerInvoices = this.queryAll<{ id: string }>('SELECT id FROM invoices WHERE id LIKE ? OR id LIKE ?', [
      `${prefix}%`,
      `%-${customerCode}-%`
    ]);

    let maxNum = 0;
    customerInvoices.forEach(i => {
      const parts = i.id.split('-');
      const lastNumStr = parts[parts.length - 1];
      if (lastNumStr) {
        const num = parseInt(lastNumStr, 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });

    const nextNum = maxNum + 1;
    const paddedNum = String(nextNum).padStart(2, '0');
    return `${prefix}${paddedNum}`;
  }

  public createInvoice(invoiceData: Omit<Invoice, 'id' | 'createdAt'>, executor: string, ip: string, ua: string): Invoice {
    return this.transaction(() => {
      // Resolve Customer (auto-create or link)
      let customerId = invoiceData.customerId;
      const cleanPhone = invoiceData.customerPhone.trim();
      let customerCode = 'C101';

      let existingCustomer = this.getCustomerByPhone(cleanPhone);
      if (!existingCustomer && customerId) {
        existingCustomer = this.getCustomerById(customerId);
      }

      if (!existingCustomer && invoiceData.customerName) {
        const newCode = this.generateNextCustomerCode();
        const newCustomer: Customer = {
          id: `cust-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
          code: newCode,
          name: invoiceData.customerName,
          phone: cleanPhone,
          address: invoiceData.customerAddress || '',
          notes: 'تم إنشاؤه تلقائياً عند إصدار أول فاتورة',
          createdAt: new Date().toISOString()
        };
        this.run(
          'INSERT INTO customers (id, code, name, phone, address, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [newCustomer.id, newCustomer.code, newCustomer.name, newCustomer.phone, newCustomer.address, newCustomer.notes, newCustomer.createdAt]
        );
        customerId = newCustomer.id;
        customerCode = newCustomer.code;
        this.logActivity(
          executor,
          'إنشاء عميل تلقائي',
          `تم إنشاء حساب عميل تلقائي ${newCustomer.name} (كود: ${customerCode})`,
          ip,
          ua
        );
      } else if (existingCustomer) {
        customerId = existingCustomer.id;
        customerCode = existingCustomer.code || this.generateNextCustomerCode();
        if (!existingCustomer.code) {
          this.run('UPDATE customers SET code = ? WHERE id = ?', [customerCode, existingCustomer.id]);
        }
        if (!existingCustomer.address && invoiceData.customerAddress) {
          this.run('UPDATE customers SET address = ? WHERE id = ?', [invoiceData.customerAddress, existingCustomer.id]);
        }
      }

      const invoiceId = this.generateInvoiceId(invoiceData.date, customerCode);

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
          'INSERT INTO invoice_items (invoice_id, service_id, service_name, quantity, price, total, service_date, service_end_date, service_date_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [newInvoice.id, item.serviceId, item.serviceName, item.quantity, item.price, item.total, item.serviceDate || null, item.serviceEndDate || null, item.serviceDateType || null]
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
            'INSERT INTO invoice_items (invoice_id, service_id, service_name, quantity, price, total, service_date, service_end_date, service_date_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, item.serviceId, item.serviceName, item.quantity, item.price, item.total, item.serviceDate || null, item.serviceEndDate || null, item.serviceDateType || null]
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

  // --- Full Database Backup & Restore Operations ---
  public getFullBackup() {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      appName: 'High Care ERB',
      settings: this.getSettings(),
      roles: this.getRoles(),
      users: this.getUsers(),
      customers: this.getCustomers(),
      services: this.getServices(),
      invoices: this.getInvoices(),
      activityLogs: this.getActivityLogs()
    };
  }

  public restoreFullBackup(data: any, executor: string, ip: string, ua: string) {
    if (!data || typeof data !== 'object') {
      throw new Error('ملف النسخة الاحتياطية غير صالح أو فارغ');
    }

    const { settings, roles, users, customers, services, invoices, activityLogs } = data;

    if (!Array.isArray(invoices) || !Array.isArray(services) || !Array.isArray(users)) {
      throw new Error('ملف النسخة الاحتياطية لا يحتوي على هيكل البيانات المطلوب (الفواتير، الخدمات، المستخدمين)');
    }

    this.transaction(() => {
      // 1. Clear existing table contents
      this.run('DELETE FROM invoice_items');
      this.run('DELETE FROM invoices');
      this.run('DELETE FROM customers');
      this.run('DELETE FROM services');
      this.run('DELETE FROM users');
      this.run('DELETE FROM roles');
      this.run('DELETE FROM activity_logs');

      // 2. Insert Settings
      if (settings) {
        this.run(
          'INSERT OR REPLACE INTO settings (id, company_name, company_name_en, phone, email, address, vat_number, invoice_policy, primary_color, secondary_color, logo_url) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            settings.companyName || 'هاي كير للخدمات الطبية',
            settings.companyNameEn || 'High Care Medical Services',
            settings.phone || '',
            settings.email || '',
            settings.address || '',
            settings.vatNumber || '',
            settings.invoicePolicy || '',
            settings.primaryColor || '#0d9488',
            settings.secondaryColor || '#0f172a',
            settings.logoUrl || null
          ]
        );
      }

      // 3. Insert Roles
      const rolesToInsert = Array.isArray(roles) && roles.length > 0 ? roles : DEFAULT_ROLES;
      rolesToInsert.forEach((r: any) => {
        this.run(
          'INSERT OR REPLACE INTO roles (id, name, name_ar, description, permissions) VALUES (?, ?, ?, ?, ?)',
          [
            r.id,
            r.name,
            r.nameAr || r.name_ar || r.name,
            r.description || '',
            JSON.stringify(r.permissions || [])
          ]
        );
      });

      // 4. Insert Users
      const usersToInsert = Array.isArray(users) && users.length > 0 ? users : DEFAULT_USERS;
      usersToInsert.forEach((u: any) => {
        this.run(
          'INSERT OR REPLACE INTO users (id, username, password_hash, full_name, role_id, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            u.id,
            (u.username || 'user').toLowerCase(),
            u.passwordHash || u.password_hash || hashPassword('123456'),
            u.fullName || u.full_name || u.username,
            u.roleId || u.role_id || 'billing',
            u.isActive !== undefined ? (u.isActive ? 1 : 0) : 1,
            u.createdAt || u.created_at || new Date().toISOString()
          ]
        );
      });

      // 5. Insert Customers
      if (Array.isArray(customers)) {
        customers.forEach((c: any) => {
          this.run(
            'INSERT OR REPLACE INTO customers (id, code, name, phone, address, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              c.id,
              c.code || null,
              c.name,
              c.phone || '',
              c.address || '',
              c.notes || '',
              c.createdAt || c.created_at || new Date().toISOString()
            ]
          );
        });
      }

      // 6. Insert Services
      if (Array.isArray(services)) {
        services.forEach((s: any) => {
          this.run(
            'INSERT OR REPLACE INTO services (id, name, default_price, description, category, is_active) VALUES (?, ?, ?, ?, ?, ?)',
            [
              s.id,
              s.name,
              s.defaultPrice ?? s.default_price ?? 0,
              s.description || '',
              s.category || 'الخدمات الطبية',
              s.isActive !== undefined ? (s.isActive ? 1 : 0) : 1
            ]
          );
        });
      }

      // 7. Insert Invoices & Invoice Items
      if (Array.isArray(invoices)) {
        invoices.forEach((i: any) => {
          this.run(
            'INSERT OR REPLACE INTO invoices (id, date, customer_id, customer_name, customer_phone, customer_address, subtotal, discount_type, discount_value, discount_amount, total, notes, created_by, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              i.id,
              i.date,
              i.customerId || i.customer_id || '',
              i.customerName || i.customer_name || '',
              i.customerPhone || i.customer_phone || '',
              i.customerAddress || i.customer_address || '',
              i.subtotal ?? 0,
              i.discountType || i.discount_type || 'value',
              i.discountValue ?? i.discount_value ?? 0,
              i.discountAmount ?? i.discount_amount ?? 0,
              i.total ?? 0,
              i.notes || '',
              i.createdBy || i.created_by || 'admin',
              i.status || 'new',
              i.createdAt || i.created_at || new Date().toISOString()
            ]
          );

          if (Array.isArray(i.items)) {
            i.items.forEach((item: any) => {
              this.run(
                'INSERT INTO invoice_items (invoice_id, service_id, service_name, quantity, price, total, service_date, service_end_date, service_date_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                  i.id,
                  item.serviceId || item.service_id || '',
                  item.serviceName || item.service_name || '',
                  item.quantity ?? 1,
                  item.price ?? 0,
                  item.total ?? ((item.quantity ?? 1) * (item.price ?? 0)),
                  item.serviceDate || item.service_date || null,
                  item.serviceEndDate || item.service_end_date || null,
                  item.serviceDateType || item.service_date_type || null
                ]
              );
            });
          }
        });
      }

      // 8. Insert Activity Logs
      if (Array.isArray(activityLogs)) {
        activityLogs.forEach((l: any) => {
          this.run(
            'INSERT OR REPLACE INTO activity_logs (id, username, timestamp, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              l.id,
              l.username || 'system',
              l.timestamp || new Date().toISOString(),
              l.action || '',
              l.details || '',
              l.ipAddress || l.ip_address || '127.0.0.1',
              l.userAgent || l.user_agent || 'System'
            ]
          );
        });
      }

      // 9. Add restore action log
      this.run(
        'INSERT INTO activity_logs (id, username, timestamp, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          `log-restore-${Date.now()}`,
          executor,
          new Date().toISOString(),
          'استعادة نسخة احتياطية',
          `تم استعادة نسخة احتياطية شاملة بنجاح (${invoices.length} فاتورة، ${services.length} خدمة، ${customers ? customers.length : 0} عميل)`,
          ip || '127.0.0.1',
          ua || 'System'
        ]
      );
    });

    this.save();

    return {
      success: true,
      message: 'تم استعادة النسخة الاحتياطية الشاملة بنجاح',
      stats: {
        invoices: invoices.length,
        services: services.length,
        customers: customers ? customers.length : 0,
        users: users ? users.length : 0
      }
    };
  }
}

// Single SQLite database instance
export const db = new SQLiteDatabase();
