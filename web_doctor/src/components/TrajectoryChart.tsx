import React, { useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import {
  BiometricMetric,
  TrajectoryPoint,
  TrajectoryResponse,
} from '../types/trajectory.types';

interface LegacyBiometricPoint {
  ga_weeks: number;
  val: number;
  date: string;
}

interface TrajectoryChartProps {
  trajectory?: TrajectoryResponse | null;
  biometricType?: 'EFW' | 'AC' | 'BPD' | 'HC' | 'FL' | 'CRL';
  patientData?: LegacyBiometricPoint[];
}

interface ChartDatum {
  ga_days: number;
  ga_weeks: number;
  ga_label: string;
  p3: number;
  p10: number;
  p50: number;
  p90: number;
  p97: number;
  band_p3_p10: [number, number];
  band_p10_p90: [number, number];
  band_p90_p97: [number, number];
  patient_val: number | null;
  point?: TrajectoryPoint;
}

const METRIC_LABELS: Record<string, string> = {
  efw: 'Ước tính cân nặng thai nhi (EFW)',
  ac: 'Chu vi vòng bụng (AC)',
  bpd: 'Đường kính lưỡng đỉnh (BPD)',
  hc: 'Chu vi vòng đầu (HC)',
  fl: 'Chiều dài xương đùi (FL)',
  crl: 'Chiều dài đầu mông (CRL)',
};

const generateFallbackHadlockCurves = (type: string) => {
  const points: Array<{
    ga_days: number;
    p3: number;
    p10: number;
    p50: number;
    p90: number;
    p97: number;
  }> = [];
  for (let w = 14; w <= 40; w++) {
    let mean = 0;
    let sd = 0;
    if (type === 'EFW') {
      mean = 0.09 * w ** 2.9;
      sd = mean * 0.12;
    } else if (type === 'AC') {
      mean = -38.8 + 13.97 * w - 0.14 * w ** 2;
      sd = mean * 0.05;
    } else if (type === 'BPD') {
      mean = -23.3 + 4.43 * w - 0.0282 * w ** 2;
      sd = mean * 0.05;
    } else if (type === 'FL') {
      mean = -18.2 + 4.57 * w - 0.033 * w ** 2;
      sd = mean * 0.05;
    } else {
      mean = -17.8 + 12.58 * w - 0.12 * w ** 2;
      sd = mean * 0.04;
    }
    points.push({
      ga_days: w * 7,
      p3: Math.max(0, Math.round(mean - 1.881 * sd)),
      p10: Math.max(0, Math.round(mean - 1.282 * sd)),
      p50: Math.max(0, Math.round(mean)),
      p90: Math.max(0, Math.round(mean + 1.282 * sd)),
      p97: Math.max(0, Math.round(mean + 1.881 * sd)),
    });
  }
  return points;
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDatum }>;
  unit: string;
}

const TrajectoryTooltip: React.FC<CustomTooltipProps> = ({ active, payload, unit }) => {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0].payload;
  const pt = datum.point;

  return (
    <div className="min-w-[230px] rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur-xs">
      <div className="mb-1.5 flex items-center justify-between border-b border-slate-100 pb-1.5">
        <span className="font-bold text-slate-900">Tuổi thai: {datum.ga_label}</span>
        {pt?.checkup_date && (
          <span className="text-[11px] text-slate-500">{pt.checkup_date}</span>
        )}
      </div>

      {pt ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Giá trị đo:</span>
            <span className="font-black text-[#275248]">
              {pt.value} {unit}
            </span>
          </div>
          {pt.percentile !== null && (
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Bách phân vị / Z:</span>
              <span className="font-bold text-slate-800">
                P{pt.percentile.toFixed(1)} (Z = {pt.z_score?.toFixed(2) ?? '—'})
              </span>
            </div>
          )}
          {pt.delta_from_median !== null && (
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Delta vs P50:</span>
              <span className="font-semibold text-slate-700">
                {pt.delta_from_median >= 0 ? '+' : ''}
                {pt.delta_from_median} {unit} (
                {pt.delta_from_median_pct !== null
                  ? `${pt.delta_from_median_pct >= 0 ? '+' : ''}${pt.delta_from_median_pct}%`
                  : '—'}
                )
              </span>
            </div>
          )}
          {pt.delta_value_from_prev !== null && (
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Delta lần trước:</span>
              <span className="font-semibold text-slate-700">
                {pt.delta_value_from_prev >= 0 ? '+' : ''}
                {pt.delta_value_from_prev} {unit}
                {pt.growth_velocity_per_week !== null &&
                  ` (${pt.growth_velocity_per_week >= 0 ? '+' : ''}${pt.growth_velocity_per_week} ${unit}/tuần)`}
              </span>
            </div>
          )}
          {pt.delta_percentile_from_prev !== null && (
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Biến động %ile:</span>
              <span
                className={`font-bold ${
                  pt.is_trajectory_drop_alert ? 'text-rose-600' : 'text-slate-700'
                }`}
              >
                {pt.delta_percentile_from_prev >= 0 ? '+' : ''}
                {pt.delta_percentile_from_prev} điểm
              </span>
            </div>
          )}
          {pt.is_trajectory_drop_alert && (
            <div className="mt-1.5 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 border border-rose-200">
              Cảnh báo: Tụt &gt; 20 điểm bách phân vị
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-0.5 text-[11px] text-slate-600">
          <div>P97: {datum.p97} {unit} • P90: {datum.p90} {unit}</div>
          <div className="font-semibold text-blue-700">P50 (Trung vị): {datum.p50} {unit}</div>
          <div>P10: {datum.p10} {unit} • P3: {datum.p3} {unit}</div>
        </div>
      )}
    </div>
  );
};

interface PatientDotProps {
  cx?: number;
  cy?: number;
  payload?: ChartDatum;
}

const PatientMeasurementDot: React.FC<PatientDotProps> = ({ cx, cy, payload }) => {
  if (typeof cx !== 'number' || typeof cy !== 'number' || !payload || payload.patient_val === null) {
    return null;
  }
  const pt = payload.point;
  let fill = '#0F766E';
  if (pt?.is_trajectory_drop_alert || pt?.warning_level === 'red') {
    fill = '#DC2626';
  } else if (pt?.warning_level === 'yellow') {
    fill = '#D97706';
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={pt?.is_trajectory_drop_alert ? 6.5 : 5}
      fill={fill}
      stroke="#FFFFFF"
      strokeWidth={2}
    />
  );
};

export const TrajectoryChart: React.FC<TrajectoryChartProps> = ({
  trajectory,
  biometricType = 'EFW',
  patientData = [],
}) => {
  const metricKey = (trajectory?.metric ?? biometricType.toLowerCase()) as BiometricMetric;
  const unit = trajectory?.unit ?? (metricKey === 'efw' ? 'g' : 'mm');
  const standardLabel =
    trajectory?.standard === 'hadlock' ? 'Hadlock LMS' : 'INTERGROWTH-21st';

  const chartData = useMemo<ChartDatum[]>(() => {
    if (trajectory && trajectory.lms_curve.length > 0) {
      const pointByGa = new Map<number, TrajectoryPoint>();
      trajectory.measurements.forEach((m) => {
        pointByGa.set(m.ga_days, m);
      });

      const merged: ChartDatum[] = trajectory.lms_curve.map((c) => {
        const pt = pointByGa.get(c.ga_days);
        if (pt) pointByGa.delete(c.ga_days);
        return {
          ga_days: c.ga_days,
          ga_weeks: Number((c.ga_days / 7).toFixed(1)),
          ga_label: `${Math.floor(c.ga_days / 7)}w ${c.ga_days % 7}d`,
          p3: c.p3,
          p10: c.p10,
          p50: c.p50,
          p90: c.p90,
          p97: c.p97,
          band_p3_p10: [c.p3, c.p10],
          band_p10_p90: [c.p10, c.p90],
          band_p90_p97: [c.p90, c.p97],
          patient_val: pt ? pt.value : null,
          point: pt,
        };
      });

      // Include any measurements whose exact ga_days wasn't on a sampled curve day
      pointByGa.forEach((pt) => {
        const nearest = merged.reduce<ChartDatum | null>((best, curr) => {
          if (!best) return curr;
          return Math.abs(curr.ga_days - pt.ga_days) < Math.abs(best.ga_days - pt.ga_days)
            ? curr
            : best;
        }, null);
        const p3 = nearest?.p3 ?? pt.value;
        const p10 = nearest?.p10 ?? pt.value;
        const p50 = nearest?.p50 ?? pt.value;
        const p90 = nearest?.p90 ?? pt.value;
        const p97 = nearest?.p97 ?? pt.value;
        merged.push({
          ga_days: pt.ga_days,
          ga_weeks: Number((pt.ga_days / 7).toFixed(1)),
          ga_label: pt.ga_formatted,
          p3,
          p10,
          p50,
          p90,
          p97,
          band_p3_p10: [p3, p10],
          band_p10_p90: [p10, p90],
          band_p90_p97: [p90, p97],
          patient_val: pt.value,
          point: pt,
        });
      });

      return merged.sort((a, b) => a.ga_days - b.ga_days);
    }

    const fallback = generateFallbackHadlockCurves(biometricType);
    return fallback.map((c) => {
      const match = patientData.find((p) => Math.round(p.ga_weeks * 7) === c.ga_days || Math.round(p.ga_weeks) * 7 === c.ga_days);
      return {
        ga_days: c.ga_days,
        ga_weeks: c.ga_days / 7,
        ga_label: `${Math.floor(c.ga_days / 7)}w 0d`,
        p3: c.p3,
        p10: c.p10,
        p50: c.p50,
        p90: c.p90,
        p97: c.p97,
        band_p3_p10: [c.p3, c.p10],
        band_p10_p90: [c.p10, c.p90],
        band_p90_p97: [c.p90, c.p97],
        patient_val: match ? match.val : null,
      };
    });
  }, [trajectory, biometricType, patientData]);

  const summary = trajectory?.summary;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            {METRIC_LABELS[metricKey] ?? `Tăng trưởng thai nhi - ${metricKey.toUpperCase()}`}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Dải nền LMS 5 mốc bách phân vị (P3, P10, P50, P90, P97)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {summary?.has_trajectory_drop_alert && (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              Tụt &gt;20 bách phân vị
            </span>
          )}
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800 border border-emerald-200/70">
            {standardLabel}
          </span>
        </div>
      </div>

      {summary && summary.total_points > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-2.5 rounded-xl bg-slate-50/80 p-3 text-xs sm:grid-cols-4">
          <div>
            <div className="text-[11px] text-slate-500">Đo gần nhất</div>
            <div className="font-bold text-slate-900">
              {summary.latest_value} {unit}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Bách phân vị</div>
            <div className="font-bold text-[#275248]">
              {summary.latest_percentile !== null ? `P${summary.latest_percentile}` : '—'}
              {summary.latest_z_score !== null && ` (Z=${summary.latest_z_score})`}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Delta giá trị</div>
            <div className="flex items-center gap-1 font-bold text-slate-800">
              {summary.overall_delta_value !== null ? (
                <>
                  <TrendingUp className="h-3.5 w-3.5 text-teal-600" />
                  {summary.overall_delta_value >= 0 ? '+' : ''}
                  {summary.overall_delta_value} {unit}
                </>
              ) : (
                '—'
              )}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Biến động %ile</div>
            <div
              className={`flex items-center gap-1 font-bold ${
                summary.has_trajectory_drop_alert ? 'text-rose-600' : 'text-slate-800'
              }`}
            >
              {summary.overall_delta_percentile !== null ? (
                <>
                  {summary.overall_delta_percentile < 0 && (
                    <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
                  )}
                  {summary.overall_delta_percentile >= 0 ? '+' : ''}
                  {summary.overall_delta_percentile} điểm
                </>
              ) : (
                '—'
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ width: '100%', height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 24, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis
              dataKey="ga_weeks"
              type="number"
              domain={['dataMin', 'dataMax']}
              unit="w"
              stroke="#64748B"
              tick={{ fill: '#64748B', fontSize: 12 }}
            />
            <YAxis
              unit={` ${unit}`}
              stroke="#64748B"
              tick={{ fill: '#64748B', fontSize: 12 }}
            />
            <Tooltip content={<TrajectoryTooltip unit={unit} />} />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />

            {/* Shaded LMS Percentile Bands */}
            <Area
              type="monotone"
              dataKey="band_p3_p10"
              name="Vùng P3–P10 (Cần theo dõi)"
              stroke="none"
              fill="#FCA5A5"
              fillOpacity={0.22}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="band_p10_p90"
              name="Vùng sinh lý P10–P90"
              stroke="none"
              fill="#A7F3D0"
              fillOpacity={0.28}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="band_p90_p97"
              name="Vùng P90–P97 (Thai to)"
              stroke="none"
              fill="#FDE68A"
              fillOpacity={0.25}
              isAnimationActive={false}
            />

            {/* 5 Percentile Reference Lines */}
            <Line type="monotone" dataKey="p97" name="P97" stroke="#D97706" strokeDasharray="4 4" dot={false} strokeWidth={1.2} />
            <Line type="monotone" dataKey="p90" name="P90" stroke="#F59E0B" strokeDasharray="2 3" dot={false} strokeWidth={1} />
            <Line type="monotone" dataKey="p50" name="P50 (Trung vị)" stroke="#2563EB" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="p10" name="P10" stroke="#F97316" strokeDasharray="2 3" dot={false} strokeWidth={1} />
            <Line type="monotone" dataKey="p3" name="P3" stroke="#DC2626" strokeDasharray="4 4" dot={false} strokeWidth={1.2} />

            {/* Patient Measurements Trajectory */}
            <Line
              type="monotone"
              dataKey="patient_val"
              name="Chỉ số thai nhi"
              stroke="#0F766E"
              strokeWidth={2.75}
              dot={<PatientMeasurementDot />}
              activeDot={{ r: 7, fill: '#0F766E', stroke: '#FFFFFF', strokeWidth: 2 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
