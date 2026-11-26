import React, { useState, useMemo, useEffect } from 'react';
import {
  ScanText,
  Search,
  Filter,
  Plus,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Check,
  UserCheck,
  ChevronRight,
  ArrowUpDown,
  ArrowRight,
  Sparkles,
  Download,
  Stethoscope,
  Activity,
  Layers,
  FileUp,
  Trash2,
  Loader2,
  X,
} from 'lucide-react';
import { UploadVerificationWizard } from '../components/ocr-workflow';
import { CheckupDetailModal } from '../components/CheckupDetailModal';
import { CheckupTimelineRecord } from '../services/checkup.service';
import { DocumentExtractionData, formatFileSize } from '../components/ocr-workflow/mockOcrData';
import { ingestService, isValidUuid } from '../services/ingest.service';
import { apiClient } from '../services/auth.service';
import { DataTable, DataTableColumn } from '../components/ui/DataTable';
import { TableActionButton } from '../components/ui/TableActionButton';

export interface ParaclinicalWorklistItem {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  gestationalAge: string;
  documentType: 'ultrasound_4d' | 'blood_test' | 'urinalysis' | 'comprehensive';
  documentTypeName: string;
  fileName: string;
  fileSize: string;
  receivedAt: string;
  doctorPerformer: string;
  ocrConfidence: number;
  status: 'pending_review' | 'verified';
  primaryDoctorId?: string | null;
  primaryDoctorName?: string | null;
  verifiedByName?: string | null;
  verifiedAt?: string | null;
  hasWarning?: boolean;
  warningSummary?: string;
  verifiedData?: DocumentExtractionData;
}

const INITIAL_WORKLIST: ParaclinicalWorklistItem[] = [
  {
    id: 'doc-001',
    patientId: 'prof-001',
    patientName: 'Nguyễn Thảo Chi',
    patientPhone: '0912 345 678',
    gestationalAge: '32 tuần 4 ngày',
    documentType: 'ultrasound_4d',
    documentTypeName: 'Siêu âm 4D & Doppler thai',
    fileName: 'Phieu_sieu_am_4D_32W.pdf',
    fileSize: '2.4 MB',
    receivedAt: '24/11/2026 08:45',
    doctorPerformer: 'BS. CKI. Trần Ngọc Thảo Vy',
    ocrConfidence: 98.5,
    status: 'pending_review',
    hasWarning: true,
    warningSummary: 'Chu vi vòng bụng (AC) giảm tốc độ tăng trưởng (P8). Cần siêu âm Doppler.',
  },
  {
    id: 'doc-002',
    patientId: 'prof-002',
    patientName: 'Phạm Minh Thư',
    patientPhone: '0988 765 432',
    gestationalAge: '18 tuần 2 ngày',
    documentType: 'blood_test',
    documentTypeName: 'Xét nghiệm huyết học & Triple Test',
    fileName: 'Ket_qua_xet_nghiem_mau_18W.pdf',
    fileSize: '1.8 MB',
    receivedAt: '24/11/2026 09:20',
    doctorPerformer: 'KTV. Nguyễn Văn Dũng',
    ocrConfidence: 99.1,
    status: 'pending_review',
  },
  {
    id: 'doc-003',
    patientId: 'prof-003',
    patientName: 'Trần Hồng Nhung',
    patientPhone: '0903 112 233',
    gestationalAge: '36 tuần 1 ngày',
    documentType: 'comprehensive',
    documentTypeName: 'Phiếu khám thai tổng quát & Non-stress test',
    fileName: 'Phieu_kham_thai_36W.pdf',
    fileSize: '3.1 MB',
    receivedAt: '24/11/2026 08:15',
    doctorPerformer: 'BS. Lê Minh',
    ocrConfidence: 97.8,
    status: 'verified',
  },
  {
    id: 'doc-004',
    patientId: 'prof-004',
    patientName: 'Nguyễn Thị Hương',
    patientPhone: '0977 889 900',
    gestationalAge: '32 tuần 4 ngày',
    documentType: 'ultrasound_4d',
    documentTypeName: 'Siêu âm 4D hình thái học thai nhi',
    fileName: 'Phieu_kham_thai_32W.pdf',
    fileSize: '2.4 MB',
    receivedAt: '23/11/2026 15:30',
    doctorPerformer: 'BS. CKI. Trần Ngọc Thảo Vy',
    ocrConfidence: 98.5,
    status: 'verified',
  },
  {
    id: 'doc-005',
    patientId: 'prof-001',
    patientName: 'Nguyễn Thảo Chi',
    patientPhone: '0912 345 678',
    gestationalAge: '28 tuần 0 ngày',
    documentType: 'ultrasound_4d',
    documentTypeName: 'Siêu âm 4D mốc 28 tuần',
    fileName: 'Sieu_am_28W_Chi.pdf',
    fileSize: '2.1 MB',
    receivedAt: '26/10/2026 10:15',
    doctorPerformer: 'BS. CKI. Trần Ngọc Thảo Vy',
    ocrConfidence: 98.9,
    status: 'verified',
  },
];

interface TestResultsProps {
  initialPatientId?: string | null;
  onNavigateToProfile?: (patientId: string) => void;
}

export const TestResults: React.FC<TestResultsProps> = ({
  initialPatientId,
  onNavigateToProfile,
}) => {
  const [worklist, setWorklist] = useState<ParaclinicalWorklistItem[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState<boolean>(true);

  const loadWorklistQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const res = await ingestService.listWorklistQueue({ page: 1, page_size: 50 });
      const mapped: ParaclinicalWorklistItem[] = (res.items || []).map((item) => {
        const docType =
          item.document_type === 'blood_test'
            ? 'blood_test'
            : item.document_type === 'urinalysis'
            ? 'urinalysis'
            : item.document_type === 'comprehensive'
            ? 'comprehensive'
            : 'ultrasound_4d';

        const docTypeName =
          docType === 'blood_test'
            ? 'Xét nghiệm huyết học'
            : docType === 'urinalysis'
            ? 'Tổng phân tích nước tiểu'
            : docType === 'comprehensive'
            ? 'Phiếu khám thai tổng quát'
            : 'Phiếu siêu âm & cận lâm sàng';

        return {
          id: item.id,
          patientId: item.pregnancy_profile_id,
          patientName: item.patient_name,
          patientPhone: item.patient_phone || '—',
          gestationalAge: item.gestational_age_formatted || 'Đang theo dõi',
          documentType: docType,
          documentTypeName: docTypeName,
          fileName: item.file_name || 'Tai_lieu_kham.pdf',
          fileSize: item.file_size_bytes ? formatFileSize(item.file_size_bytes) : '—',
          receivedAt: new Date(item.created_at).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          primaryDoctorId: item.primary_doctor_id,
          primaryDoctorName: item.primary_doctor_name,
          doctorPerformer: item.uploaded_by_name || 'Hệ thống tiếp nhận',
          verifiedByName: item.verified_by_name,
          verifiedAt: item.verified_at,
          ocrConfidence: item.ocr_confidence ?? 98.0,
          status: item.status === 'verified' ? 'verified' : 'pending_review',
        };
      });
      setWorklist(mapped);
    } catch (err) {
      console.warn('[Worklist] Không thể tải hàng đợi từ Backend:', err);
      setWorklist([]);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  useEffect(() => {
    loadWorklistQueue();
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_review' | 'verified'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [doctorScope, setDoctorScope] = useState<'all' | 'mine'>('all');

  const [currentDoctorId, setCurrentDoctorId] = useState<string | undefined>(() => {
    try {
      const raw = localStorage.getItem('precare_user');
      return raw ? (JSON.parse(raw)?.id as string | undefined) : undefined;
    } catch {
      return undefined;
    }
  });

  useEffect(() => {
    let isMounted = true;
    apiClient
      .get('/auth/me')
      .then((res) => {
        if (!isMounted) return;
        const me = res.data?.data || res.data;
        if (me?.id) {
          setCurrentDoctorId(me.id);
          try {
            localStorage.setItem('precare_user', JSON.stringify(me));
          } catch {
            // ignore storage errors
          }
        }
      })
      .catch(() => {
        // Giữ nguyên giá trị từ localStorage nếu offline
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Modal & Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardTargetPatientId, setWizardTargetPatientId] = useState<string>(
    initialPatientId || ''
  );
  const [reviewingItem, setReviewingItem] = useState<ParaclinicalWorklistItem | null>(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<ParaclinicalWorklistItem | null>(null);
  const [isDeletingWorklistItem, setIsDeletingWorklistItem] = useState(false);
  const [selectedVisitDetail, setSelectedVisitDetail] = useState<CheckupTimelineRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [successSavedModal, setSuccessSavedModal] = useState<{
    isOpen: boolean;
    patientId: string;
    patientName: string;
  } | null>(null);

  // Mở thẳng Wizard khi được điều hướng từ Hồ sơ thai kỳ cụ thể
  useEffect(() => {
    if (initialPatientId) {
      setWizardTargetPatientId(initialPatientId);
      setIsWizardOpen(true);
    }
  }, [initialPatientId]);

  const myPatientsCount = useMemo(() => {
    if (!currentDoctorId) return 0;
    return worklist.filter((i) => i.primaryDoctorId === currentDoctorId).length;
  }, [worklist, currentDoctorId]);

  // Statistics
  const stats = useMemo(() => {
    const total = worklist.length;
    const pending = worklist.filter((i) => i.status === 'pending_review').length;
    const verified = worklist.filter((i) => i.status === 'verified').length;
    const avgConfidence = (
      worklist.reduce((acc, i) => acc + i.ocrConfidence, 0) / (total || 1)
    ).toFixed(1);
    return { total, pending, verified, avgConfidence };
  }, [worklist]);

  // Filtered list
  const filteredList = useMemo(() => {
    return worklist.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.patientName.toLowerCase().includes(q) ||
        item.fileName.toLowerCase().includes(q) ||
        item.patientPhone.replace(/\s+/g, '').includes(q.replace(/\s+/g, '')) ||
        item.documentTypeName.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === 'all' || item.status === statusFilter;

      const matchType =
        typeFilter === 'all' || item.documentType === typeFilter;

      const matchDoctor =
        doctorScope === 'all' ||
        (Boolean(currentDoctorId) && item.primaryDoctorId === currentDoctorId);

      return matchSearch && matchStatus && matchType && matchDoctor;
    });
  }, [worklist, searchQuery, statusFilter, typeFilter, doctorScope, currentDoctorId]);

  // Action: Open new upload
  const handleOpenNewUpload = (patientId?: string) => {
    setWizardTargetPatientId(patientId || initialPatientId || '');
    setReviewingItem(null);
    setIsWizardOpen(true);
  };

  // Action: Open review for a pending document
  const handleReviewPending = (item: ParaclinicalWorklistItem) => {
    setReviewingItem(item);
    setWizardTargetPatientId(item.patientId);
    setIsWizardOpen(true);
  };

  // Action: Open details for a verified document
  const handleViewVerifiedDetails = (item: ParaclinicalWorklistItem) => {
    const mockVisit: CheckupTimelineRecord = {
      id: `checkup-${item.id}`,
      pregnancy_profile_id: item.patientId,
      doctor: { id: 'doc-1', full_name: item.doctorPerformer },
      checkup_date: item.receivedAt.slice(0, 10).split('/').reverse().join('-'),
      gestational_age: {
        days: 228,
        weeks: parseInt(item.gestationalAge, 10) || 32,
        remaining_days: 4,
        formatted: item.gestationalAge,
        trimester: 3,
      },
      vitals: {
        weight_kg: 56.5,
        blood_pressure_systolic: 118,
        blood_pressure_diastolic: 76,
        blood_pressure_status: 'normal',
      },
      notes: `1. Tình trạng thai: Một thai sống phát triển phù hợp tuần tuổi (${item.gestationalAge}), nước ối và bánh nhau bình thường.\n2. Lưu ý y mẹ: Huyết áp ổn định 118/76 mmHg. Theo dõi cử động thai.\n3. Hẹn tái khám: Sau 2 tuần theo lịch hẹn.`,
      biometric_data: {
        id: `bio-${item.id}`,
        bpd: 58,
        hc: 290,
        ac: 196,
        fl: 43,
        efw: 1950,
        status: 'verified',
      },
      created_at: new Date().toISOString(),
    };
    setSelectedVisitDetail(mockVisit);
  };

  // Callback when doctor finishes wizard in Step 3
  const handleSaveVerifiedDoc = (savedData?: DocumentExtractionData) => {
    setIsWizardOpen(false);

    const foundInList = worklist.find((p) => p.patientId === wizardTargetPatientId);
    const savedPatientId = reviewingItem?.patientId || wizardTargetPatientId;
    const savedPatientName = reviewingItem?.patientName || foundInList?.patientName || 'Thai phụ';

    setReviewingItem(null);
    loadWorklistQueue();

    setToastMessage('Đã đối chiếu và lưu hồ sơ điện tử thành công!');
    setTimeout(() => setToastMessage(null), 3500);

    // Kích hoạt Modal thành công với 2 hướng điều hướng theo quyết định phỏng vấn
    setSuccessSavedModal({
      isOpen: true,
      patientId: savedPatientId,
      patientName: savedPatientName,
    });
  };

  // If Upload Wizard is active
  if (isWizardOpen) {
    const targetPatient =
      reviewingItem ||
      worklist.find((p) => p.patientId === wizardTargetPatientId);

    return (
      <UploadVerificationWizard
        pregnancyProfileId={wizardTargetPatientId}
        patientName={targetPatient?.patientName || ''}
        gestationalAge={targetPatient?.gestationalAge || ''}
        initialStep={reviewingItem ? 2 : 1}
        initialReviewFile={
          reviewingItem
            ? {
                id: reviewingItem.id,
                name: reviewingItem.fileName,
                sizeFormatted: reviewingItem.fileSize,
                ocrConfidence: reviewingItem.ocrConfidence,
                doctorPerformer: reviewingItem.doctorPerformer,
              }
            : null
        }
        onClose={() => {
          setIsWizardOpen(false);
          setReviewingItem(null);
        }}
        onSaveSuccess={handleSaveVerifiedDoc}
        onDeleteSuccess={() => {
          setIsWizardOpen(false);
          setReviewingItem(null);
          loadWorklistQueue();
          setToastMessage('Đã xóa phiếu cận lâm sàng khỏi hàng đợi.');
          setTimeout(() => setToastMessage(null), 3500);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-emerald-900 text-white text-xs font-semibold rounded-xl shadow-lg border border-emerald-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          Quản lý hàng đợi phiếu cận lâm sàng chờ trích xuất OCR và đối chiếu kết quả.
        </div>
        <button
          type="button"
          onClick={() => handleOpenNewUpload()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#275248] hover:bg-[#1f423a] text-white text-xs font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0"
        >
          <FileUp className="w-4 h-4" />
          <span>Tải phiếu mới</span>
        </button>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Tổng phiếu tiếp nhận</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {stats.total}{' '}
            <span className="text-xs font-normal text-slate-500">tài liệu</span>
          </div>
          <div className="text-[11px] text-teal-600 font-medium mt-1">
            Tuần này: 28 phiếu chụp &amp; xét nghiệm
          </div>
        </div>

        <div className="bg-[#FFFBEB] rounded-2xl p-4 border border-amber-300 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
            <span>Chờ bác sĩ duyệt OCR</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-950 mt-2">
            {stats.pending.toString().padStart(2, '0')}{' '}
            <span className="text-xs font-normal text-amber-800">phiếu</span>
          </div>
          <div className="text-[11px] text-amber-800 font-medium mt-1">
            Cần đối chiếu &amp; xác nhận chuyên môn
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Đã xác nhận &amp; lưu EMR</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {stats.verified.toString().padStart(2, '0')}{' '}
            <span className="text-xs font-normal text-slate-500">hồ sơ</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            Đã đồng bộ vào bệnh án điện tử
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Độ tin cậy AI trung bình</span>
            <Sparkles className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-[#275248] mt-2">
            {stats.avgConfidence}%
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">
            Động cơ PaddleOCR &amp; Hadlock IV
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Doctor Scope Toggle: Của tôi phụ trách | Tất cả toàn khoa */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setDoctorScope('mine')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                doctorScope === 'mine'
                  ? 'bg-white text-[#275248] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Của tôi phụ trách ({myPatientsCount})
            </button>
            <button
              type="button"
              onClick={() => setDoctorScope('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                doctorScope === 'all'
                  ? 'bg-white text-[#275248] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả toàn khoa ({worklist.length})
            </button>
          </div>

          {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending_review')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'pending_review'
                ? 'bg-[#275248] text-white shadow-2xs font-bold'
                : 'text-amber-800 hover:bg-amber-100/50'
            }`}
          >
            <span>Chờ duyệt OCR</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] ${
                statusFilter === 'pending_review'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-200 text-amber-900'
              }`}
            >
              {stats.pending}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('verified')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'verified'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Đã xác nhận ({stats.verified})
          </button>
        </div>
        </div>

        {/* Search & Document Type Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên thai phụ, SĐT, loại phiếu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#275248]"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 outline-none focus:border-[#275248] cursor-pointer"
          >
            <option value="all">Tất cả loại tài liệu</option>
            <option value="ultrasound_4d">Siêu âm thai 4D</option>
            <option value="blood_test">Xét nghiệm máu</option>
            <option value="comprehensive">Khám thai tổng quát</option>
          </select>
        </div>
      </div>

      {/* Main Worklist Table (Using Shared DataTable & TableActionButton) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <DataTable<ParaclinicalWorklistItem>
          data={filteredList}
          rowKey={(item) => item.id}
          emptyMessage="Không tìm thấy phiếu cận lâm sàng nào phù hợp với bộ lọc."
          columns={[
            {
              key: 'patient',
              header: 'THAI PHỤ / MÃ BN',
              widthClass: 'w-[22%]',
              align: 'left',
              render: (item) => (
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-teal-50 text-[#275248] font-bold text-xs flex items-center justify-center shrink-0 border border-teal-200">
                    {item.patientName
                      .split(' ')
                      .map((w) => w[0])
                      .slice(-2)
                      .join('')}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">
                      {item.patientName}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      Tuổi thai: <strong>{item.gestationalAge}</strong> • {item.patientPhone}
                    </div>
                    {item.primaryDoctorName && item.primaryDoctorId !== currentDoctorId && (
                      <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-600 max-w-full truncate">
                        BS phụ trách: {item.primaryDoctorName}
                      </div>
                    )}
                  </div>
                </div>
              ),
            },
            {
              key: 'document',
              header: 'LOẠI TÀI LIỆU CẬN LÂM SÀNG',
              widthClass: 'w-[22%]',
              align: 'left',
              render: (item) => (
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800 truncate">
                    {item.documentTypeName}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 min-w-0">
                    <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate" title={`${item.fileName} (${item.fileSize})`}>
                      {item.fileName} ({item.fileSize})
                    </span>
                  </div>
                  {item.hasWarning && (
                    <div className="text-[10px] text-amber-700 font-medium flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                      <span className="truncate">{item.warningSummary}</span>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'received',
              header: 'NGÀY THỰC HIỆN',
              widthClass: 'w-[14%]',
              align: 'left',
              render: (item) => (
                <div className="text-slate-600 min-w-0">
                  <div className="truncate">{item.receivedAt}</div>
                  <div className="text-[10px] text-slate-400 truncate">
                    BS: {item.doctorPerformer}
                  </div>
                </div>
              ),
            },
            {
              key: 'confidence',
              header: 'ĐỘ TIN CẬY AI',
              widthClass: 'w-[11%]',
              align: 'center',
              render: (item) => (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-[#275248] border border-teal-200/80 whitespace-nowrap">
                  <Sparkles className="w-3 h-3 text-teal-600" />
                  {item.ocrConfidence}%
                </span>
              ),
            },
            {
              key: 'status',
              header: 'TRẠNG THÁI',
              widthClass: 'w-[12%]',
              align: 'center',
              render: (item) =>
                item.status === 'pending_review' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 whitespace-nowrap">
                    <Clock className="w-3 h-3 text-amber-600" />
                    Chờ duyệt OCR
                  </span>
                ) : (
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Đã xác nhận
                    </span>
                    {item.verifiedByName && (
                      <div className="text-[10px] text-slate-500 truncate">
                        Duyệt: <strong className="text-slate-700">{item.verifiedByName}</strong>
                        {item.verifiedAt && (
                          <> ({new Date(item.verifiedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})</>
                        )}
                      </div>
                    )}
                  </div>
                ),
            },
            {
              key: 'actions',
              header: 'THAO TÁC',
              widthClass: 'w-[19%]',
              align: 'right',
              render: (item) =>
                item.status === 'pending_review' ? (
                  <div className="inline-flex items-center justify-end gap-1.5">
                    <TableActionButton
                      label="Duyệt & Đối chiếu"
                      icon={Eye}
                      variant="primary"
                      onClick={() => handleReviewPending(item)}
                    />
                    <button
                      type="button"
                      onClick={() => setPendingDeleteItem(item)}
                      title="Xóa phiếu khỏi hàng đợi"
                      aria-label="Xóa phiếu khỏi hàng đợi"
                      className="p-2 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <TableActionButton
                    label="Xem chi tiết & dặn dò"
                    icon={Eye}
                    variant="outline"
                    onClick={() => handleViewVerifiedDetails(item)}
                  />
                ),
            },
          ] as DataTableColumn<ParaclinicalWorklistItem>[]}
        />

        {/* Footer info */}
        <div className="p-3.5 bg-slate-50/60 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Hiển thị {filteredList.length} / {worklist.length} phiếu cận lâm sàng
          </span>
          <span className="text-[11px] text-slate-400">
            Hệ thống PreCare Digital Ingestion Pipeline • Port 8000
          </span>
        </div>
      </div>

      {/* Delete Pending Worklist Item Modal */}
      {pendingDeleteItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Xóa phiếu khỏi hàng đợi chờ duyệt?
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tệp gốc và kết quả OCR chưa phê duyệt sẽ bị xóa vĩnh viễn.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingDeleteItem(null)}
                disabled={isDeletingWorklistItem}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700">
              <div className="font-semibold text-slate-900 truncate">{pendingDeleteItem.fileName}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Thai phụ: {pendingDeleteItem.patientName} • {pendingDeleteItem.documentTypeName}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPendingDeleteItem(null)}
                disabled={isDeletingWorklistItem}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsDeletingWorklistItem(true);
                  try {
                    if (isValidUuid(pendingDeleteItem.id)) {
                      await ingestService.deleteUploadedFile(pendingDeleteItem.id);
                    }
                    setPendingDeleteItem(null);
                    await loadWorklistQueue();
                    setToastMessage('Đã xóa phiếu cận lâm sàng khỏi hàng đợi.');
                    setTimeout(() => setToastMessage(null), 3500);
                  } catch (err: any) {
                    const msg =
                      err?.response?.data?.detail ||
                      err?.response?.data?.message ||
                      err?.message ||
                      'Không thể xóa phiếu cận lâm sàng.';
                    setToastMessage(msg);
                    setTimeout(() => setToastMessage(null), 4000);
                  } finally {
                    setIsDeletingWorklistItem(false);
                  }
                }}
                disabled={isDeletingWorklistItem}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
              >
                {isDeletingWorklistItem ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xác nhận xóa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkup Detail Modal */}
      {selectedVisitDetail && (
        <CheckupDetailModal
          visit={selectedVisitDetail}
          onClose={() => setSelectedVisitDetail(null)}
          patientName={
            worklist.find((i) => i.patientId === selectedVisitDetail.pregnancy_profile_id)
              ?.patientName || 'Thai phụ'
          }
        />
      )}

      {/* Modal Thông Báo Phê Duyệt Thành Công (Theo luồng thống nhất) */}
      {successSavedModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center space-y-5 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900">
                Phê duyệt &amp; Lưu hồ sơ điện tử thành công!
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Dữ liệu cận lâm sàng đã được bác sĩ ký xác thực và đồng bộ vào lịch sử khám của thai phụ{' '}
                <strong className="text-slate-800">{successSavedModal.patientName}</strong>.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  const pid = successSavedModal.patientId;
                  setSuccessSavedModal(null);
                  if (onNavigateToProfile) onNavigateToProfile(pid);
                }}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-[#275248] hover:bg-[#1f423a] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Xem hồ sơ thai phụ</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setSuccessSavedModal(null)}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
              >
                Tiếp tục ở hàng đợi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
