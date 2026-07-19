import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User, Activity, AlertCircle, ShieldAlert } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (token: string, user: { username: string; fullName: string; roleId: string; permissions: string[] }) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل الاتصال بالخادم');
      }

      // Success
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-2xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-100/50">
            <Activity className="h-9 w-9 text-white animate-pulse" />
          </div>
        </div>
        
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900 font-sans">
          هاي كير للخدمات الطبية المنزلية
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Hi Care Home Medical Services
        </p>
        <p className="mt-1 text-center text-xs text-teal-700 bg-teal-50/50 backdrop-blur-sm rounded-full py-1 px-3 w-max mx-auto border border-teal-100/50 font-medium">
          نظام الفوترة الإلكترونية وإصدار الفواتير الذكي
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="glass-card py-8 px-6 rounded-3xl shadow-xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit} id="login-form">
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-50/80 backdrop-blur-sm border border-red-200/60 rounded-xl p-4 flex items-start gap-3"
              >
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div className="text-sm text-red-700 font-medium leading-relaxed">
                  {error}
                </div>
              </motion.div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-slate-700 mb-1">
                اسم المستخدم
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pr-10 pl-3 py-3 glass-input rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 text-sm"
                  placeholder="مثال: admin"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1">
                كلمة المرور
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pr-10 pl-3 py-3 glass-input rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                id="login-btn"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-all cursor-pointer shadow-teal-600/10 hover:shadow-teal-600/20"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>جاري التحقق...</span>
                  </div>
                ) : (
                  'تسجيل الدخول'
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 border-t border-slate-200/50 pt-6">
            <div className="flex items-start gap-2 bg-white/30 backdrop-blur-sm rounded-xl p-3 border border-white/40">
              <ShieldAlert className="h-4.5 w-4.5 text-slate-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-500 leading-normal">
                <span className="font-semibold text-slate-700">بيانات الدخول التجريبية (للتقييم):</span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                  <div>• مدير نظام: <code className="bg-white/60 px-1 rounded text-slate-800">admin</code></div>
                  <div>كلمة السر: <code className="bg-white/60 px-1 rounded text-slate-800">admin123</code></div>
                  <div>• محاسب مالي: <code className="bg-white/60 px-1 rounded text-slate-800">financial</code></div>
                  <div>كلمة السر: <code className="bg-white/60 px-1 rounded text-slate-800">fin123</code></div>
                  <div>• مدخل فواتير: <code className="bg-white/60 px-1 rounded text-slate-800">billing</code></div>
                  <div>كلمة السر: <code className="bg-white/60 px-1 rounded text-slate-800">bill123</code></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
