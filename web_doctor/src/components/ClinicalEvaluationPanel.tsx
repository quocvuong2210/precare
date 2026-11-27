import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { AnalysisResult, WarningLevel } from '../types';

export const DEFAULT_CLINICAL_DISCLAIMER =
  'Kết quả phân tích từ hệ thống hỗ trợ ra quyết định lâm sàng PreCare. Bác sĩ chuyên khoa giữ quyền chẩn đoán cuối cùng.';

interface WarningStyleConfig {
  label: string;
  sublabel: string;
  badgeClass: string;
  panelClass: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const WARNING_CONFIG: Record<WarningLevel, WarningStyleConfig> = {
  green: {
    label: 'Bình thường',
    sublabel: 'Các chỉ số trong giới hạn chuẩn',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    panelClass: 'border-emerald-200/80 bg-emerald-50/30',
    Icon: CheckCircle2,
  },
  yellow: {
    label: 'Cảnh báo vàng (Theo dõi)',
    sublabel: 'Cần theo dõi sát quỹ đạo tăng trưởng',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    panelClass: 'border-amber-200/90 bg-amber-50/40',
    Icon: AlertTriangle,
  },
  red: {
    label: 'Cờ đỏ lâm sàng',
    sublabel: 'Nguy cơ cao — Cần đánh giá chuyên khoa ngay',
    badgeClass: 'bg-red-50 text-red-700 border-red-300',
    panelClass: 'border-red-200 bg-red-50/40',
    Icon: ShieldAlert,
  },
};

export interface WarningLevelBadgeProps {
  level: WarningLevel;
  size?: 'sm' | 'md';
}

export const WarningLevelBadge: React.FC<WarningLevelBadgeProps> = ({
  level,
  size = 'md',
}) => {
  const cfg = WARNING_CONFIG[level];
  const Icon = cfg.Icon;
  const padding = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <span
      data-testid={`warning-badge-${level}`}
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${padding} ${cfg.badgeClass}`}
    >
      <Icon className={iconSize} />
      <span>{cfg.label}</span>
    </span>
  );
};

interface BiometricRowConfig {
  code: string;
  name: string;
  unit: string;
  zScore?: number;
  percentile?: number;
}

function getPercentileBadgeClass(percentile?: number): string {
  if (percentile === undefined || percentile === null) {
    return 'text-slate-400 bg-slate-50 border-slate-200';
  }
  if (percentile < 3 || percentile > 97) {
    return 'text-[#DC2626] bg-red-50 border-red-200 font-bold';
  }
  if (percentile < 10 || percentile > 90) {
    return 'text-[#D97706] bg-amber-50 border-amber-200 font-semibold';
  }
  return 'text-emerald-700 bg-emerald-50 border-emerald-200 font-medium';
}

export interface ClinicalExplanationTableProps {
  analysis: AnalysisResult;
}

export const ClinicalExplanationTable: React.FC<ClinicalExplanationTableProps> = ({
  analysis,
}) => {
  const rows: BiometricRowConfig[] = [
    {
      code: 'BPD',
      name: 'Đường kính lưỡng đỉnh',
      unit: 'mm',
      zScore: analysis.bpd_zscore,
      percentile: analysis.bpd_percentile,
    },
    {
      code: 'HC',
      name: 'Chu vi vòng đầu',
      unit: 'mm',
      zScore: analysis.hc_zscore,
      percentile: analysis.hc_percentile,
    },
    {
      code: 'AC',
      name: 'Chu vi vòng bụng',
      unit: 'mm',
      zScore: analysis.ac_zscore,
      percentile: analysis.ac_percentile,
    },
    {
      code: 'FL',
      name: 'Chiều dài xương đùi',
      unit: 'mm',
      zScore: analysis.fl_zscore,
      percentile: analysis.fl_percentile,
    },
    {
      code: 'EFW',
      name: 'Cân nặng thai ước tính',
      unit: 'g',
      zScore: analysis.efw_zscore,
      percentile: analysis.efw_percentile,
    },
  ];

  const cfg = WARNING_CONFIG[analysis.warning_level];
  const analyzedDate = new Date(analysis.analyzed_at).toLocaleString('vi-VN');

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-4 ${cfg.panelClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <FileText className="w-4 h-4 text-[#275248]" />
            <span>Giải thích chuyên môn (Bác sĩ)</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="px-2 py-0.5 rounded bg-white/80 border border-slate-200 font-mono">
              Rule: {analysis.rules_version}
            </span>
            <span className="px-2 py-0.5 rounded bg-white/80 border border-slate-200 font-mono">
              Model: {analysis.model_version}
            </span>
            <span>{analyzedDate}</span>
          </div>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
          {analysis.explanation_doctor}
        </p>

        {analysis.flags && analysis.flags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {analysis.flags.map((flag) => (
              <span
                key={flag}
                className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-white border border-slate-300 text-slate-700"
              >
                {flag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              <th className="py-2.5 px-4 font-semibold">Chỉ số</th>
              <th className="py-2.5 px-4 font-semibold">Tên đầy đủ</th>
              <th className="py-2.5 px-4 font-semibold text-right">Z-score</th>
              <th className="py-2.5 px-4 font-semibold text-right">Bách phân vị (Percentile)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const hasPercentile = row.percentile !== undefined && row.percentile !== null;
              const hasZScore = row.zScore !== undefined && row.zScore !== null;
              return (
                <tr key={row.code} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-4 font-bold text-slate-800">{row.code}</td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {row.name} <span className="text-xs text-slate-400">({row.unit})</span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                    {hasZScore ? Number(row.zScore).toFixed(2) : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {hasPercentile ? (
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full border text-xs font-mono ${getPercentileBadgeClass(
                          Number(row.percentile),
                        )}`}
                      >
                        {Number(row.percentile).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">Chưa có</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export interface ClinicalDisclaimerBannerProps {
  disclaimerText?: string;
}

export const ClinicalDisclaimerBanner: React.FC<ClinicalDisclaimerBannerProps> = ({
  disclaimerText,
}) => {
  const text =
    disclaimerText && disclaimerText.trim().length > 0
      ? disclaimerText
      : DEFAULT_CLINICAL_DISCLAIMER;

  return (
    <div
      role="note"
      aria-label="Khuyến cáo miễn trừ trách nhiệm y khoa"
      className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600"
    >
      <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
      <p className="leading-relaxed">
        <span className="font-semibold text-slate-700">Lưu ý lâm sàng: </span>
        {text}
      </p>
    </div>
  );
};

export interface ClinicalEvaluationPanelProps {
  analysis: AnalysisResult | null;
  isLoading?: boolean;
}

export const ClinicalEvaluationPanel: React.FC<ClinicalEvaluationPanelProps> = ({
  analysis,
  isLoading = false,
}) => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-800">
          <ShieldCheck className="w-5 h-5 text-[#275248]" />
          <h3 className="text-base font-bold text-slate-800">
            Đánh giá Lâm sàng & Cảnh báo Cờ đỏ
          </h3>
        </div>
        {analysis && <WarningLevelBadge level={analysis.warning_level} />}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Đang tải kết quả đánh giá lâm sàng...</span>
        </div>
      ) : analysis ? (
        <ClinicalExplanationTable analysis={analysis} />
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-500">
          Chưa có kết quả đánh giá Rule Engine cho hồ sơ thai kỳ này.
        </div>
      )}

      <ClinicalDisclaimerBanner disclaimerText={analysis?.disclaimer_text} />
    </div>
  );
};
