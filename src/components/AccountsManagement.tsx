import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wallet,
  UserCheck,
  Banknote,
  Layers,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Save,
  Calendar,
  Stethoscope,
  RefreshCw,
  AlertCircle,
  Smartphone,
  Building2,
  CreditCard,
  Coins,
  Calculator,
  FileText,
  Printer,
  TrendingUp
} from 'lucide-react';
import {
  CaseAccount,
  Customer,
  OutgoingCategory,
  OutgoingRecord,
  ProfitDistributionRecord,
  RevenuePaymentMethod,
  RevenueRecord
} from '../types';
import AccountsReportPrint, {
  AccountsReportType,
  OUTGOING_CATEGORIES,
  OUTGOING_CATEGORY_LABELS
} from './AccountsReportPrint';

interface AccountsManagementProps {
  token: string;
}

type AccountSectionTab = 'case_accounts' | 'revenues' | 'outgoings' | 'profit_distribution';

const PAYMENT_METHOD_OPTIONS: {
  value: RevenuePaymentMethod;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
}[] = [
  { value: 'cash', label: 'نقدي', icon: Coins, accentClass: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { value: 'instapay', label: 'تحويل انستا باي', icon: Smartphone, accentClass: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  { value: 'e_wallet', label: 'محفظة الكترونية', icon: CreditCard, accentClass: 'text-amber-700 bg-amber-50 border-amber-200' },
  { value: 'bank_transfer', label: 'تحويل بنكي', icon: Building2, accentClass: 'text-sky-700 bg-sky-50 border-sky-200' }
];

const PAYMENT_METHOD_LABEL: Record<RevenuePaymentMethod, string> = {
  cash: 'نقدي',
  instapay: 'تحويل انستا باي',
  e_wallet: 'محفظة الكترونية',
  bank_transfer: 'تحويل بنكي'
};

function computeInclusiveDaysClient(startDate: string, endDate: string): { valid: boolean; days: number; error?: string } {
  if (!startDate || !endDate) {
    return { valid: false, days: 0 };
  }
  const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const sMatch = startDate.match(dateRegex);
  const eMatch = endDate.match(dateRegex);
  if (!sMatch || !eMatch) {
    return { valid: false, days: 0, error: 'صيغة التاريخ غير صحيحة' };
  }
  const startUtc = Date.UTC(Number(sMatch[1]), Number(sMatch[2]) - 1, Number(sMatch[3]));
  const endUtc = Date.UTC(Number(eMatch[1]), Number(eMatch[2]) - 1, Number(eMatch[3]));
  if (endUtc < startUtc) {
    return { valid: false, days: 0, error: 'تاريخ الانتهاء يجب أن يكون مساوياً لتاريخ البدء أو بعده' };
  }
  const days = Math.round((endUtc - startUtc) / 86400000) + 1;
  return { valid: true, days };
}

function formatMoney(amount: number): string {
  return Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

export default function AccountsManagement({ token }: AccountsManagementProps) {
  const [activeSection, setActiveSection] = useState<AccountSectionTab>('case_accounts');

  // Shared lookup lists
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [caseAccounts, setCaseAccounts] = useState<CaseAccount[]>([]);
  const [revenues, setRevenues] = useState<RevenueRecord[]>([]);
  const [outgoings, setOutgoings] = useState<OutgoingRecord[]>([]);
  const [profitDistributions, setProfitDistributions] = useState<ProfitDistributionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Report print preview state
  const [reportView, setReportView] = useState<{
    type: AccountsReportType;
    outgoingCategory?: 'all' | OutgoingCategory;
  } | null>(null);

  // Filters - Case Accounts
  const [caseSearch, setCaseSearch] = useState('');

  // Filters - Revenues
  const [revSearch, setRevSearch] = useState('');
  const [revMethodFilter, setRevMethodFilter] = useState<'all' | RevenuePaymentMethod>('all');
  const [revStartDate, setRevStartDate] = useState('');
  const [revEndDate, setRevEndDate] = useState('');

  // Filters - Outgoings (Section 3)
  const [outCategoryFilter, setOutCategoryFilter] = useState<'all' | OutgoingCategory>('all');
  const [outSearch, setOutSearch] = useState('');
  const [outStartDate, setOutStartDate] = useState('');
  const [outEndDate, setOutEndDate] = useState('');

  // Case Account Modal State
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [caCaseName, setCaCaseName] = useState('');
  const [caCustomerId, setCaCustomerId] = useState('');
  const [caStartDate, setCaStartDate] = useState('');
  const [caEndDate, setCaEndDate] = useState('');
  const [caDailyPrice, setCaDailyPrice] = useState('');
  const [caConsultantName, setCaConsultantName] = useState('');
  const [caNotes, setCaNotes] = useState('');
  const [caSaving, setCaSaving] = useState(false);
  const [caFormError, setCaFormError] = useState('');

  // Revenue Modal State
  const [showRevModal, setShowRevModal] = useState(false);
  const [editingRevId, setEditingRevId] = useState<string | null>(null);
  const [revCaseName, setRevCaseName] = useState('');
  const [revCaseAccountId, setRevCaseAccountId] = useState('');
  const [revAmount, setRevAmount] = useState('');
  const [revCollectorName, setRevCollectorName] = useState('');
  const [revPaymentMethod, setRevPaymentMethod] = useState<RevenuePaymentMethod>('cash');
  const [revCollectionDate, setRevCollectionDate] = useState('');
  const [revNotes, setRevNotes] = useState('');
  const [revSaving, setRevSaving] = useState(false);
  const [revFormError, setRevFormError] = useState('');

  // Filters - Profit Distribution (Section 4)
  const [profitSearch, setProfitSearch] = useState('');
  const [profitStartDate, setProfitStartDate] = useState('');
  const [profitEndDate, setProfitEndDate] = useState('');

  // Outgoing Modal State (Section 3)
  const [showOutModal, setShowOutModal] = useState(false);
  const [editingOutId, setEditingOutId] = useState<string | null>(null);
  const [outCategory, setOutCategory] = useState<OutgoingCategory>('supplies');
  const [outCaseName, setOutCaseName] = useState('');
  const [outCaseAccountId, setOutCaseAccountId] = useState('');
  const [outDate, setOutDate] = useState('');
  const [outAmount, setOutAmount] = useState('');
  const [outNotes, setOutNotes] = useState('');
  const [outSaving, setOutSaving] = useState(false);
  const [outFormError, setOutFormError] = useState('');

  // Profit Distribution Modal State (Section 4 - all amounts entered manually)
  const [showProfitModal, setShowProfitModal] = useState(false);
  const [editingProfitId, setEditingProfitId] = useState<string | null>(null);
  const [pdCaseName, setPdCaseName] = useState('');
  const [pdCaseAccountId, setPdCaseAccountId] = useState('');
  const [pdPeriodFrom, setPdPeriodFrom] = useState('');
  const [pdPeriodTo, setPdPeriodTo] = useState('');
  const [pdDrMai, setPdDrMai] = useState('');
  const [pdDrElham, setPdDrElham] = useState('');
  const [pdDrHanySamir, setPdDrHanySamir] = useState('');
  const [pdOtherDoctorName, setPdOtherDoctorName] = useState('');
  const [pdOtherDoctorAmount, setPdOtherDoctorAmount] = useState('');
  const [pdNotes, setPdNotes] = useState('');
  const [pdSaving, setPdSaving] = useState(false);
  const [pdFormError, setPdFormError] = useState('');

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'case_account' | 'revenue' | 'outgoing' | 'profit_distribution';
    id: string;
    title: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const todayIso = new Date().toISOString().split('T')[0];

  const fetchAllAccountsData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [casesRes, revRes, outRes, profitRes, custRes] = await Promise.all([
        fetch('/api/accounts/case-accounts', { headers }),
        fetch('/api/accounts/revenues', { headers }),
        fetch('/api/accounts/outgoings', { headers }),
        fetch('/api/accounts/profit-distributions', { headers }),
        fetch('/api/customers', { headers })
      ]);

      if (!casesRes.ok) {
        const errData = await casesRes.json().catch(() => ({}));
        throw new Error(errData.error || 'تعذر تحميل بيانات حسابات الحالات');
      }
      if (!revRes.ok) {
        const errData = await revRes.json().catch(() => ({}));
        throw new Error(errData.error || 'تعذر تحميل بيانات قسم الإيرادات');
      }
      if (!outRes.ok) {
        const errData = await outRes.json().catch(() => ({}));
        throw new Error(errData.error || 'تعذر تحميل بيانات قسم الخارج');
      }
      if (!profitRes.ok) {
        const errData = await profitRes.json().catch(() => ({}));
        throw new Error(errData.error || 'تعذر تحميل بيانات توزيع الأرباح');
      }

      const casesData = await casesRes.json();
      const revData = await revRes.json();
      const outData = await outRes.json();
      const profitData = await profitRes.json();
      const custData = custRes.ok ? await custRes.json() : [];

      setCaseAccounts(Array.isArray(casesData) ? casesData : []);
      setRevenues(Array.isArray(revData) ? revData : []);
      setOutgoings(Array.isArray(outData) ? outData : []);
      setProfitDistributions(Array.isArray(profitData) ? profitData : []);
      setCustomers(Array.isArray(custData) ? custData : []);
    } catch (err: any) {
      setLoadError(err.message || 'حدث خطأ أثناء تحميل بيانات الحسابات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAccountsData();
  }, [token]);

  // --- Filtered Lists & Metrics ---
  const filteredCaseAccounts = useMemo(() => {
    const q = caseSearch.toLowerCase().trim();
    if (!q) return caseAccounts;
    return caseAccounts.filter(c =>
      c.caseName.toLowerCase().includes(q) ||
      c.consultantName.toLowerCase().includes(q) ||
      (c.notes && c.notes.toLowerCase().includes(q))
    );
  }, [caseAccounts, caseSearch]);

  const caseStats = useMemo(() => {
    return filteredCaseAccounts.reduce(
      (acc, item) => {
        acc.count += 1;
        acc.totalDays += item.daysCount;
        acc.totalNursingCost += item.totalCost;
        return acc;
      },
      { count: 0, totalDays: 0, totalNursingCost: 0 }
    );
  }, [filteredCaseAccounts]);

  const filteredRevenues = useMemo(() => {
    return revenues.filter(r => {
      if (revMethodFilter !== 'all' && r.paymentMethod !== revMethodFilter) return false;
      if (revStartDate && r.collectionDate < revStartDate) return false;
      if (revEndDate && r.collectionDate > revEndDate) return false;
      if (revSearch.trim()) {
        const q = revSearch.toLowerCase().trim();
        const matches =
          r.caseName.toLowerCase().includes(q) ||
          r.collectorName.toLowerCase().includes(q) ||
          (r.notes && r.notes.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [revenues, revMethodFilter, revStartDate, revEndDate, revSearch]);

  const revenueStats = useMemo(() => {
    const summary = {
      total: 0,
      count: 0,
      cash: 0,
      instapay: 0,
      e_wallet: 0,
      bank_transfer: 0
    };
    filteredRevenues.forEach(r => {
      summary.count += 1;
      summary.total += r.amount;
      summary[r.paymentMethod] += r.amount;
    });
    return summary;
  }, [filteredRevenues]);

  // Filtered Outgoings & Category Totals
  const outgoingCategoryStats = useMemo(() => {
    const map: Record<OutgoingCategory, { count: number; total: number }> = {
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
    let allTotal = 0;
    outgoings.forEach(o => {
      allTotal += o.amount;
      if (map[o.category]) {
        map[o.category].count += 1;
        map[o.category].total += o.amount;
      }
    });
    return { map, allTotal };
  }, [outgoings]);

  const filteredOutgoings = useMemo(() => {
    return outgoings.filter(o => {
      if (outCategoryFilter !== 'all' && o.category !== outCategoryFilter) return false;
      if (outStartDate && o.date < outStartDate) return false;
      if (outEndDate && o.date > outEndDate) return false;
      if (outSearch.trim()) {
        const q = outSearch.toLowerCase().trim();
        const matches =
          o.caseName.toLowerCase().includes(q) ||
          (o.notes && o.notes.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [outgoings, outCategoryFilter, outStartDate, outEndDate, outSearch]);

  const filteredOutgoingsTotal = useMemo(() => {
    return filteredOutgoings.reduce((sum, o) => sum + o.amount, 0);
  }, [filteredOutgoings]);

  // Filtered Profit Distributions & Metrics (Section 4)
  const filteredProfitDistributions = useMemo(() => {
    return profitDistributions.filter(p => {
      if (profitStartDate && p.periodTo < profitStartDate) return false;
      if (profitEndDate && p.periodFrom > profitEndDate) return false;
      if (profitSearch.trim()) {
        const q = profitSearch.toLowerCase().trim();
        const matches =
          p.caseName.toLowerCase().includes(q) ||
          (p.otherDoctorName && p.otherDoctorName.toLowerCase().includes(q)) ||
          (p.notes && p.notes.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [profitDistributions, profitStartDate, profitEndDate, profitSearch]);

  const profitStats = useMemo(() => {
    return filteredProfitDistributions.reduce(
      (acc, p) => {
        acc.count += 1;
        acc.drMai += p.drMaiAmount;
        acc.drElham += p.drElhamAmount;
        acc.drHanySamir += p.drHanySamirAmount;
        acc.otherDoctor += p.otherDoctorAmount;
        acc.totalDistributed += p.totalDistributed;
        return acc;
      },
      { count: 0, drMai: 0, drElham: 0, drHanySamir: 0, otherDoctor: 0, totalDistributed: 0 }
    );
  }, [filteredProfitDistributions]);

  // Unique case name suggestions for datalists
  const caseNameSuggestions = useMemo(() => {
    const set = new Set<string>();
    caseAccounts.forEach(c => {
      if (c.caseName.trim()) set.add(c.caseName.trim());
    });
    customers.forEach(c => {
      if (c.name.trim()) set.add(c.name.trim());
    });
    return Array.from(set);
  }, [caseAccounts, customers]);

  // Live preview of nursing days and total cost inside modal
  const liveCalc = useMemo(() => {
    const dayCheck = computeInclusiveDaysClient(caStartDate, caEndDate);
    const rate = parseFloat(caDailyPrice);
    const validRate = Number.isFinite(rate) && rate >= 0 ? rate : 0;
    const total = dayCheck.valid ? Math.round((dayCheck.days * validRate) * 100) / 100 : 0;
    return {
      ...dayCheck,
      rate: validRate,
      total
    };
  }, [caStartDate, caEndDate, caDailyPrice]);

  // --- Case Account Handlers ---
  const openAddCaseModal = () => {
    setEditingCaseId(null);
    setCaCaseName('');
    setCaCustomerId('');
    setCaStartDate(todayIso);
    setCaEndDate(todayIso);
    setCaDailyPrice('');
    setCaConsultantName('');
    setCaNotes('');
    setCaFormError('');
    setShowCaseModal(true);
  };

  const openEditCaseModal = (item: CaseAccount) => {
    setEditingCaseId(item.id);
    setCaCaseName(item.caseName);
    setCaCustomerId(item.customerId || '');
    setCaStartDate(item.startDate);
    setCaEndDate(item.endDate);
    setCaDailyPrice(String(item.dailyNursingPrice));
    setCaConsultantName(item.consultantName);
    setCaNotes(item.notes || '');
    setCaFormError('');
    setShowCaseModal(true);
  };

  const handleCaseNameInput = (val: string) => {
    setCaCaseName(val);
    const matched = customers.find(c => c.name.trim().toLowerCase() === val.trim().toLowerCase());
    setCaCustomerId(matched ? matched.id : '');
  };

  const handleSubmitCaseAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCaFormError('');

    if (!caCaseName.trim()) {
      setCaFormError('يرجى إدخال اسم الحالة');
      return;
    }
    if (!caConsultantName.trim()) {
      setCaFormError('يرجى إدخال اسم الاستشاري');
      return;
    }
    if (!caStartDate || !caEndDate) {
      setCaFormError('يرجى تحديد تاريخ البدء وتاريخ الانتهاء');
      return;
    }
    if (!liveCalc.valid) {
      setCaFormError(liveCalc.error || 'تاريخ البدء أو الانتهاء غير صحيح');
      return;
    }
    const priceNum = parseFloat(caDailyPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setCaFormError('يرجى إدخال سعر التمريض اليومي بشكل صحيح');
      return;
    }

    setCaSaving(true);
    try {
      const url = editingCaseId
        ? `/api/accounts/case-accounts/${editingCaseId}`
        : '/api/accounts/case-accounts';
      const method = editingCaseId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          caseName: caCaseName.trim(),
          customerId: caCustomerId || undefined,
          startDate: caStartDate,
          endDate: caEndDate,
          dailyNursingPrice: priceNum,
          consultantName: caConsultantName.trim(),
          notes: caNotes.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل حفظ حساب الحالة');
      }

      setShowCaseModal(false);
      await fetchAllAccountsData();
    } catch (err: any) {
      setCaFormError(err.message || 'حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setCaSaving(false);
    }
  };

  // --- Revenue Handlers ---
  const openAddRevModal = () => {
    setEditingRevId(null);
    setRevCaseName('');
    setRevCaseAccountId('');
    setRevAmount('');
    setRevCollectorName('');
    setRevPaymentMethod('cash');
    setRevCollectionDate(todayIso);
    setRevNotes('');
    setRevFormError('');
    setShowRevModal(true);
  };

  const openEditRevModal = (item: RevenueRecord) => {
    setEditingRevId(item.id);
    setRevCaseName(item.caseName);
    setRevCaseAccountId(item.caseAccountId || '');
    setRevAmount(String(item.amount));
    setRevCollectorName(item.collectorName);
    setRevPaymentMethod(item.paymentMethod);
    setRevCollectionDate(item.collectionDate);
    setRevNotes(item.notes || '');
    setRevFormError('');
    setShowRevModal(true);
  };

  const handleRevCaseNameInput = (val: string) => {
    setRevCaseName(val);
    const matched = caseAccounts.find(c => c.caseName.trim().toLowerCase() === val.trim().toLowerCase());
    setRevCaseAccountId(matched ? matched.id : '');
  };

  const handleSubmitRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setRevFormError('');

    if (!revCaseName.trim()) {
      setRevFormError('يرجى إدخال اسم الحالة');
      return;
    }
    const amountNum = parseFloat(revAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setRevFormError('يرجى إدخال مبلغ تحصيل أكبر من الصفر');
      return;
    }
    if (!revCollectorName.trim()) {
      setRevFormError('يرجى إدخال اسم المحصل');
      return;
    }
    if (!revCollectionDate) {
      setRevFormError('يرجى تحديد تاريخ التحصيل');
      return;
    }

    setRevSaving(true);
    try {
      const url = editingRevId
        ? `/api/accounts/revenues/${editingRevId}`
        : '/api/accounts/revenues';
      const method = editingRevId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          caseName: revCaseName.trim(),
          caseAccountId: revCaseAccountId || undefined,
          amount: amountNum,
          collectorName: revCollectorName.trim(),
          paymentMethod: revPaymentMethod,
          collectionDate: revCollectionDate,
          notes: revNotes.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل حفظ سجل التحصيل');
      }

      setShowRevModal(false);
      await fetchAllAccountsData();
    } catch (err: any) {
      setRevFormError(err.message || 'حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setRevSaving(false);
    }
  };

  // --- Outgoing Handlers (Section 3) ---
  const openAddOutgoingModal = (defaultCat?: OutgoingCategory) => {
    setEditingOutId(null);
    setOutCategory(defaultCat || (outCategoryFilter !== 'all' ? outCategoryFilter : 'supplies'));
    setOutCaseName('');
    setOutCaseAccountId('');
    setOutDate(todayIso);
    setOutAmount('');
    setOutNotes('');
    setOutFormError('');
    setShowOutModal(true);
  };

  const openEditOutgoingModal = (item: OutgoingRecord) => {
    setEditingOutId(item.id);
    setOutCategory(item.category);
    setOutCaseName(item.caseName);
    setOutCaseAccountId(item.caseAccountId || '');
    setOutDate(item.date);
    setOutAmount(String(item.amount));
    setOutNotes(item.notes || '');
    setOutFormError('');
    setShowOutModal(true);
  };

  const handleOutCaseNameInput = (val: string) => {
    setOutCaseName(val);
    const matched = caseAccounts.find(c => c.caseName.trim().toLowerCase() === val.trim().toLowerCase());
    setOutCaseAccountId(matched ? matched.id : '');
  };

  const handleSubmitOutgoing = async (e: React.FormEvent) => {
    e.preventDefault();
    setOutFormError('');

    if (!outCaseName.trim()) {
      setOutFormError('يرجى إدخال اسم الحالة');
      return;
    }
    if (!outDate) {
      setOutFormError('يرجى تحديد التاريخ');
      return;
    }
    const amountNum = parseFloat(outAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setOutFormError('يرجى إدخال مبلغ أكبر من الصفر');
      return;
    }

    setOutSaving(true);
    try {
      const url = editingOutId
        ? `/api/accounts/outgoings/${editingOutId}`
        : '/api/accounts/outgoings';
      const method = editingOutId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          category: outCategory,
          caseName: outCaseName.trim(),
          caseAccountId: outCaseAccountId || undefined,
          date: outDate,
          amount: amountNum,
          notes: outNotes.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل حفظ السجل في قسم الخارج');
      }

      setShowOutModal(false);
      await fetchAllAccountsData();
    } catch (err: any) {
      setOutFormError(err.message || 'حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setOutSaving(false);
    }
  };

  const liveOutgoingCategoryTotal = useMemo(() => {
    const existingOther = outgoings
      .filter(o => o.category === outCategory && o.id !== editingOutId)
      .reduce((sum, o) => sum + o.amount, 0);
    const currentAmount = parseFloat(outAmount);
    const validAmount = Number.isFinite(currentAmount) && currentAmount > 0 ? currentAmount : 0;
    return existingOther + validAmount;
  }, [outgoings, outCategory, editingOutId, outAmount]);

  // --- Profit Distribution Handlers (Section 4) ---
  const openAddProfitModal = () => {
    setEditingProfitId(null);
    setPdCaseName('');
    setPdCaseAccountId('');
    setPdPeriodFrom(todayIso);
    setPdPeriodTo(todayIso);
    setPdDrMai('');
    setPdDrElham('');
    setPdDrHanySamir('');
    setPdOtherDoctorName('');
    setPdOtherDoctorAmount('');
    setPdNotes('');
    setPdFormError('');
    setShowProfitModal(true);
  };

  const openEditProfitModal = (item: ProfitDistributionRecord) => {
    setEditingProfitId(item.id);
    setPdCaseName(item.caseName);
    setPdCaseAccountId(item.caseAccountId || '');
    setPdPeriodFrom(item.periodFrom);
    setPdPeriodTo(item.periodTo);
    setPdDrMai(String(item.drMaiAmount));
    setPdDrElham(String(item.drElhamAmount));
    setPdDrHanySamir(String(item.drHanySamirAmount));
    setPdOtherDoctorName(item.otherDoctorName || '');
    setPdOtherDoctorAmount(String(item.otherDoctorAmount));
    setPdNotes(item.notes || '');
    setPdFormError('');
    setShowProfitModal(true);
  };

  const handlePdCaseNameInput = (val: string) => {
    setPdCaseName(val);
    const matched = caseAccounts.find(c => c.caseName.trim().toLowerCase() === val.trim().toLowerCase());
    setPdCaseAccountId(matched ? matched.id : '');
  };

  const pdPeriodCheck = useMemo(
    () => computeInclusiveDaysClient(pdPeriodFrom, pdPeriodTo),
    [pdPeriodFrom, pdPeriodTo]
  );

  const liveProfitTotal = useMemo(() => {
    const safeNum = (s: string) => {
      const n = parseFloat(s);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    };
    const total = safeNum(pdDrMai) + safeNum(pdDrElham) + safeNum(pdDrHanySamir) + safeNum(pdOtherDoctorAmount);
    return Math.round(total * 100) / 100;
  }, [pdDrMai, pdDrElham, pdDrHanySamir, pdOtherDoctorAmount]);

  const handleSubmitProfitDistribution = async (e: React.FormEvent) => {
    e.preventDefault();
    setPdFormError('');

    if (!pdCaseName.trim()) {
      setPdFormError('يرجى إدخال اسم الحالة');
      return;
    }
    if (!pdPeriodFrom || !pdPeriodTo || !pdPeriodCheck.valid) {
      setPdFormError(pdPeriodCheck.error || 'يرجى تحديد المدة (من وإلى) بشكل صحيح');
      return;
    }

    const parseManualAmount = (val: string) => (val.trim() === '' ? 0 : Number(val));
    const maiNum = parseManualAmount(pdDrMai);
    const elhamNum = parseManualAmount(pdDrElham);
    const hanyNum = parseManualAmount(pdDrHanySamir);
    const otherNum = parseManualAmount(pdOtherDoctorAmount);

    if (
      !Number.isFinite(maiNum) || maiNum < 0 ||
      !Number.isFinite(elhamNum) || elhamNum < 0 ||
      !Number.isFinite(hanyNum) || hanyNum < 0 ||
      !Number.isFinite(otherNum) || otherNum < 0
    ) {
      setPdFormError('يجب أن تكون جميع المبالغ أرقاماً صحيحة غير سالبة');
      return;
    }

    if (otherNum > 0 && !pdOtherDoctorName.trim()) {
      setPdFormError('يرجى إدخال اسم الطبيب المتغير عند كتابة مبلغ له');
      return;
    }

    setPdSaving(true);
    try {
      const url = editingProfitId
        ? `/api/accounts/profit-distributions/${editingProfitId}`
        : '/api/accounts/profit-distributions';
      const method = editingProfitId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          caseName: pdCaseName.trim(),
          caseAccountId: pdCaseAccountId || undefined,
          periodFrom: pdPeriodFrom,
          periodTo: pdPeriodTo,
          drMaiAmount: maiNum,
          drElhamAmount: elhamNum,
          drHanySamirAmount: hanyNum,
          otherDoctorName: pdOtherDoctorName.trim(),
          otherDoctorAmount: otherNum,
          notes: pdNotes.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل حفظ سجل توزيع الأرباح');
      }

      setShowProfitModal(false);
      await fetchAllAccountsData();
    } catch (err: any) {
      setPdFormError(err.message || 'حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setPdSaving(false);
    }
  };

  // --- Confirm Delete ---
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const endpoint =
        deleteTarget.type === 'case_account'
          ? `/api/accounts/case-accounts/${deleteTarget.id}`
          : deleteTarget.type === 'revenue'
            ? `/api/accounts/revenues/${deleteTarget.id}`
            : deleteTarget.type === 'outgoing'
              ? `/api/accounts/outgoings/${deleteTarget.id}`
              : `/api/accounts/profit-distributions/${deleteTarget.id}`;

      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'فشل حذف السجل');
      }

      setDeleteTarget(null);
      await fetchAllAccountsData();
    } catch (err: any) {
      setLoadError(err.message || 'حدث خطأ أثناء حذف السجل');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const resetRevenueFilters = () => {
    setRevSearch('');
    setRevMethodFilter('all');
    setRevStartDate('');
    setRevEndDate('');
  };

  const resetOutgoingFilters = () => {
    setOutSearch('');
    setOutCategoryFilter('all');
    setOutStartDate('');
    setOutEndDate('');
  };

  const resetProfitFilters = () => {
    setProfitSearch('');
    setProfitStartDate('');
    setProfitEndDate('');
  };

  if (reportView) {
    return (
      <AccountsReportPrint
        token={token}
        initialReportType={reportView.type}
        initialOutgoingCategory={reportView.outgoingCategory || 'all'}
        caseAccounts={caseAccounts}
        revenues={revenues}
        outgoings={outgoings}
        profitDistributions={profitDistributions}
        onBack={() => setReportView(null)}
      />
    );
  }

  return (
    <div className="space-y-6 font-sans text-slate-800" dir="rtl">
      {/* Top Bar */}
      <div className="glass-card p-6 rounded-2xl border border-slate-200/70 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-slate-900">
            <Wallet className="h-6 w-6 text-teal-600 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">قسم الحسابات والإدارة المالية</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            حسابات الحالات · قسم الإيرادات · قسم الخارج · توزيع الأرباح والتقارير الشاملة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setReportView({ type: 'comprehensive' })}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>التقرير الشامل لكل حاجة</span>
          </button>

          {activeSection === 'case_accounts' && (
            <>
              <button
                type="button"
                onClick={() => setReportView({ type: 'case_accounts' })}
                className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-teal-700 border border-teal-300 font-bold text-xs sm:text-sm py-2.5 px-3.5 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileText className="h-4 w-4" />
                <span>تقرير حسابات الحالات</span>
              </button>
              <button
                type="button"
                onClick={openAddCaseModal}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>إضافة حساب حالة</span>
              </button>
            </>
          )}

          {activeSection === 'revenues' && (
            <>
              <button
                type="button"
                onClick={() => setReportView({ type: 'revenues' })}
                className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-teal-700 border border-teal-300 font-bold text-xs sm:text-sm py-2.5 px-3.5 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileText className="h-4 w-4" />
                <span>تقرير قسم الإيرادات</span>
              </button>
              <button
                type="button"
                onClick={openAddRevModal}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>تسجيل تحصيل جديد</span>
              </button>
            </>
          )}

          {activeSection === 'outgoings' && (
            <>
              <button
                type="button"
                onClick={() => setReportView({ type: 'outgoings', outgoingCategory: outCategoryFilter })}
                className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-teal-700 border border-teal-300 font-bold text-xs sm:text-sm py-2.5 px-3.5 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileText className="h-4 w-4" />
                <span>تقرير قسم الخارج</span>
              </button>
              <button
                type="button"
                onClick={() => openAddOutgoingModal()}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>تسجيل بند خارج</span>
              </button>
            </>
          )}

          {activeSection === 'profit_distribution' && (
            <>
              <button
                type="button"
                onClick={() => setReportView({ type: 'profit_distribution' })}
                className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-teal-700 border border-teal-300 font-bold text-xs sm:text-sm py-2.5 px-3.5 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileText className="h-4 w-4" />
                <span>تقرير توزيع الأرباح</span>
              </button>
              <button
                type="button"
                onClick={openAddProfitModal}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>تسجيل توزيع أرباح</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 4 Sub-Sections Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setActiveSection('case_accounts')}
          className={`flex items-center justify-between p-4 rounded-xl border text-right transition-all cursor-pointer ${
            activeSection === 'case_accounts'
              ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
              : 'bg-white/70 hover:bg-white text-slate-700 border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <UserCheck className={`h-5 w-5 shrink-0 ${activeSection === 'case_accounts' ? 'text-white' : 'text-teal-600'}`} />
            <div>
              <div className="text-xs sm:text-sm font-extrabold">1. حسابات الحالات</div>
              <div className={`text-[11px] mt-0.5 ${activeSection === 'case_accounts' ? 'text-teal-100' : 'text-slate-500'}`}>
                التمريض اليومي وتكلفة الاستشاري
              </div>
            </div>
          </div>
          <span className={`font-mono tabular-nums text-xs font-bold ${activeSection === 'case_accounts' ? 'text-white' : 'text-slate-600'}`}>
            {caseAccounts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('revenues')}
          className={`flex items-center justify-between p-4 rounded-xl border text-right transition-all cursor-pointer ${
            activeSection === 'revenues'
              ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
              : 'bg-white/70 hover:bg-white text-slate-700 border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <Banknote className={`h-5 w-5 shrink-0 ${activeSection === 'revenues' ? 'text-white' : 'text-teal-600'}`} />
            <div>
              <div className="text-xs sm:text-sm font-extrabold">2. قسم الإيرادات</div>
              <div className={`text-[11px] mt-0.5 ${activeSection === 'revenues' ? 'text-teal-100' : 'text-slate-500'}`}>
                التحصيلات النقدية والتحويلات
              </div>
            </div>
          </div>
          <span className={`font-mono tabular-nums text-xs font-bold ${activeSection === 'revenues' ? 'text-white' : 'text-slate-600'}`}>
            {revenues.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('outgoings')}
          className={`flex items-center justify-between p-4 rounded-xl border text-right transition-all cursor-pointer ${
            activeSection === 'outgoings'
              ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
              : 'bg-white/70 hover:bg-white text-slate-700 border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <Layers className={`h-5 w-5 shrink-0 ${activeSection === 'outgoings' ? 'text-white' : 'text-teal-600'}`} />
            <div>
              <div className="text-xs sm:text-sm font-extrabold">3. قسم الخارج</div>
              <div className={`text-[11px] mt-0.5 ${activeSection === 'outgoings' ? 'text-teal-100' : 'text-slate-500'}`}>
                المستلزمات والأدوية والتحاليل والأطباء
              </div>
            </div>
          </div>
          <span className={`font-mono tabular-nums text-xs font-bold ${activeSection === 'outgoings' ? 'text-white' : 'text-slate-600'}`}>
            {outgoings.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('profit_distribution')}
          className={`flex items-center justify-between p-4 rounded-xl border text-right transition-all cursor-pointer ${
            activeSection === 'profit_distribution'
              ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
              : 'bg-white/70 hover:bg-white text-slate-700 border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <TrendingUp className={`h-5 w-5 shrink-0 ${activeSection === 'profit_distribution' ? 'text-white' : 'text-teal-600'}`} />
            <div>
              <div className="text-xs sm:text-sm font-extrabold">4. توزيع الأرباح</div>
              <div className={`text-[11px] mt-0.5 ${activeSection === 'profit_distribution' ? 'text-teal-100' : 'text-slate-500'}`}>
                إدخال يدوي لحصص الأطباء بالحالة
              </div>
            </div>
          </div>
          <span className={`font-mono tabular-nums text-xs font-bold ${activeSection === 'profit_distribution' ? 'text-white' : 'text-slate-600'}`}>
            {profitDistributions.length}
          </span>
        </button>
      </div>

      {/* Global Load Error */}
      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={fetchAllAccountsData}
            className="text-xs font-bold underline cursor-pointer shrink-0"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* ==================== SECTION 1: CASE ACCOUNTS ==================== */}
      {activeSection === 'case_accounts' && (
        <div className="space-y-5">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/80 rounded-xl border border-slate-200/80 p-4">
              <div className="text-xs text-slate-500 font-semibold">عدد الحالات</div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">
                {caseStats.count}
              </div>
            </div>
            <div className="bg-white/80 rounded-xl border border-slate-200/80 p-4">
              <div className="text-xs text-slate-500 font-semibold">إجمالي أيام التمريض</div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">
                {caseStats.totalDays} <span className="text-xs font-sans font-semibold text-slate-500">يوم</span>
              </div>
            </div>
            <div className="bg-white/80 rounded-xl border border-slate-200/80 p-4">
              <div className="text-xs text-slate-500 font-semibold">إجمالي تكلفة التمريض</div>
              <div className="text-2xl font-extrabold text-teal-700 font-mono tabular-nums mt-1">
                {formatMoney(caseStats.totalNursingCost)} <span className="text-xs font-sans font-semibold text-slate-500">ج.م</span>
              </div>
            </div>
          </div>

          {/* Filter & Table Card */}
          <div className="glass-card rounded-2xl border border-slate-200/70 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={caseSearch}
                  onChange={e => setCaseSearch(e.target.value)}
                  placeholder="ابحث باسم الحالة أو اسم الاستشاري..."
                  className="w-full pr-9 pl-3 py-2 glass-input rounded-xl text-xs sm:text-sm focus:outline-none"
                />
              </div>
              <div className="text-xs text-slate-500 font-mono tabular-nums">
                عرض {filteredCaseAccounts.length} من أصل {caseAccounts.length} سجل
              </div>
            </div>

            {loading ? (
              <div className="p-10 text-center text-slate-500">
                <RefreshCw className="h-6 w-6 text-teal-600 animate-spin mx-auto mb-2" />
                <p className="text-xs">جاري تحميل حسابات الحالات...</p>
              </div>
            ) : filteredCaseAccounts.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <UserCheck className="h-9 w-9 text-slate-300 mx-auto" />
                <div className="text-sm font-bold text-slate-700">لا توجد حسابات حالات مسجلة بعد</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  أضف أول حالة لحساب مدة التمريض (من تاريخ البدء إلى الانتهاء) وإجمالي تكلفة التمريض تلقائياً.
                </p>
                <button
                  type="button"
                  onClick={openAddCaseModal}
                  className="inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>إضافة أول حساب حالة</span>
                </button>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-600 text-xs font-bold border-b border-slate-200/70">
                        <th className="py-3.5 px-5">اسم الحالة</th>
                        <th className="py-3.5 px-4">تاريخ البدء</th>
                        <th className="py-3.5 px-4">تاريخ الانتهاء</th>
                        <th className="py-3.5 px-4 text-center">عدد الأيام</th>
                        <th className="py-3.5 px-4">سعر التمريض اليومي</th>
                        <th className="py-3.5 px-4">اسم الاستشاري</th>
                        <th className="py-3.5 px-4">إجمالي تكلفة التمريض</th>
                        <th className="py-3.5 px-5 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 bg-white/50">
                      {filteredCaseAccounts.map(item => (
                        <tr key={item.id} className="hover:bg-teal-50/40 transition-colors">
                          <td className="py-3.5 px-5 font-bold text-slate-900">
                            <div>{item.caseName}</div>
                            {item.notes && (
                              <div className="text-[11px] font-normal text-slate-500 mt-0.5 truncate max-w-[200px]">
                                {item.notes}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono tabular-nums text-slate-700">{item.startDate}</td>
                          <td className="py-3.5 px-4 font-mono tabular-nums text-slate-700">{item.endDate}</td>
                          <td className="py-3.5 px-4 text-center font-mono tabular-nums font-bold text-slate-800">
                            {item.daysCount} يوم
                          </td>
                          <td className="py-3.5 px-4 font-mono tabular-nums text-slate-700">
                            {formatMoney(item.dailyNursingPrice)} ج.م
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">{item.consultantName}</td>
                          <td className="py-3.5 px-4 font-mono tabular-nums font-extrabold text-teal-700">
                            {formatMoney(item.totalCost)} ج.م
                          </td>
                          <td className="py-3.5 px-5 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditCaseModal(item)}
                                className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                title="تعديل"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget({ type: 'case_account', id: item.id, title: item.caseName })}
                                className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                title="حذف"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-slate-200/60 bg-white/60">
                  {filteredCaseAccounts.map(item => (
                    <div key={item.id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-extrabold text-sm text-slate-900">{item.caseName}</div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            الاستشاري: <span className="font-semibold">{item.consultantName}</span>
                          </div>
                        </div>
                        <div className="text-left font-mono tabular-nums">
                          <div className="text-sm font-extrabold text-teal-700">{formatMoney(item.totalCost)} ج.م</div>
                          <div className="text-[11px] text-slate-500">{item.daysCount} يوم</div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-600 font-mono tabular-nums flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>من {item.startDate}</span>
                        <span>·</span>
                        <span>إلى {item.endDate}</span>
                        <span>·</span>
                        <span>اليومي: {formatMoney(item.dailyNursingPrice)} ج.م</span>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => openEditCaseModal(item)}
                          className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-lg cursor-pointer"
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ type: 'case_account', id: item.id, title: item.caseName })}
                          className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-lg cursor-pointer"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================== SECTION 2: REVENUES ==================== */}
      {activeSection === 'revenues' && (
        <div className="space-y-5">
          {/* Summary Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="col-span-2 lg:col-span-1 bg-white/90 rounded-xl border border-teal-200 p-4">
              <div className="text-xs text-slate-500 font-semibold">إجمالي التحصيلات ({revenueStats.count})</div>
              <div className="text-xl sm:text-2xl font-extrabold text-teal-700 font-mono tabular-nums mt-1">
                {formatMoney(revenueStats.total)} <span className="text-xs font-sans font-semibold text-slate-500">ج.م</span>
              </div>
            </div>
            <div className="bg-white/80 rounded-xl border border-slate-200/80 p-4">
              <div className="text-xs text-slate-500 font-semibold">نقدي</div>
              <div className="text-lg font-extrabold text-slate-900 font-mono tabular-nums mt-1">
                {formatMoney(revenueStats.cash)} <span className="text-[11px] font-sans font-normal text-slate-500">ج.م</span>
              </div>
            </div>
            <div className="bg-white/80 rounded-xl border border-slate-200/80 p-4">
              <div className="text-xs text-slate-500 font-semibold">تحويل انستا باي</div>
              <div className="text-lg font-extrabold text-slate-900 font-mono tabular-nums mt-1">
                {formatMoney(revenueStats.instapay)} <span className="text-[11px] font-sans font-normal text-slate-500">ج.م</span>
              </div>
            </div>
            <div className="bg-white/80 rounded-xl border border-slate-200/80 p-4">
              <div className="text-xs text-slate-500 font-semibold">محفظة الكترونية</div>
              <div className="text-lg font-extrabold text-slate-900 font-mono tabular-nums mt-1">
                {formatMoney(revenueStats.e_wallet)} <span className="text-[11px] font-sans font-normal text-slate-500">ج.م</span>
              </div>
            </div>
            <div className="bg-white/80 rounded-xl border border-slate-200/80 p-4">
              <div className="text-xs text-slate-500 font-semibold">تحويل بنكي</div>
              <div className="text-lg font-extrabold text-slate-900 font-mono tabular-nums mt-1">
                {formatMoney(revenueStats.bank_transfer)} <span className="text-[11px] font-sans font-normal text-slate-500">ج.م</span>
              </div>
            </div>
          </div>

          {/* Filters & Table Card */}
          <div className="glass-card rounded-2xl border border-slate-200/70 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200/60 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={revSearch}
                    onChange={e => setRevSearch(e.target.value)}
                    placeholder="بحث باسم الحالة أو المحصل..."
                    className="w-full pr-9 pl-3 py-2 glass-input rounded-xl text-xs sm:text-sm focus:outline-none"
                  />
                </div>

                <select
                  value={revMethodFilter}
                  onChange={e => setRevMethodFilter(e.target.value as 'all' | RevenuePaymentMethod)}
                  className="w-full px-3 py-2 glass-input rounded-xl text-xs sm:text-sm focus:outline-none"
                >
                  <option value="all">جميع أنواع التحصيل</option>
                  {PAYMENT_METHOD_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                <input
                  type="date"
                  value={revStartDate}
                  onChange={e => setRevStartDate(e.target.value)}
                  aria-label="من تاريخ"
                  className="w-full px-3 py-2 glass-input rounded-xl text-xs sm:text-sm font-mono focus:outline-none"
                />

                <input
                  type="date"
                  value={revEndDate}
                  onChange={e => setRevEndDate(e.target.value)}
                  aria-label="إلى تاريخ"
                  className="w-full px-3 py-2 glass-input rounded-xl text-xs sm:text-sm font-mono focus:outline-none"
                />
              </div>

              {(revSearch || revMethodFilter !== 'all' || revStartDate || revEndDate) && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-mono tabular-nums">
                    نتائج التصفية: {filteredRevenues.length} سجل
                  </span>
                  <button
                    type="button"
                    onClick={resetRevenueFilters}
                    className="text-teal-700 hover:text-teal-800 font-bold underline cursor-pointer"
                  >
                    مسح الفلاتر
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="p-10 text-center text-slate-500">
                <RefreshCw className="h-6 w-6 text-teal-600 animate-spin mx-auto mb-2" />
                <p className="text-xs">جاري تحميل سجلات الإيرادات...</p>
              </div>
            ) : filteredRevenues.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <Banknote className="h-9 w-9 text-slate-300 mx-auto" />
                <div className="text-sm font-bold text-slate-700">لا توجد تحصيلات مسجلة مطابقة</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  سجّل عمليات التحصيل مع تحديد اسم الحالة والمبلغ والمحصل ونوع التحصيل (نقدي، انستا باي، محفظة إلكترونية، أو تحويل بنكي).
                </p>
                <button
                  type="button"
                  onClick={openAddRevModal}
                  className="inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>تسجيل أول تحصيل</span>
                </button>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-600 text-xs font-bold border-b border-slate-200/70">
                        <th className="py-3.5 px-5">اسم الحالة</th>
                        <th className="py-3.5 px-4">مبلغ التحصيل</th>
                        <th className="py-3.5 px-4">اسم المحصل</th>
                        <th className="py-3.5 px-4">نوع التحصيل</th>
                        <th className="py-3.5 px-4">تاريخ التحصيل</th>
                        <th className="py-3.5 px-5 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 bg-white/50">
                      {filteredRevenues.map(item => {
                        const methodMeta = PAYMENT_METHOD_OPTIONS.find(m => m.value === item.paymentMethod);
                        return (
                          <tr key={item.id} className="hover:bg-teal-50/40 transition-colors">
                            <td className="py-3.5 px-5 font-bold text-slate-900">
                              <div>{item.caseName}</div>
                              {item.notes && (
                                <div className="text-[11px] font-normal text-slate-500 mt-0.5 truncate max-w-[220px]">
                                  {item.notes}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono tabular-nums font-extrabold text-emerald-700">
                              {formatMoney(item.amount)} ج.م
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-800">{item.collectorName}</td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ${methodMeta?.accentClass || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                                {methodMeta && <methodMeta.icon className="h-3.5 w-3.5" />}
                                <span>{PAYMENT_METHOD_LABEL[item.paymentMethod]}</span>
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono tabular-nums text-slate-700">{item.collectionDate}</td>
                            <td className="py-3.5 px-5 text-center">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditRevModal(item)}
                                  className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                  title="تعديل"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget({ type: 'revenue', id: item.id, title: `${item.caseName} (${formatMoney(item.amount)} ج.م)` })}
                                  className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                  title="حذف"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-slate-200/60 bg-white/60">
                  {filteredRevenues.map(item => (
                    <div key={item.id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-extrabold text-sm text-slate-900">{item.caseName}</div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            المحصل: <span className="font-semibold">{item.collectorName}</span>
                          </div>
                        </div>
                        <div className="text-left font-mono tabular-nums">
                          <div className="text-sm font-extrabold text-emerald-700">{formatMoney(item.amount)} ج.م</div>
                          <div className="text-[11px] text-slate-500">{item.collectionDate}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-bold text-slate-700">
                          {PAYMENT_METHOD_LABEL[item.paymentMethod]}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditRevModal(item)}
                            className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-lg cursor-pointer"
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ type: 'revenue', id: item.id, title: `${item.caseName} (${formatMoney(item.amount)} ج.م)` })}
                            className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-lg cursor-pointer"
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================== SECTION 3: OUTGOINGS (قسم الخارج) ==================== */}
      {activeSection === 'outgoings' && (
        <div className="space-y-5">
          {/* 9 Categories + All Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <button
              type="button"
              onClick={() => setOutCategoryFilter('all')}
              className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
                outCategoryFilter === 'all'
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white/85 hover:bg-white text-slate-800 border-slate-200/80'
              }`}
            >
              <div className={`text-xs font-bold ${outCategoryFilter === 'all' ? 'text-teal-50' : 'text-slate-500'}`}>
                جميع بنود الخارج ({outgoings.length})
              </div>
              <div className={`text-lg font-extrabold font-mono tabular-nums mt-1 ${outCategoryFilter === 'all' ? 'text-white' : 'text-teal-700'}`}>
                {formatMoney(outgoingCategoryStats.allTotal)} <span className="text-[11px] font-sans font-normal">ج.م</span>
              </div>
            </button>

            {OUTGOING_CATEGORIES.map(cat => {
              const stat = outgoingCategoryStats.map[cat.value];
              const isSelected = outCategoryFilter === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setOutCategoryFilter(cat.value)}
                  className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white/80 hover:bg-white text-slate-800 border-slate-200/80'
                  }`}
                >
                  <div className={`text-xs font-bold truncate ${isSelected ? 'text-teal-50' : 'text-slate-600'}`}>
                    {cat.label} ({stat.count})
                  </div>
                  <div className={`text-base sm:text-lg font-extrabold font-mono tabular-nums mt-1 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {formatMoney(stat.total)} <span className="text-[11px] font-sans font-normal">ج.م</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Filter & Table Card */}
          <div className="glass-card rounded-2xl border border-slate-200/70 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200/60 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={outSearch}
                    onChange={e => setOutSearch(e.target.value)}
                    placeholder="بحث باسم الحالة أو الملاحظات..."
                    className="w-full pr-9 pl-3 py-2 glass-input rounded-xl text-xs sm:text-sm focus:outline-none"
                  />
                </div>

                <select
                  value={outCategoryFilter}
                  onChange={e => setOutCategoryFilter(e.target.value as 'all' | OutgoingCategory)}
                  className="w-full px-3 py-2 glass-input rounded-xl text-xs sm:text-sm focus:outline-none"
                >
                  <option value="all">جميع بنود الخارج (9 بنود)</option>
                  {OUTGOING_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>

                <input
                  type="date"
                  value={outStartDate}
                  onChange={e => setOutStartDate(e.target.value)}
                  aria-label="من تاريخ"
                  className="w-full px-3 py-2 glass-input rounded-xl text-xs sm:text-sm font-mono focus:outline-none"
                />

                <input
                  type="date"
                  value={outEndDate}
                  onChange={e => setOutEndDate(e.target.value)}
                  aria-label="إلى تاريخ"
                  className="w-full px-3 py-2 glass-input rounded-xl text-xs sm:text-sm font-mono focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3 text-slate-600">
                  <span className="font-mono tabular-nums">
                    {outCategoryFilter === 'all' ? 'جميع البنود' : OUTGOING_CATEGORY_LABELS[outCategoryFilter]} · {filteredOutgoings.length} سجل
                  </span>
                  <span className="font-bold text-teal-700 font-mono tabular-nums">
                    الإجمالي: {formatMoney(filteredOutgoingsTotal)} ج.م
                  </span>
                </div>

                {(outSearch || outCategoryFilter !== 'all' || outStartDate || outEndDate) && (
                  <button
                    type="button"
                    onClick={resetOutgoingFilters}
                    className="text-teal-700 hover:text-teal-800 font-bold underline cursor-pointer"
                  >
                    مسح الفلاتر
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="p-10 text-center text-slate-500">
                <RefreshCw className="h-6 w-6 text-teal-600 animate-spin mx-auto mb-2" />
                <p className="text-xs">جاري تحميل سجلات قسم الخارج...</p>
              </div>
            ) : filteredOutgoings.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <Layers className="h-9 w-9 text-slate-300 mx-auto" />
                <div className="text-sm font-bold text-slate-700">لا توجد سجلات في قسم الخارج مطابقة</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  سجّل مصروفات الخارج (المستلزمات، أدوية الصيدلية، تحاليل، أطباء، أجهزة، إسعاف دم، ABG، علاج طبيعي، مخازن علاجات) مع حساب الإجمالي لكل بند تلقائياً.
                </p>
                <button
                  type="button"
                  onClick={() => openAddOutgoingModal()}
                  className="inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>تسجيل أول بند خارج</span>
                </button>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-600 text-xs font-bold border-b border-slate-200/70">
                        <th className="py-3.5 px-5">البند</th>
                        <th className="py-3.5 px-4">اسم الحالة</th>
                        <th className="py-3.5 px-4">التاريخ</th>
                        <th className="py-3.5 px-4">المبلغ</th>
                        <th className="py-3.5 px-4">إجمالي البند الكلي</th>
                        <th className="py-3.5 px-5 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 bg-white/50">
                      {filteredOutgoings.map(item => {
                        const catTotal = outgoingCategoryStats.map[item.category]?.total || item.amount;
                        return (
                          <tr key={item.id} className="hover:bg-teal-50/40 transition-colors">
                            <td className="py-3.5 px-5 font-bold text-slate-800">
                              {OUTGOING_CATEGORY_LABELS[item.category]}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              <div>{item.caseName}</div>
                              {item.notes && (
                                <div className="text-[11px] font-normal text-slate-500 mt-0.5 truncate max-w-[220px]">
                                  {item.notes}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono tabular-nums text-slate-700">{item.date}</td>
                            <td className="py-3.5 px-4 font-mono tabular-nums font-extrabold text-slate-900">
                              {formatMoney(item.amount)} ج.م
                            </td>
                            <td className="py-3.5 px-4 font-mono tabular-nums font-extrabold text-teal-700">
                              {formatMoney(catTotal)} ج.م
                            </td>
                            <td className="py-3.5 px-5 text-center">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditOutgoingModal(item)}
                                  className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                  title="تعديل"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget({ type: 'outgoing', id: item.id, title: `${OUTGOING_CATEGORY_LABELS[item.category]} - ${item.caseName}` })}
                                  className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                  title="حذف"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-teal-50/70 border-t border-teal-200 font-extrabold text-slate-900">
                        <td colSpan={3} className="py-3.5 px-5 text-xs sm:text-sm">
                          الإجمالي ({outCategoryFilter === 'all' ? 'جميع البنود المعروضة' : OUTGOING_CATEGORY_LABELS[outCategoryFilter]})
                        </td>
                        <td colSpan={3} className="py-3.5 px-4 font-mono tabular-nums text-base text-teal-800">
                          {formatMoney(filteredOutgoingsTotal)} ج.م
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-slate-200/60 bg-white/60">
                  {filteredOutgoings.map(item => (
                    <div key={item.id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-extrabold text-sm text-slate-900">{item.caseName}</div>
                          <div className="text-xs text-teal-700 font-bold mt-0.5">
                            {OUTGOING_CATEGORY_LABELS[item.category]}
                          </div>
                        </div>
                        <div className="text-left font-mono tabular-nums">
                          <div className="text-sm font-extrabold text-slate-900">{formatMoney(item.amount)} ج.م</div>
                          <div className="text-[11px] text-slate-500">{item.date}</div>
                        </div>
                      </div>
                      {item.notes && (
                        <div className="text-xs text-slate-500">{item.notes}</div>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-600 font-mono tabular-nums">
                          إجمالي البند: <strong className="text-teal-700">{formatMoney(outgoingCategoryStats.map[item.category]?.total || item.amount)} ج.م</strong>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditOutgoingModal(item)}
                            className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-lg cursor-pointer"
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ type: 'outgoing', id: item.id, title: `${OUTGOING_CATEGORY_LABELS[item.category]} - ${item.caseName}` })}
                            className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-lg cursor-pointer"
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================== SECTION 4: PROFIT DISTRIBUTION (توزيع الأرباح) ==================== */}
      {activeSection === 'profit_distribution' && (
        <div className="space-y-5">
          {/* Summary Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="col-span-2 lg:col-span-1 bg-white/90 rounded-xl border border-teal-200 p-4">
              <div className="text-xs text-slate-500 font-semibold">إجمالي الأرباح الموزعة ({profitStats.count})</div>
              <div className="text-xl sm:text-2xl font-extrabold text-teal-700 font-mono tabular-nums mt-1">
                {formatMoney(profitStats.totalDistributed)} <span className="text-xs font-sans font-semibold text-slate-500">ج.م</span>
              </div>
            </div>
            <div className="bg-white/80 rounded-xl border border-slate-200/80 p-4">
              <div className="text-xs text-slate-500 font-semibold">د. مي</div>
              <div className="text-lg font-extrabold text-slate-900 font-mono tabular-nums mt-1">
                {formatMoney(profitStats.drMai)} <span className="text-[11px] font-sans font-normal text-slate-500">ج.م</span>
              </div>
            </div>
            <div className="bg-white/80 rounded-xl border border-slate-200/80 p-4">
              <div className="text-xs text-slate-500 font-semibold">د. إلهام</div>
              <div className="text-lg font-extrabold text-slate-900 font-mono tabular-nums mt-1">
                {formatMoney(profitStats.drElham)} <span className="text-[11px] font-sans font-normal text-slate-500">ج.م</span>
              </div>
            </div>
            <div className="bg-white/80 rounded-xl border border-slate-200/80 p-4">
              <div className="text-xs text-slate-500 font-semibold">د. هاني سمير</div>
              <div className="text-lg font-extrabold text-slate-900 font-mono tabular-nums mt-1">
                {formatMoney(profitStats.drHanySamir)} <span className="text-[11px] font-sans font-normal text-slate-500">ج.م</span>
              </div>
            </div>
            <div className="bg-white/80 rounded-xl border border-slate-200/80 p-4">
              <div className="text-xs text-slate-500 font-semibold">الطبيب المتغير</div>
              <div className="text-lg font-extrabold text-slate-900 font-mono tabular-nums mt-1">
                {formatMoney(profitStats.otherDoctor)} <span className="text-[11px] font-sans font-normal text-slate-500">ج.م</span>
              </div>
            </div>
          </div>

          {/* Filter & Table Card */}
          <div className="glass-card rounded-2xl border border-slate-200/70 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200/60 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative sm:col-span-2">
                  <Search className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={profitSearch}
                    onChange={e => setProfitSearch(e.target.value)}
                    placeholder="بحث باسم الحالة أو الطبيب المتغير أو الملاحظات..."
                    className="w-full pr-9 pl-3 py-2 glass-input rounded-xl text-xs sm:text-sm focus:outline-none"
                  />
                </div>

                <input
                  type="date"
                  value={profitStartDate}
                  onChange={e => setProfitStartDate(e.target.value)}
                  aria-label="المدة من"
                  className="w-full px-3 py-2 glass-input rounded-xl text-xs sm:text-sm font-mono focus:outline-none"
                />

                <input
                  type="date"
                  value={profitEndDate}
                  onChange={e => setProfitEndDate(e.target.value)}
                  aria-label="المدة إلى"
                  className="w-full px-3 py-2 glass-input rounded-xl text-xs sm:text-sm font-mono focus:outline-none"
                />
              </div>

              {(profitSearch || profitStartDate || profitEndDate) && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-mono tabular-nums">
                    نتائج التصفية: {filteredProfitDistributions.length} سجل
                  </span>
                  <button
                    type="button"
                    onClick={resetProfitFilters}
                    className="text-teal-700 hover:text-teal-800 font-bold underline cursor-pointer"
                  >
                    مسح الفلاتر
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="p-10 text-center text-slate-500">
                <RefreshCw className="h-6 w-6 text-teal-600 animate-spin mx-auto mb-2" />
                <p className="text-xs">جاري تحميل سجلات توزيع الأرباح...</p>
              </div>
            ) : filteredProfitDistributions.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <TrendingUp className="h-9 w-9 text-slate-300 mx-auto" />
                <div className="text-sm font-bold text-slate-700">لا توجد سجلات توزيع أرباح مطابقة</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  سجّل توزيع الأرباح يدوياً لكل حالة مع تحديد المدة (من — إلى) وإدخال المبالغ الخاصة بـ (د. مي، د. إلهام، د. هاني سمير، وطبيب متغير يضاف يدوياً).
                </p>
                <button
                  type="button"
                  onClick={openAddProfitModal}
                  className="inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>تسجيل أول توزيع أرباح</span>
                </button>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-600 text-xs font-bold border-b border-slate-200/70">
                        <th className="py-3.5 px-5">اسم الحالة</th>
                        <th className="py-3.5 px-4">المدة (من — إلى)</th>
                        <th className="py-3.5 px-4">د. مي</th>
                        <th className="py-3.5 px-4">د. إلهام</th>
                        <th className="py-3.5 px-4">د. هاني سمير</th>
                        <th className="py-3.5 px-4">طبيب متغير (يدوي)</th>
                        <th className="py-3.5 px-4">الإجمالي</th>
                        <th className="py-3.5 px-5 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 bg-white/50">
                      {filteredProfitDistributions.map(item => (
                        <tr key={item.id} className="hover:bg-teal-50/40 transition-colors">
                          <td className="py-3.5 px-5 font-bold text-slate-900">
                            <div>{item.caseName}</div>
                            {item.notes && (
                              <div className="text-[11px] font-normal text-slate-500 mt-0.5 truncate max-w-[200px]">
                                {item.notes}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-slate-700 whitespace-nowrap">
                            {item.periodFrom} — {item.periodTo}
                          </td>
                          <td className="py-3.5 px-4 font-mono tabular-nums font-bold text-slate-800">
                            {formatMoney(item.drMaiAmount)} ج.م
                          </td>
                          <td className="py-3.5 px-4 font-mono tabular-nums font-bold text-slate-800">
                            {formatMoney(item.drElhamAmount)} ج.م
                          </td>
                          <td className="py-3.5 px-4 font-mono tabular-nums font-bold text-slate-800">
                            {formatMoney(item.drHanySamirAmount)} ج.م
                          </td>
                          <td className="py-3.5 px-4">
                            {item.otherDoctorName || item.otherDoctorAmount > 0 ? (
                              <div>
                                <div className="text-xs font-bold text-slate-800">{item.otherDoctorName || 'طبيب إضافي'}</div>
                                <div className="text-xs font-mono tabular-nums text-slate-600">{formatMoney(item.otherDoctorAmount)} ج.م</div>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono tabular-nums font-extrabold text-teal-700">
                            {formatMoney(item.totalDistributed)} ج.م
                          </td>
                          <td className="py-3.5 px-5 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditProfitModal(item)}
                                className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                title="تعديل"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget({ type: 'profit_distribution', id: item.id, title: `${item.caseName} (${item.periodFrom} - ${item.periodTo})` })}
                                className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                title="حذف"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-teal-50/70 border-t border-teal-200 font-extrabold text-slate-900">
                        <td colSpan={2} className="py-3.5 px-5 text-xs sm:text-sm">
                          الإجمالي ({filteredProfitDistributions.length} سجل)
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-slate-900">{formatMoney(profitStats.drMai)} ج.م</td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-slate-900">{formatMoney(profitStats.drElham)} ج.م</td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-slate-900">{formatMoney(profitStats.drHanySamir)} ج.م</td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-slate-900">{formatMoney(profitStats.otherDoctor)} ج.م</td>
                        <td colSpan={2} className="py-3.5 px-4 font-mono tabular-nums text-base text-teal-800">
                          {formatMoney(profitStats.totalDistributed)} ج.م
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-slate-200/60 bg-white/60">
                  {filteredProfitDistributions.map(item => (
                    <div key={item.id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-extrabold text-sm text-slate-900">{item.caseName}</div>
                          <div className="text-xs text-slate-600 font-mono tabular-nums mt-0.5">
                            {item.periodFrom} — {item.periodTo}
                          </div>
                        </div>
                        <div className="text-left font-mono tabular-nums">
                          <div className="text-sm font-extrabold text-teal-700">{formatMoney(item.totalDistributed)} ج.م</div>
                          <div className="text-[11px] text-slate-500">الإجمالي</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-700">
                        <div>د. مي: <span className="font-mono tabular-nums font-bold">{formatMoney(item.drMaiAmount)} ج.م</span></div>
                        <div>د. إلهام: <span className="font-mono tabular-nums font-bold">{formatMoney(item.drElhamAmount)} ج.م</span></div>
                        <div>د. هاني سمير: <span className="font-mono tabular-nums font-bold">{formatMoney(item.drHanySamirAmount)} ج.م</span></div>
                        <div>
                          {item.otherDoctorName || 'طبيب متغير'}:{' '}
                          <span className="font-mono tabular-nums font-bold">{formatMoney(item.otherDoctorAmount)} ج.م</span>
                        </div>
                      </div>
                      {item.notes && <div className="text-xs text-slate-500">{item.notes}</div>}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => openEditProfitModal(item)}
                          className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-lg cursor-pointer"
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ type: 'profit_distribution', id: item.id, title: `${item.caseName} (${item.periodFrom} - ${item.periodTo})` })}
                          className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-lg cursor-pointer"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Shared Datalist for Case Names */}
      <datalist id="accounts-case-names-list">
        {caseNameSuggestions.map(name => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {/* ==================== MODAL: ADD / EDIT CASE ACCOUNT ==================== */}
      <AnimatePresence>
        {showCaseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-teal-600" />
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {editingCaseId ? 'تعديل حساب حالة' : 'إضافة حساب حالة جديد'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCaseModal(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitCaseAccount} className="space-y-4">
                {caFormError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{caFormError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسم الحالة *</label>
                    <input
                      type="text"
                      required
                      list="accounts-case-names-list"
                      value={caCaseName}
                      onChange={e => handleCaseNameInput(e.target.value)}
                      placeholder="اكتب اسم الحالة أو اختر من العملاء المسجلين"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسم الاستشاري *</label>
                    <div className="relative">
                      <Stethoscope className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={caConsultantName}
                        onChange={e => setCaConsultantName(e.target.value)}
                        placeholder="مثال: د. محمد أحمد"
                        className="w-full pr-9 pl-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ البدء *</label>
                    <div className="relative">
                      <Calendar className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="date"
                        required
                        value={caStartDate}
                        onChange={e => setCaStartDate(e.target.value)}
                        className="w-full pr-9 pl-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الانتهاء *</label>
                    <div className="relative">
                      <Calendar className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="date"
                        required
                        value={caEndDate}
                        onChange={e => setCaEndDate(e.target.value)}
                        className="w-full pr-9 pl-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-600"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">سعر التمريض اليومي (ج.م) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={caDailyPrice}
                      onChange={e => setCaDailyPrice(e.target.value)}
                      placeholder="مثال: 1500"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  {/* Live Calculated Total Preview */}
                  <div className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <Calculator className="h-4 w-4 text-teal-600" />
                      <span>حساب إجمالي تكلفة التمريض تلقائياً (عدد الأيام × سعر التمريض اليومي)</span>
                    </div>
                    {liveCalc.error ? (
                      <div className="text-xs font-semibold text-red-600">{liveCalc.error}</div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3 pt-1 text-center">
                        <div className="bg-white rounded-lg border border-slate-200 p-2.5">
                          <div className="text-[11px] text-slate-500">عدد الأيام</div>
                          <div className="text-sm font-extrabold font-mono tabular-nums text-slate-900 mt-0.5">
                            {liveCalc.days} يوم
                          </div>
                        </div>
                        <div className="bg-white rounded-lg border border-slate-200 p-2.5">
                          <div className="text-[11px] text-slate-500">السعر اليومي</div>
                          <div className="text-sm font-extrabold font-mono tabular-nums text-slate-900 mt-0.5">
                            {formatMoney(liveCalc.rate)} ج.م
                          </div>
                        </div>
                        <div className="bg-teal-50 rounded-lg border border-teal-200 p-2.5">
                          <div className="text-[11px] text-teal-700 font-bold">إجمالي التكلفة</div>
                          <div className="text-sm font-extrabold font-mono tabular-nums text-teal-800 mt-0.5">
                            {formatMoney(liveCalc.total)} ج.م
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات (اختياري)</label>
                    <textarea
                      rows={2}
                      value={caNotes}
                      onChange={e => setCaNotes(e.target.value)}
                      placeholder="أي تفاصيل إضافية متعلقة بالحالة..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowCaseModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={caSaving || !liveCalc.valid}
                    className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 px-5 rounded-xl disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{caSaving ? 'جاري الحفظ...' : 'حفظ حساب الحالة'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== MODAL: ADD / EDIT REVENUE ==================== */}
      <AnimatePresence>
        {showRevModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-teal-600" />
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {editingRevId ? 'تعديل سجل تحصيل إيراد' : 'تسجيل تحصيل إيراد جديد'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRevModal(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitRevenue} className="space-y-4">
                {revFormError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{revFormError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسم الحالة *</label>
                    <input
                      type="text"
                      required
                      list="accounts-case-names-list"
                      value={revCaseName}
                      onChange={e => handleRevCaseNameInput(e.target.value)}
                      placeholder="اكتب اسم الحالة أو اختر من القائمة"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ التحصيل (ج.م) *</label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      value={revAmount}
                      onChange={e => setRevAmount(e.target.value)}
                      placeholder="مثال: 5000"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ التحصيل *</label>
                    <input
                      type="date"
                      required
                      value={revCollectionDate}
                      onChange={e => setRevCollectionDate(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسم المحصل *</label>
                    <input
                      type="text"
                      required
                      value={revCollectorName}
                      onChange={e => setRevCollectorName(e.target.value)}
                      placeholder="اسم الموظف أو المسؤول عن التحصيل"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع التحصيل *</label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {PAYMENT_METHOD_OPTIONS.map(opt => {
                        const Icon = opt.icon;
                        const active = revPaymentMethod === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setRevPaymentMethod(opt.value)}
                            className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              active
                                ? 'bg-teal-600 text-white border-teal-600'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات (اختياري)</label>
                    <textarea
                      rows={2}
                      value={revNotes}
                      onChange={e => setRevNotes(e.target.value)}
                      placeholder="رقم مرجعي للتحويل أو ملاحظات إضافية..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowRevModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={revSaving}
                    className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 px-5 rounded-xl disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{revSaving ? 'جاري الحفظ...' : 'حفظ سجل التحصيل'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== MODAL: ADD / EDIT OUTGOING (قسم الخارج) ==================== */}
      <AnimatePresence>
        {showOutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-teal-600" />
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {editingOutId ? 'تعديل سجل في قسم الخارج' : 'تسجيل بند في قسم الخارج'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOutModal(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitOutgoing} className="space-y-4">
                {outFormError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{outFormError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">البند *</label>
                    <select
                      value={outCategory}
                      onChange={e => setOutCategory(e.target.value as OutgoingCategory)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-teal-600"
                    >
                      {OUTGOING_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسم الحالة *</label>
                    <input
                      type="text"
                      required
                      list="accounts-case-names-list"
                      value={outCaseName}
                      onChange={e => handleOutCaseNameInput(e.target.value)}
                      placeholder="اكتب اسم الحالة أو اختر من القائمة"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">التاريخ *</label>
                    <input
                      type="date"
                      required
                      value={outDate}
                      onChange={e => setOutDate(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ (ج.م) *</label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      value={outAmount}
                      onChange={e => setOutAmount(e.target.value)}
                      placeholder="مثال: 750"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  {/* Live Category Total Preview */}
                  <div className="sm:col-span-2 bg-teal-50/70 border border-teal-200 rounded-xl p-3.5 flex items-center justify-between">
                    <div className="text-xs font-bold text-teal-800">
                      إجمالي بند ({OUTGOING_CATEGORY_LABELS[outCategory]}) بعد الحفظ:
                    </div>
                    <div className="text-base font-extrabold font-mono tabular-nums text-teal-900">
                      {formatMoney(liveOutgoingCategoryTotal)} ج.م
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">البيان / ملاحظات (اختياري)</label>
                    <textarea
                      rows={2}
                      value={outNotes}
                      onChange={e => setOutNotes(e.target.value)}
                      placeholder="تفاصيل الصنف أو اسم المعمل أو الطبيب..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowOutModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={outSaving}
                    className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 px-5 rounded-xl disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{outSaving ? 'جاري الحفظ...' : 'حفظ السجل'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== MODAL: ADD / EDIT PROFIT DISTRIBUTION (توزيع الأرباح) ==================== */}
      <AnimatePresence>
        {showProfitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-teal-600" />
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {editingProfitId ? 'تعديل توزيع أرباح الحالة' : 'تسجيل توزيع أرباح جديد'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfitModal(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitProfitDistribution} className="space-y-4">
                {pdFormError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{pdFormError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسم الحالة *</label>
                    <input
                      type="text"
                      required
                      list="accounts-case-names-list"
                      value={pdCaseName}
                      onChange={e => handlePdCaseNameInput(e.target.value)}
                      placeholder="اكتب اسم الحالة أو اختر من القائمة"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">المدة من *</label>
                    <input
                      type="date"
                      required
                      value={pdPeriodFrom}
                      onChange={e => setPdPeriodFrom(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">إلى *</label>
                    <input
                      type="date"
                      required
                      value={pdPeriodTo}
                      onChange={e => setPdPeriodTo(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  {pdPeriodCheck.error && (
                    <div className="sm:col-span-2 text-xs font-semibold text-red-600">
                      {pdPeriodCheck.error}
                    </div>
                  )}

                  <div className="sm:col-span-2 pt-1 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-700 mb-2">إدخال حصص الأرباح يدوياً (ج.م)</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">د. مي (ج.م)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={pdDrMai}
                          onChange={e => setPdDrMai(e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">د. إلهام (ج.م)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={pdDrElham}
                          onChange={e => setPdDrElham(e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">د. هاني سمير (ج.م)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={pdDrHanySamir}
                          onChange={e => setPdDrHanySamir(e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">طبيب (متغير يضاف يدوياً)</label>
                    <input
                      type="text"
                      value={pdOtherDoctorName}
                      onChange={e => setPdOtherDoctorName(e.target.value)}
                      placeholder="اسم الطبيب المتغير (اختياري)"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ الطبيب المتغير (ج.م)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pdOtherDoctorAmount}
                      onChange={e => setPdOtherDoctorAmount(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  {/* Live Sum Preview */}
                  <div className="sm:col-span-2 bg-teal-50/70 border border-teal-200 rounded-xl p-3.5 flex items-center justify-between">
                    <div className="text-xs font-bold text-teal-800">
                      إجمالي الأرباح الموزعة للحالة (مجموع الأرقام المدخلة يدوياً):
                    </div>
                    <div className="text-base font-extrabold font-mono tabular-nums text-teal-900">
                      {formatMoney(liveProfitTotal)} ج.م
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات (اختياري)</label>
                    <textarea
                      rows={2}
                      value={pdNotes}
                      onChange={e => setPdNotes(e.target.value)}
                      placeholder="أي ملاحظات إضافية عن توزيع الأرباح..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowProfitModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={pdSaving || !pdPeriodCheck.valid}
                    className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 px-5 rounded-xl disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{pdSaving ? 'جاري الحفظ...' : 'حفظ توزيع الأرباح'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== MODAL: CONFIRM DELETE ==================== */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4"
            >
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <h3 className="font-extrabold text-base text-slate-900">تأكيد الحذف</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                هل أنت متأكد من حذف السجل <span className="font-bold text-slate-900">"{deleteTarget.title}"</span> نهائياً؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  {deleting ? 'جاري الحذف...' : 'تأكيد الحذف'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
