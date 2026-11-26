import React, { useRef, useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Trash2,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ChevronLeft,
  Loader2,
  FileUp,
  UserCheck,
} from 'lucide-react';
import { UploadFileItem, formatFileSize } from './mockOcrData';
import { fetchPregnancyProfilesApi } from '../../services/pregnancyProfile.service';
import { isValidUuid } from '../../services/ingest.service';

const PATIENT_OPTIONS = [
  { id: 'prof-001', name: 'Nguyễn Thảo Chi', gestationalAge: '32 tuần 4 ngày' },
  { id: 'prof-002', name: 'Phạm Minh Thư', gestationalAge: '18 tuần 2 ngày' },
  { id: 'prof-003', name: 'Trần Hồng Nhung', gestationalAge: '36 tuần 1 ngày' },
  { id: 'prof-004', name: 'Nguyễn Thị Hương', gestationalAge: '32 tuần 4 ngày' },
];

interface Step1UploadProps {
  files: UploadFileItem[];
  onFilesChange: (files: UploadFileItem[]) => void;
  onStartOcr: () => void;
  onBackToResults: () => void;
  patientName?: string;
  selectedPatientId?: string;
  onSelectPatient?: (patientId: string, patientName: string) => void;
}

export const Step1Upload: React.FC<Step1UploadProps> = ({
  files,
  onFilesChange,
  onStartOcr,
  onBackToResults,
  patientName,
  selectedPatientId,
  onSelectPatient,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [patientOptions, setPatientOptions] = useState(PATIENT_OPTIONS);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Nạp danh sách hồ sơ thai kỳ thật từ API để có UUID thật khi gọi Fast Path
  useEffect(() => {
    let isMounted = true;
    fetchPregnancyProfilesApi({ page: 1, page_size: 50, status: 'active' })
      .then((res) => {
        if (!isMounted || !res?.items?.length) return;
        const apiOptions = res.items.map((item) => ({
          id: item.id,
          name: item.patientName,
          gestationalAge: item.gestationalAgeDisplay || 'Đang theo dõi',
        }));
        setPatientOptions(apiOptions);
        if (onSelectPatient && !isValidUuid(selectedPatientId)) {
          onSelectPatient(apiOptions[0].id, apiOptions[0].name);
        }
      })
      .catch(() => {
        // Fallback giữ nguyên PATIENT_OPTIONS khi chưa bật backend
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Validate and add files with simulated realistic progress
  const processAddedFiles = (incomingFiles: FileList | File[]) => {
    setUploadError(null);
    const newItems: UploadFileItem[] = [];
    const maxFiles = 10;
    const maxSizeBytes = 20 * 1024 * 1024; // 20MB

    if (files.length + incomingFiles.length > maxFiles) {
      setUploadError(`Bạn chỉ có thể tải lên tối đa ${maxFiles} tệp trong một lần.`);
      return;
    }

    for (let i = 0; i < incomingFiles.length; i++) {
      const file = incomingFiles[i];
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      const fileExt = file.name.split('.').pop()?.toLowerCase();

      if (!validTypes.includes(file.type) && !['pdf', 'jpg', 'jpeg', 'png'].includes(fileExt || '')) {
        setUploadError(`Tệp "${file.name}" không hợp lệ. Chỉ chấp nhận định dạng PDF, JPG, PNG.`);
        continue;
      }

      if (file.size > maxSizeBytes) {
        setUploadError(`Tệp "${file.name}" vượt quá dung lượng tối đa cho phép (20 MB).`);
        continue;
      }

      const id = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      newItems.push({
        id,
        file,
        name: file.name,
        size: file.size,
        sizeFormatted: formatFileSize(file.size),
        type: file.type || (fileExt === 'pdf' ? 'application/pdf' : 'image/jpeg'),
        progress: 10,
        status: 'uploading',
      });
    }

    if (newItems.length > 0) {
      const updatedList = [...files, ...newItems];
      onFilesChange(updatedList);

      // Simulate realistic upload progress progression
      newItems.forEach((item) => {
        let currentProgress = 10;
        const interval = setInterval(() => {
          currentProgress += Math.floor(Math.random() * 25) + 15;
          if (currentProgress >= 100) {
            currentProgress = 100;
            clearInterval(interval);
            onFilesChange(
              updatedList.map((f) =>
                f.id === item.id
                  ? { ...f, progress: 100, status: 'completed' }
                  : f
              )
            );
          } else {
            onFilesChange(
              updatedList.map((f) =>
                f.id === item.id ? { ...f, progress: currentProgress } : f
              )
            );
          }
        }, 150);
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processAddedFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processAddedFiles(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  const allCompleted =
    files.length > 0 && files.every((f) => f.status === 'completed');
  const isUploadingAny = files.some((f) => f.status === 'uploading');

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Breadcrumb Back Button */}
      <div>
        <button
          type="button"
          onClick={onBackToResults}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200/80 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 text-slate-500" />
          <span>Quay lại hàng đợi tiếp nhận &amp; đối chiếu</span>
        </button>
      </div>

      {/* Main Page Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Tải phiếu khám
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Tải lên tài liệu để tự động trích xuất thông tin vào hồ sơ thai kỳ{' '}
          {patientName && (
            <span>
              của thai phụ <strong className="text-slate-700">{patientName}</strong>
            </span>
          )}.
        </p>
      </div>

      {/* 3-Step Stepper Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Step 1: Active */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border-2 border-[#275248] shadow-xs">
          <div className="w-7 h-7 rounded-full bg-[#275248] text-white flex items-center justify-center text-xs font-bold shrink-0">
            1
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#275248]">Chọn &amp; tải tệp</div>
            <div className="text-[10px] text-slate-500 truncate">Tiếp nhận tài liệu cận lâm sàng</div>
          </div>
        </div>

        {/* Step 2: Inactive */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-200/80 opacity-70">
          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold shrink-0">
            2
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-700">Xử lý &amp; đối chiếu tài liệu</div>
            <div className="text-[10px] text-slate-400 truncate">Đối chiếu OCR &amp; RACA-Net</div>
          </div>
        </div>

        {/* Step 3: Inactive */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-200/80 opacity-70">
          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold shrink-0">
            3
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-700">Kiểm tra &amp; xác nhận</div>
            <div className="text-[10px] text-slate-400 truncate">Ký số &amp; đồng bộ bệnh án</div>
          </div>
        </div>
      </div>

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-800 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Main Grid: Left Upload Zone + Right Guidelines Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Drop Zone & Selected Files List */}
        <div className="lg:col-span-8 space-y-4">
          {/* Patient Selector Card in Step 1 */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#275248] flex items-center justify-center shrink-0 border border-teal-200">
                <UserCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-800 block">
                  Thai phụ gắn hồ sơ phiếu khám
                </label>
                <div className="text-[10px] text-slate-500">
                  AI sẽ tự động kiểm tra tên bệnh nhân trên phiếu khớp với hồ sơ được chọn
                </div>
              </div>
            </div>

            <div className="min-w-[240px]">
              <select
                aria-label="Chọn thai phụ gắn hồ sơ"
                value={selectedPatientId || patientOptions[0]?.id || 'prof-001'}
                onChange={(e) => {
                  const selId = e.target.value;
                  const found = patientOptions.find((item) => item.id === selId);
                  if (onSelectPatient && found) {
                    onSelectPatient(found.id, found.name);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:border-[#275248] cursor-pointer"
              >
                {patientOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.gestationalAge})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all bg-white ${
              isDragOver
                ? 'border-[#275248] bg-teal-50/30 ring-4 ring-[#275248]/10'
                : 'border-slate-200 hover:border-teal-600/70 hover:bg-slate-50/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#275248] flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <UploadCloud className="w-7 h-7" />
            </div>

            <h3 className="text-base font-bold text-slate-800">
              Kéo thả phiếu khám vào đây
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Chọn nhiều tệp PDF hoặc ảnh JPG, PNG cùng lúc
            </p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#275248] hover:bg-[#1f423a] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <FileUp className="w-4 h-4" />
              <span>+ Chọn tệp từ máy tính</span>
            </button>

            <div className="text-[11px] text-slate-400 mt-3 font-medium">
              Tối đa 10 tệp/lần • Dung lượng tối đa 20 MB/tệp
            </div>
          </div>

          {/* Selected Files List Area */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            {files.length === 0 ? (
              /* Empty state (matching Image 1) */
              <div className="py-6 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-700">
                    Chưa có phiếu khám nào được chọn
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Danh sách tệp và tiến trình tải lên sẽ hiển thị tại đây.
                  </div>
                </div>
                <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-100 flex flex-wrap justify-between items-center gap-2">
                  <span>Hỗ trợ phiếu khám, kết quả xét nghiệm và ảnh siêu âm.</span>
                  <span>Định dạng: PDF, JPEG, PNG</span>
                </div>
              </div>
            ) : (
              /* Populated list with progress bars */
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                  <span className="font-bold text-slate-800">
                    Tệp đã chọn ({files.length} tệp)
                  </span>
                  <button
                    type="button"
                    onClick={() => onFilesChange([])}
                    className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    Xóa tất cả
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {files.map((file) => {
                    const isPdf = file.name.toLowerCase().endsWith('.pdf');
                    return (
                      <div
                        key={file.id}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-200 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isPdf
                                  ? 'bg-rose-50 text-rose-600'
                                  : 'bg-sky-50 text-sky-600'
                              }`}
                            >
                              {isPdf ? (
                                <FileText className="w-4 h-4" />
                              ) : (
                                <ImageIcon className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 truncate">
                                {file.name}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {file.sizeFormatted} • {isPdf ? 'Tài liệu PDF' : 'Ảnh Scan'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {file.status === 'completed' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Đã tải xong
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md">
                                <Loader2 className="w-3 h-3 animate-spin text-teal-700" />
                                {file.progress}%
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveFile(file.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Xóa tệp"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-200 ${
                              file.status === 'completed'
                                ? 'bg-[#275248]'
                                : 'bg-teal-500'
                            }`}
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar (4 cols): Guidelines & Security Cards (Matching Image 1) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Để trích xuất chính xác hơn */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Để trích xuất chính xác hơn
            </h3>

            <div className="space-y-3.5">
              {/* Item 01 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-teal-50 text-[#275248] text-xs font-bold flex items-center justify-center shrink-0 border border-teal-100">
                  01
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Chụp rõ toàn bộ phiếu khám
                  </div>
                  <div className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    Giữ ảnh thẳng, đủ sáng, không bị lóa hoặc bóng mờ.
                  </div>
                </div>
              </div>

              {/* Item 02 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-teal-50 text-[#275248] text-xs font-bold flex items-center justify-center shrink-0 border border-teal-100">
                  02
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Giữ nguyên nội dung gốc
                  </div>
                  <div className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    Không cắt mất tên, ngày khám, chữ ký và các chỉ số sinh hóa.
                  </div>
                </div>
              </div>

              {/* Item 03 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-teal-50 text-[#275248] text-xs font-bold flex items-center justify-center shrink-0 border border-teal-100">
                  03
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Kiểm tra trước khi lưu
                  </div>
                  <div className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    Dữ liệu trích xuất cần bác sĩ đối chiếu và xác nhận tính chuẩn xác.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Bảo mật hồ sơ y tế */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Bảo mật hồ sơ y tế
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Tệp được gắn trực tiếp với hồ sơ đang mở. Vui lòng kiểm tra đúng người bệnh trước khi tải lên.
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-100 pt-2 font-medium">
              Chỉ lưu dữ liệu sau khi bạn kiểm tra và xác nhận kết quả trích xuất ở bước cuối cùng.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          {files.length === 0 ? (
            <span>Chọn ít nhất một tệp để bắt đầu trích xuất.</span>
          ) : isUploadingAny ? (
            <span>Đang hoàn tất tải lên tệp...</span>
          ) : (
            <span className="text-emerald-700 font-semibold">
              Đã sẵn sàng trích xuất {files.length} tệp cận lâm sàng.
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onStartOcr}
          disabled={!allCompleted || files.length === 0}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#275248] hover:bg-[#1f423a] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
        >
          <span>Bắt đầu trích xuất (OCR)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
