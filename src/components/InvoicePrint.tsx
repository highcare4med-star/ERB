import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Printer, MessageCircle, ArrowLeft, Download, FileText } from 'lucide-react';
import { Invoice, Settings } from '../types';

interface InvoicePrintProps {
  token: string;
  invoice: Invoice;
  onBack: () => void;
}

export default function InvoicePrint({ token, invoice, onBack }: InvoicePrintProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [sharingWhatsapp, setSharingWhatsapp] = useState(false);
  const [whatsappNotice, setWhatsappNotice] = useState<string | null>(null);

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
    // Trigger standard browser print window
    window.print();
  };

  const getCleanFileName = () => {
    const cName = (invoice?.customerName || 'عميل').trim().replace(/[/\\?%*:|"<>]/g, '_');
    const code = (invoice?.id || 'HC').trim();
    return `فاتورة_${cName}_${code}.pdf`;
  };

  const getServiceNameStyle = (name: string) => {
    const len = (name || '').trim().length;
    let fontSize = '12px';
    let lineHeight = '1.35';
    if (len > 60) {
      fontSize = '9px';
      lineHeight = '1.2';
    } else if (len > 35) {
      fontSize = '10px';
      lineHeight = '1.25';
    } else if (len > 20) {
      fontSize = '11px';
      lineHeight = '1.3';
    }
    return {
      fontSize,
      lineHeight,
      wordBreak: 'break-word' as const,
      overflowWrap: 'break-word' as const,
      whiteSpace: 'normal' as const
    };
  };

  const getPdfOptions = () => ({
    margin: 6,
    filename: getCleanFileName(),
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc: Document) => {
        const origEl = document.getElementById('printable-invoice');
        const clonedEl = clonedDoc.getElementById('printable-invoice');

        if (origEl && clonedEl) {
          const propsToCopy = [
            'color',
            'background-color',
            'border-top-color',
            'border-bottom-color',
            'border-left-color',
            'border-right-color',
            'border-top-width',
            'border-bottom-width',
            'border-left-width',
            'border-right-width',
            'border-top-style',
            'border-bottom-style',
            'border-left-style',
            'border-right-style',
            'border-top-left-radius',
            'border-top-right-radius',
            'border-bottom-left-radius',
            'border-bottom-right-radius',
            'border-collapse',
            'border-spacing',
            'font-size',
            'font-weight',
            'font-family',
            'line-height',
            'font-style',
            'text-align',
            'direction',
            'padding-top',
            'padding-bottom',
            'padding-left',
            'padding-right',
            'margin-top',
            'margin-bottom',
            'margin-left',
            'margin-right',
            'display',
            'flex-direction',
            'align-items',
            'justify-content',
            'grid-template-columns',
            'gap',
            'row-gap',
            'column-gap',
            'width',
            'height',
            'max-width',
            'min-width',
            'box-sizing',
            'vertical-align',
            'overflow'
          ];

          const origNodes = [origEl, ...Array.from(origEl.querySelectorAll('*'))] as HTMLElement[];
          const cloneNodes = [clonedEl, ...Array.from(clonedEl.querySelectorAll('*'))] as HTMLElement[];

          origNodes.forEach((node, idx) => {
            const cloneNode = cloneNodes[idx];
            if (!cloneNode || !cloneNode.style) return;
            try {
              const computed = window.getComputedStyle(node);
              propsToCopy.forEach((prop) => {
                const val = computed.getPropertyValue(prop);
                if (val) {
                  cloneNode.style.setProperty(prop, val);
                }
              });
              cloneNode.style.boxShadow = 'none';
            } catch {
              // Ignore elements without computed style
            }
          });

          // Ensure main container styling
          clonedEl.style.width = '800px';
          clonedEl.style.maxWidth = '800px';
          clonedEl.style.backgroundColor = '#ffffff';
          clonedEl.style.padding = '32px';
          clonedEl.style.boxSizing = 'border-box';
          clonedEl.style.direction = 'rtl';
          clonedEl.style.textAlign = 'right';
          clonedEl.style.border = '1px solid #a7f3d0';
          clonedEl.style.borderRadius = '12px';

          // Remove all stylesheets from cloned document so html2canvas never sees raw Tailwind v4 oklch rules
          const stylesheets = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
          stylesheets.forEach((sheet) => sheet.remove());
        }
      }
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
  });

  const handleDownloadPdf = async () => {
    const element = document.getElementById('printable-invoice');
    if (!element) return;
    setDownloadingPdf(true);
    try {
      // @ts-ignore
      const html2pdfModule = (await import('html2pdf.js')).default;
      const opt = getPdfOptions();
      await html2pdfModule().set(opt).from(element).save();
    } catch (err) {
      console.error('Error generating PDF with html2pdf:', err);
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  const getWhatsAppUrl = () => {
    if (!invoice) return '#';
    
    // Short concise WhatsApp message
    const text = `فاتورة طبية - شركة High Care 📄
رقم الفاتورة: ${invoice.id}
العميل: ${invoice.customerName}
المبلغ المستحق: ${invoice.total.toLocaleString()} جنية مصري

شكرًا لاختياركم شركة High Care للخدمات الطبية المنزلية.`;

    let cleanPhone = invoice.customerPhone.trim();
    if (cleanPhone.startsWith('01')) {
      cleanPhone = '20' + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith('05')) {
      cleanPhone = '966' + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.replace('+', '');
    } else if (cleanPhone.startsWith('0')) {
      cleanPhone = '20' + cleanPhone.slice(1);
    }

    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
  };

  const handleShareWhatsApp = async () => {
    const element = document.getElementById('printable-invoice');
    if (!element || !invoice) return;

    setSharingWhatsapp(true);
    setWhatsappNotice(null);

    const waUrl = getWhatsAppUrl();

    try {
      // @ts-ignore
      const html2pdfModule = (await import('html2pdf.js')).default;
      const opt = getPdfOptions();

      // Generate PDF blob
      const pdfWorker = html2pdfModule().set(opt).from(element);
      const pdfBlob: Blob = await pdfWorker.output('blob');

      const fileName = getCleanFileName();
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      // Try Web Share API with File payload (Supported on Mobile browsers like iOS Safari / Chrome Android)
      if (
        navigator.canShare &&
        navigator.canShare({ files: [pdfFile] })
      ) {
        try {
          await navigator.share({
            files: [pdfFile],
            title: `فاتورة طبية ${invoice.id}`,
            text: `فاتورة طبية - شركة High Care 📄\nرقم الفاتورة: ${invoice.id}\nالعميل: ${invoice.customerName}\nالمبلغ: ${invoice.total.toLocaleString()} جنية مصري`
          });
          setSharingWhatsapp(false);
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            setSharingWhatsapp(false);
            return;
          }
          console.log('Web Share API file share failed, falling back to download + open link', shareErr);
        }
      }

      // Fallback: Save PDF directly to user's downloads folder
      await html2pdfModule().set(opt).from(element).save();

      // Open WhatsApp chat in new window
      window.open(waUrl, '_blank');

      // Display alert notice to instruct user
      setWhatsappNotice(
        `تم تنزيل ملف الفاتورة PDF بنجاح (${fileName})! يمكنك الآن إرفاقه في محادثة الواتساب المفتوحة.`
      );
    } catch (err) {
      console.error('Error generating PDF for WhatsApp:', err);
      window.open(waUrl, '_blank');
    } finally {
      setSharingWhatsapp(false);
    }
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
    companyName: 'هاي كير للخدمات الطبية',
    companyNameEn: 'High Care Medical Services',
    phone: '+201000000000',
    email: 'info@hicare.eg',
    address: 'القاهرة، جمهورية مصر العربية',
    vatNumber: '123-456-789',
    invoicePolicy: 'تخضع للشروط والأحكام الخاصة بشركة هاي كير للخدمات الطبية.',
    logoUrl: '/logo.jpg'
  };

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

        <div className="flex flex-wrap items-center gap-3">
          {/* Download PDF button */}
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
            title="تحميل الفاتورة مباشرة بصيغة PDF"
          >
            {downloadingPdf ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="h-4.5 w-4.5" />
            )}
            <span>{downloadingPdf ? 'جاري التحميل...' : 'تنزيل PDF'}</span>
          </button>

          {/* Send via WhatsApp */}
          <button
            onClick={handleShareWhatsApp}
            disabled={sharingWhatsapp}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
            title="مشاركة الفاتورة بصيغة PDF مباشرة عبر واتساب"
          >
            {sharingWhatsapp ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <MessageCircle className="h-4.5 w-4.5" />
            )}
            <span>{sharingWhatsapp ? 'جاري تجهيز الفاتورة...' : 'إرسال الفاتورة (PDF) عبر واتساب'}</span>
          </button>

          {/* Trigger browser print layout */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Printer className="h-4.5 w-4.5" />
            <span>طباعة الفاتورة</span>
          </button>
        </div>
      </div>

      {whatsappNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-xl flex items-center justify-between gap-3 shadow-sm print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="text-base">📄</span>
            <span className="font-semibold">{whatsappNotice}</span>
          </div>
          <button
            onClick={() => setWhatsappNotice(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold text-xs px-2 py-1 rounded bg-emerald-100 hover:bg-emerald-200 transition-colors"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Main Printable A4 Container */}
      <div 
        id="printable-invoice"
        dir="rtl"
        className="bg-white border border-emerald-200 shadow-lg rounded-xl max-w-3xl mx-auto p-6 sm:p-8 print:border-none print:shadow-none print:p-0 print:m-0 font-sans text-right"
        style={{ direction: 'rtl', textAlign: 'right' }}
      >
        {/* Style block dedicated to Print stylesheet overrides */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            html, body, #root {
              background-color: white !important;
              background-image: none !important;
              color: black !important;
              font-size: 12px !important;
              margin: 0 !important;
              padding: 0 !important;
              height: auto !important;
              overflow: visible !important;
              direction: rtl !important;
            }
            .print\\:hidden, nav, header, aside, .glass-sidebar, .glass-header {
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
            .invoice-card {
              page-break-inside: avoid;
            }
          }
        `}} />

        {/* Invoice Card structure for Print optimization */}
        <div className="invoice-card space-y-6" style={{ direction: 'rtl', textAlign: 'right' }}>
          
          {/* Company Header Block - Refined Header Layout */}
          <div style={{ borderBottom: '3px solid #047857', paddingBottom: '12px', marginBottom: '24px' }} className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="space-y-1 text-right">
              <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight" style={{ color: '#000000' }}>{company.companyName}</h1>
              <h2 className="text-xs font-extrabold text-emerald-800 tracking-wide uppercase" style={{ color: '#047857' }}>High Care Medical Services</h2>
            </div>

            <div style={{ backgroundColor: '#f0fdf4', borderColor: '#047857', borderStyle: 'solid', borderWidth: '1px', padding: '8px 16px', borderRadius: '10px' }} className="text-center shrink-0 min-w-[170px]">
              <div className="text-[10px] font-extrabold text-black uppercase tracking-wider" style={{ color: '#000000' }}>فاتورة خدمات طبية</div>
              <h3 className="text-sm sm:text-base font-black text-black font-mono tracking-tight" dir="ltr" style={{ color: '#000000' }}>{invoice.id}</h3>
              <div className="text-[11px] text-black font-bold" style={{ color: '#000000' }}>تاريخ الإصدار: <span className="font-bold text-black font-mono">{invoice.date}</span></div>
            </div>
          </div>

          {/* Structured Table: Customer & Invoice Info */}
          <div className="mb-6 text-center" style={{ marginBottom: '28px' }}>
            <table className="w-full text-center text-xs" style={{ borderCollapse: 'collapse', border: '1px solid #059669', width: '100%', direction: 'rtl' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #059669' }}>
                  <td style={{ backgroundColor: '#ecfdf5', fontWeight: 'bold', color: '#000000', padding: '8px 10px', border: '1px solid #059669', width: '16%', textAlign: 'center', verticalAlign: 'middle' }}>اسم العميل:</td>
                  <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#000000', border: '1px solid #059669', width: '34%', textAlign: 'center', verticalAlign: 'middle' }}>{invoice.customerName}</td>
                  <td style={{ backgroundColor: '#ecfdf5', fontWeight: 'bold', color: '#000000', padding: '8px 10px', border: '1px solid #059669', width: '16%', textAlign: 'center', verticalAlign: 'middle' }}>رقم الهاتف:</td>
                  <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#000000', border: '1px solid #059669', width: '34%', textAlign: 'center', verticalAlign: 'middle', fontFamily: 'monospace' }} dir="ltr">{invoice.customerPhone}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #059669' }}>
                  <td style={{ backgroundColor: '#ecfdf5', fontWeight: 'bold', color: '#000000', padding: '8px 10px', border: '1px solid #059669', textAlign: 'center', verticalAlign: 'middle' }}>عنوان الزيارة:</td>
                  <td style={{ padding: '8px 10px', color: '#000000', fontWeight: 'bold', border: '1px solid #059669', textAlign: 'center', verticalAlign: 'middle' }}>{invoice.customerAddress || 'غير محدد'}</td>
                  <td style={{ backgroundColor: '#ecfdf5', fontWeight: 'bold', color: '#000000', padding: '8px 10px', border: '1px solid #059669', textAlign: 'center', verticalAlign: 'middle' }}>حالة الفاتورة:</td>
                  <td style={{ padding: '8px 10px', fontWeight: 'bold', border: '1px solid #059669', textAlign: 'center', verticalAlign: 'middle' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: invoice.status === 'new' ? '#d1fae5' : '#fee2e2', color: invoice.status === 'new' ? '#065f46' : '#991b1b', border: `1px solid ${invoice.status === 'new' ? '#059669' : '#fca5a5'}` }}>
                      {invoice.status === 'new' ? 'جديدة' : 'ملغاة'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ backgroundColor: '#ecfdf5', fontWeight: 'bold', color: '#000000', padding: '8px 10px', border: '1px solid #059669', textAlign: 'center', verticalAlign: 'middle' }}>جهة الإصدار:</td>
                  <td style={{ padding: '8px 10px', color: '#000000', fontWeight: 'bold', border: '1px solid #059669', textAlign: 'center', verticalAlign: 'middle' }}>{company.companyName}</td>
                  <td style={{ backgroundColor: '#ecfdf5', fontWeight: 'bold', color: '#000000', padding: '8px 10px', border: '1px solid #059669', textAlign: 'center', verticalAlign: 'middle' }}>الموظف المسؤول:</td>
                  <td style={{ padding: '8px 10px', color: '#000000', fontWeight: 'bold', fontFamily: 'monospace', border: '1px solid #059669', textAlign: 'center', verticalAlign: 'middle' }}>{invoice.createdBy}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Invoice Items Table - Clear Large Spacing & Centered Crisp Black Text */}
          <div className="text-center" style={{ marginTop: '28px', marginBottom: '28px' }}>
            <table className="w-full text-center text-xs" style={{ borderCollapse: 'collapse', border: '1px solid #059669', width: '100%', direction: 'rtl' }}>
              <thead>
                <tr style={{ backgroundColor: '#047857', color: '#ffffff' }}>
                  <th style={{ padding: '10px 8px', width: '6%', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #047857', fontWeight: '800', fontSize: '13px', color: '#ffffff' }}>م</th>
                  <th style={{ padding: '10px 12px', width: '38%', border: '1px solid #047857', fontWeight: '800', fontSize: '13px', textAlign: 'center', verticalAlign: 'middle', color: '#ffffff' }}>اسم الخدمة المقدمة</th>
                  <th style={{ padding: '10px 12px', width: '26%', border: '1px solid #047857', fontWeight: '800', fontSize: '13px', textAlign: 'center', verticalAlign: 'middle', color: '#ffffff' }}>تاريخ إجراء الخدمة</th>
                  <th style={{ padding: '10px 8px', width: '8%', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #047857', fontWeight: '800', fontSize: '13px', color: '#ffffff' }}>الكمية</th>
                  <th style={{ padding: '10px 12px', width: '11%', border: '1px solid #047857', fontWeight: '800', fontSize: '13px', textAlign: 'center', verticalAlign: 'middle', color: '#ffffff' }}>سعر الوحدة</th>
                  <th style={{ padding: '10px 12px', width: '11%', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #047857', fontWeight: '800', fontSize: '13px', fontFamily: 'monospace', color: '#ffffff' }}>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => {
                  const cleanDateStr = (str?: string) => {
                    if (!str) return '';
                    if (str.includes('-')) {
                      const parts = str.split('-');
                      if (parts.length === 3) {
                        const y = parts[0];
                        const m = parseInt(parts[1], 10);
                        const d = parseInt(parts[2], 10);
                        return `${d}/${m}/${y}`;
                      }
                    }
                    return str;
                  };

                  const startDate = item.serviceDate || invoice.date;
                  const endDate = item.serviceEndDate;
                  const isRange = item.serviceDateType === 'range' || Boolean(endDate);
                  const sClean = cleanDateStr(startDate);
                  const eClean = cleanDateStr(endDate || startDate);

                  const formattedDate = isRange
                    ? `من ${sClean} إلى ${eClean}`
                    : sClean;

                  const bgColor = index % 2 === 0 ? '#ffffff' : '#f0fdf4';

                  return (
                    <tr key={index} style={{ backgroundColor: bgColor }}>
                      <td style={{ padding: '8px 8px', textAlign: 'center', verticalAlign: 'middle', color: '#000000', fontWeight: 'bold', fontFamily: 'monospace', border: '1px solid #059669' }}>{index + 1}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 'bold', color: '#000000', border: '1px solid #059669', textAlign: 'center', verticalAlign: 'middle', ...getServiceNameStyle(item.serviceName) }}>{item.serviceName}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px', color: '#000000', fontWeight: 'bold', border: '1px solid #059669', textAlign: 'center', verticalAlign: 'middle' }}>{formattedDate}</td>
                      <td style={{ padding: '8px 8px', textAlign: 'center', verticalAlign: 'middle', color: '#000000', fontWeight: 'bold', fontFamily: 'monospace', border: '1px solid #059669' }}>{item.quantity}</td>
                      <td style={{ padding: '8px 12px', color: '#000000', fontWeight: 'bold', fontFamily: 'monospace', border: '1px solid #059669', textAlign: 'center', verticalAlign: 'middle' }}>{item.price.toLocaleString()}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', color: '#000000', fontFamily: 'monospace', border: '1px solid #059669' }}>{(item.price * item.quantity).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Columns: Notes & Totals Table - Generous Gap Above */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2 items-start text-right" style={{ marginTop: '28px' }}>
            
            {/* Notes and Policies */}
            <div className="md:col-span-7 space-y-3 text-right">
              {invoice.notes && (
                <div style={{ border: '1px solid #059669', borderRadius: '6px', padding: '10px 12px', backgroundColor: '#f0fdf4' }} className="space-y-1">
                  <span className="text-[11px] font-black text-black uppercase tracking-wider block" style={{ color: '#000000' }}>ملاحظات:</span>
                  <p className="text-xs text-black leading-relaxed font-bold" style={{ color: '#000000' }}>{invoice.notes}</p>
                </div>
              )}
              
              <div style={{ border: '1px solid #059669', borderRadius: '6px', padding: '6px 10px', backgroundColor: '#ffffff' }} className="space-y-0.5">
                <span className="text-[9px] font-bold text-black uppercase tracking-wider block" style={{ color: '#000000', fontSize: '9px' }}>الشروط والسياسة:</span>
                <p className="text-[9px] text-black font-medium leading-tight font-sans" style={{ color: '#000000', fontSize: '9px' }}>{company.invoicePolicy}</p>
              </div>
            </div>

            {/* Structured Summary Totals Table */}
            <div className="md:col-span-5 text-center">
              <table className="w-full text-center text-xs" style={{ borderCollapse: 'collapse', border: '1px solid #059669', width: '100%', direction: 'rtl' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #059669' }}>
                    <td style={{ backgroundColor: '#ecfdf5', fontWeight: 'bold', color: '#000000', padding: '8px 12px', border: '1px solid #059669', width: '50%', textAlign: 'center', verticalAlign: 'middle' }}>الإجمالي الفرعي:</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', fontFamily: 'monospace', color: '#000000', border: '1px solid #059669' }}>{invoice.subtotal.toLocaleString()} ج.م</td>
                  </tr>
                  {invoice.discountAmount > 0 && (
                    <tr style={{ borderBottom: '1px solid #fca5a5', color: '#dc2626' }}>
                      <td style={{ backgroundColor: '#fef2f2', fontWeight: 'bold', padding: '8px 12px', border: '1px solid #fca5a5', textAlign: 'center', verticalAlign: 'middle' }}>الخصم المطبق:</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', fontFamily: 'monospace', border: '1px solid #fca5a5' }}>-{invoice.discountAmount.toLocaleString()} ج.م</td>
                    </tr>
                  )}
                  <tr style={{ backgroundColor: '#047857', color: '#ffffff', fontWeight: 'bold' }}>
                    <td style={{ padding: '14px 16px', border: '1px solid #047857', fontSize: '16px', fontWeight: '900', textAlign: 'center', verticalAlign: 'middle', color: '#ffffff' }}>الإجمالي النهائي المستحق:</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle', fontWeight: '900', fontSize: '24px', fontFamily: 'monospace', color: '#ffffff', border: '1px solid #047857' }}>{invoice.total.toLocaleString()} ج.م</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
