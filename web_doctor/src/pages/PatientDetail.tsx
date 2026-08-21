import React, { useState } from 'react';
import { TrajectoryChart } from '../components/TrajectoryChart';
import { ArrowLeft, Download, ShieldCheck, AlertOctagon, Cpu, BookOpen } from 'lucide-react';

interface PatientDetailProps {
  patientId: string;
  onBack: () => void;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ patientId, onBack }) => {
  const [selectedBiometric, setSelectedBiometric] = useState<'EFW' | 'AC' | 'BPD' | 'FL' | 'HC'>('EFW');

  // Mock timeline of biometric measurements
  const patientDataEFW = [
    { ga_weeks: 18, val: 240, date: '2026-05-20' },
    { ga_weeks: 24, val: 620, date: '2026-06-30' },
    { ga_weeks: 30, val: 1400, date: '2026-08-20' }, // Low EFW -> Yellow/Red
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> Quay Lại Danh Sách
        </button>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: '#F8FAFC' }}>Hồ Sơ Thai Kỳ: Nguyễn Thị Minh Anh</h2>
          <p style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Mã Hồ Sơ: {patientId} | Bác Sĩ Phụ Trách: BS. Lê Hoàng</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Tuổi Thai Hiện Tại</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#38BDF8', marginTop: '4px' }}>30 tuần 2 ngày</div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>Ưu tiên Siêu Âm Quý 1</div>
        </div>

        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Ngày Dự Sinh (EDD)</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#F8FAFC', marginTop: '4px' }}>30/10/2026</div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>Tính từ Siêu âm Q1</div>
        </div>

        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Mức Cảnh Báo An Toàn</div>
          <div style={{ marginTop: '6px' }}>
            <span className="badge badge-yellow" style={{ fontSize: '0.85rem' }}>
              ● YELLOW - CẢNH BÁO SGA
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '4px' }}>Rule: max(luật, mô_hình)</div>
        </div>
      </div>

      {/* Analysis Result Summary Panel */}
      <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #F59E0B' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck color="#F59E0B" size={24} />
            <h3 style={{ fontSize: '1.15rem', color: '#F8FAFC' }}>Kết Quả Phân Tích & Tổng Hợp Cảnh Báo An Toàn</h3>
          </div>
          <button className="btn btn-primary" onClick={() => alert("Đã tải báo cáo PDF chuyên môn dành cho Bác sĩ!")}>
            <Download size={16} /> Xuất Báo Cáo PDF (Bác Sĩ)
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '16px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38BDF8', fontWeight: '600', marginBottom: '8px' }}>
              <BookOpen size={16} /> Luật Lâm Sàng Cờ Đỏ (Hadlock / Intergrowth-21st)
            </div>
            <p style={{ fontSize: '0.85rem', color: '#CBD5E1', lineHeight: '1.5' }}>
              CẢNH BÁO LÂM SÀNG: EFW ở bách phân vị 7.6% (&lt; 10th percentile) -&gt; Thai nhỏ hơn so với tuổi thai (SGA). Khuyến cáo theo dõi dòng chảy động mạch rốn.
            </p>
            <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#94A3B8' }}>
              <b>Phiên bản luật:</b> 1.0.0-hadlock-intergrowth
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '16px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#818CF8', fontWeight: '600', marginBottom: '8px' }}>
              <Cpu size={16} /> Mô Hình NCKH RACA-Net Inference
            </div>
            <p style={{ fontSize: '0.85rem', color: '#CBD5E1', lineHeight: '1.5' }}>
              Xác suất bất thường: <b>2.5%</b> (GREEN). Mô hình ML gợi ý bình thường nhưng bị <b>GHI ĐÈ AN TOÀN</b> bởi Luật Lâm Sàng SGA (YELLOW).
            </p>
            <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#94A3B8' }}>
              <b>Mô hình:</b> 1.0.0-racanet-v1 | <b>Fused Level:</b> max(YELLOW, GREEN) = YELLOW
            </div>
          </div>
        </div>
      </div>

      {/* Trajectory Growth Curves Section */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '-10px' }}>
        {(['EFW', 'AC', 'BPD', 'FL', 'HC'] as const).map(type => (
          <button
            key={type}
            className={`btn ${selectedBiometric === type ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedBiometric(type)}
          >
            {type} Trajectory
          </button>
        ))}
      </div>

      <TrajectoryChart biometricType={selectedBiometric} patientData={patientDataEFW} />
    </div>
  );
};
