import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  LayoutDashboard, 
  FileText, 
  FilePlus, 
  Users, 
  HeartHandshake, 
  Shield, 
  Settings as SettingsIcon, 
  History, 
  LogOut, 
  Menu, 
  X, 
  User as UserIcon,
  Bell,
  Heart,
  Globe,
  Printer,
  RefreshCw
} from 'lucide-react';

// Import Types
import { AppState, Invoice, Settings } from './types';

// Import Subcomponents
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import InvoiceList from './components/InvoiceList';
import InvoiceForm from './components/InvoiceForm';
import CustomerList from './components/CustomerList';
import ServiceList from './components/ServiceList';
import UserList from './components/UserList';
import SettingsForm from './components/SettingsForm';
import AuditLogs from './components/AuditLogs';
import InvoicePrint from './components/InvoicePrint';

export default function App() {
  // Session & Auth state
  const [session, setSession] = useState<AppState['user']>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Tab navigation state
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Mobile drawer control
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Interactive Invoice selection for Viewing / Editing
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Router override: check if viewing public invoice receipt e.g., /print/HC-YYYYMM-XXXX
  const [publicPrintId, setPublicPrintId] = useState<string | null>(null);
  const [publicInvoiceData, setPublicInvoiceData] = useState<{ invoice: Invoice; settings: any } | null>(null);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState('');

  // Toast notifications state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 1. Inspect URL parameters for sharing / printing
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/print\/(HC-\d+-\d+)$/);
    if (match && match[1]) {
      setPublicPrintId(match[1]);
      fetchPublicInvoice(match[1]);
    } else {
      // Check for saved session in sessionStorage
      const savedToken = sessionStorage.getItem('hicare_token');
      const savedUser = sessionStorage.getItem('hicare_user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setSession(JSON.parse(savedUser));
      }
      setAuthChecked(true);
    }
  }, []);

  const fetchPublicInvoice = async (invoiceId: string) => {
    setPublicLoading(true);
    setPublicError('');
    try {
      const response = await fetch(`/api/public/invoices/${invoiceId}`);
      if (!response.ok) {
        throw new Error('تعذر تحميل تفاصيل الفاتورة المطلوبة. يرجى التحقق من الرقم والاتصال بنا.');
      }
      const data = await response.json();
      setPublicInvoiceData(data);
    } catch (err: any) {
      setPublicError(err.message || 'حدث خطأ أثناء تحميل الفاتورة');
    } finally {
      setPublicLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleLoginSuccess = (newToken: string, newUser: AppState['user']) => {
    setToken(newToken);
    setSession(newUser);
    // Persist in session storage
    sessionStorage.setItem('hicare_token', newToken);
    sessionStorage.setItem('hicare_user', JSON.stringify(newUser));
    showToast('تم تسجيل الدخول بنجاح! مرحباً بك في نظام هاي كير.');
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Logout request failed:', err);
      }
    }
    // Clean states
    setToken(null);
    setSession(null);
    sessionStorage.removeItem('hicare_token');
    sessionStorage.removeItem('hicare_user');
    setViewingInvoice(null);
    setEditingInvoice(null);
    setActiveTab('dashboard');
    showToast('تم تسجيل الخروج من النظام بنجاح، يومك سعيد.', 'success');
  };

  const handleInvoiceIssued = (invoice: Invoice) => {
    setEditingInvoice(null);
    // Load print view directly so they can print or share right away!
    setViewingInvoice(invoice);
    setActiveTab('invoices');
    showToast(editingInvoice ? 'تم تعديل وحفظ بيانات الفاتورة بنجاح!' : 'تم إصدار الفاتورة الطبية وحفظها في السجلات الإلكترونية بنجاح!');
  };

  if (publicPrintId) {
    // PUBLIC INVOICE VIEWING PORTAL (Exempt from auth rules)
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans" dir="rtl">
        {publicLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <RefreshCw className="h-10 w-10 text-sky-600 animate-spin mb-3" />
            <p className="text-slate-500 text-sm">جاري جلب الفاتورة الطبية الإلكترونية...</p>
          </div>
        ) : publicError ? (
          <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-slate-100 shadow-xl text-center space-y-4">
            <X className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-lg font-bold text-slate-900">خطأ في التحميل!</h2>
            <p className="text-xs text-slate-500 leading-normal">{publicError}</p>
            <a 
              href="/"
              className="inline-block bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold py-2 px-6 rounded-xl transition-all"
            >
              الذهاب للرئيسية
            </a>
          </div>
        ) : publicInvoiceData ? (
          <div className="space-y-6">
            <div className="max-w-4xl mx-auto flex items-center justify-between bg-white py-3.5 px-6 rounded-xl border border-slate-100 shadow-sm print:hidden">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-emerald-500" />
                <span>رابط الفاتورة الإلكترونية المعتمد</span>
              </span>
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs py-1.5 px-3 rounded-lg transition-all"
              >
                <Printer className="h-4 w-4" />
                <span>طباعة وتنزيل PDF</span>
              </button>
            </div>
            
            <InvoicePrint 
              token="" 
              invoice={publicInvoiceData.invoice} 
              onBack={() => {}} 
            />
          </div>
        ) : null}
      </div>
    );
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session || !token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Permissions array helper
  const perms = session.permissions;

  // Sidebar Tabs depending on credentials
  const navigationItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, visible: true },
    { id: 'new-invoice', label: 'إصدار فاتورة', icon: FilePlus, visible: perms.includes('create_invoice') },
    { id: 'invoices', label: 'سجل الفواتير', icon: FileText, visible: perms.includes('view_invoices') },
    { id: 'customers', label: 'سجل العملاء', icon: Users, visible: perms.includes('manage_customers') || perms.includes('view_invoices') },
    { id: 'services', label: 'الخدمات الطبية', icon: HeartHandshake, visible: true },
    { id: 'users', label: 'المستخدمين', icon: Shield, visible: perms.includes('manage_users') },
    { id: 'logs', label: 'سجل العمليات', icon: History, visible: perms.includes('view_logs') },
    { id: 'settings', label: 'إعدادات الشركة', icon: SettingsIcon, visible: perms.includes('manage_settings') },
  ];

  const visibleNavs = navigationItems.filter(item => item.visible);

  return (
    <div className="min-h-screen bg-transparent flex font-sans text-slate-800" dir="rtl">
      
      {/* Toast Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-5 left-5 z-50 py-3.5 px-5 rounded-2xl shadow-xl flex items-center gap-3 border ${
              notification.type === 'success' 
                ? 'bg-white text-slate-900 border-emerald-100' 
                : 'bg-red-50 text-red-800 border-red-100'
            }`}
          >
            <div className={`h-2 w-2 rounded-full ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className="text-xs font-bold">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Rail (Desktop View - Hidden in print) */}
      <aside className="hidden lg:flex flex-col w-64 glass-sidebar shrink-0 select-none print:hidden">
        {/* Brand Header */}
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <div className="h-10 w-10 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-teal-950/20">
            <Heart className="h-6 w-6 text-white fill-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-white tracking-tight leading-normal">شركة هاي كير</h1>
            <p className="text-[10px] text-slate-400 tracking-wider font-semibold font-mono">HI CARE SYSTEM</p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {visibleNavs.map(item => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id && !viewingInvoice && !editingInvoice;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setViewingInvoice(null);
                  setEditingInvoice(null);
                  setActiveTab(item.id);
                }}
                className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-950/20'
                    : 'text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Account summary Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950/40">
          <div className="flex items-center gap-3 p-2 bg-white/5 rounded-xl">
            <div className="h-9 w-9 bg-teal-950/50 text-teal-300 rounded-lg flex items-center justify-center font-bold text-sm">
              {session.fullName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white truncate">{session.fullName}</h4>
              <p className="text-[9px] text-slate-400 font-semibold truncate mt-0.5">
                {session.roleId === 'admin' ? 'مدير نظام' : session.roleId === 'financial' ? 'مدير مالي' : session.roleId === 'billing' ? 'موظف فواتير' : 'قراءة فقط'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-3 flex items-center justify-center gap-2 py-2 px-4 border border-white/10 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 text-slate-400 rounded-xl font-bold transition-all cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        
        {/* Header toolbar (Hidden in print) */}
        <header className="glass-header py-4 px-6 flex items-center justify-between select-none print:hidden">
          <div className="flex items-center gap-4">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white/20 rounded-lg transition-all cursor-pointer"
            >
              {showMobileMenu ? <X className="h-5.5 w-5.5" /> : <Menu className="h-5.5 w-5.5" />}
            </button>

            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <span className="font-bold text-slate-800">الفرع الرئيسي:</span>
              <span>الرياض، السعودية</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-xs font-bold text-slate-600 bg-white/30 backdrop-blur-sm py-1.5 px-3 rounded-full border border-white/40">
              {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </header>

        {/* Mobile menu drawer */}
        <AnimatePresence>
          {showMobileMenu && (
            <div className="lg:hidden fixed inset-0 z-40 flex print:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMobileMenu(false)}
                className="fixed inset-0 bg-black"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.25 }}
                className="relative flex flex-col w-64 glass-sidebar h-full"
              >
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-teal-500 fill-teal-500" />
                    <span className="font-extrabold text-white text-sm">هاي كير الطبية</span>
                  </div>
                  <button onClick={() => setShowMobileMenu(false)} className="text-slate-400 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1">
                  {visibleNavs.map(item => {
                    const Icon = item.icon;
                    const isSelected = activeTab === item.id && !viewingInvoice && !editingInvoice;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setViewingInvoice(null);
                          setEditingInvoice(null);
                          setActiveTab(item.id);
                          setShowMobileMenu(false);
                        }}
                        className={`w-full flex items-center gap-3 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-teal-600 text-white'
                            : 'text-slate-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>

                <div className="p-4 border-t border-white/10 bg-slate-950/40 text-slate-400 text-xs">
                  <div className="font-bold text-white mb-2">{session.fullName}</div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white/10 rounded-xl text-xs font-bold text-slate-300 hover:bg-red-500/20 hover:text-red-400 transition-all"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Primary Tab Content Routing Screen */}
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto print:p-0 print:m-0">
          <AnimatePresence mode="wait">
            {viewingInvoice ? (
              <motion.div
                key="print-view"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.2 }}
              >
                <InvoicePrint
                  token={token}
                  invoice={viewingInvoice}
                  onBack={() => {
                    setViewingInvoice(null);
                    setActiveTab('invoices');
                  }}
                />
              </motion.div>
            ) : editingInvoice ? (
              <motion.div
                key="edit-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <InvoiceForm
                  token={token}
                  editingInvoice={editingInvoice}
                  onCancel={() => setEditingInvoice(null)}
                  onSuccess={handleInvoiceIssued}
                />
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                {activeTab === 'dashboard' && (
                  <Dashboard
                    token={token}
                    userPermissions={perms}
                    onNavigateToTab={(tab) => setActiveTab(tab)}
                    onSelectInvoice={(inv) => setViewingInvoice(inv)}
                  />
                )}
                
                {activeTab === 'new-invoice' && (
                  <InvoiceForm
                    token={token}
                    editingInvoice={null}
                    onCancel={() => setActiveTab('dashboard')}
                    onSuccess={handleInvoiceIssued}
                  />
                )}

                {activeTab === 'invoices' && (
                  <InvoiceList
                    token={token}
                    currentUsername={session.username}
                    userPermissions={perms}
                    onSelectInvoice={(inv) => setViewingInvoice(inv)}
                    onEditInvoice={(inv) => setEditingInvoice(inv)}
                  />
                )}

                {activeTab === 'customers' && (
                  <CustomerList
                    token={token}
                    userPermissions={perms}
                    onSelectInvoice={(inv) => setViewingInvoice(inv)}
                  />
                )}

                {activeTab === 'services' && (
                  <ServiceList
                    token={token}
                    userPermissions={perms}
                  />
                )}

                {activeTab === 'users' && (
                  <UserList
                    token={token}
                    currentUsername={session.username}
                  />
                )}

                {activeTab === 'logs' && (
                  <AuditLogs
                    token={token}
                  />
                )}

                {activeTab === 'settings' && (
                  <SettingsForm
                    token={token}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

      </div>

    </div>
  );
}
