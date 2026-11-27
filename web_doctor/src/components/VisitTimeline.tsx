import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  FileText,
  HeartPulse,
  Loader2,
  Plus,
  RefreshCw,
  Ruler,
  Stethoscope,
  Upload,
  Eye,
  X,
} from 'lucide-react';
import {
  CheckupTimelineRecord,
  createCheckup,
  fetchCheckupHistory,
} from '../services/checkup.service';
import { CheckupDetailModal } from './CheckupDetailModal';
import { WarningLevelBadge } from './ClinicalEvaluationPanel';
import { fetchProfileRuleEvaluationsApi } from '../services/clinicalRule.service';
import { AnalysisResult } from '../types';
import {
  ingestService,
  isValidUuid,
  mapFileDetailToExtractionData,
} from '../services/ingest.service';
import { UploadedFileSummary } from '../types/ingest.types';
import { DocumentViewer, DocumentExtractionData, formatFileSize } from './ocr-workflow';

type BloodPressureStatus = 'normal' | 'elevated' | 'stage1_hypertension' | 'crisis';

const pressureLabels: Record<BloodPressureStatus, { label: string; className: string }> = {
  normal: { label: 'Bình thường', className: 'bg-emerald-50 text-emerald-700' },
  elevated: { label: 'Tăng nhẹ', className: 'bg-amber-50 text-amber-700' },
  stage1_hypertension: { label: 'THA độ 1', className: 'bg-orange-50 text-orange-700' },
  crisis: { label: 'Khẩn cấp', className: 'bg-rose-100 text-rose-800' },
};

const formatDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const formatNumber = (value: number | null | undefined, unit = '') =>
  value == null ? '—' : `${value.toLocaleString('vi-VN')}${unit ? ` ${unit}` : ''}`;

const getErrorMessage = (err: any) => {
  const detail = err.response?.data?.detail;
  return (typeof detail === 'string' ? detail : detail?.message) || err.message || 'Không thể tải lịch sử khám.';
};

const todayInputValue = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
};

export interface VisitTimelineProps {
  pregnancyProfileId: string;
  patientName?: string;
  onOpenUpload?: () => void;
  newlyAddedVisits?: CheckupTimelineRecord[];
  onAnalysisUpdated?: (analysis: AnalysisResult) => void;
}

export const VisitTimeline: React.FC<VisitTimelineProps> = ({
  pregnancyProfileId,
  patientName,
  onOpenUpload,
  newlyAddedVisits = [],
  onAnalysisUpdated,
}) => {
  const [visits, setVisits] = useState<CheckupTimelineRecord[]>([]);
  const [analysisByCheckupId, setAnalysisByCheckupId] = useState<Record<string, AnalysisResult>>({});
  const [selectedVisitForDetail, setSelectedVisitForDetail] = useState<CheckupTimelineRecord | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileSummary[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [previewDocData, setPreviewDocData] = useState<DocumentExtractionData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [checkupDate, setCheckupDate] = useState(todayInputValue);
  const [weightKg, setWeightKg] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [notes, setNotes] = useState('');

  const loadVisits = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [history, analyses] = await Promise.all([
        fetchCheckupHistory(pregnancyProfileId),
        fetchProfileRuleEvaluationsApi(pregnancyProfileId).catch(() => [] as AnalysisResult[]),
      ]);
      setVisits(history);
      const map: Record<string, AnalysisResult> = {};
      for (const item of analyses) {
        if (!map[item.checkup_id]) {
          map[item.checkup_id] = item;
        }
      }
      setAnalysisByCheckupId(map);
    } catch (err: any) {
      setError(getErrorMessage(err));
      setVisits([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUploadedFiles = async () => {
    if (!isValidUuid(pregnancyProfileId)) {
      setUploadedFiles([]);
      return;
    }
    setIsLoadingFiles(true);
    try {
      const res = await ingestService.listProfileFiles(pregnancyProfileId, {
        page: 1,
        page_size: 50,
      });
      setUploadedFiles(res.items || []);
    } catch {
      setUploadedFiles([]);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    loadVisits();
    loadUploadedFiles();
  }, [pregnancyProfileId]);

  const handlePreviewUploadedFile = async (fileId: string) => {
    setIsLoadingPreview(true);
    try {
      const detail = await ingestService.getFileDetail(fileId);
      const mapped = mapFileDetailToExtractionData(
        detail,
        patientName || 'Thai phụ'
      );
      setPreviewDocData(mapped);
    } catch (err) {
      console.error('[VisitTimeline] Không thể tải file gốc:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Gộp bản ghi vừa tải lên (nếu có) và sắp xếp mốc tuổi thai/ngày khám mới nhất lên đầu
  const allVisits = useMemo(() => {
    const combined = [...newlyAddedVisits, ...visits];
    const seen = new Set<string>();
    return combined.filter((v) => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });
  }, [visits, newlyAddedVisits]);

  const sortedVisits = useMemo(
    () => [...allVisits].sort(
      (a, b) => b.gestational_age.days - a.gestational_age.days || b.checkup_date.localeCompare(a.checkup_date)
    ),
    [allVisits]
  );

  const isDemoData = visits.some((visit) => visit.notes?.startsWith('[DỮ LIỆU DEMO TIMELINE]'));

  const handleCreateCheckup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if ((systolic && !diastolic) || (!systolic && diastolic)) {
      setFormError('Vui lòng nhập đủ cả huyết áp tâm thu và tâm trương.');
      return;
    }
    if (systolic && diastolic && Number(systolic) <= Number(diastolic)) {
      setFormError('Huyết áp tâm thu phải lớn hơn huyết áp tâm trương.');
      return;
    }

    setIsSaving(true);
    try {
      await createCheckup({
        pregnancy_profile_id: pregnancyProfileId,
        checkup_date: checkupDate,
        weight_kg: weightKg ? Number(weightKg) : null,
        blood_pressure_systolic: systolic ? Number(systolic) : null,
        blood_pressure_diastolic: diastolic ? Number(diastolic) : null,
        notes: notes.trim() || null,
      });
      setIsCreateOpen(false);
      setCheckupDate(todayInputValue());
      setWeightKg('');
      setSystolic('');
      setDiastolic('');
      setNotes('');
      await loadVisits();
    } catch (err: any) {
      setFormError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
            <Activity className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Lịch sử &amp; diễn biến các lần khám</h3>
            </div>
            <p className="mt-1 text-xs text-slate-500">Thông tin được tải trực tiếp từ hồ sơ thai kỳ.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onOpenUpload && (
            <button
              type="button"
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#275248] px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#1f423a] transition-colors cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" /> Tải hồ sơ
            </button>
          )}
          <button
            type="button"
            onClick={loadVisits}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Làm mới
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-5 px-5 py-6 sm:px-6">
          {[0, 1, 2].map((item) => (
            <div key={item} className="grid animate-pulse grid-cols-[22px_minmax(0,1fr)] gap-3">
              <div className="mx-auto mt-1 h-4 w-4 rounded-full bg-emerald-100 ring-4 ring-white" />
              <div className="space-y-3 rounded-xl border border-slate-100 p-4">
                <div className="h-4 w-2/5 rounded bg-slate-200" />
                <div className="h-3 w-4/5 rounded bg-slate-100" />
                <div className="h-3 w-3/5 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="m-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>
          <button type="button" onClick={loadVisits} className="font-semibold underline underline-offset-2">Thử lại</button>
        </div>
      ) : sortedVisits.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800"><CalendarDays className="h-5 w-5" /></div>
          <p className="mt-3 text-sm font-semibold text-slate-800">Chưa có dữ liệu lần khám nào cho hồ sơ thai kỳ này</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">Ghi nhận lần khám để bắt đầu theo dõi các mốc sức khỏe mẹ và bé.</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {onOpenUpload && (
              <button
                type="button"
                onClick={onOpenUpload}
                className="inline-flex items-center gap-2 rounded-lg bg-[#275248] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1f423a] shadow-2xs transition-colors cursor-pointer"
              >
                <Upload className="h-4 w-4" /> Tải hồ sơ đầu tiên
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Plus className="h-4 w-4" /> Ghi nhận lần khám
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 sm:px-6 sm:py-4">
          {sortedVisits.map((visit, index) => {
            const biometric = visit.biometric_data;
            const visitAnalysis = analysisByCheckupId[visit.id] ?? null;
            const pressureStatus = pressureLabels[
              (visit.vitals.blood_pressure_status || 'normal') as BloodPressureStatus
            ];
            const verified = biometric?.status === 'verified';
            const bp = visit.vitals.blood_pressure_systolic != null && visit.vitals.blood_pressure_diastolic != null
              ? `${visit.vitals.blood_pressure_systolic}/${visit.vitals.blood_pressure_diastolic} mmHg`
              : 'Chưa ghi nhận';
            const note = visit.notes?.replace(/^\[DỮ LIỆU DEMO TIMELINE\]\s*/, '');

            return (
              <article key={visit.id} className="relative grid grid-cols-[22px_minmax(0,1fr)] gap-3 pb-4 last:pb-0 sm:grid-cols-[26px_minmax(0,1fr)] sm:gap-4">
                {index < sortedVisits.length - 1 && <div className="absolute bottom-0 left-[10px] top-5 w-px bg-emerald-200 sm:left-3" />}
                <div className="relative z-10 mt-1 flex h-5 w-5 items-center justify-center rounded-full border-[3px] border-white bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-100 sm:h-6 sm:w-6">
                  {index === 0 ? <Stethoscope className="h-2.5 w-2.5" /> : <CheckCircle2 className="h-3 w-3" />}
                </div>

                <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition hover:border-emerald-200 hover:shadow-sm sm:px-5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">
                      Tuần {visit.gestational_age.weeks}{visit.gestational_age.remaining_days > 0 ? ` + ${visit.gestational_age.remaining_days} ngày` : ''}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">{formatDate(visit.checkup_date)}</span>
                    <span className="hidden text-slate-300 sm:inline">·</span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-600"><Stethoscope className="h-3 w-3 text-slate-400" /> BS. {visit.doctor.full_name}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Quý {visit.gestational_age.trimester}</span>
                    {visitAnalysis && (
                      <WarningLevelBadge level={visitAnalysis.warning_level} size="sm" />
                    )}
                  </div>

                  <div className="mt-2.5 space-y-1.5 text-sm leading-6 text-slate-600">
                    <p className="flex flex-wrap items-center gap-x-1.5">
                      <HeartPulse className="h-3.5 w-3.5 text-rose-500" />
                      <strong className="font-semibold text-slate-700">Mẹ:</strong>
                      <span>{formatNumber(visit.vitals.weight_kg, 'kg')}</span>
                      <span className="text-slate-300">|</span>
                      <span>HA: {bp}</span>
                      {pressureStatus ? <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${pressureStatus.className}`}>{pressureStatus.label}</span> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{visit.vitals.blood_pressure_status}</span>}
                    </p>

                    {biometric ? (
                      <p className="flex flex-wrap items-center gap-x-1.5">
                        <Ruler className="h-3.5 w-3.5 text-emerald-700" />
                        <strong className="font-semibold text-slate-700">Thai:</strong>
                        <span>BPD {formatNumber(biometric.bpd, 'mm')}</span><span className="text-slate-300">|</span>
                        <span>HC {formatNumber(biometric.hc, 'mm')}</span><span className="text-slate-300">|</span>
                        <span>AC {formatNumber(biometric.ac, 'mm')}</span><span className="text-slate-300">|</span>
                        <span>FL {formatNumber(biometric.fl, 'mm')}</span><span className="text-slate-300">|</span>
                        <span>EFW {formatNumber(biometric.efw, 'g')}</span>
                        <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {verified ? 'Đã xác thực' : 'Chờ duyệt'}
                        </span>
                      </p>
                    ) : (
                      <p className="flex items-center gap-1.5 text-slate-500"><Ruler className="h-3.5 w-3.5 text-slate-400" /><strong className="font-semibold text-slate-700">Thai:</strong> Không có chỉ định siêu âm ở lần khám này.</p>
                    )}

                    {note && <p className="flex items-start gap-1.5"><FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" /><span><strong className="font-semibold text-slate-700">Ghi chú &amp; dặn dò:</strong> {note}</span></p>}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-slate-400 font-mono">
                      Mã hồ sơ: {visit.id.slice(0, 14)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedVisitForDetail(visit)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#275248] bg-teal-50 hover:bg-teal-100/80 border border-teal-200/80 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem chi tiết hồ sơ &amp; dặn dò</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!isLoading && !error && sortedVisits.length > 0 && (
        <footer className="border-t border-slate-100 bg-slate-50/70 px-5 py-2.5 text-center text-xs text-slate-500">
          {sortedVisits.length} lần khám · Sắp xếp mới nhất trước
        </footer>
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="create-checkup-title" className="my-8 w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between">
              <div><h3 id="create-checkup-title" className="text-base font-bold text-slate-900">Ghi nhận lần khám</h3><p className="mt-1 text-xs text-slate-500">Nhập thông tin khám thai và sinh hiệu mẹ.</p></div>
              <button type="button" onClick={() => setIsCreateOpen(false)} aria-label="Đóng" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleCreateCheckup} className="space-y-4">
              <label className="block text-xs font-semibold text-slate-700">Ngày khám<input required type="date" max={todayInputValue()} value={checkupDate} onChange={(event) => setCheckupDate(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-semibold text-slate-700">Cân nặng (kg)<input type="number" min="30" max="200" step="0.1" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
                <label className="text-xs font-semibold text-slate-700">Huyết áp tâm thu<input type="number" min="60" max="250" value={systolic} onChange={(event) => setSystolic(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" placeholder="mmHg" /></label>
                <label className="text-xs font-semibold text-slate-700">Huyết áp tâm trương<input type="number" min="40" max="150" value={diastolic} onChange={(event) => setDiastolic(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" placeholder="mmHg" /></label>
              </div>
              <label className="block text-xs font-semibold text-slate-700">Lời dặn / Chẩn đoán<textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
              {formError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{formError}</div>}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Hủy</button>
                <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-60">
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  {isSaving ? 'Đang lưu...' : 'Lưu lần khám'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedVisitForDetail && (
        <CheckupDetailModal
          visit={selectedVisitForDetail}
          onClose={() => setSelectedVisitForDetail(null)}
          patientName={patientName}
          existingAnalysis={analysisByCheckupId[selectedVisitForDetail.id] ?? null}
          onEvaluationComplete={(res) => {
            setAnalysisByCheckupId((prev) => ({ ...prev, [res.checkup_id]: res }));
            onAnalysisUpdated?.(res);
          }}
        />
      )}

      {/* Danh sách Hồ sơ & Tài liệu đã đẩy lên của thai phụ */}
      <div className="border-t border-slate-200 bg-slate-50/40 px-5 py-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-700" />
              Hồ sơ &amp; Tài liệu cận lâm sàng đã đẩy lên ({uploadedFiles.length})
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Toàn bộ phiếu siêu âm và xét nghiệm đã tải lên lưu trữ bảo mật cho thai phụ này.
            </p>
          </div>
          <button
            type="button"
            onClick={loadUploadedFiles}
            disabled={isLoadingFiles}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>

        {isLoadingFiles ? (
          <div className="flex items-center justify-center py-6 text-xs text-slate-500 gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
            <span>Đang tải danh sách tài liệu đã đẩy lên...</span>
          </div>
        ) : uploadedFiles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
            Chưa có tài liệu cận lâm sàng nào được đẩy lên cho hồ sơ này.
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {uploadedFiles.map((file) => {
              const statusBadge =
                file.status === 'verified'
                  ? { text: 'Đã xác nhận', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                  : file.status === 'extracted'
                  ? { text: 'Chờ bác sĩ duyệt', cls: 'bg-amber-50 text-amber-800 border-amber-200' }
                  : file.status === 'failed'
                  ? { text: 'Lỗi xử lý', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
                  : { text: 'Đang xử lý OCR', cls: 'bg-sky-50 text-sky-700 border-sky-200' };

              return (
                <div
                  key={file.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:border-emerald-300 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {file.file_name || 'Tai_lieu_kham.pdf'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${statusBadge.cls}`}>
                        {statusBadge.text}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2">
                      <span>{file.file_size_bytes ? formatFileSize(file.file_size_bytes) : '—'}</span>
                      <span>•</span>
                      <span>{formatDateTime(file.created_at)}</span>
                      {file.uploaded_by_name && (
                        <>
                          <span>•</span>
                          <span>Tải lên: {file.uploaded_by_name}</span>
                        </>
                      )}
                      {file.verified_by_name && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 font-semibold">
                            Đã duyệt: {file.verified_by_name}
                            {file.verified_at && ` (${formatDateTime(file.verified_at)})`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePreviewUploadedFile(file.id)}
                    disabled={isLoadingPreview}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-800 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Xem file</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal xem trực tiếp File gốc từ MinIO */}
      {previewDocData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-4xl h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Xem tài liệu gốc: {previewDocData.fileName}
                </h3>
                <p className="text-xs text-slate-500">
                  Thai phụ: {patientName || '—'} • Độ tin cậy trích xuất: {previewDocData.ocrConfidence}%
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDocData(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 p-3 bg-slate-100">
              <DocumentViewer
                data={previewDocData}
                patientName={patientName}
                isModal
                onClose={() => setPreviewDocData(null)}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
