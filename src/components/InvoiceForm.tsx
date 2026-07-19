import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Save, X, Calculator, Search, UserCheck, Heart } from 'lucide-react';
import { Invoice, InvoiceItem, Service, Customer } from '../types';

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
        price: item.price
      })));
    }
  }, [editingInvoice]);

  // Handle phone change and filter customers for autocomplete
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomerPhone(value);
    
    if (value.trim().length >= 3) {
      const filtered = customers.filter(c => 
        c.phone.includes(value) || 
        c.name.toLowerCase().includes(value.toLowerCase())
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
    setItems([...items, { serviceId: '', serviceName: '', quantity: 1, price: 0 }]);
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
      serviceId: selectedSrv.id,
      serviceName: selectedSrv.name,
      quantity: updated[index].quantity,
      price: selectedSrv.defaultPrice
    };
    setItems(updated);
  };

  const handleItemValueChange = (index: number, field: 'quantity' | 'price', value: number) => {
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
  // ZATCA VAT calculations: simplified invoice amounts include 15% VAT. 
  // VAT = total - total / 1.15
  const vatAmount = Math.round((finalTotal - finalTotal / 1.15) * 100) / 100;

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Customer Phone (Autocomplete Trigger) */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-500 mb-1">رقم الجوال (البحث أو الإدخال)</label>
            <input
              type="text"
              required
              value={customerPhone}
              onChange={handlePhoneChange}
              onFocus={() => customerPhone.trim().length >= 3 && setShowCustomerDropdown(true)}
              onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
              placeholder="مثال: 0500000000"
              className="block w-full px-3 py-2.5 glass-input rounded-xl text-sm focus:outline-none transition-all"
            />
            {/* Autocomplete Dropdown */}
            {showCustomerDropdown && filteredCustomers.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-50 text-slate-800">
                {filteredCustomers.map(cust => (
                  <div
                    key={cust.id}
                    onMouseDown={() => handleSelectCustomer(cust)}
                    className="p-3 text-right hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{cust.name}</div>
                      <div className="text-slate-400 mt-0.5">{cust.phone}</div>
                    </div>
                    <UserCheck className="h-4 w-4 text-teal-500" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Name */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">اسم العميل بالكامل</label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="اسم المريض أو العميل"
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
              placeholder="مثال: الرياض، حي الياسمين"
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

        {/* Invoice items table */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="h-4.5 w-4.5 text-teal-600" />
              <span>جدول الخدمات الطبية المنزلية المقدمة</span>
            </h3>
            <button
              type="button"
              onClick={handleAddItemRow}
              className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة خدمة جديدة للفاتورة</span>
            </button>
          </div>

          <div className="border border-white/20 rounded-xl overflow-hidden">
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="bg-white/10 text-slate-700 text-xs font-bold border-b border-white/10">
                  <th className="py-3 px-4 w-1/2">الخدمة الطبية</th>
                  <th className="py-3 px-4 w-1/12 text-center">الكمية</th>
                  <th className="py-3 px-4 w-2/12">سعر الخدمة (ريال)</th>
                  <th className="py-3 px-4 w-2/12 font-mono">الإجمالي الفرعي</th>
                  <th className="py-3 px-4 w-1/12 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/10 transition-colors">
                    <td className="py-3 px-4">
                      <select
                        required
                        value={item.serviceId}
                        onChange={(e) => handleItemServiceChange(idx, e.target.value)}
                        className="block w-full py-1.5 px-3 glass-input rounded-lg text-xs focus:outline-none appearance-none"
                      >
                        <option value="" className="bg-slate-100 text-slate-800">-- اختر الخدمة من القائمة الافتراضية --</option>
                        {services.map(srv => (
                          <option key={srv.id} value={srv.id} className="bg-slate-100 text-slate-800">
                            {srv.name} (السعر: {srv.defaultPrice} ريال)
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemValueChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                        className="block w-full py-1 px-2 glass-input rounded-lg text-center text-xs focus:outline-none"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={item.price}
                        onChange={(e) => handleItemValueChange(idx, 'price', parseFloat(e.target.value) || 0)}
                        className="block w-full py-1 px-2 glass-input rounded-lg text-xs focus:outline-none"
                      />
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 font-mono">
                      {(item.price * item.quantity).toLocaleString()} ريال
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        disabled={items.length === 1}
                        className="text-red-500 hover:text-red-700 disabled:opacity-30 transition-all cursor-pointer"
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
                <span className="font-bold">سياسة e-Invoicing:</span> نظام هاي كير يدعم إصدار الفاتورة الإلكترونية المبسطة المتوافقة بالكامل مع هيئة الزكاة والضريبة والجمارك (ZATCA). يتم توليد رمز الاستجابة السريعة (QR) المشفر بصيغة TLV تلقائياً بمجرد حفظ الفاتورة لضمان الامتثال القانوني.
              </div>
            </div>
          </div>

          {/* Pricing totals column */}
          <div className="glass-card p-4 rounded-xl shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">ملخص تسعير الفاتورة</h4>
            
            <div className="space-y-3 divide-y divide-white/10 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-semibold">الإجمالي الفرعي:</span>
                <span className="font-semibold font-mono text-slate-900">{subtotal.toLocaleString()} ريال</span>
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
                      <option value="value" className="bg-slate-100 text-slate-800">ريال</option>
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
                    قيمة الخصم المقتطعة: {discountAmount.toLocaleString()} ريال
                  </p>
                )}
              </div>

              {/* Final totals */}
              <div className="pt-3 flex justify-between items-center text-slate-900 font-bold">
                <span>الإجمالي النهائي (شامل الضريبة):</span>
                <span className="text-lg font-extrabold text-teal-700 font-mono">{finalTotal.toLocaleString()} ريال</span>
              </div>

              <div className="pt-3 flex justify-between items-center text-xs text-slate-500 font-semibold">
                <span>ضريبة القيمة المضافة المشمولة (15%):</span>
                <span className="font-semibold font-mono">{vatAmount.toLocaleString()} ريال</span>
              </div>
            </div>
          </div>
        </div>

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
