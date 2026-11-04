import React, { useState, useEffect } from 'react';
import { TrajectoryChart } from '../components/TrajectoryChart';
import {
  ArrowLeft,
  Download,
  ShieldCheck,
  BookOpen,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  Save,
  Activity,
} from 'lucide-react';
import { apiClient } from '../services/auth.service';

interface PatientDetailProps {
  patientId: string;
  onBack: () => void;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ patientId, onBack }) => {
  const [selectedBiometric, setSelectedBiometric] = useState<'EFW' | 'AC' | 'BPD' | 'FL' | 'HC'>('EFW');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patientData, setPatientData] = useState<any>(null);
  const [measurements, setMeasurements] = useState<Array<{ ga_weeks: number; val: number; date: string }>>([]);

  // Chế độ nhập tay dự phòng khi chưa có API máy chủ
  const [isManualInputOpen, setIsManualInputOpen] = useState(false);
  const [manualWeeks, setManualWeeks] = useState('');
  const [manualValue, setManualValue] = useState('');
  const [manualNotice, setManualNotice] = useState<string | null>(null);

  const fetchPatientDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/pregnancy-profiles/${patientId}`, { timeout: 5000 });
      const data = res.data?.data || res.data;
      setPatientData(data);
      if (Array.isArray(data?.measurements)) {
        setMeasurements(data.measurements);
      }
    } catch (err: any) {
      const status = err.response?.status;
      setError(
        status === 404
          ? 'Không thể tải dữ liệu chi tiết từ máy chủ (Endpoint /api/v1/pregnancy-profiles/' +
              patientId +
              ' chưa sẵn sàng).'
          : 'Không thể kết nối đến máy chủ API Gateway để lấy thông tin chi tiết hồ sơ.'
      );
      setPatientData(null);
      setMeasurements([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientDetail();
  }, [patientId]);

  const handleAddManualMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(manualWeeks);
    const v = parseFloat(manualValue);
    if (isNaN(w) || isNaN(v) || w <= 0 || v <= 0) {
      setManualNotice('Vui lòng nhập tuần thai và giá trị hợp lệ (> 0).');
      return;
    }

    const newEntry = {
      ga_weeks: w,
      val: v,
      date: new Date().toISOString().split('T')[0],
    };

    setMeasurements((prev) => [...prev, newEntry].sort((a, b) => a.ga_weeks - b.ga_weeks));
    setManualWeeks('');
    setManualValue('');
    setManualNotice('Đã thêm điểm đo lâm sàng vào biểu đồ thành công!');
    setTimeout(() => setManualNotice(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top action & Patient header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại Tổng quan
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {patientData?.patient_name ? `Hồ Sơ Thai Kỳ: ${patientData.patient_name}` : `Hồ Sơ Thai Kỳ: Mã ${patientId}`}
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Mã Hồ Sơ: {patientId} {patientData?.edd ? `| EDD: ${patientData.edd}` : ''}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsManualInputOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#0D8A7C] bg-teal-50 border border-teal-200 hover:bg-teal-100 transition-colors cursor-pointer self-start sm:self-center"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{isManualInputOpen ? 'Đóng nhập tay' : 'Nhập tay số đo dự phòng'}</span>
        </button>
      </div>

      {/* Thông báo lỗi khi Backend chưa có endpoint */}
      {error && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-5 text-amber-900 shadow-2xs space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100/80 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900">Không thể tải dữ liệu chi tiết từ máy chủ</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{error}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Theo tài liệu Đồ án PreCare, Bác sĩ có thể sử dụng biểu đồ bên dưới để nhập tay số đo siêu âm hoặc đánh giá tuổi thai theo bộ luật lâm sàng Hadlock (ACOG).
              </p>
            </div>
            <button
              onClick={fetchPatientDetail}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 font-semibold text-xs shadow-2xs hover:bg-amber-100/50 transition-colors shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>
          </div>
        </div>
      )}

      {/* Form nhập tay số đo dự phòng */}
      {isManualInputOpen && (
        <div className="bg-white rounded-2xl p-5 border border-teal-200/80 shadow-2xs space-y-3 animate-in fade-in-50 duration-150">
          <div className="flex items-center gap-2 text-teal-800 font-bold text-xs uppercase tracking-wider">
            <Activity className="w-4 h-4" />
            <span>Nhập thông số đo lâm sàng ({selectedBiometric})</span>
          </div>

          <form onSubmit={handleAddManualMeasurement} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tuổi thai (Tuần)</label>
              <input
                type="number"
                step="0.1"
                placeholder="VD: 30"
                value={manualWeeks}
                onChange={(e) => setManualWeeks(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Số đo {selectedBiometric} ({selectedBiometric === 'EFW' ? 'gam' : 'mm'})
              </label>
              <input
                type="number"
                step="0.1"
                placeholder={selectedBiometric === 'EFW' ? 'VD: 1450' : 'VD: 78.5'}
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-600"
                required
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#0D8A7C] hover:bg-[#0A7367] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Cập nhật vào biểu đồ</span>
              </button>
            </div>
          </form>

          {manualNotice && (
            <p className="text-xs font-medium text-teal-700 animate-in fade-in duration-150">
              {manualNotice}
            </p>
          )}
        </div>
      )}

      {/* Clinical Analysis Summary Panel - Chỉ tập trung Luật Lâm Sàng Hadlock (ẩn RACA-Net) */}
      <div className="bg-white rounded-2xl p-6 border-l-4 border-l-teal-600 border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-800">
            <ShieldCheck className="w-5 h-5 text-teal-700" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Tiêu Chuẩn Đánh Giá Lâm Sàng (Hadlock / ACOG)
            </h3>
          </div>
          <button
            onClick={() => alert('Xuất báo cáo PDF lâm sàng theo chuẩn Hadlock.')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#0D8A7C] hover:bg-[#0A7367] transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Xuất báo cáo lâm sàng (PDF)
          </button>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 p-4 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-teal-800 font-semibold text-xs">
            <BookOpen className="w-4 h-4" /> Bộ luật lâm sàng Cờ đỏ FGR (ACOG / Hadlock)
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            Hệ thống áp dụng công thức Hadlock 4 thông số (BPD, HC, AC, FL) để đối chiếu bách phân vị tăng trưởng thai nhi. Khi chu vi bụng (AC) hoặc cân nặng ước tính (EFW) dưới bách phân vị thứ 10 (&lt; 10th percentile), hệ thống kích hoạt cảnh báo nguy cơ thai chậm phát triển trong tử cung (FGR).
          </p>
          <div className="text-[11px] text-slate-500 font-medium">
            Phiên bản quy chuẩn: Hadlock-ACOG-v1.0 (Quy định Y tế PreCare)
          </div>
        </div>
      </div>

      {/* Growth Curves Biometric Selection */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(['EFW', 'AC', 'BPD', 'FL', 'HC'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedBiometric(type)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedBiometric === type
                  ? 'bg-[#0D8A7C] text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Biểu đồ {type} (Đường bách phân vị)
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
          <TrajectoryChart biometricType={selectedBiometric} patientData={measurements} />
        </div>
      </div>
    </div>
  );
};

export default PatientDetail;
