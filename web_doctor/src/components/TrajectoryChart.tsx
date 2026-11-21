import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface BiometricPoint {
  ga_weeks: number;
  val: number;
  date: string;
}

interface TrajectoryChartProps {
  biometricType: 'EFW' | 'AC' | 'BPD' | 'HC' | 'FL';
  patientData: BiometricPoint[];
}

// Generate Hadlock 5th, 50th, 95th percentile standard curve data points (weeks 14 to 40)
const generateHadlockCurves = (type: string) => {
  const points = [];
  for (let w = 14; w <= 40; w++) {
    let mean = 0;
    let sd = 0;
    if (type === 'EFW') {
      mean = 0.09 * (w ** 2.9);
      sd = mean * 0.12;
    } else if (type === 'AC') {
      mean = -38.8 + (13.97 * w) - (0.14 * (w ** 2));
      sd = mean * 0.05;
    } else if (type === 'BPD') {
      mean = -23.3 + (4.43 * w) - (0.0282 * (w ** 2));
      sd = mean * 0.05;
    } else if (type === 'FL') {
      mean = -18.2 + (4.57 * w) - (0.033 * (w ** 2));
      sd = mean * 0.05;
    } else { // HC
      mean = -17.8 + (12.58 * w) - (0.12 * (w ** 2));
      sd = mean * 0.04;
    }

    const p5 = Math.max(0, Math.round(mean - 1.645 * sd));
    const p50 = Math.max(0, Math.round(mean));
    const p95 = Math.max(0, Math.round(mean + 1.645 * sd));

    points.push({ ga_weeks: w, p5, p50, p95 });
  }
  return points;
};

export const TrajectoryChart: React.FC<TrajectoryChartProps> = ({ biometricType, patientData }) => {
  const curveData = generateHadlockCurves(biometricType);

  // Merge patient points with curve
  const chartData = curveData.map(c => {
    const match = patientData.find(p => Math.round(p.ga_weeks) === c.ga_weeks);
    return {
      ...c,
      patient_val: match ? match.val : null,
      patient_date: match ? match.date : null
    };
  });

  const unit = biometricType === 'EFW' ? 'g' : 'mm';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Tăng trưởng thai nhi - {biometricType}</h3>
          <p className="mt-1 text-xs text-slate-500">Đường tham chiếu Hadlock (bách phân vị 5, 50, 95)</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800">
          Hadlock 1984
        </span>
      </div>

      <div style={{ width: '100%', height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis
              dataKey="ga_weeks"
              unit="w"
              stroke="#64748B"
              tick={{ fill: '#64748B', fontSize: 12 }}
            />
            <YAxis
              unit={` ${unit}`}
              stroke="#64748B"
              tick={{ fill: '#64748B', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', color: '#1E293B' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
            
            {/* Centile Band Lines */}
            <Line type="monotone" dataKey="p95" name="Bách phân vị 95 (p95)" stroke="#F59E0B" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />
            <Line type="monotone" dataKey="p50" name="Bách phân vị 50 (p50 - Trung vị)" stroke="#3B82F6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="p5" name="Bách phân vị 5 (p5)" stroke="#EF4444" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />

            {/* Patient Measurements Scatter / Line */}
            <Line
              type="monotone"
              dataKey="patient_val"
              name="Chỉ số thai nhi"
              stroke="#10B981"
              strokeWidth={3}
              dot={{ r: 6, fill: '#10B981', strokeWidth: 2, stroke: '#FFFFFF' }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
