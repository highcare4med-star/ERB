import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Save, X, Calculator, Search, UserCheck, Heart, ChevronDown, Check, Minus, Stethoscope, Pill } from 'lucide-react';
import { Invoice, InvoiceItem, Service, Customer } from '../types';

interface ServicePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: Service[];
  onSelectService: (service: Service) => void;
  selectedServiceId?: string;
}

function ServicePickerModal({ isOpen, onClose, services, onSelectService, selectedServiceId }: ServicePickerModalProps) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedCategory('الكل');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredServices = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(query.toLowerCase()) || 
                          (s.description || '').toLowerCase().includes(query.toLowerCase());
    const matchesCat = selectedCategory === 'الكل' || (s.category || 'الخدمات الطبية') === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="bg-white w-full sm:max-w-2xl h-[90vh] sm:h-[80vh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden dir-rtl font-sans"
        >
          {/* Header */}
          <div className="p-4 bg-slate-800 text-white flex justify-between items-center shrink-0">
            <div>
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-teal-400" />
                <span>اختر الخدمة أو المستلزم الطبي</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">انقر على أي عنصر لإضافته مباشرة للفاتورة</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Search Box */}
          <div className="p-3 bg-slate-100 border-b border-slate-200 shrink-0 space-y-2">
            <div className="relative">
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث باسم الخدمة أو الدواء أو المستلزم..."
                className="w-full py-2.5 pr-10 pl-9 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs"
              />
              <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute left-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              {[
                { id: 'الكل', label: 'الكل' },
                { id: 'الخدمات الطبية', label: '🩺 الخدمات الطبية' },
                { id: 'الأدوية والمستلزمات الطبية', label: '💊 الأدوية والمستلزمات' }
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-teal-700 text-white shadow-xs scale-102'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* List Results */}
          <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
            {filteredServices.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-semibold space-y-2">
                <Search className="h-8 w-8 mx-auto text-slate-300" />
                <p>لا توجد نتائج تطابق "{query}"</p>
              </div>
            ) : (
              filteredServices.map(srv => {
                const isSelected = selectedServiceId === srv.id;
                const isSupply = srv.category === 'الأدوية والمستلزمات الطبية';
                return (
                  <div
                    key={srv.id}
                    onClick={() => {
                      onSelectService(srv);
                      onClose();
                    }}
                    className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between my-1 border ${
                      isSelected
                        ? 'bg-teal-50 border-teal-300 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 pr-1">
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isSupply ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'
                      }`}>
                        {isSupply ? <Pill className="h-5 w-5" /> : <Stethoscope className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-sm">{srv.name}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSupply ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-teal-50 text-teal-800 border border-teal-200'
                          }`}>
                            {srv.category || 'الخدمات الطبية'}
                          </span>
                        </div>
                        {srv.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">{srv.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 mr-2">
                      <div className="text-left">
                        <span className="font-mono font-extrabold text-teal-700 text-sm block">
                          {srv.defaultPrice.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-semibold">جنية مصري</span>
                      </div>
                      <div className={`p-2 rounded-xl transition-colors ${
                        isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-teal-600'
                      }`}>
                        {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer bar */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500 font-semibold shrink-0">
            إجمالي العناصر المتاحة: <span className="font-mono font-bold text-slate-800">{filteredServices.length}</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

interface ServiceComboboxProps {
  services: Service[];
  selectedServiceId: string;
  selectedServiceName: string;
  onSelect: (service: Service) => void;
  onOpenModal: () => void;
}

interface CustomerPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
}

function CustomerPickerModal({ isOpen, onClose, customers, onSelectCustomer }: CustomerPickerModalProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = customers.filter(c => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.code || '').toLowerCase().includes(q) ||
      (c.address || '').toLowerCase().includes(q)
    );
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="bg-white w-full sm:max-w-xl h-[85vh] sm:h-[75vh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden dir-rtl font-sans"
        >
          {/* Header */}
          <div className="p-4 bg-slate-800 text-white flex justify-between items-center shrink-0">
            <div>
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-teal-400" />
                <span>قائمة العملاء والمرضى المسجلين</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">اختر العميل بالاسم أو رقم الهاتف أو كود العميل لتعبئة البيانات آلياً</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Search Box */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 shrink-0">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث بالاسم، رقم الهاتف، أو كود العميل (مثال C101)..."
                className="w-full pr-9 pl-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-teal-500"
                autoFocus
              />
            </div>
          </div>

          {/* Customers List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-sm">لا يوجد عملاء مطابقين للبحث</p>
              </div>
            ) : (
              filtered.map((cust) => (
                <div
                  key={cust.id}
                  onClick={() => {
                    onSelectCustomer(cust);
                    onClose();
                  }}
                  className="p-3 bg-white hover:bg-teal-50/70 border border-slate-200 hover:border-teal-400 rounded-xl cursor-pointer transition-all flex items-center justify-between group shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-teal-100 text-teal-800 text-[11px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                        {cust.code || 'C100'}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">{cust.name}</span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span className="font-mono font-semibold" dir="ltr">{cust.phone}</span>
                      {cust.address && <span>• {cust.address}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="px-3 py-1.5 bg-teal-600 group-hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                  >
                    اختيار
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function ServiceCombobox({ services, selectedServiceId, selectedServiceName, onSelect, onOpenModal }: ServiceComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(selectedServiceName || '');

  useEffect(() => {
    setQuery(selectedServiceName || '');
  }, [selectedServiceName]);

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={query}
          onClick={onOpenModal}
          onChange={(e) => {
            setQuery(e.target.value);
            onOpenModal();
          }}
          placeholder="انقر لاختيار الخدمة أو الدواء..."
          className="block w-full py-2 px-3 glass-input rounded-xl text-xs focus:outline-none font-bold text-slate-800 border border-slate-200/80 cursor-pointer"
        />
        <button
          type="button"
          onClick={onOpenModal}
          className="p-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl shrink-0 transition-colors cursor-pointer"
          title="فتح قائمة البحث الشاملة"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface InvoiceFormProps {
  token: string;
  editingInvoice: Invoice | null;
  onCancel: () => void;
  onSuccess: (invoice: Invoice) => void;
}

export default function InvoiceForm({ token, editingInvoice, onCancel, onSuccess }: InvoiceFormProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'value'>('value');
  const [discountValue, setDiscountValue] = useState(0);
  
  // Invoice items state
  const [items, setItems] = useState<Omit<InvoiceItem, 'total'>[]>([
    { serviceId: '', serviceName: '', quantity: 1, price: 0 }
  ]);

  // UI state
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Service Modal state for mobile/easy picking
  const [activeModalItemIndex, setActiveModalItemIndex] = useState<number | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // Fetch Services & Customers
  useEffect(() => {
    const fetchData = async () => {
      try {
        const srvResponse = await fetch('/api/services', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const srvData = await srvResponse.json();
        // Load only active services
        setServices(srvData.filter((s: Service) => s.isActive));

        const custResponse = await fetch('/api/customers', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const custData = await custResponse.json();
        setCustomers(custData);
      } catch (err) {
        console.error('Error fetching services/customers:', err);
      }
    };
    fetchData();
  }, [token]);

  // Set form values if editing
  useEffect(() => {
    if (editingInvoice) {
      setDate(editingInvoice.date);
      setCustomerName(editingInvoice.customerName);
      setCustomerPhone(editingInvoice.customerPhone);
      setCustomerAddress(editingInvoice.customerAddress);
      setNotes(editingInvoice.notes);
      setDiscountType(editingInvoice.discountType);
      setDiscountValue(editingInvoice.discountValue);
      setItems(editingInvoice.items.map(item => ({
        serviceId: item.serviceId,
        serviceName: item.serviceName,
        quantity: item.quantity,
        price: item.price,
        serviceDate: item.serviceDate || editingInvoice.date,
        serviceEndDate: item.serviceEndDate || '',
        serviceDateType: item.serviceDateType || (item.serviceEndDate ? 'range' : 'single')
      })));
    }
  }, [editingInvoice]);

  // Handle customer name change and autocomplete
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomerName(value);

    if (value.trim().length >= 1) {
      const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(value.toLowerCase()) ||
        c.phone.includes(value) ||
        (c.code || '').toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCustomers(filtered);
      setShowCustomerDropdown(true);
    } else {
      setFilteredCustomers([]);
      setShowCustomerDropdown(false);
    }
  };

  // Handle phone change and filter customers for autocomplete
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomerPhone(value);

    if (value.trim().length >= 1) {
      const filtered = customers.filter(c =>
        c.phone.includes(value) ||
        c.name.toLowerCase().includes(value.toLowerCase()) ||
        (c.code || '').toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCustomers(filtered);
      setShowCustomerDropdown(true);
    } else {
      setFilteredCustomers([]);
      setShowCustomerDropdown(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setCustomerAddress(customer.address);
    setShowCustomerDropdown(false);
  };

  // Manage Invoice items
  const handleAddItemRow = () => {
    setItems([
      ...items,
      {
        serviceId: '',
        serviceName: '',
        quantity: 1,
        price: 0,
        serviceDate: date,
        serviceEndDate: '',
        serviceDateType: 'single'
      }
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length === 1) return;
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  const handleItemServiceChange = (index: number, serviceId: string) => {
    const selectedSrv = services.find(s => s.id === serviceId);
    if (!selectedSrv) return;

    const updated = [...items];
    updated[index] = {
      ...updated[index],
      serviceId: selectedSrv.id,
      serviceName: selectedSrv.name,
      price: selectedSrv.defaultPrice
    };
    setItems(updated);
  };

  const handleItemValueChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setItems(updated);
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = Math.round((subtotal * (discountValue / 100)) * 100) / 100;
  } else if (discountType === 'value') {
    discountAmount = Math.min(discountValue, subtotal);
  }

  const finalTotal = subtotal - discountAmount;

  // Cleanup lock on cancel
  const handleCancelAndUnlock = async () => {
    if (editingInvoice) {
      try {
        await fetch(`/api/invoices/${editingInvoice.id}/unlock`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (e) {
        console.error('Failed to unlock invoice:', e);
      }
    }
    onCancel();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!customerName.trim() || !customerPhone.trim()) {
      setError('يرجى إدخال اسم العميل ورقم هاتفه بشكل صحيح');
      return;
    }

    const cleanItems = items.filter(item => item.serviceId !== '');
    if (cleanItems.length === 0) {
      setError('يرجى إضافة خدمة واحدة على الأقل في جدول الخدمات');
      return;
    }

    setLoading(true);
    try {
      const url = editingInvoice ? `/api/invoices/${editingInvoice.id}` : '/api/invoices';
      const method = editingInvoice ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          items: cleanItems,
          discountType,
          discountValue,
          notes: notes.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'فشل حفظ الفاتورة');
      }

      onSuccess(data);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع أثناء حفظ الفاتورة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl shadow-sm overflow-hidden font-sans text-slate-800" dir="rtl">
      {/* Header */}
      <div className="p-6 border-b border-white/25 flex justify-between items-center bg-white/10">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {editingInvoice ? `تعديل الفاتورة رقم ${editingInvoice.id}` : 'إصدار فاتورة طبية جديدة'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {editingInvoice ? 'يرجى مراجعة وتحديث حقول الفاتورة المقفلة مؤقتاً لتعديلك' : 'تعبئة بيانات العميل وإضافة الخدمات الطبية المقدمة له'}
          </p>
        </div>
        <button 
          onClick={handleCancelAndUnlock}
          className="text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8" id="invoice-form">
        {error && (
          <div className="bg-red-50/80 backdrop-blur-md border border-red-200/50 text-red-700 p-4 rounded-xl text-sm font-semibold">
            {error}
          </div>
        )}

        {/* Client & Metadata block */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-teal-600" />
              <h3 className="font-bold text-sm text-slate-800">بيانات العميل / المريض</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsCustomerModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <Search className="h-3.5 w-3.5 text-teal-600" />
              <span>اختر من العملاء المسجلين ({customers.length})</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Customer Name */}
            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 mb-1">اسم العميل بالكامل</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={handleNameChange}
                onFocus={() => customerName.trim().length >= 1 && setShowCustomerDropdown(true)}
                onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                placeholder="اسم المريض أو العميل"
                className="block w-full px-3 py-2.5 glass-input rounded-xl text-sm focus:outline-none transition-all"
              />
              {/* Autocomplete Dropdown */}
              {showCustomerDropdown && filteredCustomers.length > 0 && (
                <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-100 text-slate-800 dir-rtl">
                  {filteredCustomers.map(cust => (
                    <div
                      key={cust.id}
                      onMouseDown={() => handleSelectCustomer(cust)}
                      className="p-2.5 text-right hover:bg-teal-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="bg-teal-100 text-teal-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded font-mono">
                            {cust.code || 'C100'}
                          </span>
                          <span className="font-bold text-slate-900">{cust.name}</span>
                        </div>
                        <div className="text-slate-400 mt-0.5 font-mono" dir="ltr">{cust.phone}</div>
                      </div>
                      <UserCheck className="h-4 w-4 text-teal-500 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">رقم الهاتف (البحث أو الإدخال)</label>
              <input
                type="text"
                required
                value={customerPhone}
                onChange={handlePhoneChange}
                onFocus={() => customerPhone.trim().length >= 1 && setShowCustomerDropdown(true)}
                onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                placeholder="مثال: 01000000000"
                className="block w-full px-3 py-2.5 glass-input rounded-xl text-sm focus:outline-none transition-all"
              />
            </div>

            {/* Customer Address */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">العنوان السكني للزيارة</label>
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="مثال: القاهرة، حي المعادي"
                className="block w-full px-3 py-2.5 glass-input rounded-xl text-sm focus:outline-none transition-all"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">تاريخ إصدار الفاتورة</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="block w-full px-3 py-2.5 glass-input rounded-xl text-sm focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Service Picker Modal for easy touch selection */}
        <ServicePickerModal
          isOpen={activeModalItemIndex !== null}
          onClose={() => setActiveModalItemIndex(null)}
          services={services}
          selectedServiceId={activeModalItemIndex !== null ? items[activeModalItemIndex]?.serviceId : undefined}
          onSelectService={(srv) => {
            if (activeModalItemIndex !== null) {
              const updated = [...items];
              updated[activeModalItemIndex] = {
                ...updated[activeModalItemIndex],
                serviceId: srv.id,
                serviceName: srv.name,
                price: srv.defaultPrice
              };
              setItems(updated);
            }
          }}
        />

        {/* Invoice items table / cards */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="h-4.5 w-4.5 text-teal-600" />
              <span>جدول الخدمات الطبية والمستلزمات المقدمة</span>
            </h3>
            <span className="text-xs text-slate-500 font-semibold">عدد البنود: <span className="font-mono font-bold text-teal-700">{items.length}</span></span>
          </div>

          {/* MOBILE CARD VIEW (Visible on small screens) */}
          <div className="block md:hidden space-y-4">
            {items.map((item, idx) => {
              const currentSrv = services.find(s => s.id === item.serviceId);
              const isSupply = currentSrv?.category === 'الأدوية والمستلزمات الطبية';
              return (
                <div key={idx} className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                  {/* Card Header */}
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-xs font-extrabold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100">
                      بند رقم #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(idx)}
                      disabled={items.length === 1}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>حذف</span>
                    </button>
                  </div>

                  {/* Service Picker Trigger */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">الخدمة / المستلزم الطبي</label>
                    <button
                      type="button"
                      onClick={() => setActiveModalItemIndex(idx)}
                      className="w-full text-right p-3 bg-slate-50 hover:bg-teal-50/60 border border-slate-200 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2"
                    >
                      {item.serviceName ? (
                        <div className="min-w-0 pr-1">
                          <div className="font-bold text-slate-900 text-xs truncate">{item.serviceName}</div>
                          {currentSrv?.category && (
                            <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold mt-0.5 ${
                              isSupply ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'
                            }`}>
                              {currentSrv.category}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-teal-700 flex items-center gap-1.5">
                          <Plus className="h-4 w-4 text-teal-600" />
                          <span>انقر لاختيار الخدمة أو المستلزم</span>
                        </span>
                      )}
                      <Search className="h-4 w-4 text-teal-600 shrink-0" />
                    </button>
                  </div>

                  {/* Date Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-500">تاريخ الخدمة</label>
                        <select
                          value={item.serviceDateType || 'single'}
                          onChange={(e) => handleItemValueChange(idx, 'serviceDateType', e.target.value)}
                          className="text-[10px] py-0.5 px-1.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200"
                        >
                          <option value="single">تاريخ محدد</option>
                          <option value="range">فترة (من - إلى)</option>
                        </select>
                      </div>
                      
                      {item.serviceDateType === 'range' ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="date"
                            value={item.serviceDate || date}
                            onChange={(e) => handleItemValueChange(idx, 'serviceDate', e.target.value)}
                            className="py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs w-full text-center font-mono font-bold"
                          />
                          <span className="text-xs text-slate-500 font-bold">إلى</span>
                          <input
                            type="date"
                            value={item.serviceEndDate || ''}
                            onChange={(e) => handleItemValueChange(idx, 'serviceEndDate', e.target.value)}
                            className="py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs w-full text-center font-mono font-bold"
                          />
                        </div>
                      ) : (
                        <input
                          type="date"
                          value={item.serviceDate || date}
                          onChange={(e) => handleItemValueChange(idx, 'serviceDate', e.target.value)}
                          className="py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs w-full text-center font-mono font-bold"
                        />
                      )}
                    </div>
                  </div>

                  {/* Quantity & Price Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {/* Quantity Stepper */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">الكمية</label>
                      <div className="flex items-center bg-slate-100 rounded-xl border border-slate-200 p-0.5">
                        <button
                          type="button"
                          onClick={() => handleItemValueChange(idx, 'quantity', Math.max(1, item.quantity - 1))}
                          className="p-2 text-slate-600 hover:text-slate-900 active:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemValueChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                          className="w-full text-center font-mono font-extrabold text-xs bg-transparent focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleItemValueChange(idx, 'quantity', item.quantity + 1)}
                          className="p-2 text-slate-600 hover:text-slate-900 active:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Price Input */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">السعر الفردي (ج.م)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={item.price}
                        onChange={(e) => handleItemValueChange(idx, 'price', parseFloat(e.target.value) || 0)}
                        className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs w-full font-mono font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Subtotal Footer in Card */}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500 font-bold">الإجمالي الفرعي للبند:</span>
                    <span className="font-mono font-extrabold text-teal-700 text-sm">
                      {(item.price * item.quantity).toLocaleString()} جنية مصري
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP TABLE VIEW (Visible on medium+ screens) */}
          <div className="hidden md:block border border-white/20 rounded-xl overflow-hidden">
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="bg-white/10 text-slate-700 text-xs font-bold border-b border-white/10">
                  <th className="py-3 px-3 w-4/12">الخدمة / المستلزم الطبي</th>
                  <th className="py-3 px-3 w-3/12">تاريخ إجراء الخدمة</th>
                  <th className="py-3 px-3 w-1.5/12 text-center">الكمية</th>
                  <th className="py-3 px-3 w-1.5/12">السعر (جنية مصري)</th>
                  <th className="py-3 px-3 w-1.5/12 font-mono">الإجمالي الفرعي</th>
                  <th className="py-3 px-3 w-0.5/12 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/10 transition-colors align-top">
                    <td className="py-3 px-3">
                      <ServiceCombobox
                        services={services}
                        selectedServiceId={item.serviceId}
                        selectedServiceName={item.serviceName}
                        onOpenModal={() => setActiveModalItemIndex(idx)}
                        onSelect={(srv) => {
                          const updated = [...items];
                          updated[idx] = {
                            ...updated[idx],
                            serviceId: srv.id,
                            serviceName: srv.name,
                            price: srv.defaultPrice
                          };
                          setItems(updated);
                        }}
                      />
                    </td>
                    <td className="py-3 px-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1 text-[11px]">
                          <select
                            value={item.serviceDateType || 'single'}
                            onChange={(e) => handleItemValueChange(idx, 'serviceDateType', e.target.value)}
                            className="py-1 px-1.5 glass-input rounded text-[11px] bg-white/70 border border-slate-200 text-slate-800 font-medium"
                          >
                            <option value="single">تاريخ محدد</option>
                            <option value="range">فترة (من - إلى)</option>
                          </select>
                        </div>
                        
                        {item.serviceDateType === 'range' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              value={item.serviceDate || date}
                              onChange={(e) => handleItemValueChange(idx, 'serviceDate', e.target.value)}
                              className="py-1 px-1.5 glass-input rounded text-xs w-full text-center font-mono"
                              title="من تاريخ"
                            />
                            <span className="text-xs text-slate-500 font-bold">إلى</span>
                            <input
                              type="date"
                              value={item.serviceEndDate || ''}
                              onChange={(e) => handleItemValueChange(idx, 'serviceEndDate', e.target.value)}
                              className="py-1 px-1.5 glass-input rounded text-xs w-full text-center font-mono"
                              title="إلى تاريخ"
                            />
                          </div>
                        ) : (
                          <input
                            type="date"
                            value={item.serviceDate || date}
                            onChange={(e) => handleItemValueChange(idx, 'serviceDate', e.target.value)}
                            className="py-1 px-2 glass-input rounded-lg text-xs w-full text-center font-mono"
                          />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemValueChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                        className="block w-full py-1.5 px-2 glass-input rounded-lg text-center text-xs font-extrabold focus:outline-none"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={item.price}
                        onChange={(e) => handleItemValueChange(idx, 'price', parseFloat(e.target.value) || 0)}
                        className="block w-full py-1.5 px-2 glass-input rounded-lg text-xs font-extrabold focus:outline-none"
                      />
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800 font-mono text-xs pt-4">
                      {(item.price * item.quantity).toLocaleString()} ج.م
                    </td>
                    <td className="py-3 px-3 text-center pt-3.5">
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        disabled={items.length === 1}
                        className="text-red-500 hover:text-red-700 disabled:opacity-30 transition-all cursor-pointer p-1"
                        title="حذف سطر الخدمة"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add service button positioned directly below */}
          <div className="flex justify-start pt-1">
            <button
              type="button"
              onClick={handleAddItemRow}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-sm active:scale-98 min-h-[44px]"
            >
              <Plus className="h-4.5 w-4.5 text-white" />
              <span>إضافة خدمة أو مستلزم جديد للفاتورة</span>
            </button>
          </div>
        </div>

        {/* Notes and Calculations section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
          {/* Notes column */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">ملاحظات إضافية تطبع على الفاتورة</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: حالة المريض تتطلب رعاية خاصة / تم إعطاء كيس محلول وريدي..."
                rows={3}
                className="block w-full px-3 py-2 glass-input rounded-xl text-sm focus:outline-none"
              />
            </div>
            
            <div className="glass-card rounded-xl p-4 shadow-sm flex items-start gap-2.5">
              <Heart className="h-4.5 w-4.5 text-teal-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-teal-800 leading-relaxed font-sans font-semibold">
                <span className="font-bold">سياسة الفواتير الرقمية:</span> نظام هاي كير يدعم إصدار الفاتورة الإلكترونية المتوافقة بالكامل مع قوانين مصلحة الضرائب المصرية. يتم توليد رمز الاستجابة السريعة (QR) تلقائياً بمجرد حفظ الفاتورة لضمان الامتثال القانوني.
              </div>
            </div>
          </div>

          {/* Pricing totals column */}
          <div className="glass-card p-4 rounded-xl shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">ملخص تسعير الفاتورة</h4>
            
            <div className="space-y-3 divide-y divide-white/10 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-semibold">الإجمالي الفرعي:</span>
                <span className="font-semibold font-mono text-slate-900">{subtotal.toLocaleString()} جنية مصري</span>
              </div>

              {/* Discount inputs */}
              <div className="pt-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-semibold">الخصم المطبق:</span>
                  <div className="flex items-center gap-1">
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'value')}
                      className="glass-input rounded py-0.5 px-1 text-xs focus:outline-none"
                    >
                      <option value="value" className="bg-slate-100 text-slate-800">جنية مصري</option>
                      <option value="percentage" className="bg-slate-100 text-slate-800">٪</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Math.max(parseFloat(e.target.value) || 0, 0))}
                      className="w-16 glass-input rounded py-0.5 px-1 text-center font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>
                {discountAmount > 0 && (
                  <p className="text-[10px] text-red-600 font-semibold text-left">
                    قيمة الخصم المقتطعة: {discountAmount.toLocaleString()} جنية مصري
                  </p>
                )}
              </div>

              {/* Final totals */}
              <div className="pt-3 flex justify-between items-center text-slate-900 font-bold">
                <span>الإجمالي النهائي المستحق:</span>
                <span className="text-lg font-extrabold text-teal-700 font-mono">{finalTotal.toLocaleString()} جنية مصري</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Picker Modal */}
        <CustomerPickerModal
          isOpen={isCustomerModalOpen}
          onClose={() => setIsCustomerModalOpen(false)}
          customers={customers}
          onSelectCustomer={handleSelectCustomer}
        />

        {/* Buttons footer bar */}
        <div className="flex justify-end gap-3 border-t border-white/20 pt-6 bg-white/5 p-6 -mx-6 -mb-6">
          <button
            type="button"
            onClick={handleCancelAndUnlock}
            className="px-5 py-2.5 border border-white/20 text-slate-600 rounded-xl hover:bg-white/30 transition-all text-sm font-bold cursor-pointer"
          >
            إلغاء وتراجع
          </button>
          <button
            type="submit"
            disabled={loading}
            id="save-invoice-btn"
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm py-2.5 px-6 rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <Save className="h-4.5 w-4.5" />
            )}
            <span>{editingInvoice ? 'حفظ تعديلات الفاتورة' : 'إصدار وحفظ الفاتورة'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
