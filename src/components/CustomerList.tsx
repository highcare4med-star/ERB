import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, User, Phone, MapPin, Calendar, ClipboardList, TrendingUp, DollarSign, Tag, RefreshCw } from 'lucide-react';
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

  const fetchCustomers = async () => {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans text-slate-800" dir="rtl">
      
      {/* Right Column: Searchable Customers List */}
      <div className="lg:col-span-1 glass-card p-6 rounded-2xl flex flex-col h-[650px] shadow-sm">
        <div className="mb-4">
          <h1 className="text-lg font-bold text-slate-900">سجل العملاء والمرضى</h1>
          <p className="text-xs text-slate-400 mt-1">البحث واستعراض الملفات الطبية للعملاء</p>
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
            placeholder="ابحث بالاسم، الجوال أو العنوان..."
            className="block w-full pr-9 pl-3 py-2 glass-input rounded-xl text-sm focus:outline-none"
          />
        </div>

        {/* Customers List Container */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
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
                <h4 className="font-bold text-slate-900 text-sm">{c.name}</h4>
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1.5 font-mono">
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
            <p className="text-xs text-slate-400 mt-1 max-w-xs">اختر عميلاً من القائمة الجانبية لاستعراض ملفه المالي وحساباته وتاريخ فواتيره السابقة بالتفصيل.</p>
          </div>
        ) : detailsLoading || !selectedCustomerDetails ? (
          <div className="glass-card p-12 rounded-2xl shadow-sm h-[650px] flex flex-col items-center justify-center text-center text-slate-400">
            <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mb-3" />
            <span className="text-xs">جاري تحميل السجل الطبي والمالي للعميل...</span>
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
                  <h2 className="text-xl font-bold text-slate-900">{selectedCustomerDetails.customer.name}</h2>
                  <p className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>تاريخ التسجيل: {new Date(selectedCustomerDetails.customer.createdAt).toLocaleDateString('ar-SA')}</span>
                  </p>
                </div>
                <div className="bg-teal-50/50 text-teal-600 h-10 w-10 rounded-xl flex items-center justify-center font-bold text-lg border border-teal-100/30">
                  {selectedCustomerDetails.customer.name[0]}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 border-t border-white/20 pt-4">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold">رقم الجوال:</span>
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

            {/* Customer Financial Analytics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Stat Total spent */}
              <div className="glass-card p-5 rounded-2xl shadow-sm relative overflow-hidden">
                <p className="text-slate-500 text-xs font-semibold">إجمالي الفواتير الصادرة</p>
                <div className="flex items-baseline gap-1 mt-2">
                  <h4 className="text-2xl font-black text-slate-900 font-mono">
                    {selectedCustomerDetails.stats.totalValue.toLocaleString()}
                  </h4>
                  <span className="text-xs text-slate-500">ريال</span>
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
                  <span className="text-xs text-slate-500">ريال</span>
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
                      <th className="py-3 px-5 font-mono">القيمة الكلية</th>
                      <th className="py-3 px-5 text-center">الحالة</th>
                      <th className="py-3 px-5 text-center">عرض</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {selectedCustomerDetails.invoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                          لا توجد فواتير سابقة لهذا العميل في قاعدة البيانات
                        </td>
                      </tr>
                    ) : (
                      selectedCustomerDetails.invoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-white/15 transition-colors">
                          <td className="py-2.5 px-5 font-bold text-slate-900 font-mono">{inv.id}</td>
                          <td className="py-2.5 px-5 text-slate-500 font-mono">{inv.date}</td>
                          <td className="py-2.5 px-5 text-slate-500">{inv.createdBy}</td>
                          <td className="py-2.5 px-5 font-bold text-slate-900 font-mono">{inv.total.toLocaleString()} ريال</td>
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

    </div>
  );
}
