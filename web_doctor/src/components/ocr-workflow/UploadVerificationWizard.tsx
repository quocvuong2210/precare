import React, { useState } from 'react';
import {
  UploadFileItem,
  DocumentExtractionData,
  createDefaultExtractionData,
} from './mockOcrData';
import { Step1Upload } from './Step1Upload';
import { Step2Review } from './Step2Review';
import { Step3Approval } from './Step3Approval';
import { Loader2 } from 'lucide-react';

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
}

export const UploadVerificationWizard: React.FC<UploadVerificationWizardProps> = ({
  pregnancyProfileId,
  patientName,
  gestationalAge,
  initialStep = 1,
  initialReviewFile = null,
  onClose,
  onSaveSuccess,
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

  // Start OCR extraction from Step 1 to Step 2
  const handleStartOcr = () => {
    setIsOcrProcessing(true);

    // Prepare mock data for each uploaded file
    const initialMap: Record<string, DocumentExtractionData> = {};
    files.forEach((file, idx) => {
      initialMap[file.id] = createDefaultExtractionData(
        file.id,
        file.name,
        file.sizeFormatted,
        patientName
      );
    });
    setExtractionsMap(initialMap);
    setActiveFileIndex(0);

    // Simulate OCR processing transition
    setTimeout(() => {
      setIsOcrProcessing(false);
      setCurrentStep(2);
    }, 700);
  };

  return (
    <div className="relative">
      {/* OCR Processing Overlay Spinner */}
      {isOcrProcessing && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 text-center max-w-sm w-full space-y-3 animate-in fade-in zoom-in-95">
            <Loader2 className="w-8 h-8 animate-spin text-[#275248] mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">
              Đang phân tích cấu trúc &amp; trích xuất OCR...
            </h4>
            <p className="text-xs text-slate-500">
              Hệ thống đang chạy bộ bóc tách số hóa dữ liệu và đối chiếu chuẩn an toàn RACA-Net.
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
          onProceedToStep3={() => setCurrentStep(3)}
          patientName={currentPatientName}
        />
      )}

      {/* Step 3: Kiểm tra & xác nhận */}
      {currentStep === 3 && (
        <Step3Approval
          extractionData={activeExtraction}
          onBackToStep2={() => setCurrentStep(2)}
          onConfirmAndSave={() => onSaveSuccess(activeExtraction)}
          patientName={patientName}
        />
      )}
    </div>
  );
};
