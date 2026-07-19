import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, Calendar, User, Phone, CheckCircle, AlertTriangle, FileSpreadsheet, Printer, Edit2, Trash2, XCircle, RefreshCw } from 'lucide-react';
import { Invoice } from '../types';

interface InvoiceListProps {
  token: string;
  onSelectInvoice: (invoice: Invoice) => void;
  onEditInvoice: (invoice: Invoice) => void;
  userPermissions: string[];
  currentUsername: string;
}

export default function InvoiceList({ token, onSelectInvoice, onEditInvoice, userPermissions, currentUsername }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters state
  const [searchId, setSearchId] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [searchStatus, setSearchStatus] = useState('all');
  const [searchCreator, setSearchCreator] = useState('');
  
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [lockError, setLockError] = useState('');

  const fetchInvoices = async () => {
    setLoading(true);
    setError('');
    setLockError('');
    try {
      // Build query string based on filters
      const params = new URLSearchParams();
      if (searchId) params.append('id', searchId);
      if (searchCustomer) params.append('customerName', searchCustomer);
      if (searchPhone) params.append('phone', searchPhone);
      if (searchDate) params.append('date', searchDate);
      if (searchStatus && searchStatus !== 'all') params.append('status', searchStatus);
      if (searchCreator) params.append('creator', searchCreator);

      const response = await fetch(`/api/invoices?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('فشل تحميل الفواتير من الخادم');
      }

      const data = await response.json();
      setInvoices(data);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل الفواتير');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [searchId, searchCustomer, searchPhone, searchDate, searchStatus, searchCreator, token]);

  const handleClearFilters = () => {
    setSearchId('');
    setSearchCustomer('');
    setSearchPhone('');
    setSearchDate('');
    setSearchStatus('all');
    setSearchCreator('');
  };

  // Row Locking logic check before proceeding to edit
  const handleAcquireLockAndEdit = async (invoice: Invoice) => {
    setLockError('');
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'تعذر الحصول على قفل التعديل');
      }
      // Lock acquired successfully, navigate to editing form
      onEditInvoice(invoice);
    } catch (err: any) {
      setLockError(err.message || 'الفاتورة مقفلة حالياً من قبل مستخدم آخر');
      // Scroll to lock error
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    if (!window.confirm(`هل أنت متأكد من إلغاء الفاتورة رقم ${invoiceId}؟ لا يمكن التراجع عن هذا الإجراء.`)) {
      return;
    }

    setCancellingId(invoiceId);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'فشل إلغاء الفاتورة');
      }

      // Refresh list
      fetchInvoices();
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء إلغاء الفاتورة');
    } finally {
      setCancellingId(null);
    }
  };

  const handleExportCSV = () => {
    try {
      // Build simple comma-separated values (CSV) with Arabic BOM support
      const headers = ['رقم الفاتورة', 'التاريخ', 'اسم العميل', 'رقم الهاتف', 'العنوان', 'القيمة الكلية', 'الخصم', 'الموظف', 'الحالة'];
      const rows = invoices.map(i => [
        i.id,
        i.date,
        `"${i.customerName.replace(/"/g, '""')}"`,
        i.customerPhone,
        `"${i.customerAddress.replace(/"/g, '""')}"`,
        i.total,
        i.discountAmount,
        i.createdBy,
        i.status === 'new' ? 'جديدة' : 'ملغاة'
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `futoora_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert('فشل تصدير البيانات إلى Excel/CSV');
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">سجل الفواتير والمبيعات</h1>
          <p className="text-slate-500 text-sm mt-1">عرض، بحث، طباعة وإلغاء الفواتير الطبية المصدرة</p>
        </div>
        
        {userPermissions.includes('view_reports') && (
          <button
            onClick={handleExportCSV}
            className="self-start sm:self-auto flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-2.5 px-4 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <FileSpreadsheet className="h-4.5 w-4.5" />
            تصدير البيانات لـ Excel
          </button>
        )}
      </div>

      {/* Warning regarding Lock failures */}
      {lockError && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50/80 backdrop-blur-md border border-amber-200/50 text-amber-800 p-4 rounded-xl flex items-start gap-3"
        >
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">تعذر تعديل الفاتورة!</p>
            <p className="text-xs mt-0.5">{lockError}</p>
          </div>
          <button onClick={() => setLockError('')} className="mr-auto text-amber-500 hover:text-amber-800 text-xs font-bold font-mono">X</button>
        </motion.div>
      )}

      {/* Filters Card */}
      <div className="glass-card p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <Filter className="h-5 w-5 text-teal-600" />
          <span>محرك البحث المتقدم والفلاتر</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Filter ID */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">رقم الفاتورة</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-xs font-mono">HC-</span>
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="202607-0001"
                className="block w-full pr-10 pl-3 py-2 glass-input rounded-xl text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Filter Customer */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">اسم العميل</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><Search className="h-3.5 w-3.5 text-slate-400" /></span>
              <input
                type="text"
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
                placeholder="ابحث باسم العميل"
                className="block w-full pr-8 pl-3 py-2 glass-input rounded-xl text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Filter Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">رقم هاتف العميل</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><Phone className="h-3.5 w-3.5 text-slate-400" /></span>
              <input
                type="text"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                placeholder="05xxxxxxx"
                className="block w-full pr-8 pl-3 py-2 glass-input rounded-xl text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Filter Date */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">تاريخ الإصدار</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><Calendar className="h-3.5 w-3.5 text-slate-400" /></span>
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="block w-full pr-8 pl-3 py-2 glass-input rounded-xl text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Filter Creator */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">اسم الموظف</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><User className="h-3.5 w-3.5 text-slate-400" /></span>
              <input
                type="text"
                value={searchCreator}
                onChange={(e) => setSearchCreator(e.target.value)}
                placeholder="اسم المستخدم"
                className="block w-full pr-8 pl-3 py-2 glass-input rounded-xl text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Filter Status */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">حالة الفاتورة</label>
            <select
              value={searchStatus}
              onChange={(e) => setSearchStatus(e.target.value)}
              className="block w-full px-3 py-2 glass-input rounded-xl text-sm focus:outline-none"
            >
              <option value="all">الكل</option>
              <option value="new">جديدة (فعالة)</option>
              <option value="cancelled">ملغاة</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            onClick={handleClearFilters}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-all cursor-pointer"
          >
            إعادة تعيين فلاتر البحث
          </button>
        </div>
      </div>

      {/* Invoices List Display */}
      <div className="glass-card rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mb-3" />
            <span className="text-slate-500 font-medium text-sm">جاري جلب الفواتير المحدثة...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-white/20 text-slate-600 text-xs font-bold border-b border-white/20">
                  <th className="py-4 px-6">رقم الفاتورة</th>
                  <th className="py-4 px-6">التاريخ</th>
                  <th className="py-4 px-6">اسم العميل</th>
                  <th className="py-4 px-6">رقم الجوال</th>
                  <th className="py-4 px-6">الموظف المصدر</th>
                  <th className="py-4 px-6 font-mono">الإجمالي النهائي</th>
                  <th className="py-4 px-6 text-center">الحالة</th>
                  <th className="py-4 px-6 text-center">الإجراءات والتحكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-sm">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-medium text-sm">
                      لم يتم العثور على أي فواتير تطابق معايير البحث الحالية
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-white/15 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-slate-900 font-mono">{inv.id}</td>
                      <td className="py-3.5 px-6 text-slate-600 font-mono">{inv.date}</td>
                      <td className="py-3.5 px-6 font-semibold text-slate-800">{inv.customerName}</td>
                      <td className="py-3.5 px-6 text-slate-500 font-mono">{inv.customerPhone}</td>
                      <td className="py-3.5 px-6 text-slate-500">{inv.createdBy}</td>
                      <td className="py-3.5 px-6 font-extrabold text-slate-900 font-mono">
                        {inv.total.toLocaleString()} ريال
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          inv.status === 'new' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-red-50 text-red-700 border border-red-100'
                        }`}>
                          {inv.status === 'new' ? 'جديدة' : 'ملغاة'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <div className="flex items-center justify-center gap-3">
                          {/* Print details button */}
                          <button 
                            onClick={() => onSelectInvoice(inv)}
                            className="flex items-center gap-1 bg-teal-50/50 backdrop-blur-sm border border-teal-100/30 hover:bg-teal-100/50 text-teal-700 font-bold text-xs py-1.5 px-2.5 rounded-lg transition-all cursor-pointer"
                            title="تفاصيل وطباعة الفاتورة"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>استعراض</span>
                          </button>

                          {/* Edit button (checks locks first, only for active invoices and users with edit_invoice permission) */}
                          {inv.status === 'new' && userPermissions.includes('edit_invoice') && (
                            <button
                              onClick={() => handleAcquireLockAndEdit(inv)}
                              className="flex items-center gap-1 bg-amber-50/50 backdrop-blur-sm border border-amber-100/30 hover:bg-amber-100/50 text-amber-700 font-bold text-xs py-1.5 px-2.5 rounded-lg transition-all cursor-pointer"
                              title="تعديل بيانات الفاتورة (قفل متزامن)"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              <span>تعديل</span>
                            </button>
                          )}

                          {/* Cancel button (soft cancel, only for new invoices and users with cancel_invoice permission) */}
                          {inv.status === 'new' && userPermissions.includes('cancel_invoice') && (
                            <button
                              onClick={() => handleCancelInvoice(inv.id)}
                              disabled={cancellingId === inv.id}
                              className="flex items-center gap-1 bg-red-50/50 backdrop-blur-sm border border-red-100/30 hover:bg-red-100/50 text-red-700 font-bold text-xs py-1.5 px-2.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                              title="إلغاء الفاتورة نهائياً"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span>إلغاء</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
