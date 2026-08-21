import React, { useState } from 'react';
import { UploadedFileReview } from '../types';
import { CheckCircle, AlertTriangle, Edit3, Eye, FileText } from 'lucide-react';

interface ReviewIngestQueueProps {
  reviewData: UploadedFileReview;
  onConfirm: (payload: {
    uploaded_file_id: string;
    checkup_id: string;
    bpd?: number;
    hc?: number;
    ac?: number;
    fl?: number;
    efw?: number;
    corrections?: Record<string, any>;
  }) => void;
}

export const ReviewIngestQueue: React.FC<ReviewIngestQueueProps> = ({ reviewData, onConfirm }) => {
  const extracted = reviewData.ocr_raw_payload?.extracted_fields || {};
  
  const [bpd, setBpd] = useState<number | string>(extracted.bpd_mm || '');
  const [hc, setHc] = useState<number | string>(extracted.hc_mm || '');
  const [ac, setAc] = useState<number | string>(extracted.ac_mm || '');
  const [fl, setFl] = useState<number | string>(extracted.fl_mm || '');
  const [efw, setEfw] = useState<number | string>(extracted.efw_g || '');

  const [hasEdited, setHasEdited] = useState(false);

  const handleConfirm = () => {
    onConfirm({
      uploaded_file_id: reviewData.uploaded_file_id,
      checkup_id: reviewData.checkup_id || 'dummy-checkup-id',
      bpd: bpd ? Number(bpd) : undefined,
      hc: hc ? Number(hc) : undefined,
      ac: ac ? Number(ac) : undefined,
      fl: fl ? Number(fl) : undefined,
      efw: efw ? Number(efw) : undefined,
      corrections: hasEdited ? { bpd, hc, ac, fl, efw } : undefined
    });
  };

  return (
    <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #3B82F6' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText color="#3B82F6" size={20} />
            <h3 style={{ fontSize: '1.2rem', color: '#F8FAFC' }}>Màn Hình Duyệt OCR - Màn Hình Xác Nhận (Confirmation Barrier)</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '4px' }}>
            Ràng buộc hệ thống: Kết quả trích xuất OCR bắt buộc phải qua Bác sĩ kiểm tra trước khi ghi vào hồ sơ chính thức (`biometric_data`).
          </p>
        </div>
        <span className="badge badge-yellow">
          <AlertTriangle size={14} /> PENDING CONFIRMATION
        </span>
      </div>

      <div className="grid-cols-2">
        {/* Left Column: Raw OCR View / Text */}
        <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h4 style={{ color: '#06B6D4', fontSize: '0.95rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Eye size={16} /> Ảnh/Tệp Cận Lâm Sàng & Kết Quả OCR Thô
          </h4>
          <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'monospace', color: '#CBD5E1', marginBottom: '12px' }}>
            {reviewData.ocr_raw_payload?.raw_text || 'Đang trích xuất OCR...'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
            <b>Độ tin cậy trích xuất OCR:</b> EFW: 97%, BPD: 99%, HC: 98%, AC: 96%, FL: 99%
          </div>
        </div>

        {/* Right Column: Editable Verification Form */}
        <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h4 style={{ color: '#34D399', fontSize: '0.95rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Edit3 size={16} /> Đối Chiếu & Điền Chỉ Số Lâm Sàng Duyệt
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#94A3B8' }}>BPD - Đường kính lưỡng đỉnh (mm)</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                value={bpd}
                onChange={(e) => { setBpd(e.target.value); setHasEdited(true); }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#94A3B8' }}>HC - Chu vi đầu (mm)</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                value={hc}
                onChange={(e) => { setHc(e.target.value); setHasEdited(true); }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#94A3B8' }}>AC - Chu vi bụng (mm)</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                value={ac}
                onChange={(e) => { setAc(e.target.value); setHasEdited(true); }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#94A3B8' }}>FL - Chiều dài xương đùi (mm)</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                value={fl}
                onChange={(e) => { setFl(e.target.value); setHasEdited(true); }}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.8rem', color: '#94A3B8' }}>EFW - Cân nặng ước tính (grams)</label>
              <input
                type="number"
                step="1"
                className="form-input"
                style={{ fontWeight: 'bold', color: '#38BDF8' }}
                value={efw}
                onChange={(e) => { setEfw(e.target.value); setHasEdited(true); }}
              />
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button className="btn btn-primary btn-success" onClick={handleConfirm}>
              <CheckCircle size={18} /> Xác Nhận & Ghi Vào CSDL Chính Thức
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
