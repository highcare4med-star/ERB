import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { db, hashPassword, User, Role, Customer, Service, Invoice, Settings, ActivityLog } from './server/db.ts';

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

  // Get user role permissions
  const role = db.getRoleById(user.roleId);
  const permissions = role ? role.permissions : [];

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
app.get('/api/dashboard', requireAuth, (req: any, res) => {
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
    isActive: u.isActive,
    createdAt: u.createdAt
  }));
  const roles = db.getRoles();
  res.json({ users, roles });
});

app.post('/api/users', requireAuth, requirePermission('manage_users'), (req: any, res) => {
  const { username, password, fullName, roleId, isActive } = req.body;
  const { ip, ua } = getRequestMeta(req);

  if (!username || !password || !fullName || !roleId) {
    return res.status(400).json({ error: 'يرجى إدخال جميع الحقول المطلوبة لإنشاء المستخدم' });
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
    isActive: isActive !== undefined ? isActive : true,
    createdAt: new Date().toISOString()
  };

  db.saveUser(newUser, req.user.username, ip, ua);
  res.json({
    id: newUser.id,
    username: newUser.username,
    fullName: newUser.fullName,
    roleId: newUser.roleId,
    isActive: newUser.isActive,
    createdAt: newUser.createdAt
  });
});

app.put('/api/users/:id', requireAuth, requirePermission('manage_users'), (req: any, res) => {
  const { id } = req.params;
  const { fullName, roleId, isActive, password } = req.body;
  const { ip, ua } = getRequestMeta(req);

  const user = db.getUserById(id);
  if (!user) {
    return res.status(404).json({ error: 'المستخدم غير موجود' });
  }

  // Admin cannot disable themselves
  if (user.username === 'admin' && isActive === false) {
    return res.status(400).json({ error: 'لا يمكن تعطيل حساب مدير النظام الرئيسي' });
  }

  const updated: User = {
    ...user,
    fullName: fullName || user.fullName,
    roleId: roleId || user.roleId,
    isActive: isActive !== undefined ? isActive : user.isActive,
    passwordHash: password ? hashPassword(password) : user.passwordHash
  };

  db.saveUser(updated, req.user.username, ip, ua);
  res.json({
    id: updated.id,
    username: updated.username,
    fullName: updated.fullName,
    roleId: updated.roleId,
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
  const { name, defaultPrice, description, isActive } = req.body;
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
    isActive: isActive !== undefined ? isActive : true
  };

  db.saveService(newService, req.user.username, ip, ua);
  res.json(newService);
});

app.put('/api/services/:id', requireAuth, requirePermission('manage_services'), (req: any, res) => {
  const { id } = req.params;
  const { name, defaultPrice, description, isActive } = req.body;
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
  const { id, customerName, phone, date, creator, status, search } = req.query;
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
  if (search) {
    const q = (search as string).toLowerCase().trim();
    list = list.filter(i => 
      i.id.toLowerCase().includes(q) ||
      i.customerName.toLowerCase().includes(q) ||
      i.customerPhone.includes(q) ||
      i.createdBy.toLowerCase().includes(q) ||
      i.notes.toLowerCase().includes(q)
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
  const { date, customerName, customerPhone, customerAddress, items, discountType, discountValue, notes } = req.body;
  const { ip, ua } = getRequestMeta(req);

  if (!customerName || !customerPhone || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'يرجى إدخال اسم العميل وهاتفه والخدمات المطلوبة' });
  }

  // Validate items
  for (const item of items) {
    if (!item.serviceId || !item.serviceName || item.quantity <= 0 || item.price < 0) {
      return res.status(400).json({ error: 'بيانات الخدمات غير صالحة، يرجى مراجعة الكميات والأسعار' });
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
      total: parseInt(item.quantity, 10) * parseFloat(item.price)
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
  const { date, customerName, customerPhone, customerAddress, items, discountType, discountValue, notes } = req.body;
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
      total: parseInt(item.quantity, 10) * parseFloat(item.price)
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
    notes: notes !== undefined ? notes : invoice.notes
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


// --- Vite Middleware Integration ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
