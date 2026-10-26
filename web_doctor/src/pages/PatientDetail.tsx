import React, { useState } from 'react';
import { TrajectoryChart } from '../components/TrajectoryChart';
import { ArrowLeft, Download, ShieldCheck, Cpu, BookOpen, AlertCircle } from 'lucide-react';

interface PatientDetailProps {
  patientId: string;
  onBack: () => void;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ patientId, onBack }) => {
  const [selectedBiometric, setSelectedBiometric] = useState<'EFW' | 'AC' | 'BPD' | 'FL' | 'HC'>('EFW');

  // Mock timeline of biometric measurements
  const patientDataEFW = [
    { ga_weeks: 18, val: 240, date: '2026-05-20' },
    { ga_weeks: 24, val: 620, date: '2026-06-30' },
    { ga_weeks: 30, val: 1400, date: '2026-08-20' },
  ];

  return (
    <div className="space-y-6">
      {/* Top action & Patient name */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại Tổng quan
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Hồ Sơ Thai Kỳ: Nguyễn Thảo Chi</h2>
          <p className="text-xs text-slate-500">Mã Hồ Sơ: {patientId} | Bác Sĩ Phụ Trách: BS. Lê Minh</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Tuổi Thai Hiện Tại</div>
          <div className="text-2xl font-bold text-teal-700 mt-1">32 tuần 0 ngày</div>
          <div className="text-xs text-slate-400 mt-1">Ưu tiên Siêu Âm Quý 1</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Ngày Dự Sinh (EDD)</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">30/10/2026</div>
          <div className="text-xs text-slate-400 mt-1">Tính từ Siêu âm Q1</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Mức Cảnh Báo An Toàn</div>
          <div className="mt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              ● VÀNG - CẢNH BÁO THAI NHỎ (SGA)
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Quy tắc: max(Luật lâm sàng, AI RACA-Net)</div>
        </div>
      </div>

      {/* Clinical Analysis Summary Panel */}
      <div className="bg-white rounded-2xl p-6 border-l-4 border-l-amber-500 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-800">
            <ShieldCheck className="w-6 h-6 text-amber-500" />
            <h3 className="text-base font-bold">Kết Quả Phân Tích & Tổng Hợp Cảnh Báo An Toàn</h3>
          </div>
          <button
            onClick={() => alert('Đã xuất báo cáo PDF chuyên môn dành cho bác sĩ!')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-white bg-[#345C59] hover:bg-[#2A4B48] transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> Xuất báo cáo PDF (Bác sĩ)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50/80 border border-slate-200/70 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-teal-800 font-semibold text-xs">
              <BookOpen className="w-4 h-4" /> Luật Lâm Sàng Cờ Đỏ (Hadlock / Intergrowth-21st)
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              CẢNH BÁO LÂM SÀNG: EFW ở bách phân vị 7.6% (&lt; 10th percentile) -&gt; Thai nhỏ hơn so với tuổi thai (SGA). Khuyến cáo theo dõi dòng chảy động mạch rốn.
            </p>
            <div className="text-[11px] text-slate-500 font-medium">
              Phiên bản luật: 1.0.0-hadlock-intergrowth
            </div>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/70 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-indigo-700 font-semibold text-xs">
              <Cpu className="w-4 h-4" /> Mô hình AI RACA-Net (Inference)
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Xác suất bất thường: <b className="text-emerald-600">2.5%</b> (XANH). Mô hình AI gợi ý bình thường nhưng bị <b className="text-amber-700">GHI ĐÈ AN TOÀN</b> bởi Luật lâm sàng SGA (VÀNG).
            </p>
            <div className="text-[11px] text-slate-500 font-medium">
              Mô hình: 1.0.0-racanet-v1 | Cảnh báo tổng hợp: max(VÀNG, XANH) = VÀNG
            </div>
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
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedBiometric === type
                  ? 'bg-[#345C59] text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Biểu đồ {type} (Đường bách phân vị)
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <TrajectoryChart biometricType={selectedBiometric} patientData={patientDataEFW} />
        </div>
      </div>
    </div>
  );
};
