// web_doctor/src/components/DeletionRequestsReview.tsx
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { deletionApi } from '../services/deletion.service';
import { DeletionRequestItem } from '../types/deletion.types';

export const DeletionRequestsReview: React.FC = () => {
  const [requests, setRequests] = useState<DeletionRequestItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'pending' | 'all' | 'approved' | 'rejected'>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<DeletionRequestItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const data = await deletionApi.getRequests(activeFilter === 'all' ? undefined : activeFilter);
      setRequests(data);
    } catch (err) {
      console.error('Lỗi tải danh sách yêu cầu xóa:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeFilter]);

  const handleReviewAction = async (decision: 'approved' | 'rejected') => {
    if (!selectedRequest) return;
    try {
      setIsProcessing(true);
      setStatusMessage(null);
      await deletionApi.reviewRequest(selectedRequest.id, {
        status: decision,
        review_notes: reviewNotes.trim() || undefined,
      });

      setStatusMessage({
        type: 'success',
        text: decision === 'approved' ? 'Đã phê duyệt xóa hồ sơ thành công.' : 'Đã từ chối yêu cầu xóa hồ sơ.',
      });

      setSelectedRequest(null);
      setReviewNotes('');
      fetchRequests();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setStatusMessage({
        type: 'error',
        text: typeof detail === 'string' ? detail : 'Thao tác xét duyệt thất bại. Vui lòng kiểm tra thẩm quyền.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-800">
            <ShieldCheck className="w-5 h-5 text-[#4D7D74]" />
            <h2 className="text-sm font-bold">Danh sách yêu cầu xét duyệt</h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
              {requests.length}
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-medium self-start sm:self-auto">
            {(['pending', 'all', 'approved', 'rejected'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeFilter === filter
                    ? 'bg-white text-slate-800 font-semibold shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {filter === 'pending'
                  ? 'Chờ duyệt'
                  : filter === 'all'
                  ? 'Tất cả'
                  : filter === 'approved'
                  ? 'Đã duyệt'
                  : 'Đã từ chối'}
              </button>
            ))}
          </div>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">Đang tải danh sách yêu cầu...</div>
        ) : requests.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">Không có yêu cầu xóa nào ở trạng thái này.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
                  <th className="py-3.5 px-4">Thai phụ yêu cầu</th>
                  <th className="py-3.5 px-4">Lý do y khoa</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Thai phụ */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-800">{item.requester_name}</div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(item.created_at).toLocaleString('vi-VN')}
                      </div>
                    </td>

                    {/* Lý do */}
                    <td className="py-4 px-4 max-w-xs">
                      <p className="line-clamp-2 text-slate-700 leading-relaxed">{item.reason}</p>
                    </td>

                    {/* Trạng thái */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {item.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3" /> Chờ xét duyệt
                        </span>
                      ) : item.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Đã duyệt xóa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                          <XCircle className="w-3 h-3" /> Đã từ chối
                        </span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      {item.status === 'pending' ? (
                        <button
                          onClick={() => {
                            setSelectedRequest(item);
                            setReviewNotes('');
                          }}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#345C59] hover:bg-[#2A4B48] transition-colors shadow-xs"
                        >
                          Thẩm định
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          Duyệt bởi: {item.reviewed_by_name || 'N/A'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Thẩm định (Review Action Modal) */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#4D7D74]" /> Thẩm định Yêu cầu Xóa Hồ sơ
              </h3>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl text-xs space-y-1.5 border border-slate-200/80">
              <div><b>Thai phụ:</b> {selectedRequest.requester_name}</div>
              <div><b>Phạm vi:</b> {selectedRequest.target_type === 'full_profile' ? 'Toàn bộ hồ sơ' : 'Một lần khám'}</div>
              <div><b>Lý do xóa:</b> {selectedRequest.reason}</div>
              <div>
                <b>Đồng thuận AI RACA-Net:</b>{' '}
                {selectedRequest.allow_anonymized_research
                  ? 'Cho phép giữ chuỗi số đo ẩn danh cho mô hình'
                  : 'Từ chối (Yêu cầu loại bỏ vĩnh viễn khỏi tập dữ liệu AI)'}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Ghi chú chuyên môn lâm sàng (Lý do duyệt hoặc từ chối):
              </label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Ví dụ: Đã đối chiếu với sản phụ, đồng ý xóa mềm hồ sơ theo nguyện vọng..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4D7D74] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleReviewAction('rejected')}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
              >
                Từ chối xóa
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleReviewAction('approved')}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors"
              >
                {isProcessing ? 'Đang xử lý...' : 'Phê duyệt xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};