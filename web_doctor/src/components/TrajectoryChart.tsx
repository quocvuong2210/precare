import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Scatter,
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
    <div className="glass-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', color: '#F8FAFC' }}>Biometric Trajectory Curve - {biometricType}</h3>
          <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Hadlock Growth Standard (5th, 50th, 95th Percentiles)</p>
        </div>
        <span className="badge badge-green">Standard: Hadlock 1984</span>
      </div>

      <div style={{ width: '100%', height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="ga_weeks"
              unit="w"
              stroke="#94A3B8"
              tick={{ fill: '#94A3B8', fontSize: 12 }}
            />
            <YAxis
              unit={` ${unit}`}
              stroke="#94A3B8"
              tick={{ fill: '#94A3B8', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F8FAFC' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            
            {/* Centile Band Lines */}
            <Line type="monotone" dataKey="p95" name="95th Percentile" stroke="#F59E0B" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />
            <Line type="monotone" dataKey="p50" name="50th Percentile (Median)" stroke="#3B82F6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="p5" name="5th Percentile" stroke="#EF4444" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />

            {/* Patient Measurements Scatter / Line */}
            <Line
              type="monotone"
              dataKey="patient_val"
              name="Bệnh Nhân"
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
