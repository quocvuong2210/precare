import React, { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Scan,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { DocumentExtractionData } from './mockOcrData';

interface DocumentViewerProps {
  data?: DocumentExtractionData;
  patientName?: string;
  isModal?: boolean;
  onClose?: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  data,
  patientName = 'Nguyễn Thị Hương',
  isModal = false,
  onClose,
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [highlightField, setHighlightField] = useState<string | null>(null);

  const totalPages = 2;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 20, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 20, 60));
  const handleResetZoom = () => {
    setZoom(100);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  return (
    <div
      className={`flex flex-col h-full bg-slate-100 rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs select-none ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : 'relative'
      }`}
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-white border-b border-slate-200/80 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-teal-50 text-[#275248] flex items-center justify-center shrink-0">
            <Scan className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-800 truncate">
              {data?.fileName || 'Phieu_kham_thai_32W.pdf'}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              Tài liệu gốc lưu trữ MinIO • SHA-256 xác thực
            </div>
          </div>
        </div>

        {/* Viewer Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Page switch */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg text-xs font-medium text-slate-700">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-0.5 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
              title="Trang trước"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-semibold text-slate-600 px-1">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-0.5 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
              title="Trang sau"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          {/* Zoom controls */}
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-bold text-slate-600 w-9 text-center">
            {zoom}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Phóng to"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Đặt lại 100%"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleRotate}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Xoay 90 độ"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Canvas Scroll Area */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-200/70">
        <div
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease-out',
          }}
          className="bg-white shadow-xl rounded-xl border border-slate-300 w-[580px] min-h-[780px] p-8 text-slate-800 text-[11px] leading-relaxed relative flex flex-col justify-between"
        >
          {/* Document Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
            <span className="text-7xl font-black rotate-[-35deg] tracking-widest text-slate-900">
              PRECARE MEDICAL
            </span>
          </div>

          {/* PAGE 1: PHIẾU SIÊU ÂM 4D */}
          {currentPage === 1 && (
            <div className="space-y-4">
              {/* Header Hospital */}
              <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                    BỆNH VIỆN PHỤ SẢN TRUNG ƯƠNG
                  </div>
                  <div className="text-[9px] text-slate-500 font-medium">
                    KHOA CHẨN ĐOÁN HÌNH ẢNH & THĂM DÒ CHỨC NĂNG
                  </div>
                  <div className="text-[8px] text-slate-400">
                    Địa chỉ: 43 Tràng Thi, Hàng Bông, Hoàn Kiếm, Hà Nội
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-mono text-slate-500">
                    Mã BN: <strong className="text-slate-800">BN-90842</strong>
                  </div>
                  <div className="text-[9px] font-mono text-slate-500">
                    Số phiếu: <strong>SA-4D-32W</strong>
                  </div>
                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-emerald-50 text-[8px] font-bold text-emerald-800 border border-emerald-200">
                    ORIGINAL SCANNED
                  </span>
                </div>
              </div>

              {/* Title */}
              <div className="text-center pt-1">
                <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                  PHIẾU KẾT QUẢ SIÊU ÂM THAI 4D ĐỊNH KỲ
                </h3>
                <p className="text-[9px] text-slate-500 italic mt-0.5">
                  (Máy siêu âm Voluson E10 - Đầu dò ma trận RM6C)
                </p>
              </div>

              {/* Patient Info Table */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-[10px]">
                <div>
                  <span className="text-slate-500">Họ và tên:</span>{' '}
                  <strong className="text-slate-900 uppercase">
                    {patientName}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Năm sinh:</span>{' '}
                  <strong>1996</strong> (30 tuổi)
                </div>
                <div>
                  <span className="text-slate-500">Ngày khám:</span>{' '}
                  <strong>{data?.visitDate || '24/11/2026'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Tuổi thai siêu âm:</span>{' '}
                  <strong className="text-teal-800">
                    {data?.gestationalAgeFormatted || '32 tuần 4 ngày'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Huyết áp:</span>{' '}
                  <strong>
                    {data?.vitals.bloodPressureSystolic || 118}/
                    {data?.vitals.bloodPressureDiastolic || 76} mmHg
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Cân nặng:</span>{' '}
                  <strong>{data?.vitals.weightKg || 56.5} kg</strong>
                </div>
              </div>

              {/* Ultrasound Monitor Frames Simulation */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="relative rounded-lg bg-slate-950 p-2 border border-slate-800 aspect-4/3 flex flex-col justify-between overflow-hidden shadow-inner">
                  <div className="flex justify-between items-start text-[7px] font-mono text-emerald-400">
                    <div>
                      VOLUSON E10<br />
                      F: 5.0 MHz<br />
                      GA: 32w 4d
                    </div>
                    <div className="text-right">
                      TIS: 0.8<br />
                      FR: 28Hz<br />
                      BPD: 58.0mm
                    </div>
                  </div>
                  {/* Faux Ultrasound Fetus Shape */}
                  <div className="my-auto mx-auto w-24 h-16 rounded-full bg-slate-900 border border-slate-700/60 flex items-center justify-center relative">
                    <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-600/50 absolute -top-1 left-2" />
                    <div className="w-14 h-8 rounded-full bg-slate-800/80 border border-slate-600/50 absolute bottom-1 right-2" />
                    <span className="text-[7px] text-slate-500 font-mono z-10">4D CRANIAL AXIS</span>
                  </div>
                  <div className="text-[7px] font-mono text-emerald-500 text-center">
                    [+] CALIPER BPD = 58.0 mm (P52)
                  </div>
                </div>

                <div className="relative rounded-lg bg-slate-950 p-2 border border-slate-800 aspect-4/3 flex flex-col justify-between overflow-hidden shadow-inner">
                  <div className="flex justify-between items-start text-[7px] font-mono text-amber-400">
                    <div>
                      COLOR DOPPLER<br />
                      PRF: 2.2 kHz<br />
                      FHR: 148 bpm
                    </div>
                    <div className="text-right">
                      AC: 196mm<br />
                      FL: 43mm<br />
                      EFW: 1950g
                    </div>
                  </div>
                  <div className="my-auto mx-auto w-24 h-16 rounded-full bg-slate-900 border border-slate-700/60 flex items-center justify-center relative">
                    <div className="w-16 h-10 rounded-full bg-slate-800/80 border border-dashed border-teal-500/60" />
                    <span className="text-[7px] text-teal-400 font-mono z-10">ABDOMINAL PLANE</span>
                  </div>
                  <div className="text-[7px] font-mono text-teal-400 text-center">
                    [+] CALIPER AC = 196.0 mm (P50)
                  </div>
                </div>
              </div>

              {/* Biometrics Table */}
              <div className="pt-2">
                <div className="text-[10px] font-bold text-slate-900 mb-1.5 flex items-center gap-1">
                  <span>I. CHỈ SỐ SINH TRẮC HỌC THAI NHI (BIOMETRICS)</span>
                </div>
                <table className="w-full text-left border-collapse text-[9.5px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 border-y border-slate-200">
                      <th className="py-1 px-2 font-bold">Chỉ số sinh trắc</th>
                      <th className="py-1 px-2 font-bold text-center">Giá trị đo</th>
                      <th className="py-1 px-2 font-bold text-center">Khoảng chuẩn</th>
                      <th className="py-1 px-2 font-bold text-center">Bách phân vị</th>
                      <th className="py-1 px-2 font-bold text-right">Đánh giá</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.biometrics.map((m) => (
                      <tr
                        key={m.code}
                        className="hover:bg-teal-50/40 transition-colors"
                      >
                        <td className="py-1 px-2 font-semibold text-slate-800">
                          {m.label}
                        </td>
                        <td className="py-1 px-2 text-center font-bold text-slate-900">
                          {m.value.toLocaleString()} {m.unit}
                        </td>
                        <td className="py-1 px-2 text-center text-slate-500">
                          {m.standardRange}
                        </td>
                        <td className="py-1 px-2 text-center text-slate-700 font-medium">
                          {m.percentile}
                        </td>
                        <td className="py-1 px-2 text-right text-emerald-700 font-semibold">
                          {m.assessment}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Doctor Signatures */}
              <div className="pt-4 border-t border-slate-200 flex justify-between items-end text-[9px]">
                <div>
                  <div className="text-slate-400">Khoa Chẩn đoán hình ảnh</div>
                  <div className="text-slate-600 font-medium">
                    Phòng siêu âm 4D - Tầng 2 nhà B
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-slate-500">
                    Hà Nội, ngày 24 tháng 11 năm 2026
                  </div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    BÁC SĨ SIÊU ÂM
                  </div>
                  <div className="h-10 flex items-center justify-center my-0.5 text-teal-800 font-serif italic text-xs">
                    Trần Ngọc Thảo Vy
                  </div>
                  <div className="font-semibold text-slate-900">
                    BS. CKI. Trần Ngọc Thảo Vy
                  </div>
                  <div className="text-[8px] text-emerald-700 font-medium flex items-center justify-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> Đã ký số bảo mật PKI
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PAGE 2: PHIẾU XÉT NGHIỆM HUYẾT HỌC & NƯỚC TIỂU */}
          {currentPage === 2 && (
            <div className="space-y-4">
              <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                    BỆNH VIỆN PHỤ SẢN TRUNG ƯƠNG
                  </div>
                  <div className="text-[9px] text-slate-500 font-medium">
                    KHOA HUYẾT HỌC & HÓA SINH LÂM SÀNG
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-mono text-slate-500">
                    Mã BN: <strong className="text-slate-800">BN-90842</strong>
                  </div>
                  <div className="text-[9px] font-mono text-slate-500">
                    Số xét nghiệm: <strong>XN-HH-9921</strong>
                  </div>
                </div>
              </div>

              <div className="text-center pt-1">
                <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                  PHIẾU KẾT QUẢ XÉT NGHIỆM HUYẾT HỌC & NƯỚC TIỂU
                </h3>
              </div>

              {/* Lab Table */}
              <div className="pt-2">
                <table className="w-full text-left border-collapse text-[9.5px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 border-y border-slate-200">
                      <th className="py-1.5 px-2 font-bold">Tên xét nghiệm</th>
                      <th className="py-1.5 px-2 font-bold text-center">Kết quả</th>
                      <th className="py-1.5 px-2 font-bold text-center">Chỉ số bình thường</th>
                      <th className="py-1.5 px-2 font-bold text-right">Đánh giá</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.labs.map((lab) => (
                      <tr
                        key={lab.code}
                        className={
                          lab.isAbnormal
                            ? 'bg-amber-50/70 text-amber-950 font-semibold'
                            : ''
                        }
                      >
                        <td className="py-1.5 px-2">
                          <div>{lab.label}</div>
                          {lab.sublabel && (
                            <div className="text-[8px] text-slate-400">
                              {lab.sublabel}
                            </div>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-center font-bold">
                          {lab.value} {lab.unit}
                        </td>
                        <td className="py-1.5 px-2 text-center text-slate-500">
                          {lab.normalRange}
                        </td>
                        <td
                          className={`py-1.5 px-2 text-right font-semibold ${
                            lab.isAbnormal
                              ? 'text-amber-800'
                              : 'text-emerald-700'
                          }`}
                        >
                          {lab.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Conclusion Section */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[10px] space-y-1.5">
                <div className="font-bold text-slate-900">
                  KẾT LUẬN CỦA BÁC SĨ ĐIỀU TRỊ:
                </div>
                <p className="text-slate-700">
                  {data?.conclusions.fetalCondition}
                </p>
                <p className="text-slate-700">
                  {data?.conclusions.maternalNotes}
                </p>
                <p className="text-slate-700">
                  <strong>Hẹn tái khám:</strong> {data?.conclusions.followUpAdvice}
                </p>
              </div>

              {/* Doctor Signatures */}
              <div className="pt-4 border-t border-slate-200 flex justify-between items-end text-[9px]">
                <div>
                  <div className="text-slate-400">Người thực hiện xét nghiệm</div>
                  <div className="font-medium text-slate-700">
                    KTV. Nguyễn Văn Dũng
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-slate-500">Hà Nội, 24/11/2026</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    TRƯỞNG KHOA XÉT NGHIỆM
                  </div>
                  <div className="h-10 flex items-center justify-center my-0.5 text-teal-800 font-serif italic text-xs">
                    Lê Minh
                  </div>
                  <div className="font-semibold text-slate-900">
                    TS. BS. Lê Minh
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Page Number */}
          <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-[8px] text-slate-400">
            <span>PreCare Digital Health Platform • Version 2.0</span>
            <span>
              Trang {currentPage} / {totalPages}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
