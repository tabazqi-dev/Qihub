import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { 
  Receipt, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Building2, 
  FileSpreadsheet, 
  Download, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sliders, 
  Sparkles, 
  RefreshCw, 
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Printer,
  X,
  Wallet,
  ArrowUpRight,
  Coins,
  Check,
  Table,
  CalendarDays,
  Eye,
  MousePointerClick
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  ReimbursementItem, 
  ReimburseRate, 
  ReimburseRole, 
  ReimburseProjectType, 
  ReimburseStatus 
} from '../../types';
import { ReimburseCalendarPicker } from './ReimburseCalendarPicker';
import { ReimburseScheduleBoard } from './ReimburseScheduleBoard';

// Helper: Calculate weekdays and weekends between two dates inclusive
// Khusus Online: sehari dianggap 2 sesi
export const calculateWdWeDays = (
  startDateStr: string, 
  endDateStr: string,
  typeProject: ReimburseProjectType = 'Onsite'
): { 
  wd: number; 
  we: number; 
  total: number;
  calendarWd: number;
  calendarWe: number;
  totalCalendarDays: number;
  isOnline: boolean;
} => {
  if (!startDateStr || !endDateStr) {
    return { wd: 0, we: 0, total: 0, calendarWd: 0, calendarWe: 0, totalCalendarDays: 0, isOnline: false };
  }
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { wd: 0, we: 0, total: 0, calendarWd: 0, calendarWe: 0, totalCalendarDays: 0, isOnline: false };
  }

  const s = start <= end ? new Date(start) : new Date(end);
  const e = start <= end ? new Date(end) : new Date(start);

  let calendarWd = 0;
  let calendarWe = 0;
  const current = new Date(s);
  while (current <= e) {
    const day = current.getDay(); // 0 = Sunday, 6 = Saturday
    if (day === 0 || day === 6) {
      calendarWe++;
    } else {
      calendarWd++;
    }
    current.setDate(current.getDate() + 1);
  }

  // Khusus Online: sehari dianggap 2 sesi
  const isOnline = typeProject === 'Online';
  const multiplier = isOnline ? 2 : 1;
  const wd = calendarWd * multiplier;
  const we = calendarWe * multiplier;
  const totalCalendarDays = calendarWd + calendarWe;

  return { 
    wd, 
    we, 
    total: isOnline ? totalCalendarDays : (wd + we),
    calendarWd, 
    calendarWe, 
    totalCalendarDays,
    isOnline
  };
};

// Helper: Format date string to DD/MM/YYYY
export const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

// Helper: Get effective # Hari Kerja (Khusus online 2 sesi = 1 hari kerja)
export const getEffectiveTotalHari = (item: { typeProject: ReimburseProjectType; wdDays: number; weDays: number; totalDays?: number }): number => {
  if (item.typeProject === 'Online') {
    return Math.max(1, Math.round((item.wdDays + item.weDays) / 2));
  }
  return item.totalDays || (item.wdDays + item.weDays);
};

// Helper: Get all dates between two date strings YYYY-MM-DD
export const getDatesBetween = (startStr: string, endStr: string): string[] => {
  if (!startStr || !endStr) return [];
  const s = new Date(startStr <= endStr ? startStr : endStr);
  const e = new Date(startStr <= endStr ? endStr : startStr);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return [];
  
  const dates: string[] = [];
  const curr = new Date(s);
  while (curr <= e) {
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

export const ReimburseView: React.FC = () => {
  const { 
    reimbursements, 
    reimburseRates, 
    addReimbursement, 
    updateReimbursement, 
    deleteReimbursement, 
    updateReimburseStatus,
    updateReimburseRate,
    resetReimburseRatesToDefault,
    accounts,
    profile,
    showToast
  } = useApp();

  // Top View Mode: Table view vs Implementation Schedule Board
  const [activeMainView, setActiveMainView] = useState<'table' | 'schedule_board'>('table');

  // Preview modal for a single item's calendar
  const [calendarPreviewItem, setCalendarPreviewItem] = useState<ReimbursementItem | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReimbursementItem | null>(null);
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutTargetItem, setPayoutTargetItem] = useState<ReimbursementItem | null>(null);
  const [payoutAccountId, setPayoutAccountId] = useState<string>(() => accounts[0]?.id || '');

  // Form state
  const [formProperty, setFormProperty] = useState('');
  const [formTypeProject, setFormTypeProject] = useState<ReimburseProjectType>('Onsite');
  const [formRole, setFormRole] = useState<ReimburseRole>('M');
  const [formSubmissionDate, setFormSubmissionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formStartDate, setFormStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [formEndDate, setFormEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formDateMode, setFormDateMode] = useState<'calendar' | 'range'>('calendar');
  const [formSelectedDates, setFormSelectedDates] = useState<string[]>([]);
  const [formIsManualDays, setFormIsManualDays] = useState(false);
  const [formWdDays, setFormWdDays] = useState<number>(0);
  const [formWeDays, setFormWeDays] = useState<number>(0);
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<ReimburseStatus>('Submitted');
  const [formNotes, setFormNotes] = useState('');

  // Rate Matrix editing state
  const [editingRates, setEditingRates] = useState<Record<string, { wdRate: number; weRate: number }>>({});

  // Lookup rate for given role and type
  const getRateFor = (role: ReimburseRole, type: ReimburseProjectType): { wdRate: number; weRate: number } => {
    const found = reimburseRates.find(r => r.role === role && r.type === type);
    if (found) {
      return { wdRate: found.wdRate, weRate: found.weRate };
    }
    // Fallback default
    if (role === 'M') return type === 'Onsite' ? { wdRate: 44500, weRate: 69500 } : { wdRate: 18750, weRate: 37500 };
    if (role === 'TPM') return type === 'Onsite' ? { wdRate: 75750, weRate: 100750 } : { wdRate: 33750, weRate: 52500 };
    return type === 'Onsite' ? { wdRate: 132000, weRate: 157000 } : { wdRate: 60000, weRate: 78750 };
  };

  // Open Form modal for new item
  const handleOpenNew = (defaultDate?: string) => {
    setEditingItem(null);
    setFormProperty('');
    setFormTypeProject('Onsite');
    setFormRole('M');
    const today = defaultDate || new Date().toISOString().split('T')[0];
    setFormSubmissionDate(today);
    setFormStartDate(today);
    setFormEndDate(today);
    setFormDateMode('calendar');
    setFormSelectedDates([today]);

    const calculated = calculateWdWeDays(today, today, 'Onsite');
    setFormWdDays(calculated.wd);
    setFormWeDays(calculated.we);
    setFormIsManualDays(false);
    setFormDescription('');
    setFormStatus('Submitted');
    setFormNotes('');
    setIsFormModalOpen(true);
  };

  // Open Form modal for editing item
  const handleOpenEdit = (item: ReimbursementItem) => {
    setEditingItem(item);
    setFormProperty(item.property);
    setFormTypeProject(item.typeProject);
    setFormRole(item.role);
    setFormSubmissionDate(item.submissionDate);
    setFormStartDate(item.startDate);
    setFormEndDate(item.endDate);
    setFormWdDays(item.wdDays);
    setFormWeDays(item.weDays);
    setFormIsManualDays(true); // preserve exact days
    setFormDescription(item.description);
    setFormStatus(item.status);
    setFormNotes(item.notes || '');

    // Restore or generate selectedDates
    if (item.selectedDates && item.selectedDates.length > 0) {
      setFormSelectedDates(item.selectedDates);
      setFormDateMode('calendar');
    } else {
      const between = getDatesBetween(item.startDate, item.endDate);
      setFormSelectedDates(between.length > 0 ? between : [item.startDate]);
      setFormDateMode('calendar');
    }

    setIsFormModalOpen(true);
  };

  // Handle Calendar dates selection change
  const handleCalendarDatesChange = (newDates: string[]) => {
    const sorted = [...newDates].sort();
    setFormSelectedDates(sorted);

    if (sorted.length > 0) {
      const s = sorted[0];
      const e = sorted[sorted.length - 1];
      setFormStartDate(s);
      setFormEndDate(e);

      // Count weekdays vs weekends
      let wdCount = 0;
      let weCount = 0;
      sorted.forEach(dStr => {
        const d = new Date(dStr);
        const day = d.getDay();
        if (day === 0 || day === 6) {
          weCount++;
        } else {
          wdCount++;
        }
      });

      const multiplier = formTypeProject === 'Online' ? 2 : 1;
      setFormWdDays(wdCount * multiplier);
      setFormWeDays(weCount * multiplier);
    } else {
      setFormWdDays(0);
      setFormWeDays(0);
    }
  };

  // Handle Type Project change (recalculate days automatically if not manual)
  const handleTypeProjectChange = (tp: ReimburseProjectType) => {
    setFormTypeProject(tp);
    if (!formIsManualDays && formSelectedDates.length > 0 && formDateMode === 'calendar') {
      let wdCount = 0;
      let weCount = 0;
      formSelectedDates.forEach(dStr => {
        const d = new Date(dStr);
        const day = d.getDay();
        if (day === 0 || day === 6) {
          weCount++;
        } else {
          wdCount++;
        }
      });
      const multiplier = tp === 'Online' ? 2 : 1;
      setFormWdDays(wdCount * multiplier);
      setFormWeDays(weCount * multiplier);
    } else if (!formIsManualDays && formStartDate && formEndDate) {
      const calc = calculateWdWeDays(formStartDate, formEndDate, tp);
      setFormWdDays(calc.wd);
      setFormWeDays(calc.we);
    }
  };

  // Auto-recalculate days when dates change (unless manual override)
  const handleStartDateChange = (val: string) => {
    setFormStartDate(val);
    if (!formIsManualDays && val && formEndDate) {
      const calc = calculateWdWeDays(val, formEndDate, formTypeProject);
      setFormWdDays(calc.wd);
      setFormWeDays(calc.we);
    }
  };

  const handleEndDateChange = (val: string) => {
    setFormEndDate(val);
    if (!formIsManualDays && formStartDate && val) {
      const calc = calculateWdWeDays(formStartDate, val, formTypeProject);
      setFormWdDays(calc.wd);
      setFormWeDays(calc.we);
    }
  };

  // Computed rate & amounts in form
  const currentRate = useMemo(() => {
    return getRateFor(formRole, formTypeProject);
  }, [formRole, formTypeProject, reimburseRates]);

  const formWdAmount = formWdDays * currentRate.wdRate;
  const formWeAmount = formWeDays * currentRate.weRate;
  const formTotalAmount = formWdAmount + formWeAmount;
  
  // Total hari kerja: untuk online 2 sesi = 1 hari kerja, onsite 1 sesi = 1 hari kerja
  const formTotalDays = useMemo(() => {
    if (formTypeProject === 'Online') {
      return Math.max(1, Math.round((formWdDays + formWeDays) / 2));
    }
    return formWdDays + formWeDays;
  }, [formTypeProject, formWdDays, formWeDays]);

  // Auto-generate description if empty
  const generatedDescription = useMemo(() => {
    const prop = formProperty.trim() || 'Proyek';
    return `${prop}, ${formTypeProject}, WD=${formWdDays}, WE=${formWeDays}, Project: ${formatDisplayDate(formStartDate)} - ${formatDisplayDate(formEndDate)}`;
  }, [formProperty, formTypeProject, formWdDays, formWeDays, formStartDate, formEndDate]);

  // Submit Reimbursement Form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProperty.trim()) {
      showToast('Nama properti / hotel / klien wajib diisi', 'error');
      return;
    }

    const desc = formDescription.trim() || generatedDescription;

    if (editingItem) {
      updateReimbursement(editingItem.id, {
        property: formProperty.trim(),
        typeProject: formTypeProject,
        role: formRole,
        submissionDate: formSubmissionDate,
        startDate: formStartDate,
        endDate: formEndDate,
        selectedDates: formSelectedDates.length > 0 ? formSelectedDates : undefined,
        wdDays: formWdDays,
        weDays: formWeDays,
        totalDays: formTotalDays,
        description: desc,
        wdRate: currentRate.wdRate,
        weRate: currentRate.weRate,
        wdAmount: formWdAmount,
        weAmount: formWeAmount,
        totalAmount: formTotalAmount,
        status: formStatus,
        notes: formNotes.trim() || undefined
      });
    } else {
      addReimbursement({
        property: formProperty.trim(),
        typeProject: formTypeProject,
        role: formRole,
        submissionDate: formSubmissionDate,
        startDate: formStartDate,
        endDate: formEndDate,
        selectedDates: formSelectedDates.length > 0 ? formSelectedDates : undefined,
        wdDays: formWdDays,
        weDays: formWeDays,
        totalDays: formTotalDays,
        description: desc,
        wdRate: currentRate.wdRate,
        weRate: currentRate.weRate,
        wdAmount: formWdAmount,
        weAmount: formWeAmount,
        totalAmount: formTotalAmount,
        status: formStatus,
        notes: formNotes.trim() || undefined
      });
    }

    setIsFormModalOpen(false);
  };

  // Change status directly from table row
  const handleStatusChange = (item: ReimbursementItem, newStatus: ReimburseStatus) => {
    if (newStatus === 'Done' && accounts.length > 0) {
      setPayoutTargetItem(item);
      setPayoutAccountId(accounts[0].id);
      setIsPayoutModalOpen(true);
    } else {
      updateReimburseStatus(item.id, newStatus);
    }
  };

  // Confirm Payout to Account
  const handleConfirmPayout = () => {
    if (!payoutTargetItem) return;
    updateReimburseStatus(payoutTargetItem.id, 'Done', payoutAccountId);
    setIsPayoutModalOpen(false);
    setPayoutTargetItem(null);
  };

  // Filtered List
  const filteredList = useMemo(() => {
    return reimbursements.filter(item => {
      // Search
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || 
        item.property.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        String(item.no).includes(q) ||
        item.role.toLowerCase().includes(q);

      // Status
      const matchStatus = selectedStatusFilter === 'all' || item.status.toLowerCase() === selectedStatusFilter.toLowerCase();
      // Role
      const matchRole = selectedRoleFilter === 'all' || item.role === selectedRoleFilter;
      // Type
      const matchType = selectedTypeFilter === 'all' || item.typeProject === selectedTypeFilter;

      return matchSearch && matchStatus && matchRole && matchType;
    });
  }, [reimbursements, searchQuery, selectedStatusFilter, selectedRoleFilter, selectedTypeFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalClaim = reimbursements.reduce((s, r) => s + r.totalAmount, 0);
    const totalDone = reimbursements.filter(r => r.status === 'Done').reduce((s, r) => s + r.totalAmount, 0);
    const totalPending = reimbursements.filter(r => r.status !== 'Done' && r.status !== 'Rejected').reduce((s, r) => s + r.totalAmount, 0);
    const totalWdDays = reimbursements.reduce((s, r) => s + r.wdDays, 0);
    const totalWeDays = reimbursements.reduce((s, r) => s + r.weDays, 0);
    const totalProjectDays = reimbursements.reduce((s, r) => s + getEffectiveTotalHari(r), 0);

    return { totalClaim, totalDone, totalPending, totalWdDays, totalWeDays, totalProjectDays };
  }, [reimbursements]);

  // Export to CSV matching Excel columns
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Submission date',
      'Property',
      'Type Project',
      'Role',
      'Mulai Project',
      'Selesai Project',
      '# WD',
      '# WE',
      '# Hari Kerja',
      'Description',
      'WD',
      'WE',
      'Total',
      'Status Reimburs',
      'Delivery Date'
    ];

    const rows = filteredList.map(r => [
      r.no,
      r.submissionDate,
      `"${r.property.replace(/"/g, '""')}"`,
      r.typeProject,
      r.role,
      r.startDate,
      r.endDate,
      r.wdDays,
      r.weDays,
      getEffectiveTotalHari(r),
      `"${r.description.replace(/"/g, '""')}"`,
      r.wdAmount,
      r.weAmount,
      r.totalAmount,
      r.status,
      r.deliveryDate || '-'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Reimburse_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Berkas Excel CSV klaim reimburse berhasil diunduh!', 'success');
  };

  // Export to PDF Report
  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('REKAPITULASI KLAIM REIMBURSEMENT PROYEK', 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Dibuat oleh: ${profile.name} | Tanggal Cetak: ${today} | Total Klaim: ${filteredList.length} Proyek`, 14, 24);

    // Summary Box
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 28, 269, 14, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total Klaim: Rp ${metrics.totalClaim.toLocaleString('id-ID')}`, 20, 36);
    doc.setTextColor(16, 185, 129);
    doc.text(`Sudah Cair: Rp ${metrics.totalDone.toLocaleString('id-ID')}`, 105, 36);
    doc.setTextColor(245, 158, 11);
    doc.text(`Menunggu Pencairan: Rp ${metrics.totalPending.toLocaleString('id-ID')}`, 190, 36);

    // Table Header
    let y = 48;
    doc.setFillColor(79, 70, 229);
    doc.rect(14, y, 269, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('No', 16, y + 5.5);
    doc.text('Tgl Submit', 24, y + 5.5);
    doc.text('Property / Hotel', 45, y + 5.5);
    doc.text('Type', 95, y + 5.5);
    doc.text('Role', 110, y + 5.5);
    doc.text('Periode Proyek', 123, y + 5.5);
    doc.text('WD', 160, y + 5.5);
    doc.text('WE', 170, y + 5.5);
    doc.text('Total Hari', 180, y + 5.5);
    doc.text('Subtotal WD', 200, y + 5.5);
    doc.text('Subtotal WE', 225, y + 5.5);
    doc.text('Total (Rp)', 250, y + 5.5);
    doc.text('Status', 272, y + 5.5);

    y += 8;

    // Table Rows
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);

    filteredList.forEach((r, idx) => {
      if (y > 185) {
        doc.addPage();
        y = 20;
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, 269, 7, 'F');
      }

      doc.text(String(r.no), 16, y + 5);
      doc.text(r.submissionDate, 24, y + 5);
      doc.text(r.property.substring(0, 26), 45, y + 5);
      doc.text(r.typeProject, 95, y + 5);
      doc.text(r.role, 110, y + 5);
      doc.text(`${formatDisplayDate(r.startDate)} - ${formatDisplayDate(r.endDate)}`, 123, y + 5);
      doc.text(String(r.wdDays), 160, y + 5);
      doc.text(String(r.weDays), 170, y + 5);
      doc.text(String(getEffectiveTotalHari(r)), 180, y + 5);
      doc.text(`Rp ${r.wdAmount.toLocaleString('id-ID')}`, 200, y + 5);
      doc.text(`Rp ${r.weAmount.toLocaleString('id-ID')}`, 225, y + 5);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Rp ${r.totalAmount.toLocaleString('id-ID')}`, 250, y + 5);
      doc.setFont('helvetica', 'normal');
      
      doc.text(r.status, 272, y + 5);

      y += 7;
    });

    doc.save(`Laporan_Reimbursement_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('Laporan PDF reimbursement berhasil dicetak!', 'success');
  };

  // Open Rates Edit Modal
  const handleOpenRatesModal = () => {
    const initialRates: Record<string, { wdRate: number; weRate: number }> = {};
    reimburseRates.forEach(r => {
      initialRates[`${r.role}_${r.type}`] = { wdRate: r.wdRate, weRate: r.weRate };
    });
    setEditingRates(initialRates);
    setIsRatesModalOpen(true);
  };

  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    Object.entries(editingRates).forEach(([key, val]) => {
      const [role, type] = key.split('_') as [ReimburseRole, ReimburseProjectType];
      updateReimburseRate(role, type, val.wdRate, val.weRate);
    });
    setIsRatesModalOpen(false);
    showToast('Tabel tarif reimbursement berhasil diperbarui!', 'success');
  };

  const rolesList: ReimburseRole[] = ['M', 'TPM', 'PM'];
  const projectTypesList: ReimburseProjectType[] = ['Onsite', 'Online'];

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xl shadow-xs">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100">
                  Klaim Reimbursement Proyek
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-bold">
                  Excel Rate Matrix
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Pencatatan klaim hotel & properti otomatis berdasarkan durasi Weekdays (WD) dan Weekend (WE) sesuai matriks tarif.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenRatesModal}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
              title="Lihat dan sesuaikan tarif per role & tipe"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              <span>Tabel Tarif Excel</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
              title="Unduh berkas spreadsheet CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span>Ekspor CSV</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
              title="Cetak format laporan resmi A4"
            >
              <Printer className="w-3.5 h-3.5 text-rose-500" />
              <span>Cetak PDF</span>
            </button>

            <button
              onClick={() => handleOpenNew()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all hover:scale-102 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Reimburse</span>
            </button>
          </div>
        </div>

        {/* Bento KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* 1. Total Nilai Klaim */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
              Total Seluruh Klaim
            </span>
            <p className="text-base sm:text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100 tabular-nums">
              Rp {metrics.totalClaim.toLocaleString('id-ID')}
            </p>
            <p className="text-[11px] text-neutral-400">
              {reimbursements.length} proyek diajukan
            </p>
          </div>

          {/* 2. Sudah Cair (Done) */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              Sudah Cair (Done)
            </span>
            <p className="text-base sm:text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300 tabular-nums">
              Rp {metrics.totalDone.toLocaleString('id-ID')}
            </p>
            <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
              {reimbursements.filter(r => r.status === 'Done').length} klaim selesai
            </p>
          </div>

          {/* 3. Menunggu Pencairan */}
          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
              Menunggu Pencairan
            </span>
            <p className="text-base sm:text-xl font-bold font-mono text-amber-700 dark:text-amber-300 tabular-nums">
              Rp {metrics.totalPending.toLocaleString('id-ID')}
            </p>
            <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80">
              {reimbursements.filter(r => r.status !== 'Done' && r.status !== 'Rejected').length} dalam proses
            </p>
          </div>

          {/* 4. Total Hari Kerja */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
              Akumulasi Hari Kerja
            </span>
            <p className="text-base sm:text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100 tabular-nums">
              {metrics.totalProjectDays} Hari
            </p>
            <p className="text-[11px] text-neutral-400 font-mono">
              WD: <span className="font-bold text-indigo-600 dark:text-indigo-400">{metrics.totalWdDays}</span> · WE: <span className="font-bold text-purple-600 dark:text-purple-400">{metrics.totalWeDays}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Top View Mode Switcher: Table View vs Schedule Matrix Board */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveMainView('table')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMainView === 'table'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Tabel Rekap Klaim Excel</span>
            <span className="px-1.5 py-0.5 rounded-md bg-neutral-700 dark:bg-neutral-200 text-white dark:text-neutral-900 text-[10px]">
              {reimbursements.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainView('schedule_board')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMainView === 'schedule_board'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-amber-300" />
            <span>Papan Kalender Kerja (Implementation Support)</span>
            <span className="hidden sm:inline px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-600 dark:text-amber-300 text-[10px] font-bold">
              Yogyakarta Schedule
            </span>
          </button>
        </div>

        <p className="text-[11px] text-neutral-400">
          {activeMainView === 'schedule_board' 
            ? 'Matrix visual hari 1–31 (Weekend pink & role M/TPM/PM)' 
            : 'Format tabel Excel resmi dengan rumus otomatis'}
        </p>
      </div>

      {activeMainView === 'schedule_board' ? (
        <ReimburseScheduleBoard
          reimbursements={reimbursements}
          onOpenNewWithDate={(d) => handleOpenNew(d)}
          onEditItem={handleOpenEdit}
        />
      ) : (
        <>
          {/* Filter & Search Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari nama properti, hotel, keterangan, nomor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer"
          >
            <option value="all">Status: Semua</option>
            <option value="Done">Status: Done (Selesai)</option>
            <option value="Submitted">Status: Submitted</option>
            <option value="Approved">Status: Approved</option>
            <option value="Draft">Status: Draft</option>
            <option value="Rejected">Status: Rejected</option>
          </select>

          {/* Role Filter */}
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer"
          >
            <option value="all">Role: Semua</option>
            <option value="M">Role: M</option>
            <option value="TPM">Role: TPM</option>
            <option value="PM">Role: PM</option>
          </select>

          {/* Type Filter */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer"
          >
            <option value="all">Tipe: Semua</option>
            <option value="Onsite">Onsite</option>
            <option value="Online">Online</option>
          </select>
        </div>
      </div>

      {/* Main Table View (Desktop & Tablet) */}
      <div className="hidden md:block rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-900 text-white dark:bg-neutral-950 font-bold border-b border-neutral-800">
                <th className="py-3 px-3 w-10 text-center">No</th>
                <th className="py-3 px-3 whitespace-nowrap">Submission date</th>
                <th className="py-3 px-3 whitespace-nowrap">Property</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Type Project</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Role</th>
                <th className="py-3 px-3 whitespace-nowrap">Mulai Project</th>
                <th className="py-3 px-3 whitespace-nowrap">Selesai Project</th>
                <th className="py-3 px-2 text-center whitespace-nowrap font-mono"># WD</th>
                <th className="py-3 px-2 text-center whitespace-nowrap font-mono"># WE</th>
                <th className="py-3 px-2 text-center whitespace-nowrap font-mono"># Hari</th>
                <th className="py-3 px-3 min-w-[200px]">Description</th>
                <th className="py-3 px-3 text-right whitespace-nowrap font-mono">WD</th>
                <th className="py-3 px-3 text-right whitespace-nowrap font-mono">WE</th>
                <th className="py-3 px-3 text-right whitespace-nowrap font-mono bg-neutral-800 text-amber-300">Total</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Status Reimburs</th>
                <th className="py-3 px-3 whitespace-nowrap">Delivery Date</th>
                <th className="py-3 px-3 text-center w-16">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={17} className="py-12 text-center text-neutral-400">
                    <Receipt className="w-8 h-8 mx-auto opacity-30 mb-2" />
                    <p className="font-medium">Tidak ada data klaim reimburse yang cocok dengan filter.</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const isDone = item.status === 'Done';
                  const isSubmitted = item.status === 'Submitted';

                  return (
                    <tr 
                      key={item.id} 
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <td className="py-3 px-3 text-center font-mono font-bold text-neutral-500">
                        {item.no}
                      </td>
                      <td className="py-3 px-3 font-mono text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                        {item.submissionDate}
                      </td>
                      <td className="py-3 px-3 font-semibold text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                        {item.property}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          item.typeProject === 'Onsite'
                            ? 'bg-blue-600 text-white'
                            : 'bg-amber-300 text-amber-950 font-bold'
                        }`}>
                          {item.typeProject}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          item.role === 'M'
                            ? 'bg-emerald-500 text-white'
                            : item.role === 'TPM'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-purple-600 text-white'
                        }`}>
                          {item.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                        {item.startDate}
                      </td>
                      <td className="py-3 px-3 font-mono text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{item.endDate}</span>
                          <button
                            onClick={() => setCalendarPreviewItem(item)}
                            className="p-1 rounded-md text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                            title="Buka Kalender Hari Kerja"
                          >
                            <CalendarDays className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center font-mono font-bold text-neutral-700 dark:text-neutral-300">
                        <span>{item.wdDays}</span>
                        {item.typeProject === 'Online' && (
                          <span className="block text-[9px] text-amber-600 dark:text-amber-400 font-medium">sesi</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center font-mono font-bold text-neutral-700 dark:text-neutral-300">
                        <span>{item.weDays}</span>
                        {item.typeProject === 'Online' && (
                          <span className="block text-[9px] text-amber-600 dark:text-amber-400 font-medium">sesi</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        <span>{getEffectiveTotalHari(item)}</span>
                        <span className="block text-[9px] text-neutral-400 font-normal">hari</span>
                      </td>
                      <td className="py-3 px-3 text-neutral-500 dark:text-neutral-400 text-[11px] max-w-xs truncate" title={item.description}>
                        {item.description}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                        Rp {item.wdAmount.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                        Rp {item.weAmount.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 whitespace-nowrap">
                        Rp {item.totalAmount.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <select
                          value={item.status}
                          onChange={(e) => handleStatusChange(item, e.target.value as ReimburseStatus)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all border ${
                            isDone 
                              ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs' 
                              : isSubmitted
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                              : item.status === 'Approved'
                              ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300'
                          }`}
                        >
                          <option value="Draft">Draft</option>
                          <option value="Submitted">Submitted</option>
                          <option value="Approved">Approved</option>
                          <option value="Done">Done</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-neutral-500 whitespace-nowrap">
                        {item.deliveryDate || '-'}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setCalendarPreviewItem(item)}
                            className="p-1 rounded-md text-neutral-400 hover:text-indigo-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            title="Buka Kalender Kerja"
                          >
                            <CalendarDays className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1 rounded-md text-neutral-400 hover:text-indigo-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            title="Edit Klaim"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteReimbursement(item.id)}
                            className="p-1 rounded-md text-neutral-400 hover:text-rose-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            title="Hapus Klaim"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List (Screen < md) */}
      <div className="md:hidden space-y-3">
        {filteredList.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-neutral-400">
            <Receipt className="w-8 h-8 mx-auto opacity-30 mb-2" />
            <p className="text-xs">Tidak ada data klaim reimburse.</p>
          </div>
        ) : (
          filteredList.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 font-mono font-bold text-xs flex items-center justify-center">
                    {item.no}
                  </span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate max-w-[180px]">
                    {item.property}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    item.typeProject === 'Onsite' ? 'bg-blue-600 text-white' : 'bg-amber-300 text-amber-950 font-bold'
                  }`}>
                    {item.typeProject}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    item.role === 'M' ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'
                  }`}>
                    {item.role}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {item.description}
              </p>

              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 text-[11px] font-mono">
                <div>
                  <span className="text-[10px] text-neutral-400 block">
                    WD ({item.wdDays}{item.typeProject === 'Online' ? ' sesi' : 'd'})
                  </span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    Rp {item.wdAmount.toLocaleString('id-ID')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block">
                    WE ({item.weDays}{item.typeProject === 'Online' ? ' sesi' : 'd'})
                  </span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    Rp {item.weAmount.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 block">
                    Total ({getEffectiveTotalHari(item)} hari)
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    Rp {item.totalAmount.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-400 font-mono">{item.submissionDate}</span>
                  <select
                    value={item.status}
                    onChange={(e) => handleStatusChange(item, e.target.value as ReimburseStatus)}
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 cursor-pointer"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Approved">Approved</option>
                    <option value="Done">Done</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCalendarPreviewItem(item)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    title="Buka Kalender Kerja"
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteReimbursement(item.id)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
        </>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: FORM TAMBAH / EDIT KLAIM REIMBURSE               */}
      {/* ========================================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div 
            className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    {editingItem ? 'Edit Klaim Reimbursement' : 'Tambah Klaim Reimbursement Baru'}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Tarif otomatis dihitung berdasarkan Role & Type Project dari master tarif Excel
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsFormModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSubmitForm} className="p-5 sm:p-6 overflow-y-auto space-y-4">
              {/* Row 1: Property & Submission Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Nama Property / Hotel / Klien <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Swiss-Belinn-Yogyakarta, Metland Marron Tomohon"
                    value={formProperty}
                    onChange={(e) => setFormProperty(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-900 dark:text-neutral-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Submission Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formSubmissionDate}
                    onChange={(e) => setFormSubmissionDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>

              {/* Row 2: Role & Project Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Role Proyek
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {rolesList.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setFormRole(r)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          formRole === r
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Tipe Project
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {projectTypesList.map((tp) => (
                      <button
                        key={tp}
                        type="button"
                        onClick={() => handleTypeProjectChange(tp)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          formTypeProject === tp
                            ? tp === 'Onsite' ? 'bg-blue-600 text-white' : 'bg-amber-400 text-neutral-900 font-extrabold'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                        }`}
                      >
                        {tp}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Online Rule Callout Banner */}
              {formTypeProject === 'Online' && (
                <div className="p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold">
                      Aturan Khusus Online (Excel): 1 Hari Kerja = 2 Sesi
                    </p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300">
                      Kolom <strong># WD</strong> dan <strong># WE</strong> otomatis dikalikan <strong>2 sesi</strong> per hari, dan tarif yang dikalikan adalah tarif per sesi (seperti baris Metland Marron Tomohon di Excel).
                    </p>
                  </div>
                </div>
              )}

              {/* Row 3: Active Rates Banner */}
              <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                    Tarif Aktif ({formRole} - {formTypeProject}):
                  </span>
                </div>
                <div className="flex items-center gap-4 text-neutral-700 dark:text-neutral-300">
                  <span>WD: <strong>Rp {currentRate.wdRate.toLocaleString('id-ID')}</strong>/{formTypeProject === 'Online' ? 'sesi' : 'hari'}</span>
                  <span>WE: <strong>Rp {currentRate.weRate.toLocaleString('id-ID')}</strong>/{formTypeProject === 'Online' ? 'sesi' : 'hari'}</span>
                </div>
              </div>

              {/* Row 4: Mode Pemilihan Hari Kerja (Kalender Interaktif vs Rentang Tanggal) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Penetapan Hari Kerja Proyek <span className="text-rose-500">*</span>
                  </label>
                  
                  {/* Mode Switcher Tabs */}
                  <div className="flex items-center p-0.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setFormDateMode('calendar')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        formDateMode === 'calendar'
                          ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-300 font-bold shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                      }`}
                    >
                      <MousePointerClick className="w-3.5 h-3.5" />
                      <span>Klik di Kalender</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormDateMode('range');
                        if (formStartDate && formEndDate) {
                          setFormSelectedDates(getDatesBetween(formStartDate, formEndDate));
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        formDateMode === 'range'
                          ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-300 font-bold shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                      }`}
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>Rentang Mulai - Selesai</span>
                    </button>
                  </div>
                </div>

                {/* Sub-view A: Interactive Calendar Picker */}
                {formDateMode === 'calendar' ? (
                  <div className="space-y-2">
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      💡 <strong>Klik langsung tanggal kerja Anda di kalender</strong> (warna biru untuk Weekday, ungu untuk Weekend). Nilai dan jumlah hari/sesi otomatis dihitung sesuai rate Excel.
                    </p>
                    <ReimburseCalendarPicker
                      selectedDates={formSelectedDates}
                      onChangeDates={handleCalendarDatesChange}
                      typeProject={formTypeProject}
                      wdRate={currentRate.wdRate}
                      weRate={currentRate.weRate}
                      initialMonthDate={formStartDate || formSubmissionDate}
                    />
                  </div>
                ) : (
                  /* Sub-view B: Standard Date Range Inputs */
                  <div className="space-y-3 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          Mulai Project
                        </label>
                        <input
                          type="date"
                          required
                          value={formStartDate}
                          onChange={(e) => {
                            handleStartDateChange(e.target.value);
                            if (e.target.value && formEndDate) {
                              setFormSelectedDates(getDatesBetween(e.target.value, formEndDate));
                            }
                          }}
                          className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs font-mono text-neutral-900 dark:text-neutral-100"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          Selesai Project
                        </label>
                        <input
                          type="date"
                          required
                          value={formEndDate}
                          onChange={(e) => {
                            handleEndDateChange(e.target.value);
                            if (formStartDate && e.target.value) {
                              setFormSelectedDates(getDatesBetween(formStartDate, e.target.value));
                            }
                          }}
                          className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs font-mono text-neutral-900 dark:text-neutral-100"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Row 5: # WD, # WE, and Total Hari */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    {formTypeProject === 'Online' ? 'Jumlah Sesi & Hari Kerja (Sehari 2 Sesi)' : 'Jumlah Hari Kerja (WD & WE)'}
                  </span>
                  <label className="flex items-center gap-1.5 text-[11px] text-neutral-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsManualDays}
                      onChange={(e) => setFormIsManualDays(e.target.checked)}
                      className="rounded"
                    />
                    <span>Input Manual / Sesuaikan {formTypeProject === 'Online' ? 'Sesi' : 'Hari'}</span>
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-neutral-500 mb-1">
                      # WD ({formTypeProject === 'Online' ? 'Sesi Weekday' : 'Weekdays'})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formWdDays}
                      onChange={(e) => setFormWdDays(parseInt(e.target.value || '0', 10))}
                      disabled={!formIsManualDays}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs font-mono font-bold text-center disabled:opacity-70"
                    />
                    <span className="text-[10px] text-neutral-400 mt-1 block font-mono">
                      Subtotal: Rp {formWdAmount.toLocaleString('id-ID')} ({formWdDays} {formTypeProject === 'Online' ? 'sesi' : 'hari'})
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-500 mb-1">
                      # WE ({formTypeProject === 'Online' ? 'Sesi Weekend' : 'Weekend'})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formWeDays}
                      onChange={(e) => setFormWeDays(parseInt(e.target.value || '0', 10))}
                      disabled={!formIsManualDays}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs font-mono font-bold text-center disabled:opacity-70"
                    />
                    <span className="text-[10px] text-neutral-400 mt-1 block font-mono">
                      Subtotal: Rp {formWeAmount.toLocaleString('id-ID')} ({formWeDays} {formTypeProject === 'Online' ? 'sesi' : 'hari'})
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-500 mb-1">
                      # Hari Kerja
                    </label>
                    <div className="w-full px-3 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-700 font-mono font-bold text-xs text-center text-neutral-800 dark:text-neutral-100 flex items-center justify-center h-9">
                      {formTotalDays} Hari
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 block font-mono text-right">
                      Total: Rp {formTotalAmount.toLocaleString('id-ID')} {formTypeProject === 'Online' ? `(${formWdDays + formWeDays} sesi)` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 6: Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Description
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormDescription(generatedDescription)}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    Pakai Format Otomatis Excel
                  </button>
                </div>
                <input
                  type="text"
                  value={formDescription || generatedDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Deskripsi klaim..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 font-mono"
                />
              </div>

              {/* Row 7: Status */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Status Reimbursement
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Draft', 'Submitted', 'Approved', 'Done'] as ReimburseStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFormStatus(st)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        formStatus === st
                          ? st === 'Done' ? 'bg-emerald-600 text-white' : 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all hover:scale-102"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingItem ? 'Simpan Perubahan' : 'Simpan Klaim Reimburse'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: MASTER TARIF REIMBURSE (EXCEL RATE MATRIX)       */}
      {/* ========================================================= */}
      {isRatesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div 
            className="w-full max-w-xl bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 sm:p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Master Tarif Reimburse (Excel Rate Matrix)
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Tabel tarif acuan sesuai spreadsheet Excel yang digunakan perusahaan Anda
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsRatesModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRates} className="p-5 sm:p-6 overflow-y-auto space-y-4">
              <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-rose-100/70 dark:bg-rose-950/40 text-neutral-800 dark:text-neutral-200 font-bold border-b border-rose-200 dark:border-rose-900">
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">WD (Rp)</th>
                      <th className="py-2.5 px-3 text-right">WE (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {[
                      { role: 'M', type: 'Onsite' },
                      { role: 'M', type: 'Online' },
                      { role: 'TPM', type: 'Onsite' },
                      { role: 'TPM', type: 'Online' },
                      { role: 'PM', type: 'Onsite' },
                      { role: 'PM', type: 'Online' }
                    ].map((item) => {
                      const key = `${item.role}_${item.type}`;
                      const curVal = editingRates[key] || { wdRate: 0, weRate: 0 };

                      return (
                        <tr key={key} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                          <td className="py-2.5 px-3 font-bold">{item.role}</td>
                          <td className="py-2.5 px-3">{item.type}</td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              value={curVal.wdRate}
                              onChange={(e) => {
                                const val = parseInt(e.target.value || '0', 10);
                                setEditingRates(prev => ({
                                  ...prev,
                                  [key]: { ...curVal, wdRate: val }
                                }));
                              }}
                              className="w-28 px-2 py-1 rounded-lg bg-neutral-50 dark:bg-neutral-800 border text-right font-mono font-bold"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              value={curVal.weRate}
                              onChange={(e) => {
                                const val = parseInt(e.target.value || '0', 10);
                                setEditingRates(prev => ({
                                  ...prev,
                                  [key]: { ...curVal, weRate: val }
                                }));
                              }}
                              className="w-28 px-2 py-1 rounded-lg bg-neutral-50 dark:bg-neutral-800 border text-right font-mono font-bold"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Note on Online Sessions */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Ketentuan Khusus Sesi Online (Excel):</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                  Untuk Tipe <strong>Online</strong>, 1 hari kerja setara dengan <strong>2 sesi</strong>. Nilai tarif pada kolom WD & WE di atas adalah tarif per sesi (misal: Role M Online WD Rp 18.750/sesi = Rp 37.500 jika 1 hari penuh 2 sesi).
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={resetReimburseRatesToDefault}
                  className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 font-medium"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Kembalikan ke Tarif Default Excel</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRatesModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Simpan Tarif
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: PENCAIRAN SALDO KE AKUN KEUANGAN (STATUS DONE)   */}
      {/* ========================================================= */}
      {isPayoutModalOpen && payoutTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div 
            className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Tandai Selesai & Cairkan Dana
                </h3>
                <p className="text-xs text-neutral-500">
                  Klaim #{payoutTargetItem.no}: {payoutTargetItem.property}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 space-y-1 font-mono">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-bold block">
                Total Dana Cair
              </span>
              <p className="text-xl font-bold text-emerald-800 dark:text-emerald-200">
                Rp {payoutTargetItem.totalAmount.toLocaleString('id-ID')}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Pilih Akun Rekening / Dompet Penerima:
              </label>
              <select
                value={payoutAccountId}
                onChange={(e) => setPayoutAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border text-xs font-semibold text-neutral-900 dark:text-neutral-100"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type.toUpperCase()})
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-neutral-400">
                * Saldo akun ini akan otomatis bertambah dan dicatat di mutasi keuangan Anda.
              </span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  // Only update status without depositing
                  updateReimburseStatus(payoutTargetItem.id, 'Done');
                  setIsPayoutModalOpen(false);
                  setPayoutTargetItem(null);
                }}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl border text-neutral-500"
              >
                Hanya Ubah Status
              </button>
              <button
                type="button"
                onClick={handleConfirmPayout}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                Cairkan & Masukkan Saldo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: LIHAT DETAIL HARI KERJA KALENDER                */}
      {/* ========================================================= */}
      {calendarPreviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div 
            className="w-full max-w-xl bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    <span>Hari Kerja: {calendarPreviewItem.property}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      calendarPreviewItem.typeProject === 'Onsite' ? 'bg-blue-600 text-white' : 'bg-amber-300 text-amber-950 font-bold'
                    }`}>
                      {calendarPreviewItem.typeProject}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Role: <strong>{calendarPreviewItem.role}</strong> · Periode: {calendarPreviewItem.startDate} s/d {calendarPreviewItem.endDate}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setCalendarPreviewItem(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
                <div>
                  <span className="font-bold">Total Hari Kerja:</span>{' '}
                  <span className="font-mono font-bold">{getEffectiveTotalHari(calendarPreviewItem)} Hari</span>
                  {calendarPreviewItem.typeProject === 'Online' && (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 ml-1.5 font-bold">
                      ({calendarPreviewItem.wdDays + calendarPreviewItem.weDays} sesi online)
                    </span>
                  )}
                </div>
                <div className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  Rp {calendarPreviewItem.totalAmount.toLocaleString('id-ID')}
                </div>
              </div>

              <ReimburseCalendarPicker
                selectedDates={calendarPreviewItem.selectedDates && calendarPreviewItem.selectedDates.length > 0
                  ? calendarPreviewItem.selectedDates
                  : getDatesBetween(calendarPreviewItem.startDate, calendarPreviewItem.endDate)}
                onChangeDates={() => {}}
                readOnly={true}
                typeProject={calendarPreviewItem.typeProject}
                wdRate={calendarPreviewItem.wdRate}
                weRate={calendarPreviewItem.weRate}
                initialMonthDate={calendarPreviewItem.startDate}
              />
            </div>

            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/40">
              <button
                type="button"
                onClick={() => {
                  const it = calendarPreviewItem;
                  setCalendarPreviewItem(null);
                  handleOpenEdit(it);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Ubah Tanggal Kerja</span>
              </button>

              <button
                type="button"
                onClick={() => setCalendarPreviewItem(null)}
                className="px-5 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold hover:opacity-90 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
