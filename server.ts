import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { db, hashPassword, User, Role, Customer, Service, Invoice, Settings, ActivityLog, CaseAccount, RevenueRecord, RevenuePaymentMethod, OutgoingRecord, OutgoingCategory, ProfitDistributionRecord } from './server/db.ts';

const app = express();
const PORT = 3000;

// Enable JSON body parsing with large limit for potential logos/data
app.use(express.json({ limit: '10mb' }));

// In-memory sessions store: Token -> SessionData
interface SessionData {
  username: string;
  fullName: string;
  roleId: string;
  permissions: string[];
}
const activeSessions = new Map<string, SessionData>();

// --- Helpers & Middlewares ---

// Helper to get client IP and user agent
function getRequestMeta(req: express.Request) {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const ua = req.headers['user-agent'] || 'unknown';
  return { ip, ua };
}

// Authentication Middleware
function requireAuth(req: any, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد' });
  }
  const token = authHeader.split(' ')[1];
  const session = activeSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'جلسة العمل غير صالحة أو منتهية الصلاحية. يرجى تسجيل الدخول مجدداً' });
  }
  
  // Verify user is still active in database
  const user = db.getUsers().find(u => u.username === session.username);
  if (!user || !user.isActive) {
    activeSessions.delete(token);
    return res.status(401).json({ error: 'تم تعطيل هذا الحساب أو حذفه من النظام' });
  }

  req.user = session;
  req.token = token;
  next();
}

// Permission Authorization Middleware
function requirePermission(permission: string) {
  return (req: any, res: express.Response, next: express.NextFunction) => {
    if (!req.user || !req.user.permissions.includes(permission)) {
      return res.status(403).json({ error: 'عذراً، ليس لديك الصلاحية الكافية لإجراء هذه العملية' });
    }
    next();
  };
}

const ACCOUNTS_ALLOWED_ROLES = new Set(['admin', 'company_manager']);

function sanitizeEffectivePermissions(roleId: string, permissions: string[]): string[] {
  if (!ACCOUNTS_ALLOWED_ROLES.has(roleId)) {
    return permissions.filter(p => p !== 'manage_accounts');
  }
  return permissions;
}

// Strict Accounts Authorization Middleware (Admin & Company Manager only)
function requireAccountsAccess(req: any, res: express.Response, next: express.NextFunction) {
  if (
    !req.user ||
    !ACCOUNTS_ALLOWED_ROLES.has(req.user.roleId) ||
    !req.user.permissions.includes('manage_accounts')
  ) {
    return res.status(403).json({ error: 'عذراً، قسم الحسابات مخصص حصرياً لمدير الشركة ومدير النظام فقط' });
  }
  next();
}

// --- API Endpoints ---

// 1. Authentication Endpoints
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const { ip, ua } = getRequestMeta(req);

  if (!username || !password) {
    return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
  }

  const user = db.getUserByUsername(username);
  if (!user) {
    db.logActivity('system', 'محاولة دخول فاشلة', `محاولة تسجيل دخول غير صالحة لاسم المستخدم: ${username}`, ip, ua);
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }

  if (!user.isActive) {
    return res.status(403).json({ error: 'هذا الحساب تم تعطيله، يرجى مراجعة مدير النظام' });
  }

  const inputHash = hashPassword(password);
  if (user.passwordHash !== inputHash) {
    db.logActivity('system', 'محاولة دخول فاشلة', `كلمة مرور خاطئة لحساب المستخدم: ${username}`, ip, ua);
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }

  // Get user role permissions or custom assigned permissions
  const role = db.getRoleById(user.roleId);
  const rolePermissions = role ? role.permissions : [];
  const rawPermissions = (user.permissions && Array.isArray(user.permissions))
    ? user.permissions
    : rolePermissions;
  const permissions = sanitizeEffectivePermissions(user.roleId, rawPermissions);

  // Generate session token
  const token = crypto.randomBytes(32).toString('hex');
  const sessionData: SessionData = {
    username: user.username,
    fullName: user.fullName,
    roleId: user.roleId,
    permissions
  };

  activeSessions.set(token, sessionData);
  db.logActivity(user.username, 'تسجيل دخول', 'تم تسجيل الدخول إلى النظام بنجاح', ip, ua);

  res.json({
    token,
    user: {
      username: user.username,
      fullName: user.fullName,
      roleId: user.roleId,
      permissions
    }
  });
});

app.post('/api/auth/logout', requireAuth, (req: any, res) => {
  const { ip, ua } = getRequestMeta(req);
  activeSessions.delete(req.token);
  db.logActivity(req.user.username, 'تسجيل خروج', 'تم تسجيل الخروج من النظام بنجاح', ip, ua);
  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req: any, res) => {
  res.json({ user: req.user });
});


// 2. Dashboard Endpoints
app.get('/api/dashboard', requireAuth, requirePermission('view_dashboard'), (req: any, res) => {
  const hasReports = req.user.permissions.includes('view_reports') || req.user.permissions.includes('manage_settings');
  if (!hasReports) {
    // Limited view for billing/readonly: only latest invoices and active services
    const data = db.getDashboardData();
    res.json({
      customersCount: data.customersCount,
      todayInvoicesCount: data.todayInvoicesCount,
      thisMonthInvoicesCount: data.thisMonthInvoicesCount,
      totalRevenue: null, // Hidden for billing/readonly without permissions
      topServices: [], // Hidden
      latestInvoices: data.latestInvoices.filter(i => i.createdBy === req.user.username || req.user.permissions.includes('view_invoices'))
    });
  } else {
    const data = db.getDashboardData();
    res.json(data);
  }
});


// 3. User Management Endpoints (Admin only)
app.get('/api/users', requireAuth, requirePermission('manage_users'), (req, res) => {
  const users = db.getUsers().map(u => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    roleId: u.roleId,
    permissions: u.permissions,
    isActive: u.isActive,
    createdAt: u.createdAt
  }));
  const roles = db.getRoles();
  res.json({ users, roles });
});

app.post('/api/users', requireAuth, requirePermission('manage_users'), (req: any, res) => {
  const { username, password, fullName, roleId, isActive, permissions } = req.body;
  const { ip, ua } = getRequestMeta(req);

  if (!username || !password || !fullName || !roleId) {
    return res.status(400).json({ error: 'يرجى إدخال جميع الحقول المطلوبة لإنشاء المستخدم' });
  }

  const targetRole = db.getRoleById(roleId);
  if (!targetRole) {
    return res.status(400).json({ error: 'الدور الوظيفي المحدد غير صالح' });
  }

  if (Array.isArray(permissions) && permissions.includes('manage_accounts') && !ACCOUNTS_ALLOWED_ROLES.has(roleId)) {
    return res.status(400).json({ error: 'صلاحية قسم الحسابات مخصصة حصرياً لدور مدير النظام ومدير الشركة فقط' });
  }

  const existing = db.getUserByUsername(username);
  if (existing) {
    return res.status(400).json({ error: 'اسم المستخدم هذا مسجل مسبقاً في النظام' });
  }

  const newUser: User = {
    id: `user-${Date.now()}`,
    username: username.toLowerCase().trim(),
    passwordHash: hashPassword(password),
    fullName,
    roleId,
    permissions: Array.isArray(permissions) ? sanitizeEffectivePermissions(roleId, permissions) : undefined,
    isActive: isActive !== undefined ? isActive : true,
    createdAt: new Date().toISOString()
  };

  db.saveUser(newUser, req.user.username, ip, ua);
  res.json({
    id: newUser.id,
    username: newUser.username,
    fullName: newUser.fullName,
    roleId: newUser.roleId,
    permissions: newUser.permissions,
    isActive: newUser.isActive,
    createdAt: newUser.createdAt
  });
});

app.put('/api/users/:id', requireAuth, requirePermission('manage_users'), (req: any, res) => {
  const { id } = req.params;
  const { fullName, roleId, isActive, password, permissions } = req.body;
  const { ip, ua } = getRequestMeta(req);

  const user = db.getUserById(id);
  if (!user) {
    return res.status(404).json({ error: 'المستخدم غير موجود' });
  }

  // Admin cannot disable themselves
  if (user.username === 'admin' && isActive === false) {
    return res.status(400).json({ error: 'لا يمكن تعطيل حساب مدير النظام الرئيسي' });
  }

  const nextRoleId = roleId || user.roleId;
  const targetRole = db.getRoleById(nextRoleId);
  if (!targetRole) {
    return res.status(400).json({ error: 'الدور الوظيفي المحدد غير صالح' });
  }

  if (Array.isArray(permissions) && permissions.includes('manage_accounts') && !ACCOUNTS_ALLOWED_ROLES.has(nextRoleId)) {
    return res.status(400).json({ error: 'صلاحية قسم الحسابات مخصصة حصرياً لدور مدير النظام ومدير الشركة فقط' });
  }

  const nextPermissions =
    permissions !== undefined
      ? (Array.isArray(permissions) ? sanitizeEffectivePermissions(nextRoleId, permissions) : undefined)
      : (user.permissions ? sanitizeEffectivePermissions(nextRoleId, user.permissions) : undefined);

  const updated: User = {
    ...user,
    fullName: fullName || user.fullName,
    roleId: nextRoleId,
    permissions: nextPermissions,
    isActive: isActive !== undefined ? isActive : user.isActive,
    passwordHash: password ? hashPassword(password) : user.passwordHash
  };

  db.saveUser(updated, req.user.username, ip, ua);

  // Update active sessions in memory so new permissions apply immediately
  for (const session of activeSessions.values()) {
    if (session.username.toLowerCase() === updated.username.toLowerCase()) {
      const role = db.getRoleById(updated.roleId);
      const rolePermissions = role ? role.permissions : [];
      const rawPerms = (updated.permissions && Array.isArray(updated.permissions))
        ? updated.permissions
        : rolePermissions;
      session.permissions = sanitizeEffectivePermissions(updated.roleId, rawPerms);
      session.roleId = updated.roleId;
      session.fullName = updated.fullName;
    }
  }

  res.json({
    id: updated.id,
    username: updated.username,
    fullName: updated.fullName,
    roleId: updated.roleId,
    permissions: updated.permissions,
    isActive: updated.isActive,
    createdAt: updated.createdAt
  });
});

app.delete('/api/users/:id', requireAuth, requirePermission('manage_users'), (req: any, res) => {
  const { id } = req.params;
  const { ip, ua } = getRequestMeta(req);

  const user = db.getUserById(id);
  if (!user) {
    return res.status(404).json({ error: 'المستخدم غير موجود' });
  }

  if (user.username === 'admin') {
    return res.status(400).json({ error: 'لا يمكن حذف حساب مدير النظام الرئيسي' });
  }

  if (user.username === req.user.username) {
    return res.status(400).json({ error: 'لا يمكنك حذف حسابك الخاص أثناء تسجيل الدخول' });
  }

  const success = db.deleteUser(id, req.user.username, ip, ua);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'فشل حذف المستخدم' });
  }
});


// 4. Services Endpoints
app.get('/api/services', requireAuth, (req, res) => {
  const services = db.getServices();
  res.json(services);
});

app.post('/api/services', requireAuth, requirePermission('manage_services'), (req: any, res) => {
  const { name, defaultPrice, description, category, isActive } = req.body;
  const { ip, ua } = getRequestMeta(req);

  if (!name || defaultPrice === undefined) {
    return res.status(400).json({ error: 'يرجى إدخال اسم الخدمة وسعرها الافتراضي' });
  }

  const priceNum = parseFloat(defaultPrice);
  if (isNaN(priceNum) || priceNum < 0) {
    return res.status(400).json({ error: 'السعر الافتراضي يجب أن يكون رقماً موجباً' });
  }

  const newService: Service = {
    id: `srv-${Date.now()}`,
    name,
    defaultPrice: priceNum,
    description: description || '',
    category: category || 'الخدمات الطبية',
    isActive: isActive !== undefined ? isActive : true
  };

  db.saveService(newService, req.user.username, ip, ua);
  res.json(newService);
});

app.put('/api/services/:id', requireAuth, requirePermission('manage_services'), (req: any, res) => {
  const { id } = req.params;
  const { name, defaultPrice, description, category, isActive } = req.body;
  const { ip, ua } = getRequestMeta(req);

  const service = db.getServiceById(id);
  if (!service) {
    return res.status(404).json({ error: 'الخدمة المطلوبة غير موجودة' });
  }

  const priceNum = defaultPrice !== undefined ? parseFloat(defaultPrice) : service.defaultPrice;
  if (isNaN(priceNum) || priceNum < 0) {
    return res.status(400).json({ error: 'السعر يجب أن يكون رقماً موجباً' });
  }

  const updated: Service = {
    id,
    name: name || service.name,
    defaultPrice: priceNum,
    description: description !== undefined ? description : service.description,
    category: category !== undefined ? category : (service.category || 'الخدمات الطبية'),
    isActive: isActive !== undefined ? isActive : service.isActive
  };

  db.saveService(updated, req.user.username, ip, ua);
  res.json(updated);
});

app.delete('/api/services/:id', requireAuth, requirePermission('manage_services'), (req: any, res) => {
  const { id } = req.params;
  const { ip, ua } = getRequestMeta(req);

  const success = db.deleteService(id, req.user.username, ip, ua);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'الخدمة غير موجودة' });
  }
});


// 5. Customers Endpoints
app.get('/api/customers', requireAuth, (req, res) => {
  const { search } = req.query;
  let list = db.getCustomers();
  
  if (search) {
    const q = (search as string).toLowerCase().trim();
    list = list.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.phone.includes(q) || 
      c.address.toLowerCase().includes(q)
    );
  }
  res.json(list);
});

app.get('/api/customers/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const customer = db.getCustomerById(id);
  if (!customer) {
    return res.status(404).json({ error: 'العميل غير موجود' });
  }

  // Get all customer invoices
  const allInvoices = db.getInvoices().filter(i => i.customerId === id);
  const activeInvoices = allInvoices.filter(i => i.status !== 'cancelled');

  // Customer statistics
  const totalInvoicesValue = activeInvoices.reduce((sum, i) => sum + i.total, 0);
  const totalDiscounts = activeInvoices.reduce((sum, i) => sum + i.discountAmount, 0);
  const invoicesCount = allInvoices.length;

  res.json({
    customer,
    invoices: allInvoices,
    stats: {
      invoicesCount,
      activeInvoicesCount: activeInvoices.length,
      cancelledInvoicesCount: invoicesCount - activeInvoices.length,
      totalValue: totalInvoicesValue,
      totalDiscounts,
    }
  });
});

app.post('/api/customers', requireAuth, requirePermission('manage_customers'), (req: any, res) => {
  const { name, phone, address, notes } = req.body;
  const { ip, ua } = getRequestMeta(req);

  if (!name || !phone) {
    return res.status(400).json({ error: 'يرجى إدخال اسم العميل ورقم الهاتف' });
  }

  const existing = db.getCustomerByPhone(phone);
  if (existing) {
    return res.status(400).json({ error: 'يوجد عميل مسجل مسبقاً برقم الهاتف هذا' });
  }

  const newCustomer: Customer = {
    id: `cust-${Date.now()}`,
    name,
    phone: phone.trim(),
    address: address || '',
    notes: notes || '',
    createdAt: new Date().toISOString()
  };

  db.saveCustomer(newCustomer, req.user.username, ip, ua);
  res.json(newCustomer);
});

app.put('/api/customers/:id', requireAuth, requirePermission('manage_customers'), (req: any, res) => {
  const { id } = req.params;
  const { name, phone, address, notes } = req.body;
  const { ip, ua } = getRequestMeta(req);

  const customer = db.getCustomerById(id);
  if (!customer) {
    return res.status(404).json({ error: 'العميل غير موجود' });
  }

  if (phone && phone !== customer.phone) {
    const existing = db.getCustomerByPhone(phone);
    if (existing && existing.id !== id) {
      return res.status(400).json({ error: 'يوجد عميل آخر مسجل برقم الهاتف هذا' });
    }
  }

  const updated: Customer = {
    id,
    name: name || customer.name,
    phone: phone ? phone.trim() : customer.phone,
    address: address !== undefined ? address : customer.address,
    notes: notes !== undefined ? notes : customer.notes,
    createdAt: customer.createdAt
  };

  db.saveCustomer(updated, req.user.username, ip, ua);
  res.json(updated);
});


// 6. Invoices Endpoints
app.get('/api/invoices', requireAuth, (req, res) => {
  const { id, customerName, phone, date, creator, status, invoiceType, search } = req.query;
  let list = db.getInvoices();

  // Advanced Filters
  if (id) {
    list = list.filter(i => i.id.toLowerCase().includes((id as string).toLowerCase().trim()));
  }
  if (customerName) {
    list = list.filter(i => i.customerName.toLowerCase().includes((customerName as string).toLowerCase().trim()));
  }
  if (phone) {
    list = list.filter(i => i.customerPhone.includes((phone as string).trim()));
  }
  if (date) {
    list = list.filter(i => i.date === date);
  }
  if (creator) {
    list = list.filter(i => i.createdBy.toLowerCase() === (creator as string).toLowerCase().trim());
  }
  if (status && status !== 'all') {
    list = list.filter(i => i.status === status);
  }
  if (invoiceType && invoiceType !== 'all') {
    list = list.filter(i => (i.invoiceType || 'sale') === invoiceType);
  }
  if (search) {
    const q = (search as string).toLowerCase().trim();
    list = list.filter(i => 
      i.id.toLowerCase().includes(q) ||
      i.customerName.toLowerCase().includes(q) ||
      i.customerPhone.includes(q) ||
      i.createdBy.toLowerCase().includes(q) ||
      i.notes.toLowerCase().includes(q) ||
      (i.returnReason && i.returnReason.toLowerCase().includes(q))
    );
  }

  // Sort by date descending
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(list);
});

app.get('/api/invoices/:id', requireAuth, (req: any, res) => {
  const { id } = req.params;
  const invoice = db.getInvoiceById(id);
  if (!invoice) {
    return res.status(404).json({ error: 'الفاتورة غير موجودة' });
  }

  const isLocked = db.isLockedByOther(id, req.user.username);
  const activeLocks = db.getActiveLocks();
  const currentLock = activeLocks.find(l => l.invoiceId === id);

  res.json({
    invoice,
    lock: {
      isLocked,
      lockedBy: currentLock ? currentLock.username : null,
      expiresAt: currentLock ? currentLock.expiresAt : null
    }
  });
});

// Public endpoint for customer link sharing (no auth required)
app.get('/api/public/invoices/:id', (req, res) => {
  const { id } = req.params;
  const invoice = db.getInvoiceById(id);
  if (!invoice) {
    return res.status(404).json({ error: 'الفاتورة المطلوبة غير موجودة' });
  }
  const settings = db.getSettings();
  res.json({ invoice, settings });
});

app.post('/api/invoices', requireAuth, requirePermission('create_invoice'), (req: any, res) => {
  const { date, customerName, customerPhone, customerAddress, items, discountType, discountValue, notes, invoiceType, originalInvoiceId, returnReason } = req.body;
  const { ip, ua } = getRequestMeta(req);

  if (!customerName || !customerPhone || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'يرجى إدخال اسم العميل وهاتفه والخدمات/الأدوية المطلوبة' });
  }

  // Validate items
  for (const item of items) {
    if (!item.serviceId || !item.serviceName || item.quantity <= 0 || item.price < 0) {
      return res.status(400).json({ error: 'بيانات الأصناف/الخدمات غير صالحة، يرجى مراجعة الكميات والأسعار' });
    }
  }

  // Compute Subtotal
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Compute Discount
  let discountAmount = 0;
  const val = parseFloat(discountValue) || 0;
  if (discountType === 'percentage') {
    discountAmount = Math.round((subtotal * (val / 100)) * 100) / 100;
  } else if (discountType === 'value') {
    discountAmount = Math.min(val, subtotal);
  }

  const total = subtotal - discountAmount;

  const invoiceData: Omit<Invoice, 'id' | 'createdAt'> = {
    invoiceType: (invoiceType as 'sale' | 'return') || 'sale',
    originalInvoiceId: originalInvoiceId || undefined,
    returnReason: returnReason || undefined,
    date: date || new Date().toISOString().split('T')[0],
    customerId: '', // Will be resolved or auto-created in db.ts
    customerName,
    customerPhone: customerPhone.trim(),
    customerAddress: customerAddress || '',
    items: items.map(item => ({
      serviceId: item.serviceId,
      serviceName: item.serviceName,
      quantity: parseInt(item.quantity, 10),
      price: parseFloat(item.price),
      total: parseInt(item.quantity, 10) * parseFloat(item.price),
      serviceDate: item.serviceDate || undefined,
      serviceEndDate: item.serviceEndDate || undefined,
      serviceDateType: item.serviceDateType || undefined
    })),
    subtotal,
    discountType: discountType || 'value',
    discountValue: val,
    discountAmount,
    total,
    notes: notes || '',
    createdBy: req.user.username,
    status: 'new'
  };

  try {
    const created = db.createInvoice(invoiceData, req.user.username, ip, ua);
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء إصدار الفاتورة' });
  }
});

app.put('/api/invoices/:id', requireAuth, requirePermission('edit_invoice'), (req: any, res) => {
  const { id } = req.params;
  const { date, customerName, customerPhone, customerAddress, items, discountType, discountValue, notes, invoiceType, originalInvoiceId, returnReason } = req.body;
  const { ip, ua } = getRequestMeta(req);

  const invoice = db.getInvoiceById(id);
  if (!invoice) {
    return res.status(404).json({ error: 'الفاتورة غير موجودة' });
  }

  if (invoice.status === 'cancelled') {
    return res.status(400).json({ error: 'لا يمكن تعديل الفاتورة الملغاة' });
  }

  // Check locking
  const isLocked = db.isLockedByOther(id, req.user.username);
  if (isLocked) {
    return res.status(423).json({ error: 'هذه الفاتورة مقفلة حالياً للتعديل من قبل مستخدم آخر، يرجى الانتظار حتى تنتهي الجلسة' });
  }

  // Compute Subtotal
  let updatedItems = invoice.items;
  let subtotal = invoice.subtotal;
  if (items && Array.isArray(items)) {
    for (const item of items) {
      if (!item.serviceId || !item.serviceName || item.quantity <= 0 || item.price < 0) {
        return res.status(400).json({ error: 'بيانات الخدمات المحدثة غير صالحة' });
      }
    }
    updatedItems = items.map(item => ({
      serviceId: item.serviceId,
      serviceName: item.serviceName,
      quantity: parseInt(item.quantity, 10),
      price: parseFloat(item.price),
      total: parseInt(item.quantity, 10) * parseFloat(item.price),
      serviceDate: item.serviceDate || undefined,
      serviceEndDate: item.serviceEndDate || undefined,
      serviceDateType: item.serviceDateType || undefined
    }));
    subtotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
  }

  // Compute Discount
  let dType = discountType || invoice.discountType;
  let dVal = discountValue !== undefined ? parseFloat(discountValue) : invoice.discountValue;
  if (isNaN(dVal)) dVal = 0;

  let discountAmount = 0;
  if (dType === 'percentage') {
    discountAmount = Math.round((subtotal * (dVal / 100)) * 100) / 100;
  } else if (dType === 'value') {
    discountAmount = Math.min(dVal, subtotal);
  }

  const total = subtotal - discountAmount;

  const invoiceData: Partial<Invoice> = {
    date: date || invoice.date,
    customerName: customerName || invoice.customerName,
    customerPhone: customerPhone ? customerPhone.trim() : invoice.customerPhone,
    customerAddress: customerAddress !== undefined ? customerAddress : invoice.customerAddress,
    items: updatedItems,
    subtotal,
    discountType: dType,
    discountValue: dVal,
    discountAmount,
    total,
    notes: notes !== undefined ? notes : invoice.notes,
    invoiceType: invoiceType || invoice.invoiceType,
    originalInvoiceId: originalInvoiceId !== undefined ? originalInvoiceId : invoice.originalInvoiceId,
    returnReason: returnReason !== undefined ? returnReason : invoice.returnReason
  };

  try {
    const updated = db.updateInvoice(id, invoiceData, req.user.username, ip, ua);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'حدث خطأ أثناء تعديل الفاتورة' });
  }
});

// Row locking control
app.post('/api/invoices/:id/lock', requireAuth, requirePermission('edit_invoice'), (req: any, res) => {
  const { id } = req.params;
  const success = db.acquireLock(id, req.user.username);
  if (success) {
    res.json({ success: true, message: 'تم قفل الفاتورة بنجاح لبدء التعديل' });
  } else {
    const locks = db.getActiveLocks();
    const activeLock = locks.find(l => l.invoiceId === id);
    res.status(423).json({ 
      locked: true, 
      lockedBy: activeLock ? activeLock.username : 'مستخدم آخر',
      error: `عذراً، الفاتورة مقفلة حالياً للتعديل من قبل: ${activeLock ? activeLock.username : 'مستخدم آخر'}`
    });
  }
});

app.post('/api/invoices/:id/unlock', requireAuth, (req: any, res) => {
  const { id } = req.params;
  db.releaseLock(id, req.user.username);
  res.json({ success: true });
});

app.post('/api/invoices/:id/cancel', requireAuth, requirePermission('cancel_invoice'), (req: any, res) => {
  const { id } = req.params;
  const { ip, ua } = getRequestMeta(req);

  const invoice = db.getInvoiceById(id);
  if (!invoice) {
    return res.status(404).json({ error: 'الفاتورة غير موجودة' });
  }

  if (invoice.status === 'cancelled') {
    return res.status(400).json({ error: 'الفاتورة ملغاة بالفعل مسبقاً' });
  }

  const cancelled = db.cancelInvoice(id, req.user.username, ip, ua);
  res.json(cancelled);
});


// 7. Settings Endpoints
app.get('/api/settings', requireAuth, (req, res) => {
  const settings = db.getSettings();
  res.json(settings);
});

app.put('/api/settings', requireAuth, requirePermission('manage_settings'), (req: any, res) => {
  const { companyName, companyNameEn, phone, email, address, vatNumber, invoicePolicy, primaryColor, secondaryColor, logoUrl } = req.body;
  const { ip, ua } = getRequestMeta(req);

  if (!companyName || !phone || !vatNumber) {
    return res.status(400).json({ error: 'يرجى إدخال اسم الشركة ورقم الهاتف والرقم الضريبي' });
  }

  const updatedSettings: Settings = {
    companyName,
    companyNameEn: companyNameEn || '',
    phone,
    email: email || '',
    address: address || '',
    vatNumber,
    invoicePolicy: invoicePolicy || '',
    primaryColor: primaryColor || '#0284c7',
    secondaryColor: secondaryColor || '#0f172a',
    logoUrl: logoUrl !== undefined ? logoUrl : db.getSettings().logoUrl
  };

  db.saveSettings(updatedSettings, req.user.username, ip, ua);
  res.json(updatedSettings);
});

// Backup & Restore Endpoints
app.get('/api/backup/download', requireAuth, requirePermission('manage_settings'), (req: any, res) => {
  const { ip, ua } = getRequestMeta(req);
  const backup = db.getFullBackup();
  
  db.logActivity(
    req.user.username,
    'تنزيل نسخة احتياطية',
    `تم تصدير نسخة احتياطية كاملة من قاعدة البيانات (${backup.invoices.length} فاتورة، ${backup.services.length} خدمة، ${backup.customers.length} عميل)`,
    ip,
    ua
  );

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `highcare_erb_backup_${dateStr}.json`;

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(JSON.stringify(backup, null, 2));
});

app.post('/api/backup/restore', requireAuth, requirePermission('manage_settings'), express.json({ limit: '50mb' }), (req: any, res) => {
  const { ip, ua } = getRequestMeta(req);
  const backupData = req.body.backupData || req.body;

  try {
    const result = db.restoreFullBackup(backupData, req.user.username, ip, ua);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل استعادة النسخة الاحتياطية' });
  }
});


// 8. Reports & Auditing Endpoints
app.get('/api/reports', requireAuth, requirePermission('view_reports'), (req, res) => {
  const { startDate, endDate, customerId, username, period } = req.query;
  const data = db.getReports({
    startDate: startDate as string,
    endDate: endDate as string,
    customerId: customerId as string,
    username: username as string,
    period: period as ('day' | 'week' | 'month' | 'year')
  });
  res.json(data);
});

app.get('/api/logs', requireAuth, requirePermission('view_logs'), (req, res) => {
  const logs = db.getActivityLogs();
  res.json(logs);
});


// 9. Company Accounts Endpoints (Case Accounts & Revenues - Strict manage_accounts permission)
const VALID_PAYMENT_METHODS: RevenuePaymentMethod[] = ['cash', 'instapay', 'e_wallet', 'bank_transfer'];

function isValidIsoDate(val: unknown): val is string {
  if (typeof val !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
  const [y, m, d] = val.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

app.get('/api/accounts/case-accounts', requireAuth, requireAccountsAccess, (req, res) => {
  const { search } = req.query;
  let list = db.getCaseAccounts();
  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    list = list.filter(item =>
      item.caseName.toLowerCase().includes(q) ||
      item.consultantName.toLowerCase().includes(q) ||
      (item.notes && item.notes.toLowerCase().includes(q))
    );
  }
  res.json(list);
});

app.post('/api/accounts/case-accounts', requireAuth, requireAccountsAccess, (req: any, res) => {
  const { caseName, customerId, startDate, endDate, dailyNursingPrice, consultantName, notes } = req.body;
  const { ip, ua } = getRequestMeta(req);

  if (typeof caseName !== 'string' || !caseName.trim()) {
    return res.status(400).json({ error: 'يرجى إدخال اسم الحالة' });
  }
  if (typeof consultantName !== 'string' || !consultantName.trim()) {
    return res.status(400).json({ error: 'يرجى إدخال اسم الاستشاري' });
  }
  if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
    return res.status(400).json({ error: 'يرجى إدخال تاريخ بدء وتاريخ انتهاء صحيحين' });
  }

  const priceNum = Number(dailyNursingPrice);
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    return res.status(400).json({ error: 'سعر التمريض اليومي يجب أن يكون رقماً صحيحاً غير سالب' });
  }

  try {
    const daysCount = db.calculateInclusiveDays(startDate, endDate);
    const totalCost = Math.round((daysCount * priceNum) * 100) / 100;
    const record: CaseAccount = {
      id: `ca-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      caseName: caseName.trim(),
      customerId: typeof customerId === 'string' && customerId.trim() ? customerId.trim() : undefined,
      startDate,
      endDate,
      daysCount,
      dailyNursingPrice: priceNum,
      consultantName: consultantName.trim(),
      totalCost,
      notes: typeof notes === 'string' ? notes.trim() : '',
      createdBy: req.user.username,
      createdAt: new Date().toISOString()
    };

    const saved = db.saveCaseAccount(record, req.user.username, ip, ua);
    res.json(saved);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'تعذر حفظ حساب الحالة' });
  }
});

app.put('/api/accounts/case-accounts/:id', requireAuth, requireAccountsAccess, (req: any, res) => {
  const { id } = req.params;
  const { caseName, customerId, startDate, endDate, dailyNursingPrice, consultantName, notes } = req.body;
  const { ip, ua } = getRequestMeta(req);

  const existing = db.getCaseAccountById(id);
  if (!existing) {
    return res.status(404).json({ error: 'سجل حساب الحالة غير موجود' });
  }

  const nextCaseName = typeof caseName === 'string' ? caseName.trim() : existing.caseName;
  const nextConsultantName = typeof consultantName === 'string' ? consultantName.trim() : existing.consultantName;
  const nextStartDate = startDate !== undefined ? startDate : existing.startDate;
  const nextEndDate = endDate !== undefined ? endDate : existing.endDate;
  const nextPrice = dailyNursingPrice !== undefined ? Number(dailyNursingPrice) : existing.dailyNursingPrice;

  if (!nextCaseName) {
    return res.status(400).json({ error: 'يرجى إدخال اسم الحالة' });
  }
  if (!nextConsultantName) {
    return res.status(400).json({ error: 'يرجى إدخال اسم الاستشاري' });
  }
  if (!isValidIsoDate(nextStartDate) || !isValidIsoDate(nextEndDate)) {
    return res.status(400).json({ error: 'يرجى إدخال تاريخ بدء وتاريخ انتهاء صحيحين' });
  }
  if (!Number.isFinite(nextPrice) || nextPrice < 0) {
    return res.status(400).json({ error: 'سعر التمريض اليومي يجب أن يكون رقماً صحيحاً غير سالب' });
  }

  try {
    const daysCount = db.calculateInclusiveDays(nextStartDate, nextEndDate);
    const totalCost = Math.round((daysCount * nextPrice) * 100) / 100;
    const updated: CaseAccount = {
      ...existing,
      caseName: nextCaseName,
      customerId: customerId !== undefined
        ? (typeof customerId === 'string' && customerId.trim() ? customerId.trim() : undefined)
        : existing.customerId,
      startDate: nextStartDate,
      endDate: nextEndDate,
      daysCount,
      dailyNursingPrice: nextPrice,
      consultantName: nextConsultantName,
      totalCost,
      notes: notes !== undefined ? (typeof notes === 'string' ? notes.trim() : '') : existing.notes
    };

    const saved = db.saveCaseAccount(updated, req.user.username, ip, ua);
    res.json(saved);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'تعذر تعديل حساب الحالة' });
  }
});

app.delete('/api/accounts/case-accounts/:id', requireAuth, requireAccountsAccess, (req: any, res) => {
  const { id } = req.params;
  const { ip, ua } = getRequestMeta(req);

  const deleted = db.deleteCaseAccount(id, req.user.username, ip, ua);
  if (!deleted) {
    return res.status(404).json({ error: 'سجل حساب الحالة غير موجود' });
  }
  res.json({ success: true });
});

app.get('/api/accounts/revenues', requireAuth, requireAccountsAccess, (req, res) => {
  const { search, paymentMethod, startDate, endDate } = req.query;
  let list = db.getRevenues();

  if (paymentMethod && typeof paymentMethod === 'string' && paymentMethod !== 'all') {
    list = list.filter(r => r.paymentMethod === paymentMethod);
  }
  if (startDate && typeof startDate === 'string') {
    list = list.filter(r => r.collectionDate >= startDate);
  }
  if (endDate && typeof endDate === 'string') {
    list = list.filter(r => r.collectionDate <= endDate);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    list = list.filter(r =>
      r.caseName.toLowerCase().includes(q) ||
      r.collectorName.toLowerCase().includes(q) ||
      (r.notes && r.notes.toLowerCase().includes(q))
    );
  }

  res.json(list);
});

app.post('/api/accounts/revenues', requireAuth, requireAccountsAccess, (req: any, res) => {
  const { caseName, caseAccountId, amount, collectorName, paymentMethod, collectionDate, notes } = req.body;
  const { ip, ua } = getRequestMeta(req);

  if (typeof caseName !== 'string' || !caseName.trim()) {
    return res.status(400).json({ error: 'يرجى إدخال اسم الحالة' });
  }
  if (typeof collectorName !== 'string' || !collectorName.trim()) {
    return res.status(400).json({ error: 'يرجى إدخال اسم المحصل' });
  }
  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return res.status(400).json({ error: 'مبلغ التحصيل يجب أن يكون رقماً أكبر من الصفر' });
  }
  if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    return res.status(400).json({ error: 'نوع التحصيل غير صالح' });
  }
  if (!isValidIsoDate(collectionDate)) {
    return res.status(400).json({ error: 'يرجى إدخال تاريخ تحصيل صحيح' });
  }

  const record: RevenueRecord = {
    id: `rev-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    caseName: caseName.trim(),
    caseAccountId: typeof caseAccountId === 'string' && caseAccountId.trim() ? caseAccountId.trim() : undefined,
    amount: Math.round(amountNum * 100) / 100,
    collectorName: collectorName.trim(),
    paymentMethod,
    collectionDate,
    notes: typeof notes === 'string' ? notes.trim() : '',
    createdBy: req.user.username,
    createdAt: new Date().toISOString()
  };

  const saved = db.saveRevenue(record, req.user.username, ip, ua);
  res.json(saved);
});

app.put('/api/accounts/revenues/:id', requireAuth, requireAccountsAccess, (req: any, res) => {
  const { id } = req.params;
  const { caseName, caseAccountId, amount, collectorName, paymentMethod, collectionDate, notes } = req.body;
  const { ip, ua } = getRequestMeta(req);

  const existing = db.getRevenueById(id);
  if (!existing) {
    return res.status(404).json({ error: 'سجل التحصيل غير موجود' });
  }

  const nextCaseName = typeof caseName === 'string' ? caseName.trim() : existing.caseName;
  const nextCollectorName = typeof collectorName === 'string' ? collectorName.trim() : existing.collectorName;
  const nextAmount = amount !== undefined ? Number(amount) : existing.amount;
  const nextMethod = paymentMethod !== undefined ? paymentMethod : existing.paymentMethod;
  const nextDate = collectionDate !== undefined ? collectionDate : existing.collectionDate;

  if (!nextCaseName) {
    return res.status(400).json({ error: 'يرجى إدخال اسم الحالة' });
  }
  if (!nextCollectorName) {
    return res.status(400).json({ error: 'يرجى إدخال اسم المحصل' });
  }
  if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
    return res.status(400).json({ error: 'مبلغ التحصيل يجب أن يكون رقماً أكبر من الصفر' });
  }
  if (!VALID_PAYMENT_METHODS.includes(nextMethod)) {
    return res.status(400).json({ error: 'نوع التحصيل غير صالح' });
  }
  if (!isValidIsoDate(nextDate)) {
    return res.status(400).json({ error: 'يرجى إدخال تاريخ تحصيل صحيح' });
  }

  const updated: RevenueRecord = {
    ...existing,
    caseName: nextCaseName,
    caseAccountId: caseAccountId !== undefined
      ? (typeof caseAccountId === 'string' && caseAccountId.trim() ? caseAccountId.trim() : undefined)
      : existing.caseAccountId,
    amount: Math.round(nextAmount * 100) / 100,
    collectorName: nextCollectorName,
    paymentMethod: nextMethod,
    collectionDate: nextDate,
    notes: notes !== undefined ? (typeof notes === 'string' ? notes.trim() : '') : existing.notes
  };

  const saved = db.saveRevenue(updated, req.user.username, ip, ua);
  res.json(saved);
});

app.delete('/api/accounts/revenues/:id', requireAuth, requireAccountsAccess, (req: any, res) => {
  const { id } = req.params;
  const { ip, ua } = getRequestMeta(req);

  const deleted = db.deleteRevenue(id, req.user.username, ip, ua);
  if (!deleted) {
    return res.status(404).json({ error: 'سجل التحصيل غير موجود' });
  }
  res.json({ success: true });
});

// Outgoings / Section 3 Endpoints (قسم الخارج)
const VALID_OUTGOING_CATEGORIES: OutgoingCategory[] = [
  'supplies',
  'pharmacy_meds',
  'labs',
  'doctors',
  'devices',
  'ambulance_blood',
  'abg',
  'physiotherapy',
  'treatment_stores'
];

app.get('/api/accounts/outgoings', requireAuth, requireAccountsAccess, (req, res) => {
  const { category, search, startDate, endDate } = req.query;
  let list = db.getOutgoings();

  if (category && typeof category === 'string' && category !== 'all') {
    list = list.filter(o => o.category === category);
  }
  if (startDate && typeof startDate === 'string') {
    list = list.filter(o => o.date >= startDate);
  }
  if (endDate && typeof endDate === 'string') {
    list = list.filter(o => o.date <= endDate);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    list = list.filter(o =>
      o.caseName.toLowerCase().includes(q) ||
      (o.notes && o.notes.toLowerCase().includes(q))
    );
  }

  res.json(list);
});

app.post('/api/accounts/outgoings', requireAuth, requireAccountsAccess, (req: any, res) => {
  const { category, caseName, caseAccountId, date, amount, notes } = req.body;
  const { ip, ua } = getRequestMeta(req);

  if (!VALID_OUTGOING_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'نوع البند غير صالح' });
  }
  if (typeof caseName !== 'string' || !caseName.trim()) {
    return res.status(400).json({ error: 'يرجى إدخال اسم الحالة' });
  }
  if (!isValidIsoDate(date)) {
    return res.status(400).json({ error: 'يرجى إدخال تاريخ صحيح' });
  }
  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return res.status(400).json({ error: 'المبلغ يجب أن يكون رقماً أكبر من الصفر' });
  }

  const record: OutgoingRecord = {
    id: `out-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    category,
    caseName: caseName.trim(),
    caseAccountId: typeof caseAccountId === 'string' && caseAccountId.trim() ? caseAccountId.trim() : undefined,
    date,
    amount: Math.round(amountNum * 100) / 100,
    notes: typeof notes === 'string' ? notes.trim() : '',
    createdBy: req.user.username,
    createdAt: new Date().toISOString()
  };

  const saved = db.saveOutgoing(record, req.user.username, ip, ua);
  res.json(saved);
});

app.put('/api/accounts/outgoings/:id', requireAuth, requireAccountsAccess, (req: any, res) => {
  const { id } = req.params;
  const { category, caseName, caseAccountId, date, amount, notes } = req.body;
  const { ip, ua } = getRequestMeta(req);

  const existing = db.getOutgoingById(id);
  if (!existing) {
    return res.status(404).json({ error: 'سجل بند الخارج غير موجود' });
  }

  const nextCategory = category !== undefined ? category : existing.category;
  const nextCaseName = typeof caseName === 'string' ? caseName.trim() : existing.caseName;
  const nextDate = date !== undefined ? date : existing.date;
  const nextAmount = amount !== undefined ? Number(amount) : existing.amount;

  if (!VALID_OUTGOING_CATEGORIES.includes(nextCategory)) {
    return res.status(400).json({ error: 'نوع البند غير صالح' });
  }
  if (!nextCaseName) {
    return res.status(400).json({ error: 'يرجى إدخال اسم الحالة' });
  }
  if (!isValidIsoDate(nextDate)) {
    return res.status(400).json({ error: 'يرجى إدخال تاريخ صحيح' });
  }
  if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
    return res.status(400).json({ error: 'المبلغ يجب أن يكون رقماً أكبر من الصفر' });
  }

  const updated: OutgoingRecord = {
    ...existing,
    category: nextCategory,
    caseName: nextCaseName,
    caseAccountId: caseAccountId !== undefined
      ? (typeof caseAccountId === 'string' && caseAccountId.trim() ? caseAccountId.trim() : undefined)
      : existing.caseAccountId,
    date: nextDate,
    amount: Math.round(nextAmount * 100) / 100,
    notes: notes !== undefined ? (typeof notes === 'string' ? notes.trim() : '') : existing.notes
  };

  const saved = db.saveOutgoing(updated, req.user.username, ip, ua);
  res.json(saved);
});

app.delete('/api/accounts/outgoings/:id', requireAuth, requireAccountsAccess, (req: any, res) => {
  const { id } = req.params;
  const { ip, ua } = getRequestMeta(req);

  const deleted = db.deleteOutgoing(id, req.user.username, ip, ua);
  if (!deleted) {
    return res.status(404).json({ error: 'سجل بند الخارج غير موجود' });
  }
  res.json({ success: true });
});

// Profit Distribution / Section 4 Endpoints (توزيع الأرباح)
app.get('/api/accounts/profit-distributions', requireAuth, requireAccountsAccess, (req, res) => {
  const { search, startDate, endDate } = req.query;
  let list = db.getProfitDistributions();

  if (startDate && typeof startDate === 'string') {
    list = list.filter(p => p.periodTo >= startDate);
  }
  if (endDate && typeof endDate === 'string') {
    list = list.filter(p => p.periodFrom <= endDate);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    list = list.filter(p =>
      p.caseName.toLowerCase().includes(q) ||
      (p.otherDoctorName && p.otherDoctorName.toLowerCase().includes(q)) ||
      (p.notes && p.notes.toLowerCase().includes(q))
    );
  }

  res.json(list);
});

app.post('/api/accounts/profit-distributions', requireAuth, requireAccountsAccess, (req: any, res) => {
  const {
    caseName,
    caseAccountId,
    periodFrom,
    periodTo,
    drMaiAmount,
    drElhamAmount,
    drHanySamirAmount,
    otherDoctorName,
    otherDoctorAmount,
    notes
  } = req.body;
  const { ip, ua } = getRequestMeta(req);

  if (typeof caseName !== 'string' || !caseName.trim()) {
    return res.status(400).json({ error: 'يرجى إدخال اسم الحالة' });
  }
  if (!isValidIsoDate(periodFrom) || !isValidIsoDate(periodTo)) {
    return res.status(400).json({ error: 'يرجى إدخال تاريخ المدة (من وإلى) بشكل صحيح' });
  }

  const maiNum = Number(drMaiAmount ?? 0);
  const elhamNum = Number(drElhamAmount ?? 0);
  const hanyNum = Number(drHanySamirAmount ?? 0);
  const otherNum = Number(otherDoctorAmount ?? 0);
  const cleanOtherDoctorName = typeof otherDoctorName === 'string' ? otherDoctorName.trim() : '';

  if (
    !Number.isFinite(maiNum) || maiNum < 0 ||
    !Number.isFinite(elhamNum) || elhamNum < 0 ||
    !Number.isFinite(hanyNum) || hanyNum < 0 ||
    !Number.isFinite(otherNum) || otherNum < 0
  ) {
    return res.status(400).json({ error: 'يجب أن تكون جميع مبالغ توزيع الأرباح أرقاماً صحيحة غير سالبة' });
  }

  if (otherNum > 0 && !cleanOtherDoctorName) {
    return res.status(400).json({ error: 'يرجى إدخال اسم الطبيب المتغير عند تحديد مبلغ له' });
  }

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const drMai = round2(maiNum);
  const drElham = round2(elhamNum);
  const drHany = round2(hanyNum);
  const drOther = round2(otherNum);
  const totalDistributed = round2(drMai + drElham + drHany + drOther);

  try {
    db.calculateInclusiveDays(periodFrom, periodTo);
    const record: ProfitDistributionRecord = {
      id: `pdist-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      caseName: caseName.trim(),
      caseAccountId: typeof caseAccountId === 'string' && caseAccountId.trim() ? caseAccountId.trim() : undefined,
      periodFrom,
      periodTo,
      drMaiAmount: drMai,
      drElhamAmount: drElham,
      drHanySamirAmount: drHany,
      otherDoctorName: cleanOtherDoctorName,
      otherDoctorAmount: drOther,
      totalDistributed,
      notes: typeof notes === 'string' ? notes.trim() : '',
      createdBy: req.user.username,
      createdAt: new Date().toISOString()
    };

    const saved = db.saveProfitDistribution(record, req.user.username, ip, ua);
    res.json(saved);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'تعذر حفظ سجل توزيع الأرباح' });
  }
});

app.put('/api/accounts/profit-distributions/:id', requireAuth, requireAccountsAccess, (req: any, res) => {
  const { id } = req.params;
  const {
    caseName,
    caseAccountId,
    periodFrom,
    periodTo,
    drMaiAmount,
    drElhamAmount,
    drHanySamirAmount,
    otherDoctorName,
    otherDoctorAmount,
    notes
  } = req.body;
  const { ip, ua } = getRequestMeta(req);

  const existing = db.getProfitDistributionById(id);
  if (!existing) {
    return res.status(404).json({ error: 'سجل توزيع الأرباح غير موجود' });
  }

  const nextCaseName = typeof caseName === 'string' ? caseName.trim() : existing.caseName;
  const nextPeriodFrom = periodFrom !== undefined ? periodFrom : existing.periodFrom;
  const nextPeriodTo = periodTo !== undefined ? periodTo : existing.periodTo;
  const nextMai = drMaiAmount !== undefined ? Number(drMaiAmount) : existing.drMaiAmount;
  const nextElham = drElhamAmount !== undefined ? Number(drElhamAmount) : existing.drElhamAmount;
  const nextHany = drHanySamirAmount !== undefined ? Number(drHanySamirAmount) : existing.drHanySamirAmount;
  const nextOther = otherDoctorAmount !== undefined ? Number(otherDoctorAmount) : existing.otherDoctorAmount;
  const nextOtherName =
    otherDoctorName !== undefined
      ? (typeof otherDoctorName === 'string' ? otherDoctorName.trim() : '')
      : existing.otherDoctorName;

  if (!nextCaseName) {
    return res.status(400).json({ error: 'يرجى إدخال اسم الحالة' });
  }
  if (!isValidIsoDate(nextPeriodFrom) || !isValidIsoDate(nextPeriodTo)) {
    return res.status(400).json({ error: 'يرجى إدخال تاريخ المدة (من وإلى) بشكل صحيح' });
  }
  if (
    !Number.isFinite(nextMai) || nextMai < 0 ||
    !Number.isFinite(nextElham) || nextElham < 0 ||
    !Number.isFinite(nextHany) || nextHany < 0 ||
    !Number.isFinite(nextOther) || nextOther < 0
  ) {
    return res.status(400).json({ error: 'يجب أن تكون جميع مبالغ توزيع الأرباح أرقاماً صحيحة غير سالبة' });
  }
  if (nextOther > 0 && !nextOtherName) {
    return res.status(400).json({ error: 'يرجى إدخال اسم الطبيب المتغير عند تحديد مبلغ له' });
  }

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const drMai = round2(nextMai);
  const drElham = round2(nextElham);
  const drHany = round2(nextHany);
  const drOther = round2(nextOther);
  const totalDistributed = round2(drMai + drElham + drHany + drOther);

  try {
    db.calculateInclusiveDays(nextPeriodFrom, nextPeriodTo);
    const updated: ProfitDistributionRecord = {
      ...existing,
      caseName: nextCaseName,
      caseAccountId: caseAccountId !== undefined
        ? (typeof caseAccountId === 'string' && caseAccountId.trim() ? caseAccountId.trim() : undefined)
        : existing.caseAccountId,
      periodFrom: nextPeriodFrom,
      periodTo: nextPeriodTo,
      drMaiAmount: drMai,
      drElhamAmount: drElham,
      drHanySamirAmount: drHany,
      otherDoctorName: nextOtherName,
      otherDoctorAmount: drOther,
      totalDistributed,
      notes: notes !== undefined ? (typeof notes === 'string' ? notes.trim() : '') : existing.notes
    };

    const saved = db.saveProfitDistribution(updated, req.user.username, ip, ua);
    res.json(saved);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'تعذر تعديل سجل توزيع الأرباح' });
  }
});

app.delete('/api/accounts/profit-distributions/:id', requireAuth, requireAccountsAccess, (req: any, res) => {
  const { id } = req.params;
  const { ip, ua } = getRequestMeta(req);

  const deleted = db.deleteProfitDistribution(id, req.user.username, ip, ua);
  if (!deleted) {
    return res.status(404).json({ error: 'سجل توزيع الأرباح غير موجود' });
  }
  res.json({ success: true });
});


// --- Vite Middleware Integration ---

async function startServer() {
  await db.init();
  console.log('SQLite database initialized successfully.');

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development middleware mounted.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production build files.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hi Care Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
