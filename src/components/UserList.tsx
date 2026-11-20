import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserPlus, Shield, Check, X, ShieldAlert, KeyRound, Save, RefreshCw,
  FileText, HeartHandshake, Users, TrendingUp, Settings, Wallet,
  CheckSquare, Square, SlidersHorizontal, Info, Sparkles
} from 'lucide-react';
import { User, Role } from '../types';

interface UserListProps {
  token: string;
  currentUsername: string;
}

// Structured permissions with categories and clear Arabic descriptions
export interface PermissionDefinition {
  id: string;
  label: string;
  description: string;
  isSensitive?: boolean;
}

export interface PermissionCategory {
  id: string;
  title: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  permissions: PermissionDefinition[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'invoices',
    title: 'إصدار وإدارة الفواتير',
    icon: FileText,
    color: 'text-sky-600',
    bgColor: 'bg-sky-50/70',
    borderColor: 'border-sky-200/50',
    permissions: [
      { id: 'create_invoice', label: 'إصدار فواتير جديدة', description: 'إنشاء فواتير طبية جديدة وإدخال زيارات الرعاية المنزلية' },
      { id: 'edit_invoice', label: 'تعديل الفواتير القائمة', description: 'تعديل بنود وأسعار وبيانات الفواتير غير المقفلة' },
      { id: 'view_invoices', label: 'استعراض سجل الفواتير', description: 'مشاهدة والبحث والفلترة في قائمة الفواتير' },
      { id: 'print_pdf', label: 'طباعة وتصدير PDF', description: 'توليد ملفات PDF الطبية المعتمدة وطباعتها' },
      { id: 'send_whatsapp', label: 'إرسال الفاتورة عبر واتساب', description: 'مشاركة رابط ورسالة الفاتورة مباشرة للعميل' },
      { id: 'cancel_invoice', label: 'إلغاء الفواتير', description: 'إمكانية إلغاء الفاتورة من السجل المالي' },
    ]
  },
  {
    id: 'operations',
    title: 'الخدمات الطبية وسجل العملاء',
    icon: HeartHandshake,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50/70',
    borderColor: 'border-teal-200/50',
    permissions: [
      { id: 'manage_customers', label: 'إدارة وتعديل سجل العملاء', description: 'إضافة عملاء جدد، وتعديل العناوين والهواتف وملاحظات الملف الطبي' },
      { id: 'manage_services', label: 'إدارة وتعديل الخدمات الطبية', description: 'إضافة خدمات جديدة، وتحديث قائمة الخدمات وتغيير الأسعار الافتراضية' },
    ]
  },
  {
    id: 'reports',
    title: 'لوحة التحكم والتقارير المالية وسجل العمليات',
    icon: TrendingUp,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50/70',
    borderColor: 'border-amber-200/50',
    permissions: [
      { id: 'view_dashboard', label: 'عرض لوحة التحكم الرئيسية', description: 'الاطلاع على شاشة لوحة التحكم الرئيسية وملخص الإحصائيات والوصول السريع' },
      { id: 'view_reports', label: 'الاطلاع على التقارير المالية وإجمالي الإيرادات', description: 'مشاهدة إجمالي الإيرادات ومؤشرات المبيعات وتصدير تقارير Excel المجمعة', isSensitive: true },
      { id: 'view_logs', label: 'الاطلاع على سجل العمليات (Audit Logs)', description: 'متابعة سجل حركات وأنشطة جميع الموظفين الأمنية' },
    ]
  },
  {
    id: 'accounts',
    title: 'حسابات الشركة (مدير الشركة ومدير النظام فقط)',
    icon: Wallet,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50/70',
    borderColor: 'border-emerald-200/50',
    permissions: [
      { id: 'manage_accounts', label: 'إدارة قسم الحسابات (حسابات الحالات والإيرادات والخارج وتوزيع الأرباح)', description: 'صلاحية حصرية لمدير الشركة ومدير النظام فقط لإدارة الحسابات والتقارير المالية الشاملة', isSensitive: true },
    ]
  },
  {
    id: 'system',
    title: 'إدارة النظام والإعدادات',
    icon: Settings,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50/70',
    borderColor: 'border-purple-200/50',
    permissions: [
      { id: 'manage_users', label: 'إدارة حسابات الموظفين والصلاحيات', description: 'إنشاء وتعديل مستخدمين وتحديد صلاحيات كل موظف بالـ Checkbox' },
      { id: 'manage_settings', label: 'إعدادات وسياسات الشركة', description: 'تعديل شعار الشركة، سياسات الفواتير، والألوان والبيانات الضريبية' },
    ]
  }
];

export const ALL_PERMISSION_IDS = PERMISSION_CATEGORIES.flatMap(c => c.permissions.map(p => p.id));

export default function UserList({ token, currentUsername }: UserListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formFullName, setFormFullName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRoleId, setFormRoleId] = useState('billing');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formPermissions, setFormPermissions] = useState<string[]>([]);

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Quick view user permissions modal/popover
  const [inspectUser, setInspectUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('فشل جلب قائمة المستخدمين من الخادم');
      }
      const data = await response.json();
      setUsers(data.users);
      setRoles(data.roles);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  // Helper to get effective permissions for a role
  const getRoleDefaultPermissions = (roleId: string): string[] => {
    const roleObj = roles.find(r => r.id === roleId);
    if (roleObj && roleObj.permissions) {
      return [...roleObj.permissions];
    }
    if (roleId === 'admin' || roleId === 'company_manager') return [...ALL_PERMISSION_IDS];
    if (roleId === 'operations_manager') {
      return ['create_invoice', 'edit_invoice', 'cancel_invoice', 'view_invoices', 'print_pdf', 'send_whatsapp', 'manage_services', 'manage_customers', 'view_reports'];
    }
    if (roleId === 'financial') return ['view_dashboard', 'view_invoices', 'print_pdf', 'send_whatsapp', 'manage_services', 'manage_customers', 'view_reports', 'view_logs'];
    if (roleId === 'billing') return ['view_dashboard', 'create_invoice', 'edit_invoice', 'view_invoices', 'print_pdf', 'send_whatsapp', 'manage_customers', 'manage_services'];
    if (roleId === 'data_entry') return ['view_dashboard', 'manage_services', 'manage_customers', 'view_invoices', 'print_pdf'];
    if (roleId === 'readonly') return ['view_dashboard', 'view_invoices', 'print_pdf'];
    return [];
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormFullName('');
    setFormUsername('');
    setFormPassword('');
    setFormRoleId('billing');
    setFormIsActive(true);
    // Initialize permissions for billing officer: operational with invoices, services, customers, but NO financial reports!
    setFormPermissions(['create_invoice', 'edit_invoice', 'view_invoices', 'print_pdf', 'send_whatsapp', 'manage_customers', 'manage_services']);
    setFormError('');
    setShowForm(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingId(u.id);
    setFormFullName(u.fullName);
    setFormUsername(u.username);
    setFormPassword(''); // Password remains empty unless modified
    setFormRoleId(u.roleId);
    setFormIsActive(u.isActive);

    // Use user-specific custom permissions if set, or fall back to role defaults
    if (u.permissions && Array.isArray(u.permissions)) {
      setFormPermissions([...u.permissions]);
    } else {
      setFormPermissions(getRoleDefaultPermissions(u.roleId));
    }

    setFormError('');
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const isAccountsAllowedForSelectedRole = formRoleId === 'admin' || formRoleId === 'company_manager';

  // Toggle single permission checkbox
  const handleTogglePermission = (permissionId: string) => {
    if (permissionId === 'manage_accounts' && !isAccountsAllowedForSelectedRole) {
      return;
    }
    setFormPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(p => p !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  // Quick Preset Handlers
  const handleSelectAll = () => {
    setFormPermissions(
      isAccountsAllowedForSelectedRole
        ? [...ALL_PERMISSION_IDS]
        : ALL_PERMISSION_IDS.filter(id => id !== 'manage_accounts')
    );
  };

  const handleDeselectAll = () => {
    setFormPermissions([]);
  };

  const handleApplyRoleDefault = () => {
    setFormPermissions(getRoleDefaultPermissions(formRoleId));
  };

  // Preset: Operational Supervisor (Everything except Accounts, Dashboard, Company Settings, Audit Logs & Users)
  const handleApplyOperationsSupervisorPreset = () => {
    setFormRoleId('operations_manager');
    setFormPermissions([
      'create_invoice',
      'edit_invoice',
      'cancel_invoice',
      'view_invoices',
      'print_pdf',
      'send_whatsapp',
      'manage_customers',
      'manage_services',
      'view_reports'
    ]);
  };

  // Preset: Billing Officer custom request (Invoices + Customers + Services + Edit, NO Revenue/Reports)
  const handleApplyBillingPreset = () => {
    setFormRoleId('billing');
    setFormPermissions([
      'view_dashboard',
      'create_invoice',
      'edit_invoice',
      'view_invoices',
      'print_pdf',
      'send_whatsapp',
      'manage_customers',
      'manage_services'
    ]);
  };

  const handleRoleChange = (newRoleId: string) => {
    setFormRoleId(newRoleId);
    // Automatically apply the default permissions for this role as baseline
    const defaults = getRoleDefaultPermissions(newRoleId);
    if (newRoleId !== 'admin' && newRoleId !== 'company_manager') {
      setFormPermissions(defaults.filter(p => p !== 'manage_accounts'));
    } else {
      setFormPermissions(defaults);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formFullName.trim() || !formUsername.trim() || !formRoleId) {
      setFormError('يرجى تعبئة الحقول المطلوبة');
      return;
    }

    if (!editingId && !formPassword) {
      setFormError('يرجى إدخال كلمة مرور الحساب الجديد');
      return;
    }

    if (formPermissions.length === 0) {
      setFormError('يرجى تحديد صلاحية واحدة على الأقل للموظف');
      return;
    }

    setFormLoading(true);
    try {
      const url = editingId ? `/api/users/${editingId}` : '/api/users';
      const method = editingId ? 'PUT' : 'POST';

      const bodyData: any = {
        fullName: formFullName.trim(),
        roleId: formRoleId,
        isActive: formIsActive,
        permissions: formPermissions
      };

      if (!editingId) {
        bodyData.username = formUsername.toLowerCase().trim();
        bodyData.password = formPassword;
      } else if (formPassword) {
        bodyData.password = formPassword; // Resetting password during edits
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'فشل حفظ بيانات المستخدم');
      }

      setShowForm(false);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || 'حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (u: User) => {
    if (u.username === 'admin') {
      alert('لا يمكن حذف حساب مدير النظام الرئيسي لحماية استقرار النظام');
      return;
    }

    if (u.username.toLowerCase() === currentUsername.toLowerCase()) {
      alert('لا يمكنك حذف حسابك الخاص أثناء جلسة العمل الحالية');
      return;
    }

    if (!window.confirm(`هل أنت متأكد من حذف حساب الموظف "${u.fullName}" (${u.username}) نهائياً؟`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${u.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'فشل حذف حساب المستخدم');
      }

      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء حذف حساب المستخدم');
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">إدارة الموظفين وتخصيص الصلاحيات</h1>
            <span className="bg-teal-50 text-teal-700 border border-teal-200/50 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              تحكم دقيق بالـ Checkbox
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            حدد الصلاحيات المتاحة لكل موظف بدقة (إصدار وتعديل الفواتير، الخدمات، العملاء، وحجب التقارير المالية)
          </p>
        </div>

        {!showForm && (
          <button
            onClick={handleOpenAdd}
            className="self-start sm:self-auto flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm py-2.5 px-4 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <UserPlus className="h-4.5 w-4.5" />
            إضافة حساب موظف جديد
          </button>
        )}
      </div>

      {/* Users Creation/Edition Form with Granular Checkboxes */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-6 rounded-2xl shadow-lg border border-teal-500/20 space-y-6"
          >
            <div className="flex justify-between items-center pb-3 border-b border-white/20">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-teal-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingId ? `تعديل حساب وصلاحيات الموظف: ${formUsername}` : 'إصدار حساب موظف جديد وتحديد صلاحياته بدقة'}
                </h3>
              </div>
              <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {formError && (
                <div className="bg-red-50/80 backdrop-blur-md border border-red-200/50 text-red-700 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Basic Account Credentials */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/40 p-4 rounded-xl border border-white/30">
                {/* Full Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">الاسم الكامل للموظف *</label>
                  <input
                    type="text"
                    required
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    placeholder="مثال: أحمد عبد الله"
                    className="block w-full px-3 py-2.5 glass-input rounded-xl text-sm focus:outline-none"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">اسم المستخدم (بالإنجليزي) *</label>
                  <input
                    type="text"
                    required
                    disabled={editingId !== null}
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="مثال: ahmed"
                    className="block w-full px-3 py-2.5 glass-input rounded-xl text-sm disabled:opacity-55 focus:outline-none font-mono"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    {editingId ? 'كلمة المرور (اختياري للتغيير)' : 'كلمة المرور *'}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <KeyRound className="h-4 w-4 text-slate-400" />
                    </span>
                    <input
                      type="password"
                      required={editingId === null}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder={editingId ? 'اتركه فارغاً للاحتفاظ بالحالية' : '••••••••'}
                      className="block w-full pr-8 pl-3 py-2.5 glass-input rounded-xl text-sm font-mono focus:outline-none"
                    />
                  </div>
                </div>

                {/* Role Baseline */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    الدور الوظيفي المرجعي (لتحديد الصلاحيات المبدئية)
                  </label>
                  <select
                    value={formRoleId}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="block w-full px-3 py-2.5 glass-input rounded-xl text-sm focus:outline-none appearance-none"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id} className="bg-slate-100 text-slate-800">
                        {r.nameAr} ({r.name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Is Active Status checkbox */}
                <div className="md:col-span-2 flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="formIsActiveCheckbox"
                    disabled={formUsername === 'admin'}
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="h-4.5 w-4.5 text-teal-600 border-white/30 rounded focus:ring-teal-500 bg-white/20 disabled:opacity-40"
                  />
                  <label 
                    htmlFor="formIsActiveCheckbox" 
                    className={`text-xs font-bold text-slate-700 cursor-pointer select-none ${formUsername === 'admin' ? 'opacity-40' : ''}`}
                  >
                    الحساب نشط ومصرح له بالدخول للنظام والفوترة
                  </label>
                </div>
              </div>

              {/* Granular Permissions Section */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-teal-50/50 p-4 rounded-xl border border-teal-100/60">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">صلاحيات الموظف المخصصة (Checkboxes)</h4>
                      <span className="bg-teal-600 text-white text-[11px] font-mono font-bold px-2 py-0.5 rounded-full">
                        {formPermissions.length} من {ALL_PERMISSION_IDS.length} محددة
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      قم باختيار أو إزالة أي صلاحية لكل موظف على حدة وفق مهامه الميدانية أو الإدارية.
                    </p>
                  </div>

                  {/* Quick Action Presets */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleApplyOperationsSupervisorPreset}
                      className="flex items-center gap-1 bg-white hover:bg-slate-50 text-teal-700 border border-teal-200 font-bold py-1.5 px-3 rounded-lg shadow-sm transition-all cursor-pointer"
                      title="فواتير + عملاء + خدمات بدون الحسابات ولوحة التحكم وإعدادات الشركة وسجل العمليات"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                      <span>تشغيل شامل (بدون حسابات ولوحة تحكم وإعدادات)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyBillingPreset}
                      className="flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-1.5 px-3 rounded-lg shadow-sm transition-all cursor-pointer"
                      title="فواتير + عملاء + خدمات بدون تقارير الإيرادات"
                    >
                      <span>نموذج موظف الفواتير</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="bg-white/80 hover:bg-white text-slate-700 border border-slate-200 py-1.5 px-2.5 rounded-lg font-semibold transition-all cursor-pointer"
                    >
                      تحديد الكل
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="bg-white/80 hover:bg-white text-slate-700 border border-slate-200 py-1.5 px-2.5 rounded-lg font-semibold transition-all cursor-pointer"
                    >
                      إلغاء التحديد
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyRoleDefault}
                      className="bg-white/80 hover:bg-white text-slate-700 border border-slate-200 py-1.5 px-2.5 rounded-lg font-semibold transition-all cursor-pointer"
                    >
                      استعادة افتراضي الدور
                    </button>
                  </div>
                </div>

                {/* Security Sensitivity Alert */}
                {!formPermissions.includes('view_reports') ? (
                  <div className="bg-emerald-50/70 border border-emerald-200/60 p-3 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>التقارير المالية محجوبة:</strong> هذا الموظف <u>لن يتمكن</u> من رؤية إجمالي الإيرادات أو مؤشرات المبيعات أو تصدير التقارير المالية.
                    </span>
                  </div>
                ) : (
                  <div className="bg-amber-50/70 border border-amber-200/60 p-3 rounded-xl flex items-center gap-2 text-xs text-amber-800">
                    <Info className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>التقارير المالية مفعّلة:</strong> هذا الموظف مسموح له بالاطلاع على إجمالي الإيرادات ومؤشرات المبيعات وتصدير Excel.
                    </span>
                  </div>
                )}

                {/* Categories Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PERMISSION_CATEGORIES.map(category => {
                    const CategoryIcon = category.icon;
                    const catSelectedCount = category.permissions.filter(p => formPermissions.includes(p.id)).length;
                    const allCatSelected = catSelectedCount === category.permissions.length;

                    const toggleEntireCategory = () => {
                      if (category.id === 'accounts' && !isAccountsAllowedForSelectedRole) {
                        return;
                      }
                      if (allCatSelected) {
                        setFormPermissions(prev => prev.filter(id => !category.permissions.some(p => p.id === id)));
                      } else {
                        const idsToAdd = category.permissions
                          .map(p => p.id)
                          .filter(id => id !== 'manage_accounts' || isAccountsAllowedForSelectedRole);
                        setFormPermissions(prev => Array.from(new Set([...prev, ...idsToAdd])));
                      }
                    };

                    return (
                      <div 
                        key={category.id} 
                        className="bg-white/40 rounded-xl p-4 border border-white/40 shadow-sm flex flex-col justify-between space-y-3"
                      >
                        {/* Category Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-white/20">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${category.bgColor} ${category.color}`}>
                              <CategoryIcon className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-xs text-slate-800">{category.title}</span>
                          </div>

                          {!(category.id === 'accounts' && !isAccountsAllowedForSelectedRole) && (
                            <button
                              type="button"
                              onClick={toggleEntireCategory}
                              className="text-[10px] font-semibold text-teal-600 hover:text-teal-700 underline cursor-pointer"
                            >
                              {allCatSelected ? 'إلغاء القسم' : 'تحديد كل القسم'}
                            </button>
                          )}
                        </div>

                        {/* Category Checkboxes List */}
                        <div className="space-y-2.5">
                          {category.permissions.map(perm => {
                            const isLockedAccounts = perm.id === 'manage_accounts' && !isAccountsAllowedForSelectedRole;
                            const isChecked = !isLockedAccounts && formPermissions.includes(perm.id);
                            return (
                              <label
                                key={perm.id}
                                onClick={() => handleTogglePermission(perm.id)}
                                className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all select-none ${
                                  isLockedAccounts
                                    ? 'bg-slate-100/70 border-slate-200/70 opacity-60 cursor-not-allowed'
                                    : isChecked
                                      ? 'bg-teal-500/10 border-teal-500/40 shadow-xs cursor-pointer'
                                      : 'bg-white/30 border-white/30 hover:bg-white/50 cursor-pointer'
                                }`}
                              >
                                <div className="mt-0.5">
                                  {isChecked ? (
                                    <CheckSquare className="h-4 w-4 text-teal-600" />
                                  ) : (
                                    <Square className="h-4 w-4 text-slate-300" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-xs font-bold ${isChecked ? 'text-slate-900' : 'text-slate-600'}`}>
                                      {perm.label}
                                    </span>
                                    {perm.isSensitive && (
                                      <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                                        مالي حساس
                                      </span>
                                    )}
                                    {isLockedAccounts && (
                                      <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-bold">
                                        لمدير الشركة ومدير النظام فقط
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                                    {perm.description}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-white/20 text-slate-600 rounded-xl hover:bg-white/30 transition-all text-xs font-bold cursor-pointer"
                >
                  إلغاء وتراجع
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 px-5 rounded-xl shadow transition-all disabled:opacity-50 cursor-pointer"
                >
                  {formLoading ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  <span>حفظ الموظف وتطبيق الصلاحيات فوراً</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users Database Table */}
      <div className="glass-card rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-white/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base">سجل موظفي النظام وصلاحياتهم</h3>
            <p className="text-xs text-slate-400 mt-0.5">قائمة الموظفين المسجلين وصلاحيات الدخول المنفصلة لكل مستخدم</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">إجمالي الموظفين: {users.length}</span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="h-6 w-6 text-teal-600 animate-spin mx-auto mb-3" />
            <p className="text-xs">جاري جلب حسابات المستخدمين وصلاحياتهم...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 font-bold text-xs bg-red-50/50">
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-white/10 text-slate-700 text-xs font-bold border-b border-white/10">
                  <th className="py-4 px-6">الموظف</th>
                  <th className="py-4 px-6">اسم الدخول</th>
                  <th className="py-4 px-6">الدور المرجعي</th>
                  <th className="py-4 px-6">ملخص الصلاحيات الممنوحة</th>
                  <th className="py-4 px-6 text-center">حالة الحساب</th>
                  <th className="py-4 px-6 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => {
                  const roleObj = roles.find(r => r.id === u.roleId);
                  const effectivePerms = (u.permissions && Array.isArray(u.permissions)) 
                    ? u.permissions 
                    : getRoleDefaultPermissions(u.roleId);
                  const hasReports = effectivePerms.includes('view_reports');
                  const hasServices = effectivePerms.includes('manage_services');
                  const hasCustomers = effectivePerms.includes('manage_customers');
                  const hasAccounts = effectivePerms.includes('manage_accounts');

                  return (
                    <tr key={u.id} className="hover:bg-white/10 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-100">
                            {u.fullName[0] || 'م'}
                          </div>
                          <div>
                            <div>{u.fullName}</div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              انضم في {new Date(u.createdAt).toLocaleDateString('ar-EG')}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 font-semibold font-mono text-slate-600">{u.username}</td>
                      <td className="py-3.5 px-6">
                        <span className="inline-flex items-center gap-1 text-slate-700 font-semibold bg-white/40 px-2.5 py-1 rounded-lg border border-white/40">
                          <Shield className="h-3 w-3 text-teal-600" />
                          <span>{roleObj ? roleObj.nameAr : u.roleId}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="bg-sky-50 text-sky-700 border border-sky-100 text-[10px] font-bold px-2 py-0.5 rounded">
                              {effectivePerms.length} صلاحيات
                            </span>

                            {hasAccounts && (
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                قسم الحسابات
                              </span>
                            )}

                            {hasCustomers && (
                              <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                                تعديل العملاء
                              </span>
                            )}

                            {hasServices && (
                              <span className="bg-teal-50 text-teal-700 border border-teal-100 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                                تعديل الخدمات
                              </span>
                            )}

                            {!hasReports ? (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                محجوب عن الإيرادات
                              </span>
                            ) : (
                              <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                شامل التقارير
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setInspectUser(u)}
                            className="text-[10px] text-teal-600 hover:text-teal-800 underline font-semibold cursor-pointer block"
                          >
                            استعراض الصلاحيات التفصيلية ➔
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-red-50 text-red-700 border border-red-100'
                        }`}>
                          {u.isActive ? 'مفعل ونشط' : 'معطل'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="bg-teal-50/80 hover:bg-teal-100 text-teal-700 border border-teal-200 font-bold py-1 px-3 rounded-lg text-xs transition-all cursor-pointer"
                          >
                            تعديل الصلاحيات
                          </button>
                          
                          {u.username !== 'admin' && u.username.toLowerCase() !== currentUsername.toLowerCase() && (
                            <button
                              onClick={() => handleDelete(u)}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-200/50 font-bold py-1 px-2 rounded-lg text-xs transition-all cursor-pointer"
                              title="حذف حساب الموظف"
                            >
                              حذف
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect User Permissions Modal */}
      <AnimatePresence>
        {inspectUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-teal-600" />
                  <h3 className="font-bold text-slate-900 text-base">
                    صلاحيات الموظف: {inspectUser.fullName} ({inspectUser.username})
                  </h3>
                </div>
                <button 
                  onClick={() => setInspectUser(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Active Permissions List */}
              <div className="space-y-4 text-xs">
                {PERMISSION_CATEGORIES.map(cat => {
                  const effective = (inspectUser.permissions && Array.isArray(inspectUser.permissions))
                    ? inspectUser.permissions
                    : getRoleDefaultPermissions(inspectUser.roleId);

                  const catPerms = cat.permissions;

                  return (
                    <div key={cat.id} className="space-y-1.5">
                      <div className="font-bold text-slate-700 flex items-center gap-1.5">
                        <cat.icon className="h-3.5 w-3.5 text-teal-600" />
                        <span>{cat.title}</span>
                      </div>
                      <div className="grid grid-cols-1 gap-1 pr-3">
                        {catPerms.map(p => {
                          const hasIt = effective.includes(p.id);
                          return (
                            <div 
                              key={p.id} 
                              className={`flex items-center gap-2 p-1.5 rounded-lg ${
                                hasIt ? 'bg-teal-50 text-slate-800 font-semibold' : 'text-slate-400 opacity-60'
                              }`}
                            >
                              {hasIt ? (
                                <Check className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                              ) : (
                                <X className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                              )}
                              <span>{p.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectUser;
                    setInspectUser(null);
                    handleOpenEdit(target);
                  }}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer"
                >
                  تعديل هذه الصلاحيات بالـ Checkbox
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
