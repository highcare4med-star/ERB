import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, FileText, CalendarCheck, DollarSign, ArrowUpRight, TrendingUp, HeartHandshake, Eye, EyeOff, ClipboardList, RefreshCw } from 'lucide-react';
import { Invoice, Service } from '../types';

interface DashboardData {
  customersCount: number;
  todayInvoicesCount: number;
  thisMonthInvoicesCount: number;
  totalRevenue: number | null;
  topServices: Array<{ name: string; count: number; total: number }>;
  latestInvoices: Invoice[];
}

interface DashboardProps {
  token: string;
  onNavigateToTab: (tab: string) => void;
  onSelectInvoice: (invoice: Invoice) => void;
  userPermissions: string[];
}

export default function Dashboard({ token, onNavigateToTab, onSelectInvoice, userPermissions }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRevenue, setShowRevenue] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('فشل تحميل بيانات لوحة التحكم');
      }
      const resData = await response.json();
      setData(resData);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">جاري تحميل بيانات لوحة التحكم...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center max-w-lg mx-auto my-8">
        <p className="text-red-700 font-semibold mb-3">{error}</p>
        <button 
          onClick={fetchDashboardData}
          className="bg-red-600 hover:bg-red-700 text-white font-medium text-sm py-2 px-4 rounded-xl transition-all cursor-pointer"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (!data) return null;

  // Render responsive SVG Chart representing latest invoice amounts
  const activeInvoicesForChart = data.latestInvoices
    .filter(i => i.status !== 'cancelled')
    .slice(0, 7)
    .reverse();

  const maxTotal = activeInvoicesForChart.length > 0 
    ? Math.max(...activeInvoicesForChart.map(i => i.total), 100) 
    : 100;

  return (
    <div className="space-y-8 font-sans" dir="rtl">
      {/* Upper Welcoming Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 glass-card p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">نظرة عامة على الأنظمة</h1>
          <p className="text-slate-500 text-sm mt-1">
            مرحباً بك في نظام فوترة شركة هاي كير للخدمات الطبية المنزلية. هنا ملخص للعمليات الحالية.
          </p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="self-start md:self-auto flex items-center gap-2 bg-white/30 hover:bg-white/50 border border-white/40 text-slate-700 py-2 px-4 rounded-xl text-sm font-medium transition-all cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
          تحديث البيانات
        </button>
      </div>

      {/* Main Statistics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Customers */}
        <div 
          onClick={() => onNavigateToTab('customers')}
          className="glass-card glass-card-hover p-6 rounded-2xl shadow-sm cursor-pointer relative overflow-hidden group"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">إجمالي العملاء</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{data.customersCount}</h3>
            </div>
            <div className="bg-teal-50/50 text-teal-600 p-3 rounded-xl group-hover:bg-teal-600 group-hover:text-white transition-all">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-teal-600">
            <span>عرض وإدارة العملاء</span>
            <ArrowUpRight className="h-3 w-3" />
          </div>
        </div>

        {/* Card 2: Today's Invoices */}
        <div 
          onClick={() => onNavigateToTab('invoices')}
          className="glass-card glass-card-hover p-6 rounded-2xl shadow-sm cursor-pointer relative overflow-hidden group"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">فواتير اليوم</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{data.todayInvoicesCount}</h3>
            </div>
            <div className="bg-emerald-50/50 text-emerald-600 p-3 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <CalendarCheck className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-600">
            <span>متابعة فواتير اليوم</span>
            <ArrowUpRight className="h-3 w-3" />
          </div>
        </div>

        {/* Card 3: This Month's Invoices */}
        <div 
          onClick={() => onNavigateToTab('invoices')}
          className="glass-card glass-card-hover p-6 rounded-2xl shadow-sm cursor-pointer relative overflow-hidden group"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">فواتير هذا الشهر</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{data.thisMonthInvoicesCount}</h3>
            </div>
            <div className="bg-indigo-50/50 text-indigo-600 p-3 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <FileText className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-600">
            <span>عرض تقرير الشهر</span>
            <ArrowUpRight className="h-3 w-3" />
          </div>
        </div>

        {/* Card 4: Total Revenue (Sensitive Data) */}
        <div className="glass-card p-6 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">إجمالي الإيرادات</p>
              {data.totalRevenue === null ? (
                <div className="mt-3 text-slate-400 text-xs font-semibold flex items-center gap-1">
                  <span>غير مصرح للاستعراض</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-2">
                  <h3 className="text-2xl font-extrabold text-slate-950 font-mono">
                    {showRevenue ? `${data.totalRevenue.toLocaleString('ar-SA')} ريال` : '•••••••'}
                  </h3>
                  <button 
                    onClick={() => setShowRevenue(!showRevenue)}
                    className="p-1 text-slate-400 hover:text-slate-600 transition-all rounded-lg hover:bg-slate-50/50 cursor-pointer"
                    title={showRevenue ? "إخفاء" : "إظهار"}
                  >
                    {showRevenue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </div>
            <div className="bg-amber-50/50 text-amber-600 p-3 rounded-xl">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-400 flex items-center gap-1">
            <span>بناءً على الفواتير الفعالة والمصدرة</span>
          </div>
        </div>
      </div>

      {/* Charts & Top Services Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Revenue Graphic */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">مؤشر الإيرادات للفواتير الأخيرة</h2>
              <p className="text-xs text-slate-400 mt-1">مقارنة قيم آخر 7 فواتير مصدرة فعالة</p>
            </div>
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </div>

          {activeInvoicesForChart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[220px] text-slate-400">
              <ClipboardList className="h-10 w-10 stroke-1 mb-2" />
              <p className="text-xs">لا توجد فواتير كافية لعرض الرسم البياني</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between min-h-[220px]">
              {/* Custom SVG Bar Chart */}
              <div className="relative flex-1 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-white/20">
                {activeInvoicesForChart.map((inv, idx) => {
                  const heightPercent = (inv.total / maxTotal) * 100;
                  return (
                    <div key={inv.id} className="flex-1 flex flex-col items-center group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 font-mono">
                        {inv.total} ريال
                      </div>
                      
                      {/* Visual Bar */}
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(heightPercent, 5)}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.05 }}
                        className="w-full sm:w-10 bg-teal-600 group-hover:bg-teal-500 rounded-t-lg transition-all shadow-sm shadow-teal-50"
                      />
                      
                      {/* Label */}
                      <span className="text-[10px] font-semibold font-mono text-slate-500 mt-2 truncate w-full text-center" title={inv.id}>
                        {inv.id.split('-')[2] || inv.id}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 px-1">
                <span>الفواتير الأولى ➔</span>
                <span>الفواتير الأخيرة ➔</span>
              </div>
            </div>
          )}
        </div>

        {/* Top Services Progress bars */}
        <div className="glass-card p-6 rounded-2xl shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 font-sans">الخدمات الأكثر طلباً</h2>
            <HeartHandshake className="h-5 w-5 text-teal-500" />
          </div>
          
          {userPermissions.includes('view_reports') ? (
            data.topServices.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-8">
                <p className="text-xs">لا تتوفر بيانات للخدمات حالياً</p>
              </div>
            ) : (
              <div className="flex-1 space-y-4 pt-2">
                {data.topServices.map((srv, idx) => {
                  const maxCount = data.topServices[0]?.count || 1;
                  const percentWidth = (srv.count / maxCount) * 100;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-800 truncate max-w-[180px]">{srv.name}</span>
                        <span className="text-slate-500 font-mono">{srv.count} زيارة</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200/50 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentWidth}%` }}
                          transition={{ duration: 0.8 }}
                          className="h-full bg-teal-600 rounded-full"
                        />
                      </div>
                      <p className="text-[10px] font-mono text-slate-400 text-left">
                        {srv.total.toLocaleString('ar-SA')} ريال
                      </p>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 p-4">
              <p className="text-xs">هذا القسم يتطلب صلاحيات مالي أو مدير نظام للاستعراض</p>
            </div>
          )}
        </div>
      </div>

      {/* Latest 10 Invoices Table */}
      <div className="glass-card rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-white/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">آخر الفواتير الصادرة</h2>
            <p className="text-xs text-slate-400 mt-1">متابعة حالة وتفاصيل آخر 10 فواتير مسجلة بالنظام</p>
          </div>
          <button 
            onClick={() => onNavigateToTab('invoices')}
            className="self-start sm:self-auto bg-teal-50/50 backdrop-blur-sm hover:bg-teal-100/50 text-teal-700 font-bold text-xs py-2 px-4 rounded-xl border border-teal-100/30 transition-all cursor-pointer"
          >
            عرض جميع الفواتير
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-white/20 text-slate-600 text-xs font-bold border-b border-white/20">
                <th className="py-4 px-6">رقم الفاتورة</th>
                <th className="py-4 px-6">التاريخ</th>
                <th className="py-4 px-6">العميل</th>
                <th className="py-4 px-6">الهاتف</th>
                <th className="py-4 px-6">الموظف</th>
                <th className="py-4 px-6">القيمة الكلية</th>
                <th className="py-4 px-6 text-center">الحالة</th>
                <th className="py-4 px-6 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-sm">
              {data.latestInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-sm font-medium">
                    لا يوجد أي فواتير مصدرة حالياً في النظام
                  </td>
                </tr>
              ) : (
                data.latestInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/15 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-slate-900 font-mono">{inv.id}</td>
                    <td className="py-3.5 px-6 text-slate-600 font-mono">{inv.date}</td>
                    <td className="py-3.5 px-6 font-semibold text-slate-800">{inv.customerName}</td>
                    <td className="py-3.5 px-6 text-slate-500 font-mono">{inv.customerPhone}</td>
                    <td className="py-3.5 px-6 text-slate-500">{inv.createdBy}</td>
                    <td className="py-3.5 px-6 font-bold text-slate-900 font-mono">{inv.total.toLocaleString()} ريال</td>
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
                      <button 
                        onClick={() => onSelectInvoice(inv)}
                        className="text-teal-600 hover:text-teal-800 font-bold text-xs underline cursor-pointer"
                      >
                        تفاصيل وطباعة
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
