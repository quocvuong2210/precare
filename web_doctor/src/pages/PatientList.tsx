import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Phone,
  Eye,
  Plus,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Baby,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Loader2,
} from 'lucide-react';
import {
  PatientItem,
  PatientPregnancyStatusType,
  ALL_PREGNANT_WOMEN_USERS,
  getInitials,
  getAvatarColors,
  getStoredPatients,
  saveStoredPatients,
} from '../services/patient.service';
import {
  calculatePregnancyDates,
  validateClinicalInputs,
  PregnancyCalculationParams,
  PregnancyCalculationResult,
  getTodayISO,
  formatDateToDisplay,
} from '../services/pregnancyCalculator';
import {
  fetchPregnancyProfilesApi,
  createPregnancyProfileApi,
  getUniqueDoctorsFromRecords,
  PregnancyRecordItem,
} from '../services/pregnancyProfile.service';
import { CalculationMethod } from '../types/pregnancyProfile.types';

export interface PatientListProps {
  onSelectPatient: (patientId: string) => void;
  onNavigateToCreateRecord?: () => void;
}

export const PatientList: React.FC<PatientListProps> = ({
  onSelectPatient,
  onNavigateToCreateRecord,
}) => {
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [rawRecords, setRawRecords] = useState<PregnancyRecordItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'none'>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Modal State for "+ Tạo hồ sơ"
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatientForCreate, setSelectedPatientForCreate] = useState<PatientItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields inside modal
  const [calcMode, setCalcMode] = useState<'lmp' | 'q1' | 'override'>('lmp');
  const [lmpDate, setLmpDate] = useState('');
  const [q1Date, setQ1Date] = useState('');
  const [q1Weeks, setQ1Weeks] = useState('8');
  const [q1Days, setQ1Days] = useState('0');
  const [crlMm, setCrlMm] = useState('');
  const [useCrlInput, setUseCrlInput] = useState(false);
  const [overrideEdd, setOverrideEdd] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // User hiện tại từ LocalStorage
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('precare_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  // Danh sách bác sĩ phụ trách từ dữ liệu bản ghi và bác sĩ hiện tại
  const doctorsList = useMemo(() => {
    const list = getUniqueDoctorsFromRecords(rawRecords);
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
  }, [rawRecords, currentUser]);

  // Nạp danh sách hồ sơ thai kỳ từ API & Hợp nhất thông minh với danh sách thai phụ hệ thống
  const loadPatientsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchPregnancyProfilesApi({ page: 1, page_size: 100 });
      const profiles = response.items || [];
      setRawRecords(profiles);

      // Lập chỉ mục các hồ sơ theo patientId và số điện thoại
      const profilesByPatientId = new Map<string, PregnancyRecordItem[]>();
      const profilesByPhone = new Map<string, PregnancyRecordItem[]>();

      profiles.forEach((p) => {
        if (p.patientId) {
          const list = profilesByPatientId.get(p.patientId) || [];
          list.push(p);
          profilesByPatientId.set(p.patientId, list);
        }
        if (p.phoneNumber) {
          const cleanPhone = p.phoneNumber.replace(/\s+/g, '');
          const list = profilesByPhone.get(cleanPhone) || [];
          list.push(p);
          profilesByPhone.set(cleanPhone, list);
        }
      });

      const merged: PatientItem[] = [];
      const processedIds = new Set<string>();
      const processedPhones = new Set<string>();

      // 1. Duyệt qua toàn bộ danh sách thai phụ hệ thống (role pregnant_woman trong CSDL)
      ALL_PREGNANT_WOMEN_USERS.forEach((u) => {
        const cleanPhone = u.phoneNumber.replace(/\s+/g, '');
        const userProfiles =
          profilesByPatientId.get(u.id) ||
          profilesByPhone.get(cleanPhone) ||
          [];

        const activeProf = userProfiles.find((p) => p.status === 'active');
        const endedProf = userProfiles.find(
          (p) => p.status === 'completed' || p.status === 'terminated'
        );

        let statusType: PatientPregnancyStatusType = 'none';
        let statusLabel = 'Chưa có hồ sơ hoạt động';
        let pregnancyRecordId: string | undefined = undefined;

        if (activeProf) {
          statusType = 'active';
          const ga =
            activeProf.gestationalAgeFormatted ||
            activeProf.gestationalAgeDisplay?.split(' ')[0] ||
            '--';
          statusLabel = `Đang mang thai (${ga})`;
          pregnancyRecordId = activeProf.id;
        } else if (endedProf) {
          statusType = 'delivered';
          statusLabel = `Lần sinh trước: ${endedProf.displayEdd || formatDateToDisplay(endedProf.edd)}`;
          pregnancyRecordId = endedProf.id;
        }

        processedIds.add(u.id);
        processedPhones.add(cleanPhone);

        merged.push({
          id: u.id,
          stt: '',
          fullName: u.fullName,
          phoneNumber: u.phoneNumber,
          email: u.email,
          avatarInitials: getInitials(u.fullName),
          avatarBgColor: '',
          avatarTextColor: '',
          pregnancyStatusType: statusType,
          pregnancyStatusLabel: statusLabel,
          pregnancyRecordId,
        });
      });

      // 2. Bổ sung các hồ sơ có thai phụ mới trên CSDL chưa nằm trong danh sách hằng số
      profiles.forEach((p) => {
        const pid = p.patientId || p.id;
        const cleanPhone = (p.phoneNumber || '').replace(/\s+/g, '');
        if (
          (p.patientId && processedIds.has(p.patientId)) ||
          (cleanPhone && processedPhones.has(cleanPhone)) ||
          processedIds.has(pid)
        ) {
          return;
        }

        let statusType: PatientPregnancyStatusType = 'none';
        let statusLabel = 'Chưa có hồ sơ hoạt động';
        let pregnancyRecordId: string | undefined = undefined;

        if (p.status === 'active') {
          statusType = 'active';
          const ga =
            p.gestationalAgeFormatted ||
            p.gestationalAgeDisplay?.split(' ')[0] ||
            '--';
          statusLabel = `Đang mang thai (${ga})`;
          pregnancyRecordId = p.id;
        } else if (p.status === 'completed' || p.status === 'terminated') {
          statusType = 'delivered';
          statusLabel = `Lần sinh trước: ${p.displayEdd || formatDateToDisplay(p.edd)}`;
          pregnancyRecordId = p.id;
        }

        processedIds.add(pid);
        if (cleanPhone) processedPhones.add(cleanPhone);

        merged.push({
          id: pid,
          stt: '',
          fullName: p.patientName,
          phoneNumber: p.phoneNumber,
          email: p.email || '',
          avatarInitials: getInitials(p.patientName),
          avatarBgColor: '',
          avatarTextColor: '',
          pregnancyStatusType: statusType,
          pregnancyStatusLabel: statusLabel,
          pregnancyRecordId,
        });
      });

      // Gán STT và bảng màu avatar chuẩn thiết kế
      merged.forEach((item, idx) => {
        item.stt = String(idx + 1).padStart(2, '0');
        const color = getAvatarColors(idx);
        item.avatarBgColor = color.bg;
        item.avatarTextColor = color.text;
      });

      setPatients(merged);
      saveStoredPatients(merged);
    } catch (err) {
      console.warn('Sử dụng dữ liệu cục bộ do không thể kết nối API:', err);
      setPatients(getStoredPatients());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatientsData();
  }, [loadPatientsData]);

  // Filter patients
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const matchesSearch =
        p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.phoneNumber.replace(/\s+/g, '').includes(searchQuery.replace(/\s+/g, '')) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? p.pregnancyStatusType === 'active'
          : p.pregnancyStatusType === 'none' || p.pregnancyStatusType === 'delivered';

      return matchesSearch && matchesStatus;
    });
  }, [patients, searchQuery, statusFilter]);

  // Paginated patients
  const totalItems = filteredPatients.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPatients.slice(start, start + pageSize);
  }, [filteredPatients, currentPage, pageSize]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Live Medical Calculation Preview inside Form Modal
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
        if (lmpDate) params.lmp = lmpDate;
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

  const handleOpenCreateModal = (patient: PatientItem) => {
    setSelectedPatientForCreate(patient);
    setCalcMode('lmp');
    setLmpDate('');
    setQ1Date('');
    setQ1Weeks('8');
    setQ1Days('0');
    setCrlMm('');
    setUseCrlInput(false);
    setOverrideEdd('');
    setSelectedDoctorId(currentUser?.id || doctorsList[0]?.id || '60ad56ea-437e-47bd-839a-d97333790da0');
    setFormErrors([]);
    setIsModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientForCreate) return;

    const errors: string[] = [];
    const today = getTodayISO();
    const params: PregnancyCalculationParams = {};

    if (!selectedDoctorId) {
      errors.push('Vui lòng chọn bác sĩ phụ trách.');
    }

    if (calcMode === 'lmp') {
      if (!lmpDate) errors.push('Vui lòng chọn Ngày kinh cuối (LMP).');
      else if (lmpDate > today) errors.push('Ngày kinh cuối không được ở trong tương lai.');
      else params.lmp = lmpDate;
    } else if (calcMode === 'q1') {
      if (!q1Date) errors.push('Vui lòng chọn Ngày siêu âm Quý 1.');
      else if (q1Date > today) errors.push('Ngày siêu âm không được ở trong tương lai.');
      else {
        params.q1UltrasoundDate = q1Date;
        if (useCrlInput) {
          const numCrl = parseFloat(crlMm);
          if (!crlMm || isNaN(numCrl) || numCrl <= 0) {
            errors.push('Vui lòng nhập chỉ số chiều dài đầu mông CRL (mm).');
          } else if (numCrl < 10.0 || numCrl > 84.0) {
            errors.push('Chỉ số CRL đo tuổi thai quý 1 tiêu chuẩn từ 10.0mm đến 84.0mm.');
          } else {
            params.crlMm = numCrl;
          }
        } else {
          const w = parseInt(q1Weeks || '0', 10);
          const d = parseInt(q1Days || '0', 10);
          if (w < 6 || w > 14) errors.push('Tuổi thai siêu âm quý 1 phải nằm trong khoảng 6 - 14 tuần.');
          if (d < 0 || d > 6) errors.push('Số ngày lẻ phải từ 0 đến 6 ngày.');
          params.q1GestationalWeeks = w;
          params.q1GestationalDays = d;
        }
        if (lmpDate) params.lmp = lmpDate;
      }
    } else if (calcMode === 'override') {
      if (!overrideEdd) errors.push('Vui lòng chỉ định Ngày dự sinh (EDD).');
      else params.overrideEdd = overrideEdd;
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    const valErrors = validateClinicalInputs(params);
    if (valErrors.length > 0) {
      setFormErrors(valErrors.map((v) => v.message));
      return;
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
      await createPregnancyProfileApi({
        patient_id: selectedPatientForCreate.id,
        primary_doctor_id: selectedDoctorId,
        calculation_method: calculationMethod,
        lmp: params.lmp || null,
        q1_ultrasound_date: params.q1UltrasoundDate || null,
        q1_gestational_weeks: params.q1GestationalWeeks || null,
        q1_gestational_days: params.q1GestationalDays || null,
        crl_mm: params.crlMm || null,
        override_edd: params.overrideEdd || null,
      });

      setIsModalOpen(false);
      setToastMessage(`Đã khởi tạo hồ sơ thai kỳ thành công cho thai phụ ${selectedPatientForCreate.fullName}!`);
      await loadPatientsData();
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      const msg =
        err.response?.data?.detail?.message ||
        err.response?.data?.message ||
        err.message ||
        'Không thể khởi tạo hồ sơ thai kỳ qua API PreCare';
      setFormErrors([msg]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#275248] text-white px-5 py-3.5 rounded-xl shadow-lg flex items-center gap-3 border border-teal-600/40 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Main Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Card Header & Controls */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left Title and Subtitle */}
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              Cơ sở dữ liệu Bệnh nhân
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-normal">
              {isLoading
                ? 'Đang đồng bộ dữ liệu bệnh nhân từ máy chủ PreCare...'
                : `Tổng số ${patients.length} thai phụ đang quản lý trong hệ thống`}
            </p>
          </div>

          {/* Right Toolbar: Search & Filter */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[280px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên hoặc số điện thoại..."
                className="w-full pl-9 pr-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74] focus:ring-1 focus:ring-[#4D7D74] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFilterDropdown((prev) => !prev)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {statusFilter === 'all'
                    ? 'Lọc trạng thái'
                    : statusFilter === 'active'
                    ? 'Đang mang thai'
                    : 'Chưa có hồ sơ'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showFilterDropdown && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-20 text-xs text-slate-700">
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setShowFilterDropdown(false);
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
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 ${
                      statusFilter === 'active' ? 'font-bold text-[#4D7D74] bg-teal-50/50' : ''
                    }`}
                  >
                    Đang mang thai
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter('none');
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 ${
                      statusFilter === 'none' ? 'font-bold text-[#4D7D74] bg-teal-50/50' : ''
                    }`}
                  >
                    Chưa có hồ sơ hoạt động
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="text-xs text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 bg-white">
                <th className="py-4 px-6 font-semibold w-16">STT</th>
                <th className="py-4 px-6 font-semibold">BỆNH NHÂN</th>
                <th className="py-4 px-6 font-semibold">EMAIL</th>
                <th className="py-4 px-6 font-semibold">TRẠNG THÁI THAI KỲ</th>
                <th className="py-4 px-6 font-semibold text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/90">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                    <div className="flex items-center justify-center gap-2.5">
                      <Loader2 className="w-5 h-5 text-[#4D7D74] animate-spin" />
                      <span>Đang nạp dữ liệu hồ sơ bệnh nhân...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedPatients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                    Không tìm thấy bệnh nhân nào phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedPatients.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    {/* STT */}
                    <td className="py-4 px-6 text-slate-400 text-xs font-medium whitespace-nowrap">
                      {item.stt}
                    </td>

                    {/* Bệnh nhân: Avatar + Name + Phone */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-2xs"
                          style={{
                            backgroundColor: item.avatarBgColor || '#CCFBF1',
                            color: item.avatarTextColor || '#0F766E',
                          }}
                        >
                          {item.avatarInitials}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm">
                            {item.fullName}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 font-normal">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{item.phoneNumber}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-4 px-6 text-slate-600 text-xs whitespace-nowrap">
                      {item.email}
                    </td>

                    {/* Trạng thái thai kỳ Badge */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      {item.pregnancyStatusType === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#047857] border border-emerald-100/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                          <span>{item.pregnancyStatusLabel}</span>
                        </span>
                      ) : item.pregnancyStatusType === 'delivered' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#F8FAFC] text-[#64748B] border border-slate-200/80">
                          <RotateCcw className="w-3 h-3 text-slate-400" />
                          <span>{item.pregnancyStatusLabel}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-medium bg-[#F1F5F9] text-[#64748B]">
                          {item.pregnancyStatusLabel}
                        </span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      {item.pregnancyStatusType === 'active' ? (
                        <button
                          onClick={() => onSelectPatient(item.pregnancyRecordId || item.id)}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200/90 rounded-full hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Xem hồ sơ</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenCreateModal(item)}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#275248] hover:bg-[#1E433B] rounded-full transition-colors shadow-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Tạo hồ sơ</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination */}
        <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            Hiển thị{' '}
            <span className="font-semibold text-slate-700">
              {filteredPatients.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            -{' '}
            <span className="font-semibold text-slate-700">
              {Math.min(currentPage * pageSize, totalItems)}
            </span>{' '}
            trong số{' '}
            <span className="font-semibold text-slate-700">
              {totalItems}
            </span>{' '}
            bệnh nhân
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                onClick={() => setCurrentPage(num)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentPage === num
                    ? 'bg-[#275248] text-white shadow-xs'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {num}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: TẠO HỒ SƠ THAI KỲ CHO BỆNH NHÂN */}
      {isModalOpen && selectedPatientForCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 my-8 animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#4D7D74]/15 flex items-center justify-center text-[#275248]">
                  <Baby className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Khởi tạo Hồ sơ Thai kỳ: {selectedPatientForCreate.fullName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    SĐT: {selectedPatientForCreate.phoneNumber} | Email: {selectedPatientForCreate.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-6">
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

              {/* Thông tin bác sĩ phụ trách */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bác sĩ phụ trách <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74] bg-white cursor-pointer"
                >
                  {doctorsList.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Bác sĩ điều trị và theo dõi lâm sàng trực tiếp cho thai phụ.
                </p>
              </div>

              {/* Căn cứ tính tuổi thai & EDD */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Phương pháp tính Tuổi thai & Ngày dự sinh
                  </h4>
                  <span className="text-[11px] text-teal-700 font-medium bg-teal-50 px-2 py-0.5 rounded-md">
                    ACOG No. 700
                  </span>
                </div>

                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setCalcMode('lmp')}
                    className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                      calcMode === 'lmp'
                        ? 'bg-white text-slate-800 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Ngày kinh cuối (LMP)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcMode('q1')}
                    className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                      calcMode === 'q1'
                        ? 'bg-white text-slate-800 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Siêu âm Quý 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcMode('override')}
                    className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                      calcMode === 'override'
                        ? 'bg-white text-slate-800 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    EDD chỉ định
                  </button>
                </div>

                {calcMode === 'lmp' && (
                  <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ngày đầu kỳ kinh cuối (LMP) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      max={getTodayISO()}
                      value={lmpDate}
                      onChange={(e) => setLmpDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74] bg-white"
                    />
                  </div>
                )}

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
                          onChange={(e) => setQ1Date(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74] bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          LMP (tùy chọn để đối chiếu)
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
                            name="patientQ1InputType"
                            checked={!useCrlInput}
                            onChange={() => setUseCrlInput(false)}
                          />
                          <span>Tuần + Ngày</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="patientQ1InputType"
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
                            Tuần thai lúc siêu âm (6 - 14) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="6"
                            max="14"
                            value={q1Weeks}
                            onChange={(e) => setQ1Weeks(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74] bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Ngày lẻ (0 - 6)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="6"
                            value={q1Days}
                            onChange={(e) => setQ1Days(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74] bg-white"
                          />
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
                          placeholder="Ví dụ: 45.0"
                          value={crlMm}
                          onChange={(e) => setCrlMm(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74] bg-white"
                        />
                      </div>
                    )}
                  </div>
                )}

                {calcMode === 'override' && (
                  <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ngày dự sinh bác sĩ chỉ định trực tiếp (EDD) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={overrideEdd}
                      onChange={(e) => setOverrideEdd(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74] bg-white"
                    />
                  </div>
                )}

                {livePreview.result && (
                  <div className="p-3.5 bg-teal-50/60 border border-teal-200/70 rounded-xl flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <div className="font-bold text-teal-900 flex items-center gap-2">
                        <span>Tuổi thai: {livePreview.result.gestationalAge.display}</span>
                        <span className="text-teal-700 font-semibold px-2 py-0.2 bg-teal-100 rounded-md">
                          {livePreview.result.gestationalAge.trimesterName}
                        </span>
                      </div>
                      <div className="text-slate-700">
                        Ngày dự sinh: <span className="font-bold">{livePreview.result.formattedEdd}</span>
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

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-[#275248] hover:bg-[#1E433B] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu...</span>
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
    </div>
  );
};

export default PatientList;
