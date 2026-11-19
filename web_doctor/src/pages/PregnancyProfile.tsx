import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronDown,
  Sparkles,
  Baby,
  Activity,
  BookOpen,
  Pencil,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Loader2,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  ChevronsLeft,
  ChevronsRight,
  SearchX,
  RotateCcw,
  FolderOpen,
} from 'lucide-react';
import {
  PregnancyRecordItem,
  PregnancyStatus,
  UpdatePregnancyProfileRequest,
  fetchPregnancyProfilesApi,
  createPregnancyProfileApi,
  updatePregnancyProfileApi,
  calculatePregnancyApi,
  removeVietnameseAccents,
  getUniqueDoctorsFromRecords,
  getUniquePatientsFromRecords,
  fetchEligiblePatientsApi,
  EligiblePatient,
} from '../services/pregnancyProfile.service';
import { CalculationMethod } from '../types';
import {
  calculatePregnancyDates,
  validateClinicalInputs,
  PregnancyCalculationParams,
  PregnancyCalculationResult,
  getTodayISO,
  formatDateToDisplay,
} from '../services/pregnancyCalculator';

interface PregnancyProfileProps {
  onSelectPatient: (patientId: string) => void;
}

type CalculationMode = 'lmp' | 'q1' | 'override';
type StatusFilterType = 'all' | 'active' | 'completed' | 'terminated';
type SortField = 'stt' | 'patientName' | 'gestationalAgeDays' | 'edd' | 'doctorName' | 'status' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export const PregnancyProfile: React.FC<PregnancyProfileProps> = ({ onSelectPatient }) => {
  // 1. Records & Data State (Lấy thực tế từ CSDL, không hardcode)
  const [records, setRecords] = useState<PregnancyRecordItem[]>([]);

  // 2. Search & Filter State (Đã bỏ lọc tam cá nguyệt theo yêu cầu)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [doctorFilter, setDoctorFilter] = useState<string>('all');

  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);

  // 3. Sort State
  const [sortField, setSortField] = useState<SortField>('stt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // 4. Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // 5. API Loading & Error State
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 6. Create Modal State & Validation State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [eligiblePatients, setEligiblePatients] = useState<EligiblePatient[]>([]);
  const [isLoadingEligible, setIsLoadingEligible] = useState(false);

  const loadEligiblePatients = async () => {
    setIsLoadingEligible(true);
    try {
      const data = await fetchEligiblePatientsApi();
      setEligiblePatients(data);
    } catch {
      setEligiblePatients([]);
    } finally {
      setIsLoadingEligible(false);
    }
  };

  useEffect(() => {
    loadEligiblePatients();
  }, []);

  // Clinical calculation mode
  const [calcMode, setCalcMode] = useState<CalculationMode>('lmp');
  const [lmpDate, setLmpDate] = useState('');
  const [q1Date, setQ1Date] = useState('');
  const [q1Weeks, setQ1Weeks] = useState<string>('8');
  const [q1Days, setQ1Days] = useState<string>('0');
  const [crlMm, setCrlMm] = useState<string>('');
  const [useCrlInput, setUseCrlInput] = useState(false);
  const [overrideEdd, setOverrideEdd] = useState('');
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // 7. Edit Modal State (Chuẩn PUT /api/v1/pregnancy-profiles/{profile_id} - Chỉnh sửa thông số ban đầu & tính lại EDD)
  const [editingRecord, setEditingRecord] = useState<PregnancyRecordItem | null>(null);
  const [editDoctorId, setEditDoctorId] = useState('');
  const [editCalcMode, setEditCalcMode] = useState<CalculationMode>('lmp');
  const [editLmp, setEditLmp] = useState('');
  const [editQ1Date, setEditQ1Date] = useState('');
  const [editQ1Weeks, setEditQ1Weeks] = useState<string>('8');
  const [editQ1Days, setEditQ1Days] = useState<string>('0');
  const [editCrlMm, setEditCrlMm] = useState<string>('');
  const [editUseCrlInput, setEditUseCrlInput] = useState(false);
  const [editOverrideEdd, setEditOverrideEdd] = useState('');
  const [editRecalculateEdd, setEditRecalculateEdd] = useState(true);
  const [editFormErrors, setEditFormErrors] = useState<string[]>([]);

  // Nạp danh sách hồ sơ từ API thực tế (chuẩn theo logic BE, không dùng mock fallback)
  const loadProfiles = async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const result = await fetchPregnancyProfilesApi({
        page: 1,
        page_size: 100,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery || undefined,
        doctor_id: doctorFilter !== 'all' ? doctorFilter : undefined,
      });

      if (result.items) {
        setRecords(result.items);
      } else {
        setRecords([]);
      }
    } catch (err: any) {
      const message =
        err.response?.data?.detail?.message ||
        err.response?.data?.message ||
        err.message ||
        'Không thể kết nối đến máy chủ API PreCare (Cổng 8000)';
      setListError(message);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('precare_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  // Trích xuất danh sách Bác sĩ thực tế từ CSDL qua các bản ghi
  const doctorsList = useMemo(() => {
    const list = getUniqueDoctorsFromRecords(records);
    if (currentUser?.id && (currentUser?.role === 'doctor' || currentUser?.role === 'admin')) {
      const exists = list.some((d) => d.id === currentUser.id);
      if (!exists) {
        return [
          {
            id: currentUser.id,
            name: currentUser.full_name ? `BS. ${currentUser.full_name}` : 'Bác sĩ phụ trách',
          },
          ...list,
        ];
      }
    }
    return list;
  }, [records, currentUser]);

  // Danh sách thai phụ chưa có hồ sơ thai kỳ (nạp động từ bảng users qua API)
  const unregisteredPatients = useMemo(() => {
    const registeredIds = new Set(records.map((r) => r.patientId));
    return eligiblePatients.filter((p) => !registeredIds.has(p.id));
  }, [records, eligiblePatients]);

  // Danh sách thai phụ đã có hồ sơ thai kỳ thực tế từ CSDL
  const existingPatients = useMemo(() => {
    return getUniquePatientsFromRecords(records);
  }, [records]);

  // Đếm số lượng bộ lọc đang active
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (statusFilter !== 'all') count++;
    if (doctorFilter !== 'all') count++;
    return count;
  }, [searchQuery, statusFilter, doctorFilter]);

  // Xóa toàn bộ bộ lọc và đặt lại tìm kiếm
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDoctorFilter('all');
    setCurrentPage(1);
  };

  // 1. SEARCH & FILTER LOGIC:
  const filteredRecords = useMemo(() => {
    const q = removeVietnameseAccents(searchQuery);

    return records.filter((r) => {
      // Tìm kiếm thông minh (không dấu, không phân biệt hoa thường, bỏ khoảng trắng SĐT)
      const matchesSearch =
        !q ||
        removeVietnameseAccents(r.patientName).includes(q) ||
        r.phoneNumber.replace(/\s+/g, '').includes(q.replace(/\s+/g, '')) ||
        (r.email && removeVietnameseAccents(r.email).includes(q)) ||
        removeVietnameseAccents(r.id).includes(q);

      // Lọc theo trạng thái
      const matchesStatus =
        statusFilter === 'all' ? true : r.status === statusFilter;

      // Lọc theo bác sĩ (hỗ trợ so sánh linh hoạt ID hoặc tên)
      const matchesDoctor =
        doctorFilter === 'all'
          ? true
          : r.doctorId === doctorFilter ||
            r.doctorName === doctorFilter ||
            r.doctorName.toLowerCase().replace(/^bs\.\s*/i, '').trim() ===
              doctorFilter.toLowerCase().replace(/^bs\.\s*/i, '').trim();

      return matchesSearch && matchesStatus && matchesDoctor;
    });
  }, [records, searchQuery, statusFilter, doctorFilter]);

  // 2. SORT LOGIC:
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'stt') {
        cmp = (parseInt(a.stt, 10) || 0) - (parseInt(b.stt, 10) || 0);
      } else if (sortField === 'patientName') {
        cmp = a.patientName.localeCompare(b.patientName, 'vi');
      } else if (sortField === 'gestationalAgeDays') {
        cmp = (a.gestationalAgeDays ?? 0) - (b.gestationalAgeDays ?? 0);
      } else if (sortField === 'edd') {
        cmp = new Date(a.edd).getTime() - new Date(b.edd).getTime();
      } else if (sortField === 'doctorName') {
        cmp = a.doctorName.localeCompare(b.doctorName, 'vi');
      } else if (sortField === 'status') {
        cmp = a.status.localeCompare(b.status);
      } else if (sortField === 'createdAt') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredRecords, sortField, sortOrder]);

  // Đổi chiều hoặc chọn cột sắp xếp
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // 3. PAGINATION LOGIC:
  const totalItems = sortedRecords.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  // Tự động quay về trang 1 khi thay đổi bộ lọc, tìm kiếm, kích thước trang hoặc sắp xếp
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, doctorFilter, pageSize]);

  // Counts for KPI Cards (Tính toán 100% từ dữ liệu thực tế)
  const totalCount = records.length;
  const activeCount = records.filter((r) => r.status === 'active').length;
  const completedCount = records.filter((r) => r.status === 'completed').length;
  const terminatedCount = records.filter((r) => r.status === 'terminated').length;

  // Live Medical Calculation Preview inside Create Modal
  const livePreview = useMemo<{
    result?: PregnancyCalculationResult;
    error?: string;
  }>(() => {
    try {
      const params: PregnancyCalculationParams = {};

      if (calcMode === 'lmp') {
        if (!lmpDate) return {};
        params.lmp = lmpDate;
      } else if (calcMode === 'q1') {
        if (!q1Date) return {};
        params.q1UltrasoundDate = q1Date;
        if (useCrlInput && crlMm) {
          params.crlMm = parseFloat(crlMm);
        } else {
          params.q1GestationalWeeks = parseInt(q1Weeks || '0', 10);
          params.q1GestationalDays = parseInt(q1Days || '0', 10);
        }
        if (lmpDate) {
          params.lmp = lmpDate;
        }
      } else if (calcMode === 'override') {
        if (!overrideEdd) return {};
        params.overrideEdd = overrideEdd;
      }

      const valErrors = validateClinicalInputs(params);
      if (valErrors.length > 0) {
        return { error: valErrors[0].message };
      }

      const res = calculatePregnancyDates(params);
      return { result: res };
    } catch (err: any) {
      return { error: err.message || 'Lỗi tính toán y khoa' };
    }
  }, [calcMode, lmpDate, q1Date, q1Weeks, q1Days, crlMm, useCrlInput, overrideEdd]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    loadEligiblePatients();
    const firstPat = unregisteredPatients[0]?.id || existingPatients[0]?.id || '';
    const firstDoc = doctorsList[0]?.id || currentUser?.id || '';
    setSelectedPatientId(firstPat);
    setSelectedDoctorId(firstDoc);
    setCalcMode('lmp');
    setLmpDate('');
    setQ1Date('');
    setQ1Weeks('8');
    setQ1Days('0');
    setCrlMm('');
    setUseCrlInput(false);
    setOverrideEdd('');
    setFormErrors([]);
    setFieldErrors({});
    setIsCreateModalOpen(true);
  };

  // Close Create Modal
  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  // 4. VALIDATE LOGIC: Kiểm tra từng trường form tạo mới theo chuẩn STORY-3.1
  const validateFormFields = (): boolean => {
    const errors: Record<string, string> = {};
    const errorList: string[] = [];
    const today = getTodayISO();

    if (!selectedPatientId) {
      errors.patientId = 'Vui lòng chọn thai phụ (patient_id).';
      errorList.push('Vui lòng chọn thai phụ (patient_id).');
    }

    if (!selectedDoctorId) {
      errors.doctorId = 'Vui lòng chọn bác sĩ phụ trách.';
      errorList.push('Vui lòng chọn bác sĩ phụ trách.');
    }

    if (calcMode === 'lmp') {
      if (!lmpDate) {
        errors.lmp = 'Vui lòng chọn Ngày kinh cuối (LMP).';
        errorList.push('Vui lòng chọn Ngày kinh cuối (LMP).');
      } else if (lmpDate > today) {
        errors.lmp = 'Ngày kinh cuối không được ở trong tương lai.';
        errorList.push('Ngày kinh cuối không được ở trong tương lai.');
      } else {
        const diffDays = Math.floor((new Date(today).getTime() - new Date(lmpDate).getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 300) {
          errors.lmp = 'Ngày kinh cuối vượt quá giới hạn thai kỳ (> 300 ngày).';
          errorList.push('Ngày kinh cuối vượt quá giới hạn thai kỳ (> 300 ngày).');
        }
      }
    } else if (calcMode === 'q1') {
      if (!q1Date) {
        errors.q1Date = 'Vui lòng chọn Ngày siêu âm Quý 1.';
        errorList.push('Vui lòng chọn Ngày siêu âm Quý 1.');
      } else if (q1Date > today) {
        errors.q1Date = 'Ngày siêu âm phải nhỏ hơn hoặc bằng ngày hôm nay.';
        errorList.push('Ngày siêu âm phải nhỏ hơn hoặc bằng ngày hôm nay.');
      }

      if (lmpDate && q1Date && q1Date < lmpDate) {
        errors.q1Date = 'Ngày siêu âm Quý 1 phải sau ngày kinh cuối (LMP).';
        errorList.push('Ngày siêu âm Quý 1 phải sau ngày kinh cuối (LMP).');
      }

      if (useCrlInput) {
        const numCrl = parseFloat(crlMm);
        if (!crlMm || isNaN(numCrl) || numCrl <= 0) {
          errors.crlMm = 'Vui lòng nhập chỉ số chiều dài đầu mông CRL (mm).';
          errorList.push('Vui lòng nhập chỉ số chiều dài đầu mông CRL (mm).');
        } else if (numCrl < 10.0 || numCrl > 84.0) {
          errors.crlMm = 'Chỉ số CRL đo tuổi thai quý 1 tiêu chuẩn từ 10.0mm đến 84.0mm.';
          errorList.push('Chỉ số CRL đo tuổi thai quý 1 tiêu chuẩn từ 10.0mm đến 84.0mm.');
        }
      } else {
        const w = parseInt(q1Weeks || '0', 10);
        const d = parseInt(q1Days || '0', 10);
        if (w < 6 || w > 14) {
          errors.q1Weeks = 'Tuổi thai siêu âm quý 1 phải nằm trong khoảng 6 - 14 tuần.';
          errorList.push('Tuổi thai siêu âm quý 1 phải nằm trong khoảng 6 - 14 tuần.');
        }
        if (d < 0 || d > 6) {
          errors.q1Days = 'Số ngày lẻ phải từ 0 đến 6 ngày.';
          errorList.push('Số ngày lẻ phải từ 0 đến 6 ngày.');
        }
      }
    } else if (calcMode === 'override') {
      if (!overrideEdd) {
        errors.overrideEdd = 'Vui lòng chỉ định Ngày dự sinh (EDD).';
        errorList.push('Vui lòng chỉ định Ngày dự sinh (EDD).');
      }
    }

    setFieldErrors(errors);
    setFormErrors(errorList);
    return errorList.length === 0;
  };

  // Submit Create Modal
  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateFormFields()) {
      return;
    }

    const allPatients = [...unregisteredPatients, ...existingPatients];
    const patient = allPatients.find((p) => p.id === selectedPatientId) || allPatients[0];
    const doctor = doctorsList.find((d) => d.id === selectedDoctorId) || doctorsList[0];

    const params: PregnancyCalculationParams = {};
    if (calcMode === 'lmp') params.lmp = lmpDate;
    else if (calcMode === 'q1') {
      params.q1UltrasoundDate = q1Date;
      if (useCrlInput) params.crlMm = parseFloat(crlMm);
      else {
        params.q1GestationalWeeks = parseInt(q1Weeks || '0', 10);
        params.q1GestationalDays = parseInt(q1Days || '0', 10);
      }
      if (lmpDate) params.lmp = lmpDate;
    } else if (calcMode === 'override') {
      params.overrideEdd = overrideEdd;
    }

    setIsSubmitting(true);
    setFormErrors([]);

    let calculationMethod: CalculationMethod = 'lmp';
    if (calcMode === 'q1') {
      calculationMethod = useCrlInput ? 'crl' : 'q1_ultrasound';
    } else if (calcMode === 'override') {
      calculationMethod = 'direct_edd';
    }

    try {
      const created = await createPregnancyProfileApi({
        patient_id: patient.id,
        primary_doctor_id: doctor.id,
        calculation_method: calculationMethod,
        lmp: params.lmp || null,
        q1_ultrasound_date: params.q1UltrasoundDate || null,
        q1_gestational_weeks: params.q1GestationalWeeks || null,
        q1_gestational_days: params.q1GestationalDays || null,
        crl_mm: params.crlMm || null,
        override_edd: params.overrideEdd || null,
      });

      setRecords((prev) => [created, ...prev]);
      setEligiblePatients((prev) => prev.filter((p) => p.id !== created.patientId));
      setIsCreateModalOpen(false);

      setToastMessage(`Đã khởi tạo hồ sơ thai kỳ thành công cho ${created.patientName}!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (apiErr: any) {
      const apiMsg =
        apiErr.response?.data?.error?.message ||
        apiErr.response?.data?.detail?.message ||
        apiErr.response?.data?.message ||
        apiErr.message ||
        'Dữ liệu y khoa thai kỳ không hợp lệ hoặc thai phụ đã có hồ sơ đang hoạt động.';
      setFormErrors([apiMsg]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal (Chuẩn PUT /{profile_id} - Chỉnh sửa thông số ban đầu & tính lại EDD)
  const handleOpenEditModal = (rec: PregnancyRecordItem) => {
    setEditingRecord(rec);
    const matchedDoc = doctorsList.find(
      (d) =>
        (rec.doctorId && d.id === rec.doctorId) ||
        d.name.toLowerCase().replace(/^bs\.\s*/i, '').trim() ===
          rec.doctorName.toLowerCase().replace(/^bs\.\s*/i, '').trim()
    );
    setEditDoctorId(rec.doctorId || matchedDoc?.id || doctorsList[0]?.id || '');

    // Xác định phương pháp tính toán ban đầu dựa trên dữ liệu hiện có
    if (rec.q1UltrasoundDate || rec.crlMm) {
      setEditCalcMode('q1');
    } else if (rec.lmp) {
      setEditCalcMode('lmp');
    } else {
      setEditCalcMode('override');
    }

    setEditLmp(rec.lmp || '');
    setEditQ1Date(rec.q1UltrasoundDate || '');
    setEditQ1Weeks(String(rec.q1GestationalWeeks ?? 8));
    setEditQ1Days(String(rec.q1GestationalDays ?? 0));
    setEditCrlMm(rec.crlMm ? String(rec.crlMm) : '');
    setEditUseCrlInput(Boolean(rec.crlMm));
    setEditOverrideEdd(rec.edd || '');
    setEditRecalculateEdd(true);
    setEditFormErrors([]);
  };

  // Submit Edit Modal (Gọi PUT /api/v1/pregnancy-profiles/{profile_id})
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    const errors: string[] = [];
    const today = getTodayISO();

    if (!editDoctorId) {
      errors.push('Vui lòng chọn bác sĩ phụ trách.');
    }

    if (editCalcMode === 'lmp') {
      if (!editLmp) {
        errors.push('Vui lòng chọn Ngày kinh cuối (LMP).');
      } else if (editLmp > today) {
        errors.push('Ngày kinh cuối không được ở trong tương lai.');
      }
    } else if (editCalcMode === 'q1') {
      if (!editQ1Date) {
        errors.push('Vui lòng chọn Ngày siêu âm quý 1.');
      } else if (editQ1Date > today) {
        errors.push('Ngày siêu âm không được ở trong tương lai.');
      }
      if (editUseCrlInput) {
        const crl = parseFloat(editCrlMm);
        if (isNaN(crl) || crl < 10 || crl > 84) {
          errors.push('Chỉ số CRL phải nằm trong khoảng 10 - 84 mm (tương đương 7 - 14 tuần thai).');
        }
      }
    } else if (editCalcMode === 'override') {
      if (!editOverrideEdd) {
        errors.push('Vui lòng chọn Ngày dự sinh (EDD) do bác sĩ chỉ định.');
      }
    }

    if (errors.length > 0) {
      setEditFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setEditFormErrors([]);

    try {
      const payload: UpdatePregnancyProfileRequest = {
        primary_doctor_id: editDoctorId || undefined,
        recalculate_edd: editRecalculateEdd,
      };

      if (editCalcMode === 'lmp') {
        payload.lmp = editLmp;
      } else if (editCalcMode === 'q1') {
        payload.q1_ultrasound_date = editQ1Date;
        if (editUseCrlInput && editCrlMm) {
          payload.crl_mm = parseFloat(editCrlMm);
        } else {
          payload.q1_gestational_weeks = parseInt(editQ1Weeks || '0', 10);
          payload.q1_gestational_days = parseInt(editQ1Days || '0', 10);
        }
      } else if (editCalcMode === 'override') {
        payload.override_edd = editOverrideEdd;
      }

      await updatePregnancyProfileApi(editingRecord.id, payload);

      // Nạp lại danh sách hồ sơ mới nhất từ API để hiển thị dữ liệu chính xác
      await loadProfiles();
      setEditingRecord(null);

      setToastMessage(`Đã cập nhật hồ sơ và tính lại EDD cho ${editingRecord.patientName} thành công!`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      const apiMsg =
        err.response?.data?.detail?.message ||
        err.response?.data?.message ||
        err.message ||
        'Không thể cập nhật hồ sơ thai kỳ';
      setEditFormErrors([apiMsg]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#275248] text-white px-5 py-3.5 rounded-xl shadow-lg flex items-center gap-3 animate-fade-in border border-teal-600/40">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP STAT CARDS (4 THẺ THỐNG KÊ TÍNH 100% TỪ DỮ LIỆU THẬT) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng hồ sơ thai kỳ */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Tổng hồ sơ thai kỳ</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {String(totalCount).padStart(2, '0')}
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            Dữ liệu thực từ CSDL PreCare
          </div>
        </div>

        {/* Card 2: Đang theo dõi */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Đang hoạt động</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-emerald-700 tracking-tight">
              {String(activeCount).padStart(2, '0')}
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            Thai phụ đang trong chu kỳ chăm sóc
          </div>
        </div>

        {/* Card 3: Đã sinh */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Đã sinh</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
              <Baby className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-sky-700 tracking-tight">
              {String(completedCount).padStart(2, '0')}
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            Hồ sơ kết thúc chu sinh thành công
          </div>
        </div>

        {/* Card 4: Đình chỉ thai kỳ */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Đình chỉ</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-rose-700 tracking-tight">
              {String(terminatedCount).padStart(2, '0')}
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            Kết thúc sớm do y khoa hoặc sảy thai
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTAINER CARD: DANH SÁCH HỒ SƠ THAI KỲ */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Header Toolbar: Tiêu đề + Tìm kiếm + 3 Bộ lọc + Đặt lại + Nút Tạo mới */}
        <div className="p-6 border-b border-slate-100 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              Danh sách Hồ sơ Thai kỳ
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-normal">
              Dữ liệu thời gian thực từ cơ sở dữ liệu. Nhấp vào tiêu đề cột để sắp xếp hoặc áp dụng bộ lọc đa chiều.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              {/* Search Input (Họ tên, SĐT, Email, ID - Bỏ dấu thông minh) */}
              <div className="relative w-64 max-w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên, SĐT, email..."
                  className="w-full pl-8 pr-7 py-2 text-xs text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74] focus:ring-1 focus:ring-[#4D7D74] transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title="Xóa từ khóa tìm kiếm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Dropdown */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusDropdown((prev) => !prev);
                    setShowDoctorDropdown(false);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-medium transition-colors shadow-2xs whitespace-nowrap ${
                    statusFilter !== 'all'
                      ? 'bg-teal-50 border-[#275248] text-[#275248] font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {statusFilter === 'all'
                      ? 'Lọc trạng thái'
                      : statusFilter === 'active'
                      ? 'Đang hoạt động'
                      : statusFilter === 'completed'
                      ? 'Hoàn thành'
                      : 'Đã đình chỉ'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showStatusDropdown && (
                  <div className="absolute left-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-20 text-xs text-slate-700">
                    <button
                      onClick={() => {
                        setStatusFilter('all');
                        setShowStatusDropdown(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 ${
                        statusFilter === 'all' ? 'font-bold text-[#4D7D74] bg-teal-50/50' : ''
                      }`}
                    >
                      Tất cả trạng thái
                    </button>
                    <button
                      onClick={() => {
                        setStatusFilter('active');
                        setShowStatusDropdown(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 ${
                        statusFilter === 'active' ? 'font-bold text-[#4D7D74] bg-teal-50/50' : ''
                      }`}
                    >
                      Đang hoạt động
                    </button>
                    <button
                      onClick={() => {
                        setStatusFilter('completed');
                        setShowStatusDropdown(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 ${
                        statusFilter === 'completed' ? 'font-bold text-[#4D7D74] bg-teal-50/50' : ''
                      }`}
                    >
                      Hoàn thành
                    </button>
                    <button
                      onClick={() => {
                        setStatusFilter('terminated');
                        setShowStatusDropdown(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 ${
                        statusFilter === 'terminated' ? 'font-bold text-rose-600 bg-rose-50/50' : ''
                      }`}
                    >
                      Đã đình chỉ
                    </button>
                  </div>
                )}
              </div>

              {/* Doctor Filter Dropdown (Tự động lấy danh sách từ CSDL, không hardcode) */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowDoctorDropdown((prev) => !prev);
                    setShowStatusDropdown(false);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-medium transition-colors shadow-2xs whitespace-nowrap ${
                    doctorFilter !== 'all'
                      ? 'bg-teal-50 border-[#275248] text-[#275248] font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {doctorFilter === 'all'
                      ? 'Tất cả bác sĩ'
                      : doctorFilter}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showDoctorDropdown && (
                  <div className="absolute left-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-20 text-xs text-slate-700 max-h-60 overflow-y-auto">
                    <button
                      onClick={() => {
                        setDoctorFilter('all');
                        setShowDoctorDropdown(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 ${
                        doctorFilter === 'all' ? 'font-bold text-[#4D7D74] bg-teal-50/50' : ''
                      }`}
                    >
                      Tất cả bác sĩ
                    </button>
                    {doctorsList.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => {
                          setDoctorFilter(doc.name);
                          setShowDoctorDropdown(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 ${
                          doctorFilter === doc.name ? 'font-bold text-[#4D7D74] bg-teal-50/50' : ''
                        }`}
                      >
                        {doc.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Nút Đặt lại bộ lọc (chỉ hiện khi có filter active) */}
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer"
                  title="Xóa tất cả bộ lọc và tìm kiếm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Đặt lại ({activeFilterCount})</span>
                </button>
              )}
            </div>

            {/* Action Button: "+ Tạo Hồ sơ Thai kỳ" */}
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#275248] hover:bg-[#1f423a] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Tạo Hồ sơ Thai kỳ</span>
            </button>
          </div>
        </div>

        {/* API Error / Offline Fallback Alert Banner */}
        {listError && (
          <div className="mx-6 mt-4 p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-800 animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{listError}</span>
            </div>
            <button
              type="button"
              onClick={loadProfiles}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-medium transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Thử lại API</span>
            </button>
          </div>
        )}

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="text-xs text-slate-500 font-semibold border-b border-slate-100 bg-slate-50/40">
                {/* STT */}
                <th
                  onClick={() => handleSort('stt')}
                  className="py-3.5 px-6 font-semibold w-20 cursor-pointer hover:bg-slate-100/70 transition-colors select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>STT</span>
                    {sortField === 'stt' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#275248]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#275248]" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                    )}
                  </div>
                </th>

                {/* HỌ VÀ TÊN THAI PHỤ */}
                <th
                  onClick={() => handleSort('patientName')}
                  className="py-3.5 px-6 font-semibold cursor-pointer hover:bg-slate-100/70 transition-colors select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>HỌ VÀ TÊN THAI PHỤ</span>
                    {sortField === 'patientName' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#275248]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#275248]" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                    )}
                  </div>
                </th>

                {/* TUỔI THAI (GT) */}
                <th
                  onClick={() => handleSort('gestationalAgeDays')}
                  className="py-3.5 px-6 font-semibold cursor-pointer hover:bg-slate-100/70 transition-colors select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>TUỔI THAI (G<sub>T</sub>)</span>
                    {sortField === 'gestationalAgeDays' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#275248]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#275248]" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                    )}
                  </div>
                </th>

                {/* NGÀY DỰ SINH (EDD) */}
                <th
                  onClick={() => handleSort('edd')}
                  className="py-3.5 px-6 font-semibold cursor-pointer hover:bg-slate-100/70 transition-colors select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>NGÀY DỰ SINH (EDD)</span>
                    {sortField === 'edd' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#275248]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#275248]" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                    )}
                  </div>
                </th>

                {/* BÁC SĨ PHỤ TRÁCH */}
                <th
                  onClick={() => handleSort('doctorName')}
                  className="py-3.5 px-6 font-semibold cursor-pointer hover:bg-slate-100/70 transition-colors select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>BÁC SĨ PHỤ TRÁCH</span>
                    {sortField === 'doctorName' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#275248]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#275248]" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                    )}
                  </div>
                </th>

                {/* TRẠNG THÁI */}
                <th
                  onClick={() => handleSort('status')}
                  className="py-3.5 px-6 font-semibold cursor-pointer hover:bg-slate-100/70 transition-colors select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>TRẠNG THÁI</span>
                    {sortField === 'status' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#275248]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#275248]" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                    )}
                  </div>
                </th>

                <th className="py-3.5 px-6 font-semibold text-center">HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* LOADING SKELETON */}
              {isLoading ? (
                Array.from({ length: pageSize > 5 ? 5 : pageSize }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse border-b border-slate-100">
                    <td className="py-4 px-6"><div className="h-3 w-6 bg-slate-200 rounded"></div></td>
                    <td className="py-4 px-6"><div className="h-3.5 w-32 bg-slate-200 rounded mb-1.5"></div><div className="h-2.5 w-20 bg-slate-100 rounded"></div></td>
                    <td className="py-4 px-6"><div className="h-5 w-20 bg-emerald-100/60 rounded mb-1"></div><div className="h-2.5 w-16 bg-slate-100 rounded"></div></td>
                    <td className="py-4 px-6"><div className="h-3.5 w-20 bg-slate-200 rounded mb-1"></div><div className="h-2.5 w-16 bg-slate-100 rounded"></div></td>
                    <td className="py-4 px-6"><div className="h-3 w-28 bg-slate-200 rounded"></div></td>
                    <td className="py-4 px-6"><div className="h-5 w-24 bg-slate-200 rounded-full"></div></td>
                    <td className="py-4 px-6 text-center"><div className="h-7 w-24 bg-slate-200 rounded-xl mx-auto"></div></td>
                  </tr>
                ))
              ) : records.length === 0 ? (
                /* EMPTY STATE: Khi cơ sở dữ liệu chưa có hồ sơ nào */
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="max-w-md mx-auto flex flex-col items-center justify-center text-center p-6">
                      <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-[#275248] mb-3 border border-teal-100 shadow-xs">
                        <FolderOpen className="w-7 h-7" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">Chưa có hồ sơ thai kỳ nào trong cơ sở dữ liệu</h3>
                      <p className="text-xs text-slate-500 mt-1 mb-4">
                        Hệ thống chưa ghi nhận hồ sơ nào từ máy chủ. Bác sĩ có thể bấm nút bên dưới để tạo hồ sơ ban đầu cho thai phụ.
                      </p>
                      <button
                        onClick={handleOpenCreateModal}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#275248] hover:bg-[#1f423a] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                        <span>Tạo hồ sơ thai kỳ đầu tiên</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : paginatedRecords.length === 0 ? (
                /* EMPTY STATE: Khi tìm kiếm / lọc không ra kết quả */
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="max-w-md mx-auto flex flex-col items-center justify-center text-center p-6">
                      <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-3 border border-amber-100 shadow-xs">
                        <SearchX className="w-7 h-7" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">Không tìm thấy hồ sơ thai kỳ nào phù hợp</h3>
                      <p className="text-xs text-slate-500 mt-1 mb-4">
                        Không có kết quả nào khớp với từ khóa tìm kiếm hoặc bộ lọc hiện tại. Vui lòng kiểm tra lại điều kiện lọc.
                      </p>
                      <button
                        onClick={handleResetFilters}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Xóa bộ lọc & Đặt lại tìm kiếm</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                /* DATA ROWS */
                paginatedRecords.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* STT */}
                    <td className="py-4 px-6 text-slate-500 text-xs font-medium whitespace-nowrap">
                      {item.stt}
                    </td>

                    {/* Họ và tên thai phụ + SĐT */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="font-bold text-slate-800 text-sm">
                        {item.patientName}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {item.phoneNumber}
                      </div>
                    </td>

                    {/* Tuổi thai (G_T): Badge + Quý */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold bg-[#ECFDF5] text-[#065F46] border border-teal-200/60">
                        {item.gestationalAgeFormatted || item.gestationalAgeDisplay}
                      </span>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {item.trimesterDisplay}
                      </div>
                    </td>

                    {/* Ngày dự sinh (EDD) + Số ngày còn lại */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="font-bold text-slate-800 text-xs">
                        {item.displayEdd}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Còn {item.daysUntilEdd ?? 0} ngày
                      </div>
                    </td>

                    {/* Bác sĩ phụ trách */}
                    <td className="py-4 px-6 text-slate-700 text-xs font-medium whitespace-nowrap">
                      {item.doctorName}
                    </td>

                    {/* Trạng thái Pill */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      {item.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#E0F2FE] text-[#0369A1] border border-sky-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7]"></span>
                          {item.statusLabel || 'Đã sinh'}
                        </span>
                      ) : item.status === 'terminated' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#FFE4E6] text-[#BE123C] border border-rose-200/60">
                          <span className="w-1.5 h-1.5 rounded-sm bg-[#E11D48]"></span>
                          {item.statusLabel || 'Đình chỉ'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#15803D] border border-emerald-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
                          {item.statusLabel || 'Đang hoạt động'}
                        </span>
                      )}
                    </td>

                    {/* Hành động */}
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onSelectPatient(item.id)}
                          className="px-3.5 py-1.5 bg-[#2D6A5D] hover:bg-[#235349] text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                          Xem bệnh án
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                          title="Cập nhật EDD & Trạng thái"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <div>
              Hiển thị{' '}
              <span className="font-semibold text-slate-700">
                {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </span>{' '}
              -{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(currentPage * pageSize, totalItems)}
              </span>{' '}
              trong số{' '}
              <span className="font-semibold text-slate-700">{totalItems}</span> hồ sơ thai kỳ
            </div>

            {/* Dropdown Page Size */}
            <div className="flex items-center gap-1.5">
              <span>Mỗi trang:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:border-[#275248]"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Page Buttons */}
          <div className="flex items-center gap-1">
            {/* First Page */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1}
              className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Trang đầu"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>

            {/* Prev Page */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Trang trước"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Numeric Page Buttons */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((num, idx, arr) => (
                <React.Fragment key={num}>
                  {idx > 0 && num - arr[idx - 1] > 1 && (
                    <span className="px-1 text-slate-400">...</span>
                  )}
                  <button
                    onClick={() => setCurrentPage(num)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                      currentPage === num
                        ? 'bg-[#275248] text-white shadow-xs'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {num}
                  </button>
                </React.Fragment>
              ))}

            {/* Next Page */}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Trang sau"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Last Page */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Trang cuối"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. MODAL: KHỞI TẠO HỒ SƠ THAI KỲ MỚI (CÓ INLINE FIELD VALIDATION & LOAD ĐỘNG BÁC SĨ/BỆNH NHÂN) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 my-8 animate-scale-up">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#4D7D74]/15 flex items-center justify-center text-[#275248]">
                  <Baby className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Khởi tạo Hồ sơ Thai kỳ Mới
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dữ liệu lưu trực tiếp vào CSDL PreCare theo chuẩn y khoa ACOG 700
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseCreateModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleCreateRecord} className="p-6 space-y-6">
              {/* Form errors tổng quát */}
              {formErrors.length > 0 && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>Lỗi kiểm tra tính hợp lệ dữ liệu:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {formErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* PHẦN 1: THAI PHỤ (patient_id) VÀ BÁC SĨ (primary_doctor_id) TỪ DỮ LIỆU THỰC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Thai phụ <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => {
                      setSelectedPatientId(e.target.value);
                      if (fieldErrors.patientId) {
                        setFieldErrors((prev) => ({ ...prev, patientId: '' }));
                      }
                    }}
                    className={`w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border rounded-xl outline-none transition-all ${
                      fieldErrors.patientId ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-[#4D7D74]'
                    }`}
                  >
                    <option value="">-- Chọn thai phụ từ hệ thống --</option>
                    {isLoadingEligible ? (
                      <option disabled>Đang tải danh sách thai phụ từ CSDL...</option>
                    ) : unregisteredPatients.length > 0 ? (
                      <optgroup label="Thai phụ chưa có hồ sơ thai kỳ">
                        {unregisteredPatients.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.fullName} {p.phoneNumber ? `(${p.phoneNumber})` : ''} — [Chưa có hồ sơ thai kỳ]
                          </option>
                        ))}
                      </optgroup>
                    ) : (
                      <optgroup label="Thai phụ chưa có hồ sơ thai kỳ">
                        <option disabled>Không có tài khoản thai phụ nào chưa có hồ sơ</option>
                      </optgroup>
                    )}
                    {existingPatients.length > 0 && (
                      <optgroup label="Thai phụ đã có hồ sơ thai kỳ">
                        {existingPatients.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.fullName} {p.phoneNumber ? `(${p.phoneNumber})` : ''} — [Đã có hồ sơ]
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  {fieldErrors.patientId ? (
                    <span className="text-[11px] text-rose-500 font-medium mt-1 block">
                      {fieldErrors.patientId}
                    </span>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Ưu tiên chọn thai phụ hiển thị nhãn [Chưa có hồ sơ thai kỳ] để tạo mới.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Bác sĩ phụ trách <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => {
                      setSelectedDoctorId(e.target.value);
                      if (fieldErrors.doctorId) {
                        setFieldErrors((prev) => ({ ...prev, doctorId: '' }));
                      }
                    }}
                    className={`w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border rounded-xl outline-none transition-all ${
                      fieldErrors.doctorId ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-[#4D7D74]'
                    }`}
                  >
                    <option value="">-- Chọn bác sĩ phụ trách --</option>
                    {doctorsList.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.doctorId ? (
                    <span className="text-[11px] text-rose-500 font-medium mt-1 block">
                      {fieldErrors.doctorId}
                    </span>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Bác sĩ điều trị và theo dõi lâm sàng.
                    </p>
                  )}
                </div>
              </div>

              {/* PHẦN 2: CĂN CỨ TÍNH TUỔI THAI & NGÀY DỰ SINH (ACOG 700) */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    Phương pháp xác định Tuổi thai & EDD (ACOG 700)
                  </h4>
                  <span className="text-[11px] text-teal-700 font-semibold bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200/50">
                    Chuẩn lâm sàng
                  </span>
                </div>

                {/* Tabs chọn phương pháp */}
                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => {
                      setCalcMode('lmp');
                      setFieldErrors({});
                    }}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      calcMode === 'lmp'
                        ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Ngày kinh cuối (LMP)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCalcMode('q1');
                      setFieldErrors({});
                    }}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      calcMode === 'q1'
                        ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Siêu âm Quý 1
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCalcMode('override');
                      setFieldErrors({});
                    }}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      calcMode === 'override'
                        ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    EDD trực tiếp
                  </button>
                </div>

                {/* Input Phương pháp 1: LMP */}
                {calcMode === 'lmp' && (
                  <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ngày đầu kỳ kinh cuối (LMP) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      max={getTodayISO()}
                      value={lmpDate}
                      onChange={(e) => {
                        setLmpDate(e.target.value);
                        if (fieldErrors.lmp) {
                          setFieldErrors((prev) => ({ ...prev, lmp: '' }));
                        }
                      }}
                      className={`w-full px-3 py-2 text-xs border rounded-xl outline-none bg-white ${
                        fieldErrors.lmp ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-[#4D7D74]'
                      }`}
                    />
                    {fieldErrors.lmp ? (
                      <span className="text-[11px] text-rose-500 font-medium block">
                        {fieldErrors.lmp}
                      </span>
                    ) : (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Quy tắc Naegele: EDD = LMP + 280 ngày. Không chọn ngày trong tương lai.
                      </p>
                    )}
                  </div>
                )}

                {/* Input Phương pháp 2: Siêu âm Quý 1 */}
                {calcMode === 'q1' && (
                  <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Ngày siêu âm Quý 1 <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="date"
                          max={getTodayISO()}
                          value={q1Date}
                          onChange={(e) => {
                            setQ1Date(e.target.value);
                            if (fieldErrors.q1Date) {
                              setFieldErrors((prev) => ({ ...prev, q1Date: '' }));
                            }
                          }}
                          className={`w-full px-3 py-2 text-xs border rounded-xl outline-none bg-white ${
                            fieldErrors.q1Date ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-[#4D7D74]'
                          }`}
                        />
                        {fieldErrors.q1Date && (
                          <span className="text-[11px] text-rose-500 font-medium block mt-1">
                            {fieldErrors.q1Date}
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          LMP đối chiếu (Tùy chọn)
                        </label>
                        <input
                          type="date"
                          max={getTodayISO()}
                          value={lmpDate}
                          onChange={(e) => setLmpDate(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74] bg-white"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-700">Cách nhập kết quả siêu âm:</span>
                      <div className="flex items-center gap-3 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="q1InputType"
                            checked={!useCrlInput}
                            onChange={() => setUseCrlInput(false)}
                          />
                          <span>Tuần + Ngày</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="q1InputType"
                            checked={useCrlInput}
                            onChange={() => setUseCrlInput(true)}
                          />
                          <span>Chỉ số CRL (mm)</span>
                        </label>
                      </div>
                    </div>

                    {!useCrlInput ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Tuần thai lúc siêu âm (6 - 14 tuần) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="6"
                            max="14"
                            value={q1Weeks}
                            onChange={(e) => {
                              setQ1Weeks(e.target.value);
                              if (fieldErrors.q1Weeks) {
                                setFieldErrors((prev) => ({ ...prev, q1Weeks: '' }));
                              }
                            }}
                            className={`w-full px-3 py-2 text-xs border rounded-xl outline-none bg-white ${
                              fieldErrors.q1Weeks ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-[#4D7D74]'
                            }`}
                          />
                          {fieldErrors.q1Weeks && (
                            <span className="text-[11px] text-rose-500 font-medium block mt-1">
                              {fieldErrors.q1Weeks}
                            </span>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Ngày lẻ (0 - 6 ngày) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="6"
                            value={q1Days}
                            onChange={(e) => {
                              setQ1Days(e.target.value);
                              if (fieldErrors.q1Days) {
                                setFieldErrors((prev) => ({ ...prev, q1Days: '' }));
                              }
                            }}
                            className={`w-full px-3 py-2 text-xs border rounded-xl outline-none bg-white ${
                              fieldErrors.q1Days ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-[#4D7D74]'
                            }`}
                          />
                          {fieldErrors.q1Days && (
                            <span className="text-[11px] text-rose-500 font-medium block mt-1">
                              {fieldErrors.q1Days}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Chiều dài đầu mông CRL (10 - 84 mm) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="10"
                          max="84"
                          placeholder="Ví dụ: 47.5"
                          value={crlMm}
                          onChange={(e) => {
                            setCrlMm(e.target.value);
                            if (fieldErrors.crlMm) {
                              setFieldErrors((prev) => ({ ...prev, crlMm: '' }));
                            }
                          }}
                          className={`w-full px-3 py-2 text-xs border rounded-xl outline-none bg-white ${
                            fieldErrors.crlMm ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-[#4D7D74]'
                          }`}
                        />
                        {fieldErrors.crlMm ? (
                          <span className="text-[11px] text-rose-500 font-medium block mt-1">
                            {fieldErrors.crlMm}
                          </span>
                        ) : (
                          <p className="text-[11px] text-slate-500 mt-1">
                            Ước lượng theo công thức Hadlock/Robinson: GA = 8.052 × √CRL + 23.73
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Input Phương pháp 3: Override EDD */}
                {calcMode === 'override' && (
                  <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ngày dự sinh bác sĩ chỉ định trực tiếp (Override EDD) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={overrideEdd}
                      onChange={(e) => {
                        setOverrideEdd(e.target.value);
                        if (fieldErrors.overrideEdd) {
                          setFieldErrors((prev) => ({ ...prev, overrideEdd: '' }));
                        }
                      }}
                      className={`w-full px-3 py-2 text-xs border rounded-xl outline-none bg-white ${
                        fieldErrors.overrideEdd ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-[#4D7D74]'
                      }`}
                    />
                    {fieldErrors.overrideEdd ? (
                      <span className="text-[11px] text-rose-500 font-medium block">
                        {fieldErrors.overrideEdd}
                      </span>
                    ) : (
                      <p className="text-[11px] text-slate-500">
                        Áp dụng trong trường hợp bác sĩ quyết định lâm sàng riêng hoặc can thiệp IVF/thụ tinh nhân tạo.
                      </p>
                    )}
                  </div>
                )}

                {/* Live Preview Card */}
                {livePreview.result && (
                  <div className="p-3.5 bg-teal-50/70 border border-teal-200/80 rounded-xl flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <div className="font-bold text-teal-900 flex items-center gap-2">
                        <span>Tuổi thai: {livePreview.result.gestationalAge.display} ({livePreview.result.gestationalAge.formatted})</span>
                        <span className="text-teal-700 font-semibold px-2 py-0.2 bg-teal-100 rounded-md">
                          {livePreview.result.gestationalAge.trimesterName}
                        </span>
                      </div>
                      <div className="text-slate-700">
                        Ngày dự sinh (EDD):{' '}
                        <span className="font-bold text-slate-900">
                          {livePreview.result.formattedEdd}
                        </span>{' '}
                        (còn {livePreview.result.daysUntilEdd} ngày)
                      </div>
                      <p className="text-[11px] text-slate-500 italic">
                        {livePreview.result.clinicalNote}
                      </p>
                    </div>
                  </div>
                )}

                {livePreview.error && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{livePreview.error}</span>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-[#275248] hover:bg-[#1f423a] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu API...</span>
                    </>
                  ) : (
                    <span>Lưu hồ sơ thai kỳ</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL: CHỈNH SỬA HỒ SƠ BAN ĐẦU & TÍNH LẠI EDD (CHUẨN API PUT /api/v1/pregnancy-profiles/{profile_id}) */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200 animate-scale-up my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#275248]/10 flex items-center justify-center text-[#275248]">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Chỉnh sửa Hồ sơ Ban đầu & Tính lại EDD
                  </h3>
                  <p className="text-xs text-slate-500">
                    Thai phụ: <strong className="text-slate-700">{editingRecord.patientName}</strong> ({editingRecord.phoneNumber})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-5">
              {/* Error messages banner */}
              {editFormErrors.length > 0 && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>Lỗi kiểm tra dữ liệu:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {editFormErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Bác sĩ phụ trách */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Bác sĩ phụ trách chính <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editDoctorId}
                  onChange={(e) => setEditDoctorId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74] transition-all"
                >
                  <option value="">-- Chọn bác sĩ phụ trách --</option>
                  {doctorsList.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chế độ cập nhật thông số lâm sàng */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Phương pháp xác định Ngày dự sinh (EDD) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditCalcMode('lmp')}
                    className={`py-2 px-2.5 text-xs font-semibold rounded-xl border transition-all text-center cursor-pointer ${
                      editCalcMode === 'lmp'
                        ? 'bg-[#275248] text-white border-[#275248] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Ngày kinh cuối (LMP)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCalcMode('q1')}
                    className={`py-2 px-2.5 text-xs font-semibold rounded-xl border transition-all text-center cursor-pointer ${
                      editCalcMode === 'q1'
                        ? 'bg-[#275248] text-white border-[#275248] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Siêu âm Quý 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCalcMode('override')}
                    className={`py-2 px-2.5 text-xs font-semibold rounded-xl border transition-all text-center cursor-pointer ${
                      editCalcMode === 'override'
                        ? 'bg-[#275248] text-white border-[#275248] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Chỉ định EDD trực tiếp
                  </button>
                </div>
              </div>

              {/* Chi tiết theo từng phương pháp */}
              {editCalcMode === 'lmp' && (
                <div className="p-4 bg-teal-50/50 border border-teal-100 rounded-xl space-y-2 animate-fade-in">
                  <label className="block text-xs font-bold text-slate-700">
                    Ngày đầu kỳ kinh cuối (LMP) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editLmp}
                    onChange={(e) => setEditLmp(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74] bg-white"
                  />
                  <p className="text-[11px] text-slate-500">
                    Quy tắc Naegele: EDD = LMP + 280 ngày (40 tuần).
                  </p>
                </div>
              )}

              {editCalcMode === 'q1' && (
                <div className="p-4 bg-teal-50/50 border border-teal-100 rounded-xl space-y-3.5 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ngày thực hiện siêu âm Quý 1 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={editQ1Date}
                      onChange={(e) => setEditQ1Date(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74] bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-4 text-xs font-medium text-slate-700 pt-1">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="editUltrasoundType"
                        checked={!editUseCrlInput}
                        onChange={() => setEditUseCrlInput(false)}
                        className="text-[#275248] focus:ring-[#4D7D74]"
                      />
                      <span>Tuần + Ngày lẻ</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="editUltrasoundType"
                        checked={editUseCrlInput}
                        onChange={() => setEditUseCrlInput(true)}
                        className="text-[#275248] focus:ring-[#4D7D74]"
                      />
                      <span>Chỉ số CRL (mm)</span>
                    </label>
                  </div>

                  {!editUseCrlInput ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Tuần thai lúc siêu âm (6 - 14 tuần) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="42"
                          value={editQ1Weeks}
                          onChange={(e) => setEditQ1Weeks(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74] bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Ngày lẻ (0 - 6 ngày)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="6"
                          value={editQ1Days}
                          onChange={(e) => setEditQ1Days(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74] bg-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Chiều dài đầu mông CRL (10 - 84 mm) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="10"
                        max="84"
                        placeholder="Ví dụ: 45.2"
                        value={editCrlMm}
                        onChange={(e) => setEditCrlMm(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74] bg-white"
                      />
                    </div>
                  )}
                </div>
              )}

              {editCalcMode === 'override' && (
                <div className="p-4 bg-teal-50/50 border border-teal-100 rounded-xl space-y-2 animate-fade-in">
                  <label className="block text-xs font-bold text-slate-700">
                    Ngày dự sinh (EDD) bác sĩ chỉ định <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editOverrideEdd}
                    onChange={(e) => setEditOverrideEdd(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74] bg-white"
                  />
                  <p className="text-[11px] text-slate-500">
                    Bác sĩ chỉ định trực tiếp ngày dự sinh dựa trên hội chẩn lâm sàng.
                  </p>
                </div>
              )}

              {/* Tùy chọn recalculate_edd */}
              <div className="pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editRecalculateEdd}
                    onChange={(e) => setEditRecalculateEdd(e.target.checked)}
                    className="w-4 h-4 text-[#275248] rounded border-slate-300 focus:ring-[#4D7D74]"
                  />
                  <span className="text-xs text-slate-700 font-medium">
                    Tự động chuẩn hóa và tính lại EDD theo quy chuẩn y khoa ACOG 700 (recalculate_edd)
                  </span>
                </label>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4.5 py-2 bg-[#275248] hover:bg-[#1f423a] text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu và tính lại EDD...</span>
                    </>
                  ) : (
                    <span>Lưu & Cập nhật EDD</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PregnancyProfile;
