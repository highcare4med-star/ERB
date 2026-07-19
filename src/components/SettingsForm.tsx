import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Settings as SettingsIcon, Save, Heart, ShieldCheck, Mail, Phone, MapPin, RefreshCw, AlertCircle } from 'lucide-react';
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
                placeholder="Hi Care Home Medical Services"
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
                  placeholder="+966500000000"
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
                  placeholder="info@hicare.sa"
                  className="block w-full pr-8 pl-3 py-2.5 glass-input rounded-xl text-sm font-mono focus:outline-none"
                />
              </div>
            </div>

            {/* VAT registration number (Saudi ZATCA compliance) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">الرقم الضريبي للشركة (VAT - 15 خانة)</label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <AlertCircle className="h-4 w-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  required
                  maxLength={15}
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="310xxxxxxxxxxx3"
                  className="block w-full pr-8 pl-3 py-2.5 glass-input rounded-xl text-sm font-mono text-right focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">الرقم الضريبي الموحد للمنشآت في المملكة العربية السعودية يبدأ وينتهي بالرقم 3.</p>
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
                  placeholder="الرياض - طريق الملك فهد - المملكة العربية السعودية"
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
    </div>
  );
}
