import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserPlus, UserX, Shield, Check, X, ShieldAlert, KeyRound, Save, RefreshCw } from 'lucide-react';
import { User, Role } from '../types';

interface UserListProps {
  token: string;
  currentUsername: string;
}

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

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

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

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormFullName('');
    setFormUsername('');
    setFormPassword('');
    setFormRoleId('billing');
    setFormIsActive(true);
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
    setFormError('');
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingId(null);
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

    setFormLoading(true);
    try {
      const url = editingId ? `/api/users/${editingId}` : '/api/users';
      const method = editingId ? 'PUT' : 'POST';

      const bodyData: any = {
        fullName: formFullName.trim(),
        roleId: formRoleId,
        isActive: formIsActive
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
          <h1 className="text-2xl font-bold text-slate-900">إدارة مستخدمي النظام</h1>
          <p className="text-slate-500 text-sm mt-1">تحديد الحسابات والتحكم في صلاحيات الموظفين والمحاسبين الماليين</p>
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

      {/* Users Creation/Edition Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 rounded-2xl shadow-sm space-y-4"
        >
          <div className="flex justify-between items-center pb-3 border-b border-white/20">
            <h3 className="font-bold text-slate-900 text-base">
              {editingId ? `تحديث حساب الموظف: ${formUsername}` : 'إصدار حساب مستخدم جديد وصلاحيات وصول'}
            </h3>
            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="bg-red-50/80 backdrop-blur-md border border-red-200/50 text-red-700 p-3.5 rounded-xl text-xs font-semibold">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Full Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">الاسم الكامل للموظف</label>
                <input
                  type="text"
                  required
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="مثال: محمد السعيد"
                  className="block w-full px-3 py-2.5 glass-input rounded-xl text-sm focus:outline-none"
                />
              </div>

              {/* Username (Locked during edits) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">اسم المستخدم (بالإنجليزي)</label>
                <input
                  type="text"
                  required
                  disabled={editingId !== null}
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="مثال: mohamed"
                  className="block w-full px-3 py-2.5 glass-input rounded-xl text-sm disabled:opacity-55 focus:outline-none"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  {editingId ? 'تعيين كلمة مرور جديدة (اختياري)' : 'كلمة المرور'}
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
                    placeholder={editingId ? 'اتركه فارغاً للاحتفاظ بالقديمة' : '••••••••'}
                    className="block w-full pr-8 pl-3 py-2.5 glass-input rounded-xl text-sm font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Role Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">الدور الوظيفي وصلاحية النظام</label>
                <select
                  value={formRoleId}
                  onChange={(e) => setFormRoleId(e.target.value)}
                  className="block w-full px-3 py-2.5 glass-input rounded-xl text-sm focus:outline-none appearance-none"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id} className="bg-slate-100 text-slate-800">{r.nameAr} ({r.name})</option>
                  ))}
                </select>
              </div>

              {/* Is Active Status checkbox */}
              <div className="flex items-center gap-2 pt-6">
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
                <span>حفظ بيانات الحساب</span>
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Roles & Permissions Explanation Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 glass-card p-5 rounded-xl shadow-sm">
        <div className="flex gap-2 text-slate-700 items-start md:col-span-1 border-b md:border-b-0 md:border-l border-white/10 pb-3 md:pb-0 md:pl-4">
          <Shield className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-xs text-slate-900">شرح نظام الصلاحيات</h4>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
              كل موظف يتم تحديد دوره المالي أو التحريري بدقة وفق مهامه في شركة هاي كير للخدمات الطبية.
            </p>
          </div>
        </div>
        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[10px] leading-relaxed text-slate-500 font-semibold">
          <div>
            <span className="font-bold text-slate-800 block">• مدير النظام الرئيسي (Admin):</span>
            صلاحيات مطلقة لإدارة الخدمات والمستخدمين وإصدار الفواتير وعرض التقارير وسجل الأمان.
          </div>
          <div>
            <span className="font-bold text-slate-800 block">• المحاسب المالي (Financial):</span>
            استعراض الفواتير وإدارتها، وإدارة الخدمات والعملاء، وعرض التحليلات المبيعية التفصيلية.
          </div>
          <div>
            <span className="font-bold text-slate-800 block">• موظف الفواتير (Billing):</span>
            إصدار فواتير زيارات الرعاية المنزلية، وإضافة وتعديل الخدمات والعملاء دون الصلاحيات المالية.
          </div>
        </div>
      </div>

      {/* Users Database Table */}
      <div className="glass-card rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <span className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin inline-block mb-3"></span>
            <p className="text-xs">جاري جلب حسابات المستخدمين...</p>
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
                  <th className="py-4 px-6">الموظف بالكامل</th>
                  <th className="py-4 px-6">اسم المستخدم</th>
                  <th className="py-4 px-6">تاريخ الإنشاء</th>
                  <th className="py-4 px-6">الدور الوظيفي وصلاحيته</th>
                  <th className="py-4 px-6 text-center">حالة الحساب</th>
                  <th className="py-4 px-6 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => {
                  const roleObj = roles.find(r => r.id === u.roleId);
                  return (
                    <tr key={u.id} className="hover:bg-white/10 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-slate-900">{u.fullName}</td>
                      <td className="py-3.5 px-6 font-semibold font-mono text-slate-500">{u.username}</td>
                      <td className="py-3.5 px-6 text-slate-500 font-mono">
                        {new Date(u.createdAt).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="inline-flex items-center gap-1 text-slate-700 font-semibold">
                          <Shield className="h-3.5 w-3.5 text-teal-600" />
                          <span>{roleObj ? roleObj.nameAr : u.roleId}</span>
                        </span>
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
                            className="bg-white/30 hover:bg-white/50 border border-white/40 text-slate-700 hover:text-slate-900 font-bold py-1 px-2.5 rounded-lg text-xs transition-all cursor-pointer"
                          >
                            تحديث
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

    </div>
  );
}
