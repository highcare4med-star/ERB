import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Shield, Calendar, User, Laptop, Info, RefreshCw } from 'lucide-react';
import { ActivityLog } from '../types';

interface AuditLogsProps {
  token: string;
}

export default function AuditLogs({ token }: AuditLogsProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('فشل جلب سجل العمليات من الخادم');
      }
      const data = await response.json();
      setLogs(data);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token]);

  // Client side filtering for speedy searches
  const filteredLogs = logs.filter(l => 
    l.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.ipAddress.includes(searchQuery)
  );

  return (
    <div className="space-y-6 font-sans text-slate-800" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">سجل العمليات والرقابة الأمني (Audit Logs)</h1>
          <p className="text-slate-500 text-sm mt-1">مراقبة تحركات الموظفين وتعديلات الفواتير وحالات تسجيل الدخول لضمان موثوقية الأداء</p>
        </div>

        <button
          onClick={fetchLogs}
          className="self-start sm:self-auto flex items-center gap-2 bg-white/30 hover:bg-white/50 border border-white/40 text-slate-700 py-2 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
          تحديث السجل
        </button>
      </div>

      {/* Filters & Information summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div className="md:col-span-3 relative">
          <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث باسم المستخدم، الإجراء، تفاصيل التعديل أو عنوان IP..."
            className="block w-full pr-9 pl-3 py-2.5 glass-input rounded-xl text-sm focus:outline-none"
          />
        </div>
        <div className="md:col-span-1 text-xs text-slate-500 font-semibold text-center md:text-left glass-card py-3.5 px-4 rounded-xl shadow-sm">
          إجمالي سجلات العمليات: {filteredLogs.length} عملية
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <span className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin inline-block mb-3"></span>
            <p className="text-xs">جاري تحميل سجل العمليات والرقابة الأمني...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 font-bold text-xs bg-red-50/50">
            {error}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            لم يتم العثور على أي عمليات مسجلة في السجل الأمني
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-white/10 text-slate-700 text-xs font-bold border-b border-white/10">
                  <th className="py-4 px-6 w-2/12">التوقيت والزمن</th>
                  <th className="py-4 px-6 w-1/12">اسم المستخدم</th>
                  <th className="py-4 px-6 w-2/12">نوع العملية</th>
                  <th className="py-4 px-6 w-5/12">تفاصيل الإجراء والمعدل</th>
                  <th className="py-4 px-6 w-1/12">عنوان IP</th>
                  <th className="py-4 px-6 w-1/12">الجهاز والمتصفح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-white/10 transition-colors text-xs">
                    <td className="py-3 px-6 text-slate-500 font-mono" dir="ltr">
                      {new Date(log.timestamp).toLocaleString('ar-SA')}
                    </td>
                    <td className="py-3 px-6 font-bold text-slate-800 flex items-center gap-1 mt-1.5">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>{log.username}</span>
                    </td>
                    <td className="py-3 px-6">
                      <span className="inline-flex px-2 py-0.5 rounded font-bold bg-teal-500/10 text-teal-700 border border-teal-500/20 text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-slate-600 leading-normal">{log.details}</td>
                    <td className="py-3 px-6 text-slate-500 font-mono" dir="ltr">{log.ipAddress}</td>
                    <td className="py-3 px-6 text-slate-400 truncate max-w-[120px]" title={log.userAgent}>
                      <span className="flex items-center gap-1">
                        <Laptop className="h-3.5 w-3.5" />
                        <span>{log.userAgent.split(' ')[0] || 'Unknown'}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
