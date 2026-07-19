import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Plus, Edit2, Trash2, Check, X, ShieldAlert, HeartHandshake, Save } from 'lucide-react';
import { Service } from '../types';

interface ServiceListProps {
  token: string;
  userPermissions: string[];
}

export default function ServiceList({ token, userPermissions }: ServiceListProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State for Adding / Editing Service
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const canManage = userPermissions.includes('manage_services');

  const fetchServices = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/services', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('فشل جلب قائمة الخدمات من الخادم');
      }
      const data = await response.json();
      setServices(data);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [token]);

  const handleOpenAddForm = () => {
    setEditingId(null);
    setFormName('');
    setFormPrice('');
    setFormDescription('');
    setFormIsActive(true);
    setFormError('');
    setShowForm(true);
  };

  const handleOpenEditForm = (srv: Service) => {
    setEditingId(srv.id);
    setFormName(srv.name);
    setFormPrice(String(srv.defaultPrice));
    setFormDescription(srv.description);
    setFormIsActive(srv.isActive);
    setFormError('');
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim() || !formPrice) {
      setFormError('يرجى ملء اسم الخدمة وسعرها الافتراضي');
      return;
    }

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError('السعر الافتراضي يجب أن يكون قيمة رقمية موجبة');
      return;
    }

    setFormLoading(true);
    try {
      const url = editingId ? `/api/services/${editingId}` : '/api/services';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formName.trim(),
          defaultPrice: priceNum,
          description: formDescription.trim(),
          isActive: formIsActive
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'فشل حفظ الخدمة الطبية');
      }

      // Success
      setShowForm(false);
      fetchServices();
    } catch (err: any) {
      setFormError(err.message || 'حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteService = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الخدمة الطبية "${name}" نهائياً من قاعدة البيانات؟`)) {
      return;
    }

    try {
      const response = await fetch(`/api/services/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'فشل حذف الخدمة');
      }

      fetchServices();
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء حذف الخدمة');
    }
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans text-slate-800" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">إدارة الخدمات الطبية</h1>
          <p className="text-slate-500 text-sm mt-1">تحديد، تسعير، تفعيل وتعطيل الخدمات الطبية المنزلية الافتراضية</p>
        </div>

        {canManage && !showForm && (
          <button
            onClick={handleOpenAddForm}
            className="self-start sm:self-auto flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm py-2.5 px-4 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" />
            إضافة خدمة طبية جديدة
          </button>
        )}
      </div>

      {/* Services Form (Add/Edit) */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 rounded-2xl shadow-sm space-y-4"
        >
          <div className="flex justify-between items-center pb-3 border-b border-white/20">
            <h3 className="font-bold text-slate-900 text-base">
              {editingId ? 'تعديل الخدمة الطبية الحالية' : 'إضافة خدمة طبية منزلية جديدة لـ هاي كير'}
            </h3>
            <button onClick={handleCloseForm} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="bg-red-50/80 backdrop-blur-md border border-red-200/50 text-red-700 p-3.5 rounded-xl text-xs font-semibold">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Service Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">اسم الخدمة الطبية بالكامل</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: رعاية تمريضية منزلية - نوبة 12 ساعة"
                  className="block w-full px-3 py-2 glass-input rounded-xl text-sm focus:outline-none"
                />
              </div>

              {/* Default Price */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">السعر الافتراضي (ريال)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="مثال: 500"
                  className="block w-full px-3 py-2 glass-input rounded-xl text-sm text-right font-mono focus:outline-none"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">وصف تفصيلي للخدمة ونطاق عملها</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="توضيح تفاصيل الخدمة التي سيتم طباعتها للعميل لزيادة الشفافية..."
                rows={3}
                className="block w-full px-3 py-2 glass-input rounded-xl text-sm focus:outline-none"
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="formIsActive"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="h-4.5 w-4.5 text-teal-600 border-white/30 rounded focus:ring-teal-500 bg-white/20"
              />
              <label htmlFor="formIsActive" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                الخدمة نشطة ومتاحة للاختيار عند إصدار الفواتير
              </label>
            </div>

            {/* Submit Action Buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={handleCloseForm}
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
                <span>حفظ بيانات الخدمة</span>
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Services Directory Filters */}
      <div className="glass-card p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center gap-4 justify-between">
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث باسم الخدمة أو الشرح الوصفي..."
            className="block w-full pr-9 pl-3 py-2 glass-input rounded-xl text-sm focus:outline-none"
          />
        </div>
        <p className="text-xs text-slate-500 font-semibold">عدد الخدمات المطابقة: {filteredServices.length} خدمات</p>
      </div>

      {/* services table */}
      <div className="glass-card rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <span className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin inline-block mb-3"></span>
            <p className="text-xs">جاري جلب الخدمات المحدثة...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 font-bold text-xs bg-red-50/50">
            {error}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            لم يتم العثور على أي خدمات طبية مسجلة
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredServices.map(srv => (
              <div 
                key={srv.id} 
                className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                  srv.isActive 
                    ? 'bg-white/20 border-white/30 shadow-sm hover:shadow-md' 
                    : 'bg-white/5 border-white/10 opacity-60'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      srv.isActive 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {srv.isActive ? 'نشطة ومتاحة' : 'غير نشطة حالياً'}
                    </span>
                    <HeartHandshake className="h-5 w-5 text-teal-500 shrink-0" />
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mb-1">{srv.name}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-3">
                    {srv.description || 'لا يوجد وصف تفصيلي مسجل لهذه الخدمة الطبية حالياً.'}
                  </p>
                </div>

                <div className="border-t border-white/20 pt-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">السعر الافتراضي للزيارة</span>
                    <span className="text-base font-black text-slate-950 font-mono">{srv.defaultPrice.toLocaleString()} ريال</span>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditForm(srv)}
                        className="p-1.5 bg-white/30 hover:bg-white/50 border border-white/40 text-slate-700 hover:text-slate-900 rounded-lg transition-all cursor-pointer"
                        title="تعديل السعر أو البيانات"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteService(srv.id, srv.name)}
                        className="p-1.5 bg-red-50/50 hover:bg-red-100/50 border border-red-200/50 text-red-600 hover:text-red-800 rounded-lg transition-all cursor-pointer"
                        title="حذف الخدمة نهائياً"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Warning layout in case they can't manage */}
      {!canManage && (
        <div className="glass-card rounded-2xl p-4 flex items-start gap-2.5 shadow-sm">
          <ShieldAlert className="h-4.5 w-4.5 text-slate-500 mt-0.5" />
          <p className="text-[10px] text-slate-500 leading-relaxed">
            <span className="font-bold text-slate-700">ملاحظة صلاحيات الحساب:</span> حسابك الحالي يتيح لك "استعراض" الخدمات والأسعار فقط. الصلاحيات المتقدمة مثل الإضافة والتعديل والحذف محصورة بمسؤولي النظام أو الإداريين الماليين لحماية البيانات التشغيلية.
          </p>
        </div>
      )}
    </div>
  );
}
