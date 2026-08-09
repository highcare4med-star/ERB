import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Settings as SettingsIcon, Save, Heart, ShieldCheck, Mail, Phone, MapPin, RefreshCw, AlertCircle, Database, Download, Upload, FileJson, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { Settings } from '../types';

interface SettingsFormProps {
  token: string;
}

export default function SettingsForm({ token }: SettingsFormProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [companyNameEn, setCompanyNameEn] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [invoicePolicy, setInvoicePolicy] = useState('');
  
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  // Backup & Restore State
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreConfirmModal, setRestoreConfirmModal] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string; stats?: any } | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('فشل جلب إعدادات الشركة');
      }
      const data = await response.json();
      setSettings(data);

      // Populate form
      setCompanyName(data.companyName);
      setCompanyNameEn(data.companyNameEn || '');
      setPhone(data.phone);
      setEmail(data.email || '');
      setAddress(data.address || '');
      setVatNumber(data.vatNumber);
      setInvoicePolicy(data.invoicePolicy || '');
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess(false);

    if (!companyName.trim() || !phone.trim() || !vatNumber.trim()) {
      setFormError('يرجى تعبئة اسم الشركة ورقم الهاتف والرقم الضريبي للشركة');
      return;
    }

    setFormLoading(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          companyName: companyName.trim(),
          companyNameEn: companyNameEn.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          vatNumber: vatNumber.trim(),
          invoicePolicy: invoicePolicy.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'فشل حفظ الإعدادات');
      }

      setSettings(data);
      setFormSuccess(true);
      
      // Auto dismiss success alert
      setTimeout(() => setFormSuccess(false), 5000);
    } catch (err: any) {
      setFormError(err.message || 'حدث خطأ غير متوقع أثناء الاتصال بالخادم');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDownloadBackup = async () => {
    setDownloadingBackup(true);
    setBackupMessage(null);
    try {
      const res = await fetch('/api/backup/download', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'فشل تنزيل النسخة الاحتياطية');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `highcare_erb_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setBackupMessage({
        type: 'success',
        text: 'تم تنزيل ملف النسخة الاحتياطية الشاملة بنجاح! يمكنك الاحتفاظ به محلياً.'
      });
    } catch (err: any) {
      setBackupMessage({
        type: 'error',
        text: err.message || 'حدث خطأ أثناء تنزيل النسخة الاحتياطية'
      });
    } finally {
      setDownloadingBackup(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!restoreFile) return;
    setRestoringBackup(true);
    setBackupMessage(null);
    setRestoreConfirmModal(false);

    try {
      const text = await restoreFile.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error('الملف المرفق ليس بصيغة JSON صحيحة');
      }

      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ backupData: json })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل استعادة النسخة الاحتياطية');
      }

      setBackupMessage({
        type: 'success',
        text: data.message || 'تمت استعادة كافة البيانات بنجاح!',
        stats: data.stats
      });
      setRestoreFile(null);
      fetchSettings();
    } catch (err: any) {
      setBackupMessage({
        type: 'error',
        text: err.message || 'حدث خطأ أثناء استعادة النسخة الاحتياطية'
      });
    } finally {
      setRestoringBackup(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] font-sans">
        <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mb-3" />
        <p className="text-slate-500 text-sm">جاري جلب إعدادات شركة هاي كير...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50/80 backdrop-blur-md border border-red-200/50 rounded-2xl p-6 text-center max-w-lg mx-auto my-8 font-sans">
        <p className="text-red-700 font-semibold mb-3">{error}</p>
        <button 
          onClick={fetchSettings}
          className="bg-red-600 hover:bg-red-700 text-white font-medium text-sm py-2 px-4 rounded-xl cursor-pointer"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans text-slate-800" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-teal-500/10 text-teal-600 border border-teal-500/20 rounded-xl flex items-center justify-center">
            <SettingsIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">إعدادات ملف الشركة الضريبي</h1>
            <p className="text-slate-500 text-xs mt-0.5">تعديل بيانات فواتير شركة هاي كير للخدمات الطبية وعناوين الاتصال</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-2xl shadow-sm overflow-hidden" id="settings-form">
        <div className="p-6 space-y-6">
          {formError && (
            <div className="bg-red-50/80 backdrop-blur-md border border-red-200/50 text-red-700 p-3.5 rounded-xl text-xs font-semibold">
              {formError}
            </div>
          )}

          {formSuccess && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-500/15 backdrop-blur-md border border-emerald-500/20 text-emerald-800 p-4 rounded-xl flex items-start gap-2.5"
            >
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs font-bold leading-relaxed">
                تم تحديث إعدادات الشركة وبيانات الرقم الضريبي وسياسة إصدار الفاتورة الإلكترونية بنجاح! سيتم تطبيق التعديلات فوراً على أي فواتير جديدة أو مطبوعة.
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Name Arabic */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">اسم الشركة (بالعربية)</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="هاي كير للخدمات الطبية المنزلية"
                className="block w-full px-3 py-2.5 glass-input rounded-xl text-sm focus:outline-none"
              />
            </div>

            {/* Company Name English */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">اسم الشركة (بالإنجليزي)</label>
              <input
                type="text"
                required
                value={companyNameEn}
                onChange={(e) => setCompanyNameEn(e.target.value)}
                placeholder="High Care Home Medical Services"
                className="block w-full px-3 py-2.5 glass-input rounded-xl text-sm focus:outline-none"
              />
            </div>

            {/* Phone number */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">هاتف التواصل والدعم الفني</label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+201000000000"
                  className="block w-full pr-8 pl-3 py-2.5 glass-input rounded-xl text-sm font-mono focus:outline-none"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">البريد الإلكتروني للشركة</label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@hicare.eg"
                  className="block w-full pr-8 pl-3 py-2.5 glass-input rounded-xl text-sm font-mono focus:outline-none"
                />
              </div>
            </div>

            {/* VAT registration number */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">الرقم الضريبي / التسجيل التسجيلي للشركة (VAT)</label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <AlertCircle className="h-4 w-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  required
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  placeholder="123456789"
                  className="block w-full pr-8 pl-3 py-2.5 glass-input rounded-xl text-sm font-mono text-right focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">رقم التسجيل الضريبي لدى مصلحة الضرائب المصرية.</p>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">عنوان المقر الرئيسي للشركة</label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <MapPin className="h-4 w-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="القاهرة - جمهورية مصر العربية"
                  className="block w-full pr-8 pl-3 py-2.5 glass-input rounded-xl text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Invoice printed policies statement */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">شروط وسياسة الفواتير الطبية المطبوعة</label>
            <textarea
              value={invoicePolicy}
              onChange={(e) => setInvoicePolicy(e.target.value)}
              placeholder="تطبع السياسة في أسفل الفواتير الصادرة للعميل كشروط وأحكام الخدمة..."
              rows={4}
              className="block w-full px-3 py-2 glass-input rounded-xl text-sm leading-relaxed focus:outline-none"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="p-6 bg-white/5 border-t border-white/15 flex justify-end">
          <button
            type="submit"
            disabled={formLoading}
            id="save-settings-btn"
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm py-2.5 px-6 rounded-xl shadow transition-all disabled:opacity-50 cursor-pointer"
          >
            {formLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <Save className="h-4.5 w-4.5" />
            )}
            <span>حفظ بيانات وتعديلات الشركة</span>
          </button>
        </div>
      </form>

      {/* Full Database Backup & Restore Section */}
      <div className="glass-card rounded-2xl shadow-sm overflow-hidden p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 rounded-xl flex items-center justify-center">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">النسخ الاحتياطي واستعادة قاعدة البيانات الشاملة</h2>
              <p className="text-slate-500 text-xs mt-0.5">تصدير واستعادة كافة الفواتير والخدمات والعملاء والمستخدمين والصلاحيات والإعدادات بضغطة زر</p>
            </div>
          </div>
        </div>

        {/* Message Banner */}
        {backupMessage && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border text-xs font-semibold flex items-start gap-3 ${
              backupMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {backupMessage.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-1">
              <div>{backupMessage.text}</div>
              {backupMessage.stats && (
                <div className="text-[11px] font-normal text-emerald-700 flex flex-wrap gap-x-4 gap-y-1 mt-1 pt-1 border-t border-emerald-200/60">
                  <span>📄 الفواتير المستعادة: <strong>{backupMessage.stats.invoices}</strong></span>
                  <span>🩺 الخدمات المستعادة: <strong>{backupMessage.stats.services}</strong></span>
                  <span>👥 العملاء المستعادون: <strong>{backupMessage.stats.customers}</strong></span>
                  <span>🔐 الحسابات المستعادة: <strong>{backupMessage.stats.users}</strong></span>
                </div>
              )}
            </div>
            <button onClick={() => setBackupMessage(null)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Download Backup Box */}
          <div className="p-5 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Download className="h-4.5 w-4.5 text-teal-600" />
                <span>تنزيل نسخة احتياطية شاملة (Full Backup JSON)</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                تنزيل ملف واحد يحتوي على كامل قاعدة البيانات (الفواتير، الخدمات، العملاء، المستخدمين والصلاحيات، إعدادات الشركة). يمكنك الاحتفاظ بهذا الملف محلياً واستعادته عند تحديث النظام.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={downloadingBackup}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow transition-all disabled:opacity-50 cursor-pointer"
            >
              {downloadingBackup ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>جاري استخراج البيانات والتنزيل...</span>
                </>
              ) : (
                <>
                  <FileJson className="h-4 w-4" />
                  <span>تنزيل النسخة الاحتياطية الآن</span>
                </>
              )}
            </button>
          </div>

          {/* Restore Backup Box */}
          <div className="p-5 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Upload className="h-4.5 w-4.5 text-indigo-600" />
                <span>استعادة نسخة احتياطية (Restore Data)</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                قم برفع ملف النسخة الاحتياطية (JSON) المحفوظ سابقاً لاستعادة جميع البيانات والفواتير المدمجة دفعة واحدة.
              </p>
            </div>

            <div className="space-y-2">
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setRestoreFile(e.target.files[0]);
                    setBackupMessage(null);
                  }
                }}
                className="block w-full text-xs text-slate-500 file:mr-0 file:ml-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />

              {restoreFile && (
                <div className="flex items-center justify-between text-xs bg-indigo-50/80 border border-indigo-200/60 p-2.5 rounded-xl text-indigo-900 font-medium">
                  <span className="truncate max-w-[200px]">📁 {restoreFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setRestoreConfirmModal(true)}
                    disabled={restoringBackup}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold py-1 px-3 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                  >
                    استعادة الآن
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Restore */}
      {restoreConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
            dir="rtl"
          >
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900">تأكيد استعادة النسخة الاحتياطية</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              تحذير: سيتم استبدال جميع الفواتير، الخدمات، العملاء، المستخدمين والإعدادات الحالية في النظام بالبيانات الموجودة في ملف النسخة الاحتياطية (<strong>{restoreFile?.name}</strong>).
              <br /><br />
              هل أنت متأكد من رغبتك في إكمال الاستعادة؟
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRestoreConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleRestoreBackup}
                disabled={restoringBackup}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow transition-all cursor-pointer disabled:opacity-50"
              >
                {restoringBackup && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                <span>نعم، استعادة كافة البيانات</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
