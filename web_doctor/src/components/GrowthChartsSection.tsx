import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { TrajectoryChart } from './TrajectoryChart';
import { fetchPregnancyTrajectory } from '../services/trajectory.service';
import {
  BiometricMetric,
  GrowthStandard,
  TrajectoryResponse,
} from '../types/trajectory.types';

type GrowthBiometricKey = Exclude<BiometricMetric, 'crl'>;

const GROWTH_METRICS: Array<{
  key: GrowthBiometricKey;
  type: 'EFW' | 'AC' | 'BPD' | 'HC' | 'FL';
}> = [
  { key: 'efw', type: 'EFW' },
  { key: 'ac', type: 'AC' },
  { key: 'bpd', type: 'BPD' },
  { key: 'hc', type: 'HC' },
  { key: 'fl', type: 'FL' },
];

export const GrowthChartsSection: React.FC<{ pregnancyProfileId: string }> = ({
  pregnancyProfileId,
}) => {
  const [trajectories, setTrajectories] = useState<TrajectoryResponse[]>([]);
  const [standard, setStandard] = useState<GrowthStandard>('intergrowth_21st');
  const [selectedMetric, setSelectedMetric] = useState<'all' | GrowthBiometricKey>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    const loadTrajectories = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const results = await Promise.all(
          GROWTH_METRICS.map((m) =>
            fetchPregnancyTrajectory(pregnancyProfileId, {
              metric: m.key,
              standard,
            })
          )
        );
        if (isCurrent) setTrajectories(results);
      } catch (err: unknown) {
        const axiosErr = err as {
          response?: { data?: { detail?: string | { message?: string } } };
          message?: string;
        };
        const detail = axiosErr.response?.data?.detail;
        if (isCurrent) {
          setTrajectories([]);
          setError(
            (typeof detail === 'string' ? detail : detail?.message) ||
              axiosErr.message ||
              'Không thể tải dữ liệu quỹ đạo tăng trưởng từ máy chủ.'
          );
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };
    void loadTrajectories();
    return () => {
      isCurrent = false;
    };
  }, [pregnancyProfileId, standard, refreshKey]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-12 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin text-[#275248]" />
        Đang tải quỹ đạo tăng trưởng &amp; đường cong chuẩn LMS...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </span>
        <button
          type="button"
          onClick={() => setRefreshKey((current) => current + 1)}
          className="font-semibold underline underline-offset-2"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const withData = trajectories.filter((t) => t.measurements.length > 0);
  const visibleCharts =
    selectedMetric === 'all'
      ? withData
      : trajectories.filter((t) => t.metric === selectedMetric);

  if (withData.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
        <p className="text-sm font-semibold text-slate-800">
          Chưa có chỉ số siêu âm để vẽ biểu đồ
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Biểu đồ sẽ xuất hiện khi hồ sơ có dữ liệu BPD, HC, AC, FL hoặc EFW.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedMetric('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              selectedMetric === 'all'
                ? 'bg-[#275248] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả chỉ số ({withData.length})
          </button>
          {GROWTH_METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setSelectedMetric(m.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                selectedMetric === m.key
                  ? 'bg-[#275248] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m.type}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 text-xs">
          <button
            type="button"
            onClick={() => setStandard('intergrowth_21st')}
            className={`rounded-lg px-2.5 py-1 font-semibold cursor-pointer ${
              standard === 'intergrowth_21st'
                ? 'bg-white text-[#275248] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            INTERGROWTH-21st
          </button>
          <button
            type="button"
            onClick={() => setStandard('hadlock')}
            className={`rounded-lg px-2.5 py-1 font-semibold cursor-pointer ${
              standard === 'hadlock'
                ? 'bg-white text-[#275248] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hadlock
          </button>
        </div>
      </div>

      <div
        className={`grid grid-cols-1 gap-5 ${
          selectedMetric === 'all' ? 'xl:grid-cols-2' : ''
        }`}
      >
        {visibleCharts.map((traj) => (
          <TrajectoryChart key={`${traj.metric}-${traj.standard}`} trajectory={traj} />
        ))}
      </div>
    </div>
  );
};
