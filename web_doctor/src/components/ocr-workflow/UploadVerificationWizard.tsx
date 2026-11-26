import React, { useState, useEffect, useRef } from 'react';
import {
  UploadFileItem,
  DocumentExtractionData,
  createDefaultExtractionData,
} from './mockOcrData';
import { Step1Upload } from './Step1Upload';
import { Step2Review } from './Step2Review';
import { Step3Approval } from './Step3Approval';
import { Loader2, AlertCircle } from 'lucide-react';
import {
  ingestService,
  isValidUuid,
  mapFileDetailToExtractionData,
} from '../../services/ingest.service';
import { createCheckup } from '../../services/checkup.service';

export interface InitialReviewFileInfo {
  id: string;
  name: string;
  sizeFormatted: string;
  ocrConfidence?: number;
  doctorPerformer?: string;
}

interface UploadVerificationWizardProps {
  pregnancyProfileId: string;
  patientName: string;
  gestationalAge?: string;
  initialStep?: 1 | 2 | 3;
  initialReviewFile?: InitialReviewFileInfo | null;
  onClose: () => void;
  onSaveSuccess: (savedData?: DocumentExtractionData) => void;
  onDeleteSuccess?: (deletedFileId: string) => void;
}

export const UploadVerificationWizard: React.FC<UploadVerificationWizardProps> = ({
  pregnancyProfileId,
  patientName,
  gestationalAge,
  initialStep = 1,
  initialReviewFile = null,
  onClose,
  onSaveSuccess,
  onDeleteSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(
    initialReviewFile ? 2 : initialStep
  );
  const [currentPatientId, setCurrentPatientId] = useState(pregnancyProfileId);
  const [currentPatientName, setCurrentPatientName] = useState(patientName);
  const [files, setFiles] = useState<UploadFileItem[]>(() => {
    if (!initialReviewFile) return [];
    return [
      {
        id: initialReviewFile.id,
        name: initialReviewFile.name,
        size: 0,
        sizeFormatted: initialReviewFile.sizeFormatted,
        type: initialReviewFile.name.toLowerCase().endsWith('.pdf')
          ? 'application/pdf'
          : 'image/jpeg',
        progress: 100,
        status: 'completed',
      },
    ];
  });
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [isOcrProcessing, setIsOcrProcessing] = useState<boolean>(false);
  const [isDeletingFile, setIsDeletingFile] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const blobUrlsRef = useRef<string[]>([]);
  const [processingStageText, setProcessingStageText] = useState<string>(
    'Hệ thống đang chạy bộ bóc tách số hóa dữ liệu và đối chiếu chuẩn an toàn RACA-Net.'
  );

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  // Store extracted data per file ID or index
  const [extractionsMap, setExtractionsMap] = useState<Record<string, DocumentExtractionData>>(() => {
    if (!initialReviewFile) return {};
    const prefilled = createDefaultExtractionData(
      initialReviewFile.id,
      initialReviewFile.name,
      initialReviewFile.sizeFormatted,
      patientName
    );
    return {
      [initialReviewFile.id]: {
        ...prefilled,
        ocrConfidence: initialReviewFile.ocrConfidence ?? prefilled.ocrConfidence,
        doctorPerformer: initialReviewFile.doctorPerformer ?? prefilled.doctorPerformer,
        gestationalAgeFormatted: gestationalAge || prefilled.gestationalAgeFormatted,
      },
    };
  });

  // Nếu duyệt file thật (UUID) từ hàng đợi, gọi API lấy Presigned URL & ocr_raw_payload từ Backend
  useEffect(() => {
    if (initialReviewFile && isValidUuid(initialReviewFile.id)) {
      ingestService
        .getFileDetail(initialReviewFile.id)
        .then((detail) => {
          const mapped = mapFileDetailToExtractionData(detail, currentPatientName);
          setExtractionsMap((prev) => ({
            ...prev,
            [initialReviewFile.id]: mapped,
          }));
        })
        .catch((err) => {
          console.warn('[Ingest] Không thể tải chi tiết file từ API, giữ dữ liệu preview:', err);
        });
    }
  }, [initialReviewFile, currentPatientName]);

  // Get active extraction data
  const currentFile = files[activeFileIndex];
  const activeExtraction: DocumentExtractionData =
    (currentFile && extractionsMap[currentFile.id]) ||
    createDefaultExtractionData(
      currentFile?.id || 'default-file',
      currentFile?.name || 'Phieu_kham_thai_32W.pdf',
      currentFile?.sizeFormatted || '2.4 MB',
      patientName
    );

  const handleUpdateActiveExtraction = (updated: DocumentExtractionData) => {
    if (currentFile) {
      setExtractionsMap((prev) => ({
        ...prev,
        [currentFile.id]: updated,
      }));
    }
  };

  // Start OCR extraction from Step 1 to Step 2 (Fast Path / Slow Path API + Local Preview Fallback)
  const handleStartOcr = async () => {
    setApiError(null);
    setIsOcrProcessing(true);
    setProcessingStageText('Đang tải tài liệu lên hệ thống lưu trữ bảo mật...');

    const realFiles = files.filter((f) => Boolean(f.file));
    const canCallBackendApi =
      isValidUuid(currentPatientId) && realFiles.length > 0;

    if (canCallBackendApi) {
      try {
        const nextMap: Record<string, DocumentExtractionData> = {};
        const nextFiles: UploadFileItem[] = [...files];

        if (realFiles.length === 1 && realFiles[0].file) {
          const targetItem = realFiles[0];
          const uploadRes = await ingestService.uploadSingleDocument(
            targetItem.file!,
            currentPatientId,
            'ultrasound_report',
            undefined,
            (pct) => {
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === targetItem.id ? { ...f, progress: pct } : f
                )
              );
            }
          );

          if (uploadRes.task_id) {
            setProcessingStageText(
              'Đang đọc text layer PDF (Fast Path) và phân tích bảng chỉ số...'
            );
            await ingestService.pollTaskUntilFinished(
              uploadRes.task_id,
              (status) => {
                if (status.stage_message) {
                  setProcessingStageText(status.stage_message);
                }
              }
            );
          }

          const detail = await ingestService.getFileDetail(uploadRes.file_id);
          const mapped = mapFileDetailToExtractionData(detail, currentPatientName);

          // Đồng bộ lại file_id thật từ Backend
          const idx = nextFiles.findIndex((f) => f.id === targetItem.id);
          if (idx !== -1) {
            nextFiles[idx] = {
              ...nextFiles[idx],
              id: uploadRes.file_id,
              progress: 100,
              status: 'completed',
            };
          }
          nextMap[uploadRes.file_id] = mapped;
        } else {
          // Batch Upload (> 1 files)
          const rawFileObjs = realFiles.map((f) => f.file!);
          const batchRes = await ingestService.uploadDocumentsBatch(
            rawFileObjs,
            currentPatientId,
            'ultrasound_report'
          );

          setProcessingStageText(
            `Đã tiếp nhận ${batchRes.successful_enqueued}/${batchRes.total_files} tài liệu. Đang bóc tách song song...`
          );

          await ingestService.pollBatchUntilFinished(batchRes.batch_id, (st) => {
            setProcessingStageText(
              `Đang trích xuất hàng loạt (${st.completed_files}/${st.total_files} hoàn thành)...`
            );
          });

          const details = await Promise.all(
            batchRes.items.map((item) => ingestService.getFileDetail(item.file_id))
          );

          details.forEach((detail, i) => {
            const mapped = mapFileDetailToExtractionData(detail, currentPatientName);
            nextMap[detail.id] = mapped;
            if (nextFiles[i]) {
              nextFiles[i] = {
                ...nextFiles[i],
                id: detail.id,
                progress: 100,
                status: 'completed',
              };
            }
          });
        }

        setFiles(nextFiles);
        setExtractionsMap(nextMap);
        setActiveFileIndex(0);
        setIsOcrProcessing(false);
        setCurrentStep(2);
        return;
      } catch (err: unknown) {
        const axiosErr = err as {
          response?: { status?: number; data?: { detail?: string } };
          message?: string;
        };
        const detailMsg =
          axiosErr?.response?.data?.detail ||
          axiosErr?.message ||
          'Không thể kết nối tới Backend Fast Path / Celery Worker.';
        console.error('[Ingest API] Lỗi xử lý tài liệu:', err);
        setApiError(
          `Lỗi trích xuất từ Backend (${axiosErr?.response?.status || 'Network'}): ${detailMsg}`
        );
        setIsOcrProcessing(false);
        return;
      }
    }

    // Fallback chế độ Mock Offline (chỉ chạy khi chưa có UUID hồ sơ thật từ Database)
    setProcessingStageText(
      'Đang nạp bản xem trước cục bộ và dữ liệu mẫu đối chiếu...'
    );
    const initialMap: Record<string, DocumentExtractionData> = {};
    files.forEach((file) => {
      const baseMock = createDefaultExtractionData(
        file.id,
        file.name,
        file.sizeFormatted,
        currentPatientName
      );
      let localBlobUrl: string | undefined;
      if (file.file) {
        localBlobUrl = URL.createObjectURL(file.file);
        blobUrlsRef.current.push(localBlobUrl);
      }
      initialMap[file.id] = {
        ...baseMock,
        presignedViewUrl: localBlobUrl,
        fileType: file.type,
      };
    });
    setExtractionsMap(initialMap);
    setActiveFileIndex(0);

    setTimeout(() => {
      setIsOcrProcessing(false);
      setCurrentStep(2);
    }, 500);
  };

  // Xác nhận và lưu hồ sơ ở Bước 3
  const handleDeleteActiveFile = async () => {
    const targetFileId = activeExtraction.fileId || currentFile?.id || '';
    setApiError(null);
    setIsDeletingFile(true);
    try {
      if (isValidUuid(targetFileId)) {
        await ingestService.deleteUploadedFile(targetFileId);
      }

      const deletedId = currentFile?.id;
      const remainingFiles = files.filter((_, idx) => idx !== activeFileIndex);
      setFiles(remainingFiles);
      if (deletedId) {
        setExtractionsMap((prev) => {
          const next = { ...prev };
          delete next[deletedId];
          return next;
        });
      }

      if (remainingFiles.length > 0) {
        setActiveFileIndex((prev) => Math.min(prev, remainingFiles.length - 1));
      } else if (onDeleteSuccess) {
        onDeleteSuccess(targetFileId);
      } else {
        onClose();
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Không thể xóa tài liệu khỏi hàng đợi.';
      setApiError(msg);
    } finally {
      setIsDeletingFile(false);
    }
  };

  const handleConfirmStep3 = async () => {
    if (isValidUuid(currentPatientId)) {
      try {
        const todayIso = new Date().toISOString().slice(0, 10);
        const formattedDate =
          /^\d{4}-\d{2}-\d{2}$/.test(activeExtraction.visitDate) &&
          activeExtraction.visitDate <= todayIso
            ? activeExtraction.visitDate
            : todayIso;

        const getBio = (code: string, min: number, max: number) => {
          const found = activeExtraction.biometrics.find((m) => m.code === code);
          if (!found || typeof found.value !== 'number') return null;
          return found.value >= min && found.value <= max ? found.value : null;
        };

        const bpdVal = getBio('BPD', 10, 120);
        const hcVal = getBio('HC', 50, 400);
        const acVal = getBio('AC', 50, 450);
        const flVal = getBio('FL', 5, 95);
        const efwVal = getBio('EFW', 50, 6000);
        const hasAnyBiometrics =
          bpdVal !== null ||
          hcVal !== null ||
          acVal !== null ||
          flVal !== null ||
          efwVal !== null;

        const sysBp = activeExtraction.vitals.bloodPressureSystolic;
        const diaBp = activeExtraction.vitals.bloodPressureDiastolic;
        const validBp =
          sysBp >= 60 && sysBp <= 250 && diaBp >= 40 && diaBp <= 150 && sysBp > diaBp;

        const wKg = activeExtraction.vitals.weightKg;
        const validWeight = wKg >= 30 && wKg <= 200 ? wKg : null;

        const savedCheckup = await createCheckup({
          pregnancy_profile_id: currentPatientId,
          checkup_date: formattedDate,
          weight_kg: validWeight,
          blood_pressure_systolic: validBp ? sysBp : null,
          blood_pressure_diastolic: validBp ? diaBp : null,
          notes: [
            activeExtraction.conclusions.fetalCondition,
            activeExtraction.conclusions.maternalNotes,
            activeExtraction.conclusions.followUpAdvice,
          ]
            .filter(Boolean)
            .join('\n'),
          biometrics: hasAnyBiometrics
            ? {
                bpd: bpdVal,
                hc: hcVal,
                ac: acVal,
                fl: flVal,
                efw: efwVal,
              }
            : null,
        });
        if (isValidUuid(activeExtraction.fileId)) {
          await ingestService.verifyUploadedFile(activeExtraction.fileId, savedCheckup?.id);
        }
      } catch (err) {
        console.warn('[Checkup API] Không thể lưu checkup lên Backend, tiếp tục lưu trạng thái UI:', err);
      }
    }
    onSaveSuccess(activeExtraction);
  };

  return (
    <div className="relative space-y-4">
      {/* API Error Banner */}
      {apiError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start justify-between gap-3 text-xs text-rose-800 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-rose-900">Không thể trích xuất tự động từ Backend</div>
              <div className="mt-0.5">{apiError}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setApiError(null)}
            className="text-rose-600 hover:text-rose-900 font-semibold cursor-pointer shrink-0"
          >
            Đóng
          </button>
        </div>
      )}

      {/* OCR Processing Overlay Spinner */}
      {isOcrProcessing && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 text-center max-w-sm w-full space-y-3 animate-in fade-in zoom-in-95">
            <Loader2 className="w-8 h-8 animate-spin text-[#275248] mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">
              Đang phân tích cấu trúc &amp; trích xuất OCR...
            </h4>
            <p className="text-xs text-slate-500">
              {processingStageText}
            </p>
          </div>
        </div>
      )}

      {/* Step 1: Chọn & tải tệp */}
      {currentStep === 1 && (
        <Step1Upload
          files={files}
          onFilesChange={setFiles}
          onStartOcr={handleStartOcr}
          onBackToResults={onClose}
          patientName={currentPatientName}
          selectedPatientId={currentPatientId}
          onSelectPatient={(pid, pname) => {
            setCurrentPatientId(pid);
            setCurrentPatientName(pname);
          }}
        />
      )}

      {/* Step 2: Xử lý & đối chiếu tài liệu */}
      {currentStep === 2 && (
        <Step2Review
          files={files}
          activeFileIndex={activeFileIndex}
          onSelectFileIndex={setActiveFileIndex}
          extractionData={activeExtraction}
          onUpdateExtractionData={handleUpdateActiveExtraction}
          onBackToStep1={() => setCurrentStep(1)}
          onBackToQueue={initialReviewFile ? onClose : undefined}
          onDeleteFile={handleDeleteActiveFile}
          isDeletingFile={isDeletingFile}
          onProceedToStep3={() => setCurrentStep(3)}
          patientName={currentPatientName}
        />
      )}

      {/* Step 3: Kiểm tra & xác nhận */}
      {currentStep === 3 && (
        <Step3Approval
          extractionData={activeExtraction}
          onBackToStep2={() => setCurrentStep(2)}
          onConfirmAndSave={handleConfirmStep3}
          patientName={currentPatientName}
        />
      )}
    </div>
  );
};
