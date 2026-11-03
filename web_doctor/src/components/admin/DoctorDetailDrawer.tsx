import React, { useState } from 'react';
import { AdminUser } from '../../types/admin.types';
import { StatusBadge } from './StatusBadge';
import {
  X,
  Stethoscope,
  Building2,
  FileCheck2,
  Phone,
  Mail,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ZoomIn,
  History,
} from 'lucide-react';

export interface DoctorDetailDrawerProps {
  user: AdminUser | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (user: AdminUser) => void;
  onReject: (user: AdminUser) => void;
}

export const DoctorDetailDrawer: React.FC<DoctorDetailDrawerProps> = ({
  user,
  isOpen,
  onClose,
  onApprove,
  onReject,
}) => {
  const [isZoomImage, setIsZoomImage] = useState(false);

  if (!isOpen || !user) return null;

  const profile = (user as any).doctor_profile;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-xl bg-white shadow-xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Header Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-[#117366] flex items-center justify-center font-bold">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Chi tiết Hồ sơ Bác sĩ</h2>
              <p className="text-[11px] text-slate-500">Đối chiếu và thẩm định chứng chỉ hành nghề</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Doctor Header Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#117366] text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'B'}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 truncate">{user.full_name}</h3>
                <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{user.hospital || profile?.hospital || 'Chưa cập nhật đơn vị'}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-row sm:flex-col items-start sm:items-end gap-1.5 shrink-0">
              <StatusBadge status={(user as any).profile_status || (user as any).approval_status || user.status || 'active'} />
            </div>
          </div>

          {/* Contact & Account info */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Thông tin liên hệ & Tài khoản
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-400 block">Email</span>
                  <span className="font-medium text-slate-800 truncate block">{user.email}</span>
                </div>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-400 block">Số điện thoại</span>
                  <span className="font-mono text-slate-800 block">
                    {user.phone_number || '--'}
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-400 block">Ngày gửi hồ sơ</span>
                  <span className="text-slate-800 block">{user.created_at}</span>
                </div>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-400 block">Trạng thái tài khoản</span>
                  <StatusBadge status={user.status} />
                </div>
              </div>
            </div>
          </div>

          {/* Professional Credentials */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Chứng chỉ hành nghề y tế (CCHN)
              </h4>
              <span className="text-xs font-mono text-[#117366] font-bold">
                {user.license_number || profile?.license_number || 'Chưa cung cấp'}
              </span>
            </div>

            <div className="p-3.5 bg-teal-50/40 border border-teal-200 rounded-xl space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <span className="text-[11px] text-slate-500 block">Cơ quan cấp:</span>
                  <span className="font-medium text-slate-800">
                    {profile?.issue_place || 'Sở Y Tế / Bộ Y Tế'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Ngày cấp phép:</span>
                  <span className="font-medium text-slate-800">{profile?.issue_date || '15/03/2021'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Khoa / Đơn vị:</span>
                  <span className="font-medium text-slate-800">
                    {profile?.department || 'Khoa Sản'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Cơ sở công tác:</span>
                  <span className="font-medium text-slate-800">
                    {profile?.hospital || user.hospital || 'Bệnh viện'}
                  </span>
                </div>
              </div>

              {/* Certificate image scan preview */}
              <div className="pt-2.5 border-t border-teal-200/60">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5 text-[#117366]" />
                    <span>Bản quét Chứng chỉ hành nghề</span>
                  </span>
                  <button
                    onClick={() => setIsZoomImage(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#117366] hover:underline cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>Phóng to</span>
                  </button>
                </div>

                <div
                  onClick={() => setIsZoomImage(true)}
                  className="relative group h-44 w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-300 shadow-inner cursor-pointer"
                >
                  <img
                    src={
                      profile?.certificate_image_url ||
                      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80'
                    }
                    alt="Chứng chỉ hành nghề"
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200 opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end justify-between p-2.5">
                    <div className="text-white text-[11px]">
                      <span className="font-semibold block">
                        CCHN: {user.license_number || 'CCHN-019842/BYT'}
                      </span>
                      <span className="text-slate-300 text-[10px]">Nhấp để xem ảnh đầy đủ</span>
                    </div>
                    <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded text-white text-[10px] font-medium">
                      Bản mẫu
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              <span>Lịch sử thẩm định</span>
            </h4>

            {profile?.processing_history && profile.processing_history.length > 0 ? (
              <div className="space-y-1.5">
                {(profile.processing_history as any[]).map((h: any, i: number) => (
                  <div
                    key={i}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{h.action}</span>
                      <span className="text-[10px] font-mono text-slate-400">{h.timestamp}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">Người thực hiện: {h.actor}</div>
                    {h.note && (
                      <div className="text-[11px] text-slate-700 bg-white p-2 rounded border border-slate-200 mt-1">
                        "{h.note}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 italic">
                Chưa có lịch sử xử lý trước đó. Hồ sơ được tạo mới.
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-slate-200 bg-white flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Đóng lại
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onReject(user)}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Từ chối hồ sơ</span>
            </button>

            <button
              type="button"
              onClick={() => onApprove(user)}
              className="inline-flex items-center gap-1 h-8 px-3.5 rounded-lg text-xs font-medium text-white bg-[#117366] hover:bg-[#0e5c52] transition-colors cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span>Phê duyệt hồ sơ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {isZoomImage && (
        <div
          className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsZoomImage(false)}
        >
          <div
            className="max-w-3xl w-full bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="font-semibold text-xs block">
                  Bản quét Chứng chỉ hành nghề: {user.license_number || 'CCHN-019842/BYT'}
                </span>
                <span className="text-[11px] text-slate-400">
                  Bác sĩ: {user.full_name} • {user.hospital || 'Bệnh viện'}
                </span>
              </div>
              <button
                onClick={() => setIsZoomImage(false)}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto p-3 bg-slate-950 flex items-center justify-center">
              <img
                src={
                  profile?.certificate_image_url ||
                  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&auto=format&fit=crop&q=80'
                }
                alt="Chứng chỉ phóng to"
                className="max-w-full max-h-[65vh] object-contain rounded border border-slate-700 shadow-md"
              />
            </div>
            <div className="p-2.5 bg-slate-900 text-slate-400 text-xs flex items-center justify-between border-t border-slate-800">
              <span>Định dạng: Scan y tế chất lượng cao</span>
              <button
                onClick={() => setIsZoomImage(false)}
                className="h-7 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DoctorDetailDrawer;
