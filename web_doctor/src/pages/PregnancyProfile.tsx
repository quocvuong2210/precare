import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  Stethoscope,
  ChevronDown,
  Sparkles,
  Info,
  Clock,
  Heart,
  Baby,
} from 'lucide-react';
import {
  PregnancyRecordItem,
  PregnancyStatus,
  getStoredPregnancyRecords,
  createNewPregnancyRecord,
  recalculateRecordAtToday,
} from '../services/pregnancyProfile.service';
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

export const PregnancyProfile: React.FC<PregnancyProfileProps> = ({ onSelectPatient }) => {
  const [records, setRecords] = useState<PregnancyRecordItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form Fields State
  const [patientName, setPatientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [doctorName, setDoctorName] = useState('BS. Lê Minh');

  // Clinical calculation mode
  const [calcMode, setCalcMode] = useState<CalculationMode>('lmp');
  const [lmpDate, setLmpDate] = useState('');
  const [q1Date, setQ1Date] = useState('');
  const [q1Weeks, setQ1Weeks] = useState<string>('8');
  const [q1Days, setQ1Days] = useState<string>('0');
  const [crlMm, setCrlMm] = useState<string>('');
  const [useCrlInput, setUseCrlInput] = useState(false);
  const [overrideEdd, setOverrideEdd] = useState('');

  // Medical History State
  const [bloodType, setBloodType] = useState('O+');
  const [allergies, setAllergies] = useState('');
  const [underlyingConditions, setUnderlyingConditions] = useState('');
  const [obstetricHistory, setObstetricHistory] = useState('Con so (Para 0000)');

  // Form error state
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Load records on mount
  useEffect(() => {
    const rawList = getStoredPregnancyRecords();
    const updated = rawList.map(recalculateRecordAtToday);
    setRecords(updated);
  }, []);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Search by name or phone
      const matchesSearch =
        r.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.phoneNumber.replace(/\s+/g, '').includes(searchQuery.replace(/\s+/g, ''));

      // Filter by status
      const matchesStatus =
        statusFilter === 'all' ? true : r.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [records, searchQuery, statusFilter]);

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
        if (lmpDate) {
          params.lmp = lmpDate;
        }
      } else if (calcMode === 'override') {
        if (!overrideEdd) return {};
        params.overrideEdd = overrideEdd;
      }

      // Check validations
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

  // Open Modal
  const handleOpenModal = () => {
    setPatientName('');
    setPhoneNumber('');
    setEmail('');
    setBirthDate('');
    setDoctorName('BS. Lê Minh');
    setCalcMode('lmp');
    setLmpDate('');
    setQ1Date('');
    setQ1Weeks('8');
    setQ1Days('0');
    setCrlMm('');
    setUseCrlInput(false);
    setOverrideEdd('');
    setBloodType('O+');
    setAllergies('');
    setUnderlyingConditions('');
    setObstetricHistory('Con so (Para 0000)');
    setFormErrors([]);
    setIsModalOpen(true);
  };

  // Close Modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Submit Modal
  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];

    if (!patientName.trim()) {
      errors.push('Vui lòng nhập họ và tên thai phụ.');
    }
    if (!phoneNumber.trim()) {
      errors.push('Vui lòng nhập số điện thoại thai phụ.');
    }

    const params: PregnancyCalculationParams = {};
    if (calcMode === 'lmp') {
      if (!lmpDate) {
        errors.push('Vui lòng chọn Ngày kinh cuối (LMP).');
      } else {
        params.lmp = lmpDate;
      }
    } else if (calcMode === 'q1') {
      if (!q1Date) {
        errors.push('Vui lòng chọn Ngày siêu âm Quý 1.');
      } else {
        params.q1UltrasoundDate = q1Date;
        if (useCrlInput) {
          if (!crlMm || parseFloat(crlMm) <= 0) {
            errors.push('Vui lòng nhập chỉ số chiều dài đầu mông CRL (mm).');
          } else {
            params.crlMm = parseFloat(crlMm);
          }
        } else {
          params.q1GestationalWeeks = parseInt(q1Weeks || '0', 10);
          params.q1GestationalDays = parseInt(q1Days || '0', 10);
        }
        if (lmpDate) params.lmp = lmpDate;
      }
    } else if (calcMode === 'override') {
      if (!overrideEdd) {
        errors.push('Vui lòng chỉ định Ngày dự sinh (EDD).');
      } else {
        params.overrideEdd = overrideEdd;
      }
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    // Validate clinical parameters
    const valErrors = validateClinicalInputs(params);
    if (valErrors.length > 0) {
      setFormErrors(valErrors.map((v) => v.message));
      return;
    }

    // Create record
    const created = createNewPregnancyRecord({
      patientName,
      phoneNumber,
      email: email || undefined,
      birthDate: birthDate || undefined,
      doctorName,
      lmp: params.lmp,
      q1UltrasoundDate: params.q1UltrasoundDate,
      q1GestationalWeeks: params.q1GestationalWeeks,
      q1GestationalDays: params.q1GestationalDays,
      crlMm: params.crlMm,
      overrideEdd: params.overrideEdd,
      history: {
        bloodType,
        allergies: allergies || 'Không có',
        underlyingConditions: underlyingConditions || 'Không có',
        obstetricHistory: obstetricHistory || 'Con so',
      },
      status: 'active',
    });

    setRecords((prev) => [created, ...prev]);
    setIsModalOpen(false);

    // Show toast
    setToastMessage(`Đã khởi tạo hồ sơ thai kỳ thành công cho thai phụ ${created.patientName}!`);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
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

      {/* Main Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Card Header & Controls */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left Title and Subtitle */}
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              Danh sách Hồ sơ Thai kỳ
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-normal">
              Tổng số {records.length} thai phụ đang theo dõi • 18 lượt khám hôm nay
            </p>
          </div>

          {/* Right Toolbar: Search, Filter, Add Button */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên hoặc số điện thoại..."
                className="w-full pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74] focus:ring-1 focus:ring-[#4D7D74] transition-all"
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
                onClick={() => setShowStatusDropdown((prev) => !prev)}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
              >
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {statusFilter === 'all'
                    ? 'Lọc trạng thái'
                    : statusFilter === 'active'
                    ? 'Đang hoạt động'
                    : 'Hoàn thành'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showStatusDropdown && (
                <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-20 text-xs text-slate-700">
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
                </div>
              )}
            </div>

            {/* Primary Action Button "+ Tạo hồ sơ mới" */}
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#275248] hover:bg-[#1f423a] text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Tạo hồ sơ mới</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="text-xs text-slate-500 font-semibold border-b border-slate-100 bg-slate-50/40">
                <th className="py-3.5 px-6 font-medium w-16">STT</th>
                <th className="py-3.5 px-6 font-medium">Thai phụ</th>
                <th className="py-3.5 px-6 font-medium">Bác sĩ phụ trách</th>
                <th className="py-3.5 px-6 font-medium">Tuổi thai hiện tại</th>
                <th className="py-3.5 px-6 font-medium">Ngày dự sinh</th>
                <th className="py-3.5 px-6 font-medium">Trạng thái</th>
                <th className="py-3.5 px-6 font-medium text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                    Không tìm thấy hồ sơ thai kỳ nào phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* STT */}
                    <td className="py-4 px-6 text-slate-500 text-xs font-medium whitespace-nowrap">
                      {item.stt}
                    </td>

                    {/* Thai phụ: Tên đậm + SĐT */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="font-bold text-slate-800 text-sm">
                        {item.patientName}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {item.phoneNumber}
                      </div>
                    </td>

                    {/* Bác sĩ phụ trách */}
                    <td className="py-4 px-6 text-slate-700 text-xs font-medium whitespace-nowrap">
                      {item.doctorName}
                    </td>

                    {/* Tuổi thai hiện tại: Tuần ngày + Quý */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="font-medium text-slate-800 text-xs">
                        {item.gestationalAgeDisplay}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {item.trimesterDisplay}
                      </div>
                    </td>

                    {/* Ngày dự sinh */}
                    <td className="py-4 px-6 text-slate-700 text-xs font-medium whitespace-nowrap">
                      {item.displayEdd}
                    </td>

                    {/* Trạng thái Badge */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      {item.status === 'completed' ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-[#E0F2FE] text-[#0284C7]">
                          {item.statusLabel}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-[#ECFDF5] text-[#047857]">
                          {item.statusLabel}
                        </span>
                      )}
                    </td>

                    {/* Thao tác: Xem chi tiết */}
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <button
                        onClick={() => onSelectPatient(item.id)}
                        className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200/90 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs cursor-pointer"
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: KHỞI TẠO HỒ SƠ THAI KỲ MỚI */}
      {isModalOpen && (
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
                    Nhập thông tin ban đầu và kiểm tra tự động tuổi thai y khoa
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleCreateRecord} className="p-6 space-y-6">
              {/* Error messages banner */}
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

              {/* Phần 1: Thông tin thai phụ */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#4D7D74]"></span>
                  1. Thông tin Thai phụ
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Họ và tên <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Ví dụ: Lê Hoàng Hải Yến"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74] focus:ring-1 focus:ring-[#4D7D74]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Số điện thoại <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Ví dụ: 0912 345 678"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74] focus:ring-1 focus:ring-[#4D7D74]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email liên hệ
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74] focus:ring-1 focus:ring-[#4D7D74]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bác sĩ phụ trách
                    </label>
                    <input
                      type="text"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      placeholder="BS. Lê Minh"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74] focus:ring-1 focus:ring-[#4D7D74]"
                    />
                  </div>
                </div>
              </div>

              {/* Phần 2: Phương pháp xác định tuổi thai & EDD */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#4D7D74]"></span>
                    2. Căn cứ tính Tuổi thai & Ngày dự sinh (ACOG 700)
                  </h4>
                  <span className="text-[11px] text-teal-700 font-medium bg-teal-50 px-2 py-0.5 rounded-md">
                    Chuẩn lâm sàng
                  </span>
                </div>

                {/* Tabs chọn phương pháp */}
                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setCalcMode('lmp')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
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
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
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
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      calcMode === 'override'
                        ? 'bg-white text-slate-800 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    EDD trực tiếp
                  </button>
                </div>

                {/* Cụm input tương ứng với tab */}
                {calcMode === 'lmp' && (
                  <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-3">
                    <div>
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
                      <p className="text-[11px] text-slate-500 mt-1">
                        Quy tắc Naegele: EDD = LMP + 280 ngày. Không chọn ngày ở tương lai.
                      </p>
                    </div>
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
                          LMP bổ sung (tùy chọn để đối chiếu)
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
                            Tuần thai lúc siêu âm (6 - 14 tuần)
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
                            Ngày lẻ (0 - 6 ngày)
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
                          Chiều dài đầu mông CRL (10 - 84 mm)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="10"
                          max="84"
                          placeholder="Ví dụ: 47.5"
                          value={crlMm}
                          onChange={(e) => setCrlMm(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74] bg-white"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                          Ước lượng theo công thức Hadlock/Robinson: GA = 8.052 × √CRL + 23.73
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {calcMode === 'override' && (
                  <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ngày dự sinh bác sĩ chỉ định trực tiếp (Override EDD) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={overrideEdd}
                      onChange={(e) => setOverrideEdd(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74] bg-white"
                    />
                    <p className="text-[11px] text-slate-500">
                      Sử dụng khi có hội chẩn lâm sàng đặc biệt hoặc can thiệp IVF ngày chuyển phôi.
                    </p>
                  </div>
                )}

                {/* Live Preview Card */}
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

              {/* Phần 3: Tiền sử cơ bản */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#4D7D74]"></span>
                  3. Tiền sử y tế & Sản khoa cơ bản
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nhóm máu
                    </label>
                    <select
                      value={bloodType}
                      onChange={(e) => setBloodType(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74] bg-white"
                    >
                      <option value="O+">O Rh+</option>
                      <option value="A+">A Rh+</option>
                      <option value="B+">B Rh+</option>
                      <option value="AB+">AB Rh+</option>
                      <option value="O-">O Rh-</option>
                      <option value="A-">A Rh-</option>
                      <option value="B-">B Rh-</option>
                      <option value="AB-">AB Rh-</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tiền sử sản khoa (Para)
                    </label>
                    <input
                      type="text"
                      value={obstetricHistory}
                      onChange={(e) => setObstetricHistory(e.target.value)}
                      placeholder="Con so (Para 0000)"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Dị ứng đã biết
                    </label>
                    <input
                      type="text"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      placeholder="Kháng sinh, thức ăn, phấn hoa..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bệnh nền mạn tính
                    </label>
                    <input
                      type="text"
                      value={underlyingConditions}
                      onChange={(e) => setUnderlyingConditions(e.target.value)}
                      placeholder="Tăng huyết áp, tiểu đường, tuyến giáp..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#4D7D74]"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#275248] hover:bg-[#1f423a] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Lưu hồ sơ thai kỳ
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
