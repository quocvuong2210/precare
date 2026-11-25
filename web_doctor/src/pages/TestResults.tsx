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
} from 'lucide-react';
import { UploadVerificationWizard } from '../components/ocr-workflow';
import { CheckupDetailModal } from '../components/CheckupDetailModal';
import { CheckupTimelineRecord } from '../services/checkup.service';
import { DocumentExtractionData, createDefaultExtractionData } from '../components/ocr-workflow/mockOcrData';

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
  const [worklist, setWorklist] = useState<ParaclinicalWorklistItem[]>(INITIAL_WORKLIST);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_review' | 'verified'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modal & Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardTargetPatientId, setWizardTargetPatientId] = useState<string>(
    initialPatientId || 'prof-001'
  );
  const [reviewingItem, setReviewingItem] = useState<ParaclinicalWorklistItem | null>(null);
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

      return matchSearch && matchStatus && matchType;
    });
  }, [worklist, searchQuery, statusFilter, typeFilter]);

  // Action: Open new upload
  const handleOpenNewUpload = (patientId?: string) => {
    setWizardTargetPatientId(patientId || initialPatientId || 'prof-001');
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

    let savedPatientId = wizardTargetPatientId;
    let savedPatientName = 'Nguyễn Thảo Chi';

    if (reviewingItem) {
      savedPatientId = reviewingItem.patientId;
      savedPatientName = reviewingItem.patientName;
      // Update existing item status to verified
      setWorklist((prev) =>
        prev.map((i) =>
          i.id === reviewingItem.id
            ? { ...i, status: 'verified', verifiedData: savedData }
            : i
        )
      );
    } else if (savedData) {
      const targetP =
        INITIAL_WORKLIST.find((p) => p.patientId === wizardTargetPatientId) ||
        INITIAL_WORKLIST[0];
      savedPatientId = targetP.patientId;
      savedPatientName = targetP.patientName;

      // Add new item to worklist
      const newItem: ParaclinicalWorklistItem = {
        id: `doc-${Date.now()}`,
        patientId: wizardTargetPatientId,
        patientName: savedPatientName,
        patientPhone: targetP.patientPhone || '0912 345 678',
        gestationalAge: savedData.gestationalAgeFormatted || targetP.gestationalAge || '32 tuần 4 ngày',
        documentType: 'ultrasound_4d',
        documentTypeName: 'Phiếu siêu âm 4D mới tải lên',
        fileName: savedData.fileName,
        fileSize: savedData.fileSizeFormatted,
        receivedAt: `${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
        doctorPerformer: savedData.doctorPerformer || 'BS. Lê Minh',
        ocrConfidence: savedData.ocrConfidence,
        status: 'verified',
        verifiedData: savedData,
      };
      setWorklist((prev) => [newItem, ...prev]);
    }

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
      INITIAL_WORKLIST.find((p) => p.patientId === wizardTargetPatientId) ||
      INITIAL_WORKLIST[0];

    return (
      <UploadVerificationWizard
        pregnancyProfileId={wizardTargetPatientId}
        patientName={targetPatient.patientName}
        gestationalAge={targetPatient.gestationalAge}
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

      {/* Top Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#275248] uppercase tracking-wider">
            <ScanText className="w-4 h-4 text-[#275248]" />
            <span>KHOA CẬN LÂM SÀNG &amp; SỐ HÓA BỆNH ÁN PRECARE</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Hàng đợi Tiếp nhận &amp; Đối chiếu cận lâm sàng
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Trung tâm tiếp nhận tài liệu, trích xuất OCR số hóa và đối chiếu kết quả siêu âm, xét nghiệm toàn khoa.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenNewUpload()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#275248] hover:bg-[#1f423a] text-white text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tiếp nhận hồ sơ mới</span>
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
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
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

      {/* Main Worklist Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                <th className="py-3 px-4">THAI PHỤ / MÃ BN</th>
                <th className="py-3 px-4">LOẠI TÀI LIỆU CẬN LÂM SÀNG</th>
                <th className="py-3 px-4">NGÀY THỰC HIỆN</th>
                <th className="py-3 px-4 text-center">ĐỘ TIN CẬY AI</th>
                <th className="py-3 px-4 text-center">TRẠNG THÁI</th>
                <th className="py-3 px-4 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Không tìm thấy phiếu cận lâm sàng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Thai phụ */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-teal-50 text-[#275248] font-bold text-xs flex items-center justify-center shrink-0 border border-teal-200">
                          {item.patientName
                            .split(' ')
                            .map((w) => w[0])
                            .slice(-2)
                            .join('')}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">
                            {item.patientName}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Tuổi thai: <strong>{item.gestationalAge}</strong> • {item.patientPhone}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Loại tài liệu */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">
                        {item.documentTypeName}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <FileText className="w-3 h-3 text-slate-400" />
                        <span>
                          {item.fileName} ({item.fileSize})
                        </span>
                      </div>
                      {item.hasWarning && (
                        <div className="text-[10px] text-amber-700 font-medium flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>{item.warningSummary}</span>
                        </div>
                      )}
                    </td>

                    {/* Ngày tiếp nhận */}
                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{item.receivedAt}</div>
                      <div className="text-[10px] text-slate-400">
                        BS: {item.doctorPerformer}
                      </div>
                    </td>

                    {/* Độ tin cậy OCR */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-[#275248] border border-teal-200/80">
                        <Sparkles className="w-3 h-3 text-teal-600" />
                        {item.ocrConfidence}%
                      </span>
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3.5 px-4 text-center">
                      {item.status === 'pending_review' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Chờ duyệt OCR
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Đã xác nhận
                        </span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-right">
                      {item.status === 'pending_review' ? (
                        <button
                          type="button"
                          onClick={() => handleReviewPending(item)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#275248] hover:bg-[#1f423a] text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Duyệt &amp; Đối chiếu</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleViewVerifiedDetails(item)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Xem chi tiết &amp; dặn dò</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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

      {/* Checkup Detail Modal */}
      {selectedVisitDetail && (
        <CheckupDetailModal
          visit={selectedVisitDetail}
          onClose={() => setSelectedVisitDetail(null)}
          patientName={
            worklist.find((i) => i.patientId === selectedVisitDetail.pregnancy_profile_id)
              ?.patientName || 'Nguyễn Thảo Chi'
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
