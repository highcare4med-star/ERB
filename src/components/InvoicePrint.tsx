import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Printer, MessageCircle, ArrowLeft, Heart, CheckCircle2, ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';
import { Invoice, Settings } from '../types';
import { generateZATCABase64, getZATCAQRImageUrl } from '../utils/zatca';

interface InvoicePrintProps {
  token: string;
  invoice: Invoice;
  onBack: () => void;
}

export default function InvoicePrint({ token, invoice, onBack }: InvoicePrintProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch company settings to populate invoice header
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setSettings(data);
      } catch (err) {
        console.error('Error loading settings on invoice print page:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [token]);

  const handlePrint = () => {
    window.print();
  };

  const getWhatsAppLink = () => {
    if (!invoice) return '#';
    
    const companyName = settings?.companyName || 'هاي كير للخدمات الطبية المنزلية';
    
    // Build custom professional Arabic text for WhatsApp dispatch
    const text = `عزيزنا العميل *${invoice.customerName}*، 🌸
يسعدنا خدمتكم في *${companyName}*.

تم إصدار الفاتورة الطبية الخاصة بكم بتفاصيل الخدمات المقدمة:
📄 *رقم الفاتورة:* ${invoice.id}
📅 *التاريخ:* ${invoice.date}
💰 *إجمالي الفاتورة:* ${invoice.total.toLocaleString()} ريال (شامل ضريبة القيمة المضافة 15٪)

📥 *يمكنكم استعراض الفاتورة والاحتفاظ بنسخة للطباعة عبر الرابط المعتمد:*
${window.location.origin}/print/${invoice.id}

نتمنى لكم دوام الصحة والعافية. 🩺💚`;

    // Ensure phone is in international format if starts with 05
    let cleanPhone = invoice.customerPhone.trim();
    if (cleanPhone.startsWith('05')) {
      cleanPhone = '966' + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.replace('+', '');
    }

    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 text-sm">جاري جلب الفاتورة الطبية...</p>
      </div>
    );
  }

  const company = settings || {
    companyName: 'هاي كير للخدمات الطبية المنزلية',
    companyNameEn: 'Hi Care Home Medical Services',
    phone: '+966500000000',
    email: 'info@hicare.sa',
    address: 'الرياض، المملكة العربية السعودية',
    vatNumber: '310123456789003',
    invoicePolicy: 'الأسعار تشمل ضريبة القيمة المضافة 15%'
  };

  // Generate ZATCA base64 encoded TLV string for QR Code
  // Simplified tax invoice requirements require tag 1, 2, 3, 4, 5
  // VAT Amount is total - total / 1.15
  const invoiceVat = Math.round((invoice.total - invoice.total / 1.15) * 100) / 100;
  
  // Format invoice timestamp. Since we only have 'date' (YYYY-MM-DD), we append a generic 12:00:00 timestamp for Saudi ZATCA scan compliance.
  const timestampIso = `${invoice.date}T12:00:00Z`;
  
  const zatcaBase64 = generateZATCABase64(
    company.companyName,
    company.vatNumber,
    timestampIso,
    invoice.total.toFixed(2),
    invoiceVat.toFixed(2)
  );

  const qrImageUrl = getZATCAQRImageUrl(zatcaBase64);

  return (
    <div className="space-y-6 font-sans text-slate-800" dir="rtl">
      {/* Top Controls Toolbar (Hidden in print) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-4 rounded-xl shadow-sm print:hidden">
        <button
          onClick={onBack}
          className="self-start flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-all font-bold text-sm cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>العودة لسجل الفواتير</span>
        </button>

        <div className="flex items-center gap-3">
          {/* Send via WhatsApp */}
          <a
            href={getWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <MessageCircle className="h-4.5 w-4.5" />
            <span>إرسال وتذكير عبر واتساب</span>
          </a>

          {/* Trigger browser print layout */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Printer className="h-4.5 w-4.5" />
            <span>طباعة وتنزيل PDF (A4)</span>
          </button>
        </div>
      </div>

      {/* Main Printable A4 Container */}
      <div className="bg-white border border-slate-100 shadow-lg rounded-2xl max-w-4xl mx-auto p-8 sm:p-12 print:border-none print:shadow-none print:p-0 print:m-0 font-sans">
        
        {/* Style block dedicated to Print stylesheet overrides */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background-color: white !important;
              color: black !important;
              font-size: 12px !important;
            }
            .print\\:hidden {
              display: none !important;
            }
            header, footer, nav, sidebar, .navbar, .no-print {
              display: none !important;
            }
            .print\\:m-0 {
              margin: 0 !important;
            }
            .print\\:p-0 {
              padding: 0 !important;
            }
            .print\\:border-none {
              border: none !important;
            }
            .print\\:shadow-none {
              box-shadow: none !important;
            }
            /* Avoid page breaks inside invoice elements */
            .invoice-card {
              page-break-inside: avoid;
            }
          }
        `}} />

        {/* Invoice Card structure for Print optimization */}
        <div className="invoice-card space-y-8">
          {/* Company Header Block */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-100 pb-6 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-teal-600 rounded-xl flex items-center justify-center text-white font-bold font-mono shadow-md print:bg-slate-800">
                  <Heart className="h-7 w-7 text-white fill-white" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-slate-950">{company.companyName}</h1>
                  <h2 className="text-xs font-semibold text-slate-500 font-sans tracking-wide uppercase">{company.companyNameEn}</h2>
                </div>
              </div>
              <div className="text-xs text-slate-500 space-y-1 pr-1 pt-1">
                <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" /> <span>{company.address}</span></div>
                <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" /> <span dir="ltr">{company.phone}</span></div>
                {company.email && <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400" /> <span dir="ltr">{company.email}</span></div>}
              </div>
            </div>

            <div className="text-right sm:text-left space-y-2 shrink-0">
              <div className="bg-teal-50/50 text-teal-800 font-bold text-xs py-1 px-3 rounded-full inline-block border border-teal-100/30 print:bg-slate-100 print:text-black">
                فاتورة ضريبية مبسطة
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">{invoice.id}</h3>
              <div className="text-xs text-slate-500 space-y-1">
                <div>تاريخ الإصدار: <span className="font-bold text-slate-800 font-mono">{invoice.date}</span></div>
                <div>الرقم الضريبي للشركة: <span className="font-bold text-slate-800 font-mono">{company.vatNumber}</span></div>
                <div>حالة الفاتورة: <span className={`font-bold ${invoice.status === 'new' ? 'text-emerald-600' : 'text-red-500'}`}>{invoice.status === 'new' ? 'جديدة' : 'ملغاة'}</span></div>
              </div>
            </div>
          </div>

          {/* Customer Details Block */}
          <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 print:bg-slate-50 print:border">
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">بيانات العميل المستفيد</span>
              <div className="text-sm font-extrabold text-slate-900">{invoice.customerName}</div>
              <div className="text-xs text-slate-600">رقم الجوال: <span className="font-semibold font-mono" dir="ltr">{invoice.customerPhone}</span></div>
              {invoice.customerAddress && <div className="text-xs text-slate-600">عنوان الزيارة الطبية: <span className="font-semibold">{invoice.customerAddress}</span></div>}
            </div>

            <div className="sm:border-r border-slate-200 sm:pr-6 space-y-1.5 text-right sm:text-left">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">جهة إصدار الفاتورة</span>
              <div className="text-sm font-semibold text-slate-800">شركة هاي كير للخدمات الطبية المنزلية</div>
              <div className="text-xs text-slate-600">الموظف المسؤول: <span className="font-semibold font-mono">{invoice.createdBy}</span></div>
              <div className="text-xs text-slate-500">تم الحفظ تلقائياً في السجل الرقمي المعتمد للشركة</div>
            </div>
          </div>

          {/* Invoice Items Table */}
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">تفاصيل الخدمات الطبية المنزلية المقدمة</span>
            <div className="border border-slate-100 rounded-xl overflow-hidden print:border">
              <table className="w-full text-right border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-100">
                    <th className="py-3.5 px-4 w-1/12 text-center">#</th>
                    <th className="py-3.5 px-4 w-6/12">اسم الخدمة المقدمة ووصفها</th>
                    <th className="py-3.5 px-4 w-1/12 text-center">الكمية</th>
                    <th className="py-3.5 px-4 w-2/12">سعر الوحدة</th>
                    <th className="py-3.5 px-4 w-2/12 text-left font-mono">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/20 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-400 font-bold font-mono">{index + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.serviceName}</div>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600 font-mono">{item.quantity}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono">{item.price.toLocaleString()} ريال</td>
                      <td className="py-3 px-4 text-left font-bold text-slate-900 font-mono">{(item.price * item.quantity).toLocaleString()} ريال</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Columns: Notes & Totals & QR Code */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 items-start">
            
            {/* Notes and Policies */}
            <div className="md:col-span-7 space-y-4">
              {invoice.notes && (
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">ملاحظات الطبيب / الممرض</span>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">{invoice.notes}</p>
                </div>
              )}
              
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">الشروط والسياسة المطبوعة</span>
                <p className="text-[10px] text-slate-400 leading-normal font-sans">{company.invoicePolicy}</p>
              </div>
            </div>

            {/* Calculations Totals & QR Code Block */}
            <div className="md:col-span-5 bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4 print:bg-white print:border">
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>الإجمالي الفرعي الخاضع للضريبة:</span>
                  <span className="font-semibold font-mono text-slate-800">{invoice.subtotal.toLocaleString()} ريال</span>
                </div>
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-red-600 font-medium">
                    <span>الخصم المطبق:</span>
                    <span className="font-bold font-mono">-{invoice.discountAmount.toLocaleString()} ريال</span>
                  </div>
                )}
                <div className="border-t border-slate-200 my-2 pt-2 flex justify-between items-center text-slate-950 font-bold">
                  <span>الإجمالي النهائي المستحق:</span>
                  <span className="text-base font-extrabold text-teal-700 font-mono print:text-black">
                    {invoice.total.toLocaleString()} ريال
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>شامل ضريبة القيمة المضافة 15%:</span>
                  <span className="font-semibold font-mono">{invoiceVat.toLocaleString()} ريال</span>
                </div>
              </div>

              {/* Saudi ZATCA QR Code Scan Element */}
              <div className="border-t border-slate-200/60 pt-4 flex flex-col items-center text-center space-y-1.5">
                <div className="bg-white p-1.5 border border-slate-100 rounded-lg shadow-sm">
                  {qrImageUrl ? (
                    <img
                      src={qrImageUrl}
                      alt="ZATCA E-Invoicing QR Code"
                      className="h-32 w-32 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-32 w-32 bg-slate-100 flex items-center justify-center text-xs text-slate-400">جاري التوليد...</div>
                  )}
                </div>
                <span className="text-[9px] font-extrabold text-slate-400 tracking-wide">رمز الفاتورة الإلكترونية المعتمد لـ ZATCA</span>
              </div>

            </div>
          </div>

          {/* Bottom Signature Space */}
          <div className="border-t border-slate-100 pt-8 flex justify-between text-xs text-slate-500 px-2">
            <div className="space-y-1.5">
              <div>أُصدرت بواسطة الموظف المعتمد:</div>
              <div className="font-bold text-slate-800 font-sans">{invoice.createdBy}</div>
              <div className="h-0.5 w-24 border-b border-dashed border-slate-300 pt-2" />
            </div>

            <div className="space-y-1.5 text-left">
              <div>التوقيع والختم الرسمي للشركة:</div>
              <div className="font-bold text-slate-800">Hi Care Medical Services</div>
              <div className="h-0.5 w-24 border-b border-dashed border-slate-300 pt-2 mr-auto" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
