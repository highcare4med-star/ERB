import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Download, Printer, Filter, RefreshCw, MessageCircle, X, Send, Phone, ExternalLink } from 'lucide-react';
import {
  CaseAccount,
  OutgoingCategory,
  OutgoingRecord,
  ProfitDistributionRecord,
  RevenuePaymentMethod,
  RevenueRecord,
  Settings
} from '../types';

export type AccountsReportType =
  | 'case_accounts'
  | 'revenues'
  | 'outgoings'
  | 'profit_distribution'
  | 'comprehensive';

export const OUTGOING_CATEGORIES: { value: OutgoingCategory; label: string }[] = [
  { value: 'supplies', label: 'المستلزمات' },
  { value: 'pharmacy_meds', label: 'ادوية الصيدلية' },
  { value: 'labs', label: 'تحاليل' },
  { value: 'doctors', label: 'اطباء' },
  { value: 'devices', label: 'أجهزه' },
  { value: 'ambulance_blood', label: 'اسعاف دم وصفائح دمويه' },
  { value: 'abg', label: 'ABG' },
  { value: 'physiotherapy', label: 'علاج طبيعي' },
  { value: 'treatment_stores', label: 'مخازن علاجات' }
];

export const OUTGOING_CATEGORY_LABELS: Record<OutgoingCategory, string> = {
  supplies: 'المستلزمات',
  pharmacy_meds: 'ادوية الصيدلية',
  labs: 'تحاليل',
  doctors: 'اطباء',
  devices: 'أجهزه',
  ambulance_blood: 'اسعاف دم وصفائح دمويه',
  abg: 'ABG',
  physiotherapy: 'علاج طبيعي',
  treatment_stores: 'مخازن علاجات'
};

const PAYMENT_METHOD_LABELS: Record<RevenuePaymentMethod, string> = {
  cash: 'نقدي',
  instapay: 'تحويل انستا باي',
  e_wallet: 'محفظة الكترونية',
  bank_transfer: 'تحويل بنكي'
};

interface AccountsReportPrintProps {
  token: string;
  initialReportType: AccountsReportType;
  initialOutgoingCategory?: 'all' | OutgoingCategory;
  caseAccounts: CaseAccount[];
  revenues: RevenueRecord[];
  outgoings: OutgoingRecord[];
  profitDistributions: ProfitDistributionRecord[];
  onBack: () => void;
}

function formatNum(val: number): string {
  return Number(val || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

export default function AccountsReportPrint({
  token,
  initialReportType,
  initialOutgoingCategory = 'all',
  caseAccounts,
  revenues,
  outgoings,
  profitDistributions,
  onBack
}: AccountsReportPrintProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [sharingWhatsapp, setSharingWhatsapp] = useState(false);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState<string>(() => {
    try {
      return localStorage.getItem('hicare_last_report_wa_phone') || '';
    } catch {
      return '';
    }
  });
  const [whatsappCustomText, setWhatsappCustomText] = useState<string>('');
  const [whatsappNotice, setWhatsappNotice] = useState<{ message: string; waUrl: string } | null>(null);

  // Interactive report filters
  const [reportType, setReportType] = useState<AccountsReportType>(initialReportType);
  const [selectedCase, setSelectedCase] = useState<string>('all');
  const [selectedOutgoingCat, setSelectedOutgoingCat] = useState<'all' | OutgoingCategory>(
    initialOutgoingCategory
  );
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (err) {
        console.error('Error loading settings for report:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [token]);

  const allCaseNames = useMemo(() => {
    const set = new Set<string>();
    caseAccounts.forEach(c => c.caseName.trim() && set.add(c.caseName.trim()));
    revenues.forEach(r => r.caseName.trim() && set.add(r.caseName.trim()));
    outgoings.forEach(o => o.caseName.trim() && set.add(o.caseName.trim()));
    profitDistributions.forEach(p => p.caseName.trim() && set.add(p.caseName.trim()));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [caseAccounts, revenues, outgoings, profitDistributions]);

  // Filtered datasets
  const filteredCaseAccounts = useMemo(() => {
    return caseAccounts.filter(c => {
      if (selectedCase !== 'all' && c.caseName.trim() !== selectedCase) return false;
      if (dateFrom && c.endDate < dateFrom) return false;
      if (dateTo && c.startDate > dateTo) return false;
      return true;
    });
  }, [caseAccounts, selectedCase, dateFrom, dateTo]);

  const filteredRevenues = useMemo(() => {
    return revenues.filter(r => {
      if (selectedCase !== 'all' && r.caseName.trim() !== selectedCase) return false;
      if (dateFrom && r.collectionDate < dateFrom) return false;
      if (dateTo && r.collectionDate > dateTo) return false;
      return true;
    });
  }, [revenues, selectedCase, dateFrom, dateTo]);

  const filteredOutgoings = useMemo(() => {
    return outgoings.filter(o => {
      if (reportType === 'outgoings' && selectedOutgoingCat !== 'all' && o.category !== selectedOutgoingCat) {
        return false;
      }
      if (selectedCase !== 'all' && o.caseName.trim() !== selectedCase) return false;
      if (dateFrom && o.date < dateFrom) return false;
      if (dateTo && o.date > dateTo) return false;
      return true;
    });
  }, [outgoings, reportType, selectedOutgoingCat, selectedCase, dateFrom, dateTo]);

  const filteredProfitDistributions = useMemo(() => {
    return profitDistributions.filter(p => {
      if (selectedCase !== 'all' && p.caseName.trim() !== selectedCase) return false;
      if (dateFrom && p.periodTo < dateFrom) return false;
      if (dateTo && p.periodFrom > dateTo) return false;
      return true;
    });
  }, [profitDistributions, selectedCase, dateFrom, dateTo]);

  // Aggregations
  const caseTotals = useMemo(() => {
    return filteredCaseAccounts.reduce(
      (acc, c) => {
        acc.days += c.daysCount;
        acc.cost += c.totalCost;
        return acc;
      },
      { days: 0, cost: 0 }
    );
  }, [filteredCaseAccounts]);

  const revenueTotals = useMemo(() => {
    const totals = { total: 0, cash: 0, instapay: 0, e_wallet: 0, bank_transfer: 0 };
    filteredRevenues.forEach(r => {
      totals.total += r.amount;
      totals[r.paymentMethod] += r.amount;
    });
    return totals;
  }, [filteredRevenues]);

  const outgoingTotals = useMemo(() => {
    const byCategory: Record<OutgoingCategory, { count: number; total: number }> = {
      supplies: { count: 0, total: 0 },
      pharmacy_meds: { count: 0, total: 0 },
      labs: { count: 0, total: 0 },
      doctors: { count: 0, total: 0 },
      devices: { count: 0, total: 0 },
      ambulance_blood: { count: 0, total: 0 },
      abg: { count: 0, total: 0 },
      physiotherapy: { count: 0, total: 0 },
      treatment_stores: { count: 0, total: 0 }
    };
    let grandTotal = 0;
    filteredOutgoings.forEach(o => {
      grandTotal += o.amount;
      if (byCategory[o.category]) {
        byCategory[o.category].count += 1;
        byCategory[o.category].total += o.amount;
      }
    });
    return { grandTotal, byCategory };
  }, [filteredOutgoings]);

  const profitTotals = useMemo(() => {
    return filteredProfitDistributions.reduce(
      (acc, p) => {
        acc.drMai += p.drMaiAmount;
        acc.drElham += p.drElhamAmount;
        acc.drHanySamir += p.drHanySamirAmount;
        acc.otherDoctor += p.otherDoctorAmount;
        acc.totalDistributed += p.totalDistributed;
        return acc;
      },
      { drMai: 0, drElham: 0, drHanySamir: 0, otherDoctor: 0, totalDistributed: 0 }
    );
  }, [filteredProfitDistributions]);

  const netAfterOutgoings = revenueTotals.total - outgoingTotals.grandTotal;
  const netAfterAllCosts = revenueTotals.total - (caseTotals.cost + outgoingTotals.grandTotal);

  const reportTitle = useMemo(() => {
    if (reportType === 'case_accounts') return 'تقرير حسابات الحالات';
    if (reportType === 'revenues') return 'تقرير قسم الإيرادات والتحصيلات';
    if (reportType === 'outgoings') {
      return selectedOutgoingCat === 'all'
        ? 'تقرير قسم الخارج (جميع البنود)'
        : `تقرير قسم الخارج — ${OUTGOING_CATEGORY_LABELS[selectedOutgoingCat]}`;
    }
    if (reportType === 'profit_distribution') return 'تقرير توزيع الأرباح';
    return 'التقرير المالي الشامل (كامل الحسابات)';
  }, [reportType, selectedOutgoingCat]);

  const todayStr = new Date().toISOString().split('T')[0];
  const refCode = `HC-ACC-${todayStr.replace(/-/g, '')}`;

  const totalRecordCount = useMemo(() => {
    if (reportType === 'case_accounts') return filteredCaseAccounts.length;
    if (reportType === 'revenues') return filteredRevenues.length;
    if (reportType === 'outgoings') return filteredOutgoings.length;
    if (reportType === 'profit_distribution') return filteredProfitDistributions.length;
    return (
      filteredCaseAccounts.length +
      filteredRevenues.length +
      filteredOutgoings.length +
      filteredProfitDistributions.length
    );
  }, [
    reportType,
    filteredCaseAccounts.length,
    filteredRevenues.length,
    filteredOutgoings.length,
    filteredProfitDistributions.length
  ]);

  const getCleanFileName = () => {
    const outgoingEnSlugs: Record<OutgoingCategory, string> = {
      supplies: 'Supplies',
      pharmacy_meds: 'Pharmacy_Meds',
      labs: 'Labs',
      doctors: 'Doctors',
      devices: 'Devices',
      ambulance_blood: 'Ambulance_Blood',
      abg: 'ABG',
      physiotherapy: 'Physiotherapy',
      treatment_stores: 'Treatment_Stores'
    };

    const typeSlug: Record<AccountsReportType, string> = {
      case_accounts: 'HighCare_Case_Accounts_Report',
      revenues: 'HighCare_Revenues_Report',
      outgoings:
        selectedOutgoingCat === 'all'
          ? 'HighCare_Outgoings_Report'
          : `HighCare_Outgoings_${outgoingEnSlugs[selectedOutgoingCat]}_Report`,
      profit_distribution: 'HighCare_Profit_Distribution_Report',
      comprehensive: 'HighCare_Comprehensive_Accounts_Report'
    };

    let caseSuffix = '';
    if (selectedCase !== 'all') {
      const asciiCase = selectedCase
        .trim()
        .replace(/[^a-zA-Z0-9\s_-]/g, '')
        .trim()
        .replace(/\s+/g, '_');
      if (asciiCase) {
        caseSuffix = `_${asciiCase}`;
      } else {
        const idx = allCaseNames.indexOf(selectedCase);
        caseSuffix = idx >= 0 ? `_Case_${idx + 1}` : '_Selected_Case';
      }
    }

    const cleanDate = todayStr.replace(/[^0-9-]/g, '');
    return `${typeSlug[reportType]}${caseSuffix}_${cleanDate}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');
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
        const origEl = document.getElementById('printable-account-report');
        const clonedEl = clonedDoc.getElementById('printable-account-report');

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
              propsToCopy.forEach(prop => {
                const val = computed.getPropertyValue(prop);
                if (val && !val.includes('oklch') && !val.includes('oklab') && !val.includes('color-mix')) {
                  cloneNode.style.setProperty(prop, val);
                }
              });
              cloneNode.style.boxShadow = 'none';
            } catch {
              // Ignore elements without computed style
            }
          });

          clonedEl.style.width = '820px';
          clonedEl.style.maxWidth = '820px';
          clonedEl.style.backgroundColor = '#ffffff';
          clonedEl.style.padding = '28px';
          clonedEl.style.boxSizing = 'border-box';
          clonedEl.style.direction = 'rtl';
          clonedEl.style.textAlign = 'right';
          clonedEl.style.border = '1px solid #a7f3d0';
          clonedEl.style.borderRadius = '12px';

          const stylesheets = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
          stylesheets.forEach(sheet => sheet.remove());
        }
      }
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
  });

  const handleDownloadPdf = async () => {
    const element = document.getElementById('printable-account-report');
    if (!element) return;
    setDownloadingPdf(true);
    try {
      // @ts-ignore
      const html2pdfModule = (await import('html2pdf.js')).default;
      const opt = getPdfOptions();
      await html2pdfModule().set(opt).from(element).save();
    } catch (err) {
      console.error('Error generating Accounts report PDF:', err);
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  const buildDefaultWhatsappText = () => {
    const periodText = dateFrom || dateTo ? `من ${dateFrom || 'البداية'} إلى ${dateTo || 'الآن'}` : 'كافة الفترات';
    const caseText = selectedCase === 'all' ? 'جميع الحالات' : selectedCase;
    const companyTitle = settings?.companyName || 'هاي كير للخدمات الطبية';

    let summaryLine = '';
    if (reportType === 'case_accounts') {
      summaryLine = `عدد الحالات: ${filteredCaseAccounts.length}\nإجمالي أيام التمريض: ${caseTotals.days} يوم\nإجمالي تكلفة التمريض: ${formatNum(caseTotals.cost)} ج.م`;
    } else if (reportType === 'revenues') {
      summaryLine = `عدد التحصيلات: ${filteredRevenues.length}\nإجمالي الإيرادات: ${formatNum(revenueTotals.total)} ج.م\n(نقدي: ${formatNum(revenueTotals.cash)} | انستا باي: ${formatNum(revenueTotals.instapay)} | محفظة: ${formatNum(revenueTotals.e_wallet)} | بنكي: ${formatNum(revenueTotals.bank_transfer)})`;
    } else if (reportType === 'outgoings') {
      const catLabel = selectedOutgoingCat === 'all' ? 'جميع البنود' : OUTGOING_CATEGORY_LABELS[selectedOutgoingCat];
      summaryLine = `البند: ${catLabel}\nعدد السجلات: ${filteredOutgoings.length}\nإجمالي الخارج: ${formatNum(outgoingTotals.grandTotal)} ج.م`;
    } else if (reportType === 'profit_distribution') {
      summaryLine = `عدد السجلات: ${filteredProfitDistributions.length}\nإجمالي الأرباح الموزعة: ${formatNum(profitTotals.totalDistributed)} ج.م\n(د. مي: ${formatNum(profitTotals.drMai)} | د. إلهام: ${formatNum(profitTotals.drElham)} | د. هاني: ${formatNum(profitTotals.drHanySamir)} | متغير: ${formatNum(profitTotals.otherDoctor)})`;
    } else {
      summaryLine = `• تكلفة التمريض: ${formatNum(caseTotals.cost)} ج.م\n• إجمالي الإيرادات: ${formatNum(revenueTotals.total)} ج.م\n• إجمالي الخارج: ${formatNum(outgoingTotals.grandTotal)} ج.م\n• توزيع الأرباح: ${formatNum(profitTotals.totalDistributed)} ج.م\n• الصافي النهائي: ${formatNum(netAfterAllCosts)} ج.م`;
    }

    return `${reportTitle} - ${companyTitle} 📄
المرجع: ${refCode}
التاريخ: ${todayStr}
الحالة: ${caseText}
الفترة: ${periodText}

${summaryLine}`;
  };

  const formatWhatsAppPhone = (rawPhone: string) => {
    let cleanPhone = rawPhone.replace(/[\s\-()]/g, '').trim();
    if (!cleanPhone) return '';
    if (cleanPhone.startsWith('01')) {
      cleanPhone = '20' + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith('05')) {
      cleanPhone = '966' + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.slice(1);
    } else if (cleanPhone.startsWith('00')) {
      cleanPhone = cleanPhone.slice(2);
    } else if (cleanPhone.startsWith('0')) {
      cleanPhone = '20' + cleanPhone.slice(1);
    }
    return cleanPhone.replace(/\D/g, '');
  };

  const getWhatsAppUrl = (phoneInput: string, text: string) => {
    const cleanPhone = formatWhatsAppPhone(phoneInput);
    const encodedText = encodeURIComponent(text);
    if (cleanPhone) {
      return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
    }
    return `https://api.whatsapp.com/send?text=${encodedText}`;
  };

  const openWhatsappModal = () => {
    setWhatsappCustomText(buildDefaultWhatsappText());
    setShowWhatsappModal(true);
  };

  const handleConfirmShareWhatsApp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const element = document.getElementById('printable-account-report');
    if (!element) return;

    try {
      if (whatsappPhone.trim()) {
        localStorage.setItem('hicare_last_report_wa_phone', whatsappPhone.trim());
      } else {
        localStorage.removeItem('hicare_last_report_wa_phone');
      }
    } catch {
      // ignore storage errors
    }

    setSharingWhatsapp(true);
    setWhatsappNotice(null);

    const messageText = whatsappCustomText.trim() || buildDefaultWhatsappText();
    const waUrl = getWhatsAppUrl(whatsappPhone, messageText);

    try {
      // @ts-ignore
      const html2pdfModule = (await import('html2pdf.js')).default;
      const opt = getPdfOptions();
      const pdfWorker = html2pdfModule().set(opt).from(element);
      const pdfBlob: Blob = await pdfWorker.output('blob');
      const fileName = getCleanFileName();
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      // Web Share API with PDF file (Mobile Chrome / iOS Safari)
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            files: [pdfFile],
            title: reportTitle,
            text: messageText
          });
          setShowWhatsappModal(false);
          setSharingWhatsapp(false);
          return;
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') {
            setSharingWhatsapp(false);
            return;
          }
        }
      }

      // Desktop fallback: download PDF + open WhatsApp + show interactive notice
      await html2pdfModule().set(opt).from(element).save();
      setShowWhatsappModal(false);
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      setWhatsappNotice({
        message: `تم تنزيل ملف التقرير PDF بنجاح (${fileName})! يمكنك الآن إرفاقه في محادثة الواتساب المفتوحة.`,
        waUrl
      });
    } catch (err) {
      console.error('Error generating PDF for WhatsApp report share:', err);
      setShowWhatsappModal(false);
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      setWhatsappNotice({
        message: 'تم تجهيز رسالة التقرير للواتساب. يمكنك فتح الواتساب من الزر المجاور أو تنزيل التقرير PDF لإرفاقه.',
        waUrl
      });
    } finally {
      setSharingWhatsapp(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px]">
        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mb-3" />
        <p className="text-slate-500 text-sm">جاري تجهيز التقرير المالي...</p>
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

  const periodLabel =
    dateFrom || dateTo
      ? `من ${dateFrom || 'البداية'} إلى ${dateTo || 'الآن'}`
      : 'كافة الفترات';

  return (
    <div className="space-y-5 font-sans text-slate-800" dir="rtl">
      {/* Control Toolbar (Hidden in Print) */}
      <div className="glass-card p-4 rounded-2xl border border-slate-200/70 space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="self-start flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold text-sm cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>العودة لقسم الحسابات</span>
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 px-4 rounded-xl transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
              title="تحميل التقرير مباشرة بصيغة PDF"
            >
              <Download className="h-4 w-4" />
              <span>{downloadingPdf ? 'جاري التجهيز...' : 'تنزيل PDF'}</span>
            </button>

            <button
              type="button"
              onClick={openWhatsappModal}
              disabled={sharingWhatsapp}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
              title="مشاركة التقرير بصيغة PDF مباشرة عبر واتساب"
            >
              {sharingWhatsapp ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <MessageCircle className="h-4 w-4" />
              )}
              <span>{sharingWhatsapp ? 'جاري التجهيز...' : 'إرسال التقرير (PDF) عبر واتساب'}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Printer className="h-4 w-4" />
              <span>طباعة التقرير</span>
            </button>
          </div>
        </div>

        {/* Report Selector & Filters */}
        <div className="pt-3 border-t border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Filter className="h-3 w-3 text-teal-600" />
              <span>نوع التقرير</span>
            </label>
            <select
              value={reportType}
              onChange={e => setReportType(e.target.value as AccountsReportType)}
              className="w-full px-3 py-2 glass-input rounded-xl text-xs font-bold focus:outline-none"
            >
              <option value="comprehensive">التقرير الشامل لكل حاجة</option>
              <option value="case_accounts">1. تقرير حسابات الحالات</option>
              <option value="revenues">2. تقرير قسم الإيرادات</option>
              <option value="outgoings">3. تقرير قسم الخارج</option>
              <option value="profit_distribution">4. تقرير توزيع الأرباح</option>
            </select>
          </div>

          {reportType === 'outgoings' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">بند الخارج</label>
              <select
                value={selectedOutgoingCat}
                onChange={e => setSelectedOutgoingCat(e.target.value as 'all' | OutgoingCategory)}
                className="w-full px-3 py-2 glass-input rounded-xl text-xs font-bold focus:outline-none"
              >
                <option value="all">جميع بنود الخارج (9 بنود)</option>
                {OUTGOING_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">الحالة (اختياري)</label>
            <select
              value={selectedCase}
              onChange={e => setSelectedCase(e.target.value)}
              className="w-full px-3 py-2 glass-input rounded-xl text-xs focus:outline-none"
            >
              <option value="all">كل الحالات</option>
              {allCaseNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">من تاريخ</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 glass-input rounded-xl text-xs font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full px-3 py-2 glass-input rounded-xl text-xs font-mono focus:outline-none"
            />
          </div>
        </div>
      </div>

      {whatsappNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="text-base">📄</span>
            <span className="font-semibold">{whatsappNotice.message}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={whatsappNotice.waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>فتح واتساب</span>
            </a>
            <button
              type="button"
              onClick={() => setWhatsappNotice(null)}
              className="text-emerald-700 hover:text-emerald-950 font-bold text-xs px-2.5 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Printable A4 Container - Exact Invoice Style */}
      <div
        id="printable-account-report"
        dir="rtl"
        className="bg-white max-w-4xl mx-auto p-6 sm:p-8 print:border-none print:shadow-none print:p-0 print:m-0 font-sans text-right"
        style={{
          direction: 'rtl',
          textAlign: 'right',
          backgroundColor: '#ffffff',
          border: '1px solid #a7f3d0',
          borderRadius: '12px',
          color: '#000000'
        }}
      >
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
            tr {
              page-break-inside: avoid;
            }
          }
        `}} />

        <div style={{ direction: 'rtl', textAlign: 'right' }}>
          {/* Company Header - Matches InvoicePrint */}
          <div
            style={{
              borderBottom: '3px solid #047857',
              paddingBottom: '12px',
              marginBottom: '22px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ textAlign: 'right' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#000000', margin: 0 }}>
                {company.companyName}
              </h1>
              <h2 style={{ fontSize: '12px', fontWeight: 800, color: '#047857', margin: '4px 0 0 0', textTransform: 'uppercase' }}>
                {company.companyNameEn || 'High Care Medical Services'}
              </h2>
            </div>

            <div
              style={{
                backgroundColor: '#f0fdf4',
                borderColor: '#047857',
                borderStyle: 'solid',
                borderWidth: '1px',
                padding: '8px 16px',
                borderRadius: '10px',
                textAlign: 'center',
                minWidth: '210px'
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#047857' }}>
                {reportTitle}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#000000', fontFamily: 'monospace', marginTop: '2px' }} dir="ltr">
                {refCode}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#000000', marginTop: '2px' }}>
                تاريخ التقرير: <span style={{ fontFamily: 'monospace' }}>{todayStr}</span>
              </div>
            </div>
          </div>

          {/* Info Grid Table - Matches InvoicePrint */}
          <div style={{ marginBottom: '24px' }}>
            <table
              style={{
                borderCollapse: 'collapse',
                border: '1px solid #059669',
                width: '100%',
                direction: 'rtl',
                fontSize: '12px'
              }}
            >
              <tbody>
                <tr>
                  <td style={{ backgroundColor: '#ecfdf5', fontWeight: 700, color: '#000000', padding: '8px 10px', border: '1px solid #059669', width: '16%', textAlign: 'center' }}>
                    نوع التقرير:
                  </td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#000000', border: '1px solid #059669', width: '34%', textAlign: 'center' }}>
                    {reportTitle}
                  </td>
                  <td style={{ backgroundColor: '#ecfdf5', fontWeight: 700, color: '#000000', padding: '8px 10px', border: '1px solid #059669', width: '16%', textAlign: 'center' }}>
                    نطاق الحالة:
                  </td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#000000', border: '1px solid #059669', width: '34%', textAlign: 'center' }}>
                    {selectedCase === 'all' ? 'جميع الحالات' : selectedCase}
                  </td>
                </tr>
                <tr>
                  <td style={{ backgroundColor: '#ecfdf5', fontWeight: 700, color: '#000000', padding: '8px 10px', border: '1px solid #059669', textAlign: 'center' }}>
                    الفترة الزمنية:
                  </td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#000000', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace' }}>
                    {periodLabel}
                  </td>
                  <td style={{ backgroundColor: '#ecfdf5', fontWeight: 700, color: '#000000', padding: '8px 10px', border: '1px solid #059669', textAlign: 'center' }}>
                    عدد السجلات:
                  </td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#000000', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace' }}>
                    {totalRecordCount}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ================= COMPREHENSIVE SUMMARY BOX ================= */}
          {reportType === 'comprehensive' && (
            <div style={{ marginBottom: '26px' }}>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#047857', marginBottom: '8px' }}>
                الملخص التنفيذي الشامل لجميع الحسابات
              </div>
              <table
                style={{
                  borderCollapse: 'collapse',
                  border: '1px solid #059669',
                  width: '100%',
                  direction: 'rtl',
                  fontSize: '12px'
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#047857', color: '#ffffff' }}>
                    <th style={{ padding: '10px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>القسم</th>
                    <th style={{ padding: '10px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>عدد السجلات / التفاصيل</th>
                    <th style={{ padding: '10px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>الإجمالي (ج.م)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ backgroundColor: '#ffffff' }}>
                    <td style={{ padding: '9px 12px', border: '1px solid #059669', fontWeight: 800, textAlign: 'center', color: '#000000' }}>
                      1. حسابات الحالات (التمريض)
                    </td>
                    <td style={{ padding: '9px 12px', border: '1px solid #059669', textAlign: 'center', color: '#000000', fontWeight: 700 }}>
                      {filteredCaseAccounts.length} حالة · {caseTotals.days} يوم تمريض
                    </td>
                    <td style={{ padding: '9px 12px', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: '#000000' }}>
                      {formatNum(caseTotals.cost)} ج.م
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: '#f0fdf4' }}>
                    <td style={{ padding: '9px 12px', border: '1px solid #059669', fontWeight: 800, textAlign: 'center', color: '#000000' }}>
                      2. قسم الإيرادات (التحصيلات)
                    </td>
                    <td style={{ padding: '9px 12px', border: '1px solid #059669', textAlign: 'center', color: '#000000', fontWeight: 700 }}>
                      نقدي: {formatNum(revenueTotals.cash)} · انستا باي: {formatNum(revenueTotals.instapay)} · محفظة: {formatNum(revenueTotals.e_wallet)} · بنكي: {formatNum(revenueTotals.bank_transfer)}
                    </td>
                    <td style={{ padding: '9px 12px', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: '#047857' }}>
                      {formatNum(revenueTotals.total)} ج.م
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: '#ffffff' }}>
                    <td style={{ padding: '9px 12px', border: '1px solid #059669', fontWeight: 800, textAlign: 'center', color: '#000000' }}>
                      3. قسم الخارج (9 بنود)
                    </td>
                    <td style={{ padding: '9px 12px', border: '1px solid #059669', textAlign: 'center', color: '#000000', fontWeight: 700 }}>
                      {filteredOutgoings.length} بند مصروفات خارجية
                    </td>
                    <td style={{ padding: '9px 12px', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: '#000000' }}>
                      {formatNum(outgoingTotals.grandTotal)} ج.م
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: '#f0fdf4' }}>
                    <td style={{ padding: '9px 12px', border: '1px solid #059669', fontWeight: 800, textAlign: 'center', color: '#000000' }}>
                      4. توزيع الأرباح
                    </td>
                    <td style={{ padding: '9px 12px', border: '1px solid #059669', textAlign: 'center', color: '#000000', fontWeight: 700 }}>
                      د. مي: {formatNum(profitTotals.drMai)} · د. إلهام: {formatNum(profitTotals.drElham)} · د. هاني: {formatNum(profitTotals.drHanySamir)} · متغير: {formatNum(profitTotals.otherDoctor)}
                    </td>
                    <td style={{ padding: '9px 12px', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: '#000000' }}>
                      {formatNum(profitTotals.totalDistributed)} ج.م
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: '#ecfdf5' }}>
                    <td style={{ padding: '10px 12px', border: '1px solid #059669', fontWeight: 900, textAlign: 'center', color: '#000000' }}>
                      الصافي (الإيرادات − الخارج)
                    </td>
                    <td style={{ padding: '10px 12px', border: '1px solid #059669', textAlign: 'center', color: '#000000', fontWeight: 700 }}>
                      بعد خصم إجمالي الخارج فقط
                    </td>
                    <td style={{ padding: '10px 12px', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace', fontWeight: 900, fontSize: '14px', color: '#047857' }}>
                      {formatNum(netAfterOutgoings)} ج.م
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: '#047857', color: '#ffffff' }}>
                    <td style={{ padding: '12px', border: '1px solid #047857', fontWeight: 900, textAlign: 'center', color: '#ffffff', fontSize: '14px' }}>
                      الصافي النهائي (الإيرادات − التمريض − الخارج)
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>
                      مقارنة التحصيل بمجموع تكاليف التمريض والخارج
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #047857', textAlign: 'center', fontFamily: 'monospace', fontWeight: 900, fontSize: '18px', color: '#ffffff' }}>
                      {formatNum(netAfterAllCosts)} ج.م
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* ================= SECTION 1 TABLE: CASE ACCOUNTS ================= */}
          {(reportType === 'case_accounts' || reportType === 'comprehensive') && (
            <div style={{ marginBottom: '26px' }}>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#047857', marginBottom: '8px' }}>
                {reportType === 'comprehensive' ? 'أولاً: كشف حسابات الحالات (التمريض)' : 'تفاصيل حسابات الحالات'}
              </div>
              <table
                style={{
                  borderCollapse: 'collapse',
                  border: '1px solid #059669',
                  width: '100%',
                  direction: 'rtl',
                  fontSize: '11.5px'
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#047857', color: '#ffffff' }}>
                    <th style={{ padding: '9px 6px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800, width: '5%' }}>م</th>
                    <th style={{ padding: '9px 8px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>اسم الحالة</th>
                    <th style={{ padding: '9px 8px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>اسم الاستشاري</th>
                    <th style={{ padding: '9px 8px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>تاريخ البدء</th>
                    <th style={{ padding: '9px 8px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>تاريخ الانتهاء</th>
                    <th style={{ padding: '9px 6px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>الأيام</th>
                    <th style={{ padding: '9px 8px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>السعر اليومي</th>
                    <th style={{ padding: '9px 8px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCaseAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '14px', textAlign: 'center', color: '#64748b', border: '1px solid #059669' }}>
                        لا توجد سجلات لحسابات الحالات ضمن هذا النطاق
                      </td>
                    </tr>
                  ) : (
                    filteredCaseAccounts.map((item, idx) => (
                      <tr key={item.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f0fdf4' }}>
                        <td style={{ padding: '7px 6px', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: '#000000' }}>{idx + 1}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', fontWeight: 700, color: '#000000' }}>{item.caseName}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', fontWeight: 600, color: '#000000' }}>{item.consultantName}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace', color: '#000000' }}>{item.startDate}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace', color: '#000000' }}>{item.endDate}</td>
                        <td style={{ padding: '7px 6px', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: '#000000' }}>{item.daysCount}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: '#000000' }}>{formatNum(item.dailyNursingPrice)}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: '#000000' }}>{formatNum(item.totalCost)} ج.م</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {reportType === 'case_accounts' && (
                <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end' }}>
                  <table style={{ borderCollapse: 'collapse', border: '1px solid #059669', width: '340px', direction: 'rtl', fontSize: '12px' }}>
                    <tbody>
                      <tr>
                        <td style={{ backgroundColor: '#ecfdf5', fontWeight: 700, color: '#000000', padding: '8px 12px', border: '1px solid #059669', textAlign: 'center' }}>إجمالي أيام التمريض:</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, fontFamily: 'monospace', color: '#000000', border: '1px solid #059669' }}>{caseTotals.days} يوم</td>
                      </tr>
                      <tr style={{ backgroundColor: '#047857', color: '#ffffff' }}>
                        <td style={{ padding: '12px', border: '1px solid #047857', fontWeight: 900, fontSize: '14px', textAlign: 'center', color: '#ffffff' }}>إجمالي تكلفة التمريض:</td>
                        <td style={{ padding: '12px', border: '1px solid #047857', fontWeight: 900, fontSize: '18px', fontFamily: 'monospace', textAlign: 'center', color: '#ffffff' }}>{formatNum(caseTotals.cost)} ج.م</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================= SECTION 2 TABLE: REVENUES ================= */}
          {(reportType === 'revenues' || reportType === 'comprehensive') && (
            <div style={{ marginBottom: '26px' }}>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#047857', marginBottom: '8px' }}>
                {reportType === 'comprehensive' ? 'ثانياً: كشف قسم الإيرادات (التحصيلات)' : 'تفاصيل قسم الإيرادات والتحصيلات'}
              </div>
              <table
                style={{
                  borderCollapse: 'collapse',
                  border: '1px solid #059669',
                  width: '100%',
                  direction: 'rtl',
                  fontSize: '11.5px'
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#047857', color: '#ffffff' }}>
                    <th style={{ padding: '9px 6px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800, width: '5%' }}>م</th>
                    <th style={{ padding: '9px 8px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>اسم الحالة</th>
                    <th style={{ padding: '9px 8px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>اسم المحصل</th>
                    <th style={{ padding: '9px 8px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>نوع التحصيل</th>
                    <th style={{ padding: '9px 8px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>تاريخ التحصيل</th>
                    <th style={{ padding: '9px 8px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>مبلغ التحصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRevenues.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '14px', textAlign: 'center', color: '#64748b', border: '1px solid #059669' }}>
                        لا توجد تحصيلات مسجلة ضمن هذا النطاق
                      </td>
                    </tr>
                  ) : (
                    filteredRevenues.map((item, idx) => (
                      <tr key={item.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f0fdf4' }}>
                        <td style={{ padding: '7px 6px', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: '#000000' }}>{idx + 1}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', fontWeight: 700, color: '#000000' }}>{item.caseName}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', fontWeight: 600, color: '#000000' }}>{item.collectorName}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', fontWeight: 700, color: '#000000' }}>{PAYMENT_METHOD_LABELS[item.paymentMethod]}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace', color: '#000000' }}>{item.collectionDate}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: '#000000' }}>{formatNum(item.amount)} ج.م</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {reportType === 'revenues' && (
                <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end' }}>
                  <table style={{ borderCollapse: 'collapse', border: '1px solid #059669', width: '380px', direction: 'rtl', fontSize: '12px' }}>
                    <tbody>
                      <tr>
                        <td style={{ backgroundColor: '#ecfdf5', fontWeight: 700, color: '#000000', padding: '7px 12px', border: '1px solid #059669', textAlign: 'center' }}>نقدي:</td>
                        <td style={{ padding: '7px 12px', textAlign: 'center', fontWeight: 700, fontFamily: 'monospace', color: '#000000', border: '1px solid #059669' }}>{formatNum(revenueTotals.cash)} ج.م</td>
                      </tr>
                      <tr>
                        <td style={{ backgroundColor: '#ecfdf5', fontWeight: 700, color: '#000000', padding: '7px 12px', border: '1px solid #059669', textAlign: 'center' }}>تحويل انستا باي:</td>
                        <td style={{ padding: '7px 12px', textAlign: 'center', fontWeight: 700, fontFamily: 'monospace', color: '#000000', border: '1px solid #059669' }}>{formatNum(revenueTotals.instapay)} ج.م</td>
                      </tr>
                      <tr>
                        <td style={{ backgroundColor: '#ecfdf5', fontWeight: 700, color: '#000000', padding: '7px 12px', border: '1px solid #059669', textAlign: 'center' }}>محفظة الكترونية:</td>
                        <td style={{ padding: '7px 12px', textAlign: 'center', fontWeight: 700, fontFamily: 'monospace', color: '#000000', border: '1px solid #059669' }}>{formatNum(revenueTotals.e_wallet)} ج.م</td>
                      </tr>
                      <tr>
                        <td style={{ backgroundColor: '#ecfdf5', fontWeight: 700, color: '#000000', padding: '7px 12px', border: '1px solid #059669', textAlign: 'center' }}>تحويل بنكي:</td>
                        <td style={{ padding: '7px 12px', textAlign: 'center', fontWeight: 700, fontFamily: 'monospace', color: '#000000', border: '1px solid #059669' }}>{formatNum(revenueTotals.bank_transfer)} ج.م</td>
                      </tr>
                      <tr style={{ backgroundColor: '#047857', color: '#ffffff' }}>
                        <td style={{ padding: '12px', border: '1px solid #047857', fontWeight: 900, fontSize: '14px', textAlign: 'center', color: '#ffffff' }}>إجمالي الإيرادات المحصلة:</td>
                        <td style={{ padding: '12px', border: '1px solid #047857', fontWeight: 900, fontSize: '18px', fontFamily: 'monospace', textAlign: 'center', color: '#ffffff' }}>{formatNum(revenueTotals.total)} ج.م</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================= SECTION 3 TABLE: OUTGOINGS ================= */}
          {(reportType === 'outgoings' || reportType === 'comprehensive') && (
            <div style={{ marginBottom: '26px' }}>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#047857', marginBottom: '8px' }}>
                {reportType === 'comprehensive' ? 'ثالثاً: كشف قسم الخارج (بنود المصروفات)' : 'ملخص وتفاصيل قسم الخارج'}
              </div>

              {/* 9-Category Breakdown Table */}
              {(reportType === 'comprehensive' || selectedOutgoingCat === 'all') && (
                <table
                  style={{
                    borderCollapse: 'collapse',
                    border: '1px solid #059669',
                    width: '100%',
                    direction: 'rtl',
                    fontSize: '11.5px',
                    marginBottom: '14px'
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#ecfdf5', color: '#000000' }}>
                      <th style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', fontWeight: 800 }}>البند</th>
                      <th style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', fontWeight: 800 }}>العدد</th>
                      <th style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', fontWeight: 800 }}>الإجمالي (ج.م)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {OUTGOING_CATEGORIES.map((cat, idx) => {
                      const stats = outgoingTotals.byCategory[cat.value];
                      return (
                        <tr key={cat.value} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f0fdf4' }}>
                          <td style={{ padding: '6px 10px', border: '1px solid #059669', textAlign: 'center', fontWeight: 700, color: '#000000' }}>{cat.label}</td>
                          <td style={{ padding: '6px 10px', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace', color: '#000000' }}>{stats.count}</td>
                          <td style={{ padding: '6px 10px', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: '#000000' }}>{formatNum(stats.total)} ج.م</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Detailed Outgoing Records */}
              <table
                style={{
                  borderCollapse: 'collapse',
                  border: '1px solid #059669',
                  width: '100%',
                  direction: 'rtl',
                  fontSize: '11.5px'
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#047857', color: '#ffffff' }}>
                    <th style={{ padding: '9px 6px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800, width: '5%' }}>م</th>
                    <th style={{ padding: '9px 8px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>البند</th>
                    <th style={{ padding: '9px 8px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>اسم الحالة</th>
                    <th style={{ padding: '9px 8px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>التاريخ</th>
                    <th style={{ padding: '9px 8px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>ملاحظات</th>
                    <th style={{ padding: '9px 8px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOutgoings.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '14px', textAlign: 'center', color: '#64748b', border: '1px solid #059669' }}>
                        لا توجد بنود مسجلة في قسم الخارج ضمن هذا النطاق
                      </td>
                    </tr>
                  ) : (
                    filteredOutgoings.map((item, idx) => (
                      <tr key={item.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f0fdf4' }}>
                        <td style={{ padding: '7px 6px', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: '#000000' }}>{idx + 1}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', fontWeight: 700, color: '#000000' }}>{OUTGOING_CATEGORY_LABELS[item.category]}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', fontWeight: 700, color: '#000000' }}>{item.caseName}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace', color: '#000000' }}>{item.date}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', color: '#000000' }}>{item.notes || '—'}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: '#000000' }}>{formatNum(item.amount)} ج.م</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {reportType === 'outgoings' && (
                <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end' }}>
                  <table style={{ borderCollapse: 'collapse', border: '1px solid #059669', width: '360px', direction: 'rtl', fontSize: '12px' }}>
                    <tbody>
                      <tr>
                        <td style={{ backgroundColor: '#ecfdf5', fontWeight: 700, color: '#000000', padding: '8px 12px', border: '1px solid #059669', textAlign: 'center' }}>عدد السجلات:</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, fontFamily: 'monospace', color: '#000000', border: '1px solid #059669' }}>{filteredOutgoings.length}</td>
                      </tr>
                      <tr style={{ backgroundColor: '#047857', color: '#ffffff' }}>
                        <td style={{ padding: '12px', border: '1px solid #047857', fontWeight: 900, fontSize: '14px', textAlign: 'center', color: '#ffffff' }}>الإجمالي النهائي للخارج:</td>
                        <td style={{ padding: '12px', border: '1px solid #047857', fontWeight: 900, fontSize: '18px', fontFamily: 'monospace', textAlign: 'center', color: '#ffffff' }}>{formatNum(outgoingTotals.grandTotal)} ج.م</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================= SECTION 4 TABLE: PROFIT DISTRIBUTION ================= */}
          {(reportType === 'profit_distribution' || reportType === 'comprehensive') && (
            <div style={{ marginBottom: '26px' }}>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#047857', marginBottom: '8px' }}>
                {reportType === 'comprehensive' ? 'رابعاً: كشف توزيع الأرباح' : 'تفاصيل توزيع الأرباح'}
              </div>
              <table
                style={{
                  borderCollapse: 'collapse',
                  border: '1px solid #059669',
                  width: '100%',
                  direction: 'rtl',
                  fontSize: '11.5px'
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#047857', color: '#ffffff' }}>
                    <th style={{ padding: '9px 6px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800, width: '5%' }}>م</th>
                    <th style={{ padding: '9px 8px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>اسم الحالة</th>
                    <th style={{ padding: '9px 8px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>المدة (من — إلى)</th>
                    <th style={{ padding: '9px 8px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>د. مي</th>
                    <th style={{ padding: '9px 8px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>د. إلهام</th>
                    <th style={{ padding: '9px 8px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>د. هاني سمير</th>
                    <th style={{ padding: '9px 8px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>الطبيب المتغير</th>
                    <th style={{ padding: '9px 8px', border: '1px solid #047857', textAlign: 'center', color: '#ffffff', fontWeight: 800 }}>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfitDistributions.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '14px', textAlign: 'center', color: '#64748b', border: '1px solid #059669' }}>
                        لا توجد سجلات توزيع أرباح ضمن هذا النطاق
                      </td>
                    </tr>
                  ) : (
                    filteredProfitDistributions.map((item, idx) => (
                      <tr key={item.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f0fdf4' }}>
                        <td style={{ padding: '7px 6px', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: '#000000' }}>{idx + 1}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', fontWeight: 700, color: '#000000' }}>{item.caseName}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace', color: '#000000' }}>{item.periodFrom} — {item.periodTo}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: '#000000' }}>{formatNum(item.drMaiAmount)} ج.م</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: '#000000' }}>{formatNum(item.drElhamAmount)} ج.م</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: '#000000' }}>{formatNum(item.drHanySamirAmount)} ج.م</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', color: '#000000' }}>
                          {item.otherDoctorName || item.otherDoctorAmount > 0 ? (
                            <>
                              <span style={{ fontWeight: 700 }}>{item.otherDoctorName || 'طبيب إضافي'}</span>
                              {' · '}
                              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{formatNum(item.otherDoctorAmount)} ج.م</span>
                            </>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '7px 8px', border: '1px solid #059669', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: '#047857' }}>{formatNum(item.totalDistributed)} ج.م</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {reportType === 'profit_distribution' && (
                <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end' }}>
                  <table style={{ borderCollapse: 'collapse', border: '1px solid #059669', width: '380px', direction: 'rtl', fontSize: '12px' }}>
                    <tbody>
                      <tr>
                        <td style={{ backgroundColor: '#ecfdf5', fontWeight: 700, color: '#000000', padding: '7px 12px', border: '1px solid #059669', textAlign: 'center' }}>إجمالي حصة د. مي:</td>
                        <td style={{ padding: '7px 12px', textAlign: 'center', fontWeight: 700, fontFamily: 'monospace', color: '#000000', border: '1px solid #059669' }}>{formatNum(profitTotals.drMai)} ج.م</td>
                      </tr>
                      <tr>
                        <td style={{ backgroundColor: '#ecfdf5', fontWeight: 700, color: '#000000', padding: '7px 12px', border: '1px solid #059669', textAlign: 'center' }}>إجمالي حصة د. إلهام:</td>
                        <td style={{ padding: '7px 12px', textAlign: 'center', fontWeight: 700, fontFamily: 'monospace', color: '#000000', border: '1px solid #059669' }}>{formatNum(profitTotals.drElham)} ج.م</td>
                      </tr>
                      <tr>
                        <td style={{ backgroundColor: '#ecfdf5', fontWeight: 700, color: '#000000', padding: '7px 12px', border: '1px solid #059669', textAlign: 'center' }}>إجمالي حصة د. هاني سمير:</td>
                        <td style={{ padding: '7px 12px', textAlign: 'center', fontWeight: 700, fontFamily: 'monospace', color: '#000000', border: '1px solid #059669' }}>{formatNum(profitTotals.drHanySamir)} ج.م</td>
                      </tr>
                      <tr>
                        <td style={{ backgroundColor: '#ecfdf5', fontWeight: 700, color: '#000000', padding: '7px 12px', border: '1px solid #059669', textAlign: 'center' }}>إجمالي الطبيب المتغير:</td>
                        <td style={{ padding: '7px 12px', textAlign: 'center', fontWeight: 700, fontFamily: 'monospace', color: '#000000', border: '1px solid #059669' }}>{formatNum(profitTotals.otherDoctor)} ج.م</td>
                      </tr>
                      <tr style={{ backgroundColor: '#047857', color: '#ffffff' }}>
                        <td style={{ padding: '12px', border: '1px solid #047857', fontWeight: 900, fontSize: '14px', textAlign: 'center', color: '#ffffff' }}>إجمالي الأرباح الموزعة:</td>
                        <td style={{ padding: '12px', border: '1px solid #047857', fontWeight: 900, fontSize: '18px', fontFamily: 'monospace', textAlign: 'center', color: '#ffffff' }}>{formatNum(profitTotals.totalDistributed)} ج.م</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Footer Policy Box - Matches InvoicePrint */}
          <div style={{ border: '1px solid #059669', borderRadius: '6px', padding: '8px 12px', backgroundColor: '#ffffff', marginTop: '18px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#000000', display: 'block', marginBottom: '2px' }}>
              اعتماد الإدارة المالية:
            </span>
            <p style={{ fontSize: '10px', color: '#000000', margin: 0 }}>
              {company.invoicePolicy} · مستند مالي داخلي صادر من نظام إدارة الحسابات — {company.companyName}
            </p>
          </div>
        </div>
      </div>

      {/* WhatsApp Share Modal */}
      {showWhatsappModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 print:hidden" dir="rtl">
          <form
            onSubmit={handleConfirmShareWhatsApp}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/60">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">إرسال التقرير عبر واتساب (PDF)</h3>
                  <p className="text-[11px] text-slate-500 font-medium truncate max-w-[250px]">{reportTitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWhatsappModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-emerald-600" />
                  <span>رقم الواتساب المستلم (اختياري)</span>
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  value={whatsappPhone}
                  onChange={e => setWhatsappPhone(e.target.value)}
                  placeholder="01012345678"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-right focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  أدخل رقم الهاتف للإرسال المباشر، أو اتركه فارغاً لاختيار جهة الاتصال من داخل واتساب.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">نص ملخص التقرير المرفق بالرسالة</label>
                <textarea
                  rows={6}
                  value={whatsappCustomText}
                  onChange={e => setWhatsappCustomText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowWhatsappModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={sharingWhatsapp}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {sharingWhatsapp ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>{sharingWhatsapp ? 'جاري تجهيز PDF...' : 'تجهيز PDF وإرسال واتساب'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
