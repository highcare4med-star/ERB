import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, User, Phone, MapPin, Calendar, ClipboardList, 
  DollarSign, Tag, RefreshCw, Plus, Edit2, X, Check, Save 
} from 'lucide-react';
import { Customer, Invoice } from '../types';

interface CustomerListProps {
  token: string;
  onSelectInvoice: (invoice: Invoice) => void;
  userPermissions: string[];
}

export default function CustomerList({ token, onSelectInvoice, userPermissions }: CustomerListProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Customer Details Sub-view
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState<{
    customer: Customer;
    invoices: Invoice[];
    stats: {
      invoicesCount: number;
      activeInvoicesCount: number;
      cancelledInvoicesCount: number;
      totalValue: number;
      totalDiscounts: number;
    }
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Customer Add / Edit Modal state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const canManageCustomers = userPermissions.includes('manage_customers');
  const canViewReports = userPermissions.includes('view_reports');

  const fetchCustomers = async (maintainSelectionId?: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/customers?search=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('فشل تحميل قائمة العملاء');
      }
      const data = await response.json();
      setCustomers(data);
      if (maintainSelectionId) {
        handleSelectCustomer(maintainSelectionId);
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل العملاء');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery, token]);

  const handleSelectCustomer = async (id: string) => {
    setSelectedCustomerId(id);
    setDetailsLoading(true);
    try {
      const response = await fetch(`/api/customers/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('فشل تحميل تفاصيل ملف العميل');
      }
      const data = await response.json();
      setSelectedCustomerDetails(data);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء تحميل تفاصيل العميل');
      setSelectedCustomerId(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormAddress('');
    setFormNotes('');
    setModalError('');
    setShowCustomerModal(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormName(c.name);
    setFormPhone(c.phone);
    setFormAddress(c.address || '');
    setFormNotes(c.notes || '');
    setModalError('');
    setShowCustomerModal(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!formName.trim() || !formPhone.trim()) {
      setModalError('يرجى إدخال اسم العميل ورقم الهاتف');
      return;
    }

    setModalLoading(true);
    try {
      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers';
      const method = editingCustomer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formName.trim(),
          phone: formPhone.trim(),
          address: formAddress.trim(),
          notes: formNotes.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'فشل حفظ بيانات العميل');
      }

      setShowCustomerModal(false);
      await fetchCustomers(editingCustomer ? editingCustomer.id : data.id);
    } catch (err: any) {
      setModalError(err.message || 'حدث خطأ أثناء حفظ بيانات العميل');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans text-slate-800" dir="rtl">
      
      {/* Right Column: Searchable Customers List */}
      <div className="lg:col-span-1 glass-card p-6 rounded-2xl flex flex-col h-[650px] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">سجل العملاء والمرضى</h1>
            <p className="text-xs text-slate-400 mt-0.5">البحث واستعراض وتعديل ملفات العملاء</p>
          </div>
          {canManageCustomers && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 px-3 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>إضافة عميل</span>
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم، الهاتف أو العنوان..."
            className="block w-full pr-9 pl-3 py-2 glass-input rounded-xl text-sm focus:outline-none"
          />
        </div>

        {/* Customers List Container */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-teal-600" />
              <span className="text-xs">جاري التحديث...</span>
            </div>
          ) : customers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              لا يوجد عملاء مسجلين حالياً
            </div>
          ) : (
            customers.map(c => (
              <div
                key={c.id}
                onClick={() => handleSelectCustomer(c.id)}
                className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
                  selectedCustomerId === c.id
                    ? 'bg-teal-500/20 border-teal-500/40 shadow-sm'
                    : 'bg-white/20 hover:bg-white/45 border-white/25'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">{c.name}</h4>
                  {canManageCustomers && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(c);
                      }}
                      className="text-slate-400 hover:text-teal-600 p-1 rounded-md transition-colors"
                      title="تعديل بيانات العميل"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1 font-mono">
                  <Phone className="h-3 w-3" />
                  <span>{c.phone}</span>
                </div>
                {c.address && (
                  <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{c.address}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Left Column: Customer Deep Profile and Past Invoices Details */}
      <div className="lg:col-span-2 space-y-6">
        {selectedCustomerId === null ? (
          <div className="glass-card p-12 rounded-2xl shadow-sm h-[650px] flex flex-col items-center justify-center text-center text-slate-400">
            <User className="h-16 w-16 text-slate-300 stroke-1 mb-3" />
            <h3 className="font-bold text-slate-700">لم يتم اختيار عميل</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">اختر عميلاً من القائمة الجانبية لاستعراض ملفه وتاريخ فواتيره السابقة بالتفصيل.</p>
          </div>
        ) : detailsLoading || !selectedCustomerDetails ? (
          <div className="glass-card p-12 rounded-2xl shadow-sm h-[650px] flex flex-col items-center justify-center text-center text-slate-400">
            <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mb-3" />
            <span className="text-xs">جاري تحميل السجل الطبي للعميل...</span>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Customer Header Info Card */}
            <div className="glass-card p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-900">{selectedCustomerDetails.customer.name}</h2>
                    {canManageCustomers && (
                      <button
                        onClick={() => handleOpenEdit(selectedCustomerDetails.customer)}
                        className="flex items-center gap-1 bg-white/40 hover:bg-white text-teal-700 border border-teal-200/50 text-xs font-bold py-1 px-2.5 rounded-lg transition-all cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>تعديل بيانات العميل</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>تاريخ التسجيل: {new Date(selectedCustomerDetails.customer.createdAt).toLocaleDateString('ar-EG')}</span>
                  </p>
                </div>
                <div className="bg-teal-50/50 text-teal-600 h-10 w-10 rounded-xl flex items-center justify-center font-bold text-lg border border-teal-100/30">
                  {selectedCustomerDetails.customer.name[0]}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 border-t border-white/20 pt-4">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold">رقم الهاتف:</span>
                  <span className="font-mono">{selectedCustomerDetails.customer.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold">العنوان السكني للزيارات:</span>
                  <span>{selectedCustomerDetails.customer.address || 'غير محدد'}</span>
                </div>
                {selectedCustomerDetails.customer.notes && (
                  <div className="md:col-span-2 bg-white/30 rounded-xl p-3 border border-white/40 text-slate-500 leading-normal">
                    <span className="font-bold text-slate-700 block mb-1">ملاحظات ملف العميل:</span>
                    {selectedCustomerDetails.customer.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Customer Analytics - Hidden sensitive financials if !canViewReports */}
            {canViewReports ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Stat Total spent */}
                <div className="glass-card p-5 rounded-2xl shadow-sm relative overflow-hidden">
                  <p className="text-slate-500 text-xs font-semibold">إجمالي الفواتير الصادرة</p>
                  <div className="flex items-baseline gap-1 mt-2">
                    <h4 className="text-2xl font-black text-slate-900 font-mono">
                      {selectedCustomerDetails.stats.totalValue.toLocaleString()}
                    </h4>
                    <span className="text-xs text-slate-500">جنية مصري</span>
                  </div>
                  <div className="absolute bottom-2 left-2 text-teal-600/10">
                    <DollarSign className="h-10 w-10 stroke-2" />
                  </div>
                </div>

                {/* Stat Discounts */}
                <div className="glass-card p-5 rounded-2xl shadow-sm relative overflow-hidden">
                  <p className="text-slate-500 text-xs font-semibold">إجمالي الخصومات الممنوحة</p>
                  <div className="flex items-baseline gap-1 mt-2">
                    <h4 className="text-2xl font-black text-emerald-600 font-mono">
                      {selectedCustomerDetails.stats.totalDiscounts.toLocaleString()}
                    </h4>
                    <span className="text-xs text-slate-500">جنية مصري</span>
                  </div>
                  <div className="absolute bottom-2 left-2 text-emerald-600/10">
                    <Tag className="h-10 w-10 stroke-2" />
                  </div>
                </div>

                {/* Stat Count */}
                <div className="glass-card p-5 rounded-2xl shadow-sm relative overflow-hidden">
                  <p className="text-slate-500 text-xs font-semibold">عدد زيارات الرعاية المنزلية</p>
                  <div className="flex items-baseline gap-1 mt-2">
                    <h4 className="text-2xl font-black text-indigo-600 font-mono">
                      {selectedCustomerDetails.stats.activeInvoicesCount}
                    </h4>
                    <span className="text-xs text-slate-500">زيارات</span>
                  </div>
                  <div className="absolute bottom-2 left-2 text-indigo-600/10">
                    <ClipboardList className="h-10 w-10 stroke-2" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Clean Visits Counter for Billing Officers */}
                <div className="glass-card p-5 rounded-2xl shadow-sm relative overflow-hidden">
                  <p className="text-slate-500 text-xs font-semibold">عدد زيارات الرعاية المعتمدة</p>
                  <div className="flex items-baseline gap-1 mt-2">
                    <h4 className="text-2xl font-black text-teal-600 font-mono">
                      {selectedCustomerDetails.stats.activeInvoicesCount}
                    </h4>
                    <span className="text-xs text-slate-500">زيارة طبية</span>
                  </div>
                  <div className="absolute bottom-2 left-2 text-teal-600/10">
                    <ClipboardList className="h-10 w-10 stroke-2" />
                  </div>
                </div>

                <div className="glass-card p-5 rounded-2xl shadow-sm flex flex-col justify-center">
                  <p className="text-slate-500 text-xs font-semibold">حالة الملف الطبي للعميل</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-sm font-bold text-slate-800">نشط ومعتمد للزيارات المنزلية</span>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Past Invoices Table */}
            <div className="glass-card rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-white/20">
                <h3 className="font-bold text-slate-900 text-sm">سجل الفواتير التاريخية للعميل</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">تفاصيل جميع الفواتير الطبية المصدرة مسبقاً لهذا الملف</p>
              </div>

              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-right border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-white/20 text-slate-600 text-xs font-bold border-b border-white/20 sticky top-0">
                      <th className="py-3 px-5">رقم الفاتورة</th>
                      <th className="py-3 px-5">تاريخ الإصدار</th>
                      <th className="py-3 px-5">الموظف المصدر</th>
                      {canViewReports && <th className="py-3 px-5 font-mono">القيمة الكلية</th>}
                      <th className="py-3 px-5 text-center">الحالة</th>
                      <th className="py-3 px-5 text-center">عرض</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {selectedCustomerDetails.invoices.length === 0 ? (
                      <tr>
                        <td colSpan={canViewReports ? 6 : 5} className="py-8 text-center text-slate-400 font-medium">
                          لا توجد فواتير سابقة لهذا العميل في قاعدة البيانات
                        </td>
                      </tr>
                    ) : (
                      selectedCustomerDetails.invoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-white/15 transition-colors">
                          <td className="py-2.5 px-5 font-bold text-slate-900 font-mono">{inv.id}</td>
                          <td className="py-2.5 px-5 text-slate-500 font-mono">{inv.date}</td>
                          <td className="py-2.5 px-5 text-slate-500">{inv.createdBy}</td>
                          {canViewReports && (
                            <td className="py-2.5 px-5 font-bold text-slate-900 font-mono">{inv.total.toLocaleString()} جنية مصري</td>
                          )}
                          <td className="py-2.5 px-5 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.status === 'new'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-red-50 text-red-700'
                            }`}>
                              {inv.status === 'new' ? 'جديدة' : 'ملغاة'}
                            </span>
                          </td>
                          <td className="py-2.5 px-5 text-center">
                            <button
                              onClick={() => onSelectInvoice(inv)}
                              className="text-teal-600 hover:text-teal-800 font-bold text-xs underline cursor-pointer"
                            >
                              تفاصيل
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Add / Edit Customer Modal */}
      <AnimatePresence>
        {showCustomerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base">
                  {editingCustomer ? 'تعديل بيانات العميل' : 'إضافة ملف عميل جديد'}
                </h3>
                <button 
                  onClick={() => setShowCustomerModal(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {modalError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-semibold">
                  {modalError}
                </div>
              )}

              <form onSubmit={handleSaveCustomer} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">اسم العميل بالكامل *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="مثال: يوسف محمود"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">رقم الهاتف *</label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="مثال: 01012345678"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">العنوان للزيارات المنزلية</label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="مثال: المعادي، القاهرة"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ملاحظات الملف الطبي</label>
                  <textarea
                    rows={3}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="ملاحظات صحية أو تفاصيل موقع..."
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCustomerModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 px-5 rounded-xl shadow transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {modalLoading ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    <span>حفظ بيانات العميل</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
