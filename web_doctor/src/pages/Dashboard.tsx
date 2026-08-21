import React, { useState } from 'react';
import { Users, FileCheck, ShieldAlert, Activity, ArrowRight, UploadCloud } from 'lucide-react';
import { ReviewIngestQueue } from '../components/ReviewIngestQueue';
import { UploadedFileReview } from '../types';

interface PatientSummary {
  id: string;
  name: string;
  ga_weeks: number;
  edd: string;
  doctor: string;
  warning_level: 'green' | 'yellow' | 'red';
  last_checkup: string;
}

const MOCK_PATIENTS: PatientSummary[] = [
  { id: 'prof-001', name: 'Nguyễn Thị Minh Anh', ga_weeks: 30, edd: '2026-10-30', doctor: 'BS. Lê Hoàng', warning_level: 'red', last_checkup: '2026-08-20' },
  { id: 'prof-002', name: 'Phạm Thanh Thảo', ga_weeks: 24, edd: '2026-12-10', doctor: 'BS. Lê Hoàng', warning_level: 'yellow', last_checkup: '2026-08-18' },
  { id: 'prof-003', name: 'Trần Mỹ Duyên', ga_weeks: 18, edd: '2027-01-22', doctor: 'BS. Lê Hoàng', warning_level: 'green', last_checkup: '2026-08-15' },
];

const MOCK_REVIEW_ITEM: UploadedFileReview = {
  uploaded_file_id: 'file-uuid-999',
  status: 'extracted',
  pregnancy_profile_id: 'prof-001',
  checkup_id: 'checkup-uuid-111',
  file_url: 'minio://precare-paraclinical-files/prof-001/ultrasound_30w.png',
  ocr_raw_payload: {
    document_type: 'ultrasound_report',
    extracted_fields: {
      bpd_mm: 77.5,
      hc_mm: 282.0,
      ac_mm: 260.0,
      fl_mm: 57.0,
      efw_g: 1400.0
    },
    raw_text: "SIÊU ÂM THAI 30 TUẦN - BPD: 77.5mm, HC: 282mm, AC: 260mm, FL: 57mm, EFW: 1400g. OCR confidence 98%",
    confidence_scores: { bpd: 0.99, hc: 0.98, ac: 0.96, fl: 0.99, efw: 0.97 }
  }
};

export const Dashboard: React.FC<{ onSelectPatient: (id: string) => void }> = ({ onSelectPatient }) => {
  const [showReviewQueue, setShowReviewQueue] = useState(true);
  const [confirmedMessage, setConfirmedMessage] = useState<string | null>(null);

  const handleConfirmReview = (payload: any) => {
    setShowReviewQueue(false);
    setConfirmedMessage("Đã xác nhận & đồng bộ hồ sơ sinh trắc chính thức vào CSDL thành công! Đã chạy mô hình phân tích RACA-Net.");
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '12px', color: '#3B82F6' }}>
            <Users size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Hồ Sơ Thai Kỳ Đang QL</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#F8FAFC' }}>128 Thai Phụ</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.15)', borderRadius: '12px', color: '#F59E0B' }}>
            <FileCheck size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Chờ Xác Nhận OCR</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#F8FAFC' }}>{showReviewQueue ? '1 Tệp Mới' : '0 Tệp'}</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '12px', color: '#EF4444' }}>
            <ShieldAlert size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Cảnh Báo Cờ Đỏ (RED)</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#EF4444' }}>3 Trường Hợp</div>
          </div>
        </div>
      </div>

      {/* Confirmation Barrier Feature Banner */}
      {confirmedMessage && (
        <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34D399' }}>
          ✓ {confirmedMessage}
        </div>
      )}

      {showReviewQueue && (
        <ReviewIngestQueue reviewData={MOCK_REVIEW_ITEM} onConfirm={handleConfirmReview} />
      )}

      {/* Patient Table */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity color="#06B6D4" size={20} /> Danh Sách Theo Dõi Thai Kỳ
          </h3>
          <button className="btn btn-primary">
            <UploadCloud size={18} /> Tải Tệp Cận Lâm Sàng Mới
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8' }}>
                <th style={{ padding: '12px 16px' }}>Mã / Họ Tên Thai Phụ</th>
                <th style={{ padding: '12px 16px' }}>Tuổi Thai</th>
                <th style={{ padding: '12px 16px' }}>Dự Sinh (EDD)</th>
                <th style={{ padding: '12px 16px' }}>Lần Khám Gần Nhất</th>
                <th style={{ padding: '12px 16px' }}>Mức Cảnh Báo</th>
                <th style={{ padding: '12px 16px' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_PATIENTS.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: '600', color: '#F8FAFC' }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{p.id}</div>
                  </td>
                  <td style={{ padding: '16px' }}>{p.ga_weeks} tuần</td>
                  <td style={{ padding: '16px' }}>{p.edd}</td>
                  <td style={{ padding: '16px' }}>{p.last_checkup}</td>
                  <td style={{ padding: '16px' }}>
                    <span className={`badge badge-${p.warning_level}`}>
                      ● {p.warning_level.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <button className="btn btn-secondary" onClick={() => onSelectPatient(p.id)}>
                      Xem Hồ Sơ <ArrowRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
