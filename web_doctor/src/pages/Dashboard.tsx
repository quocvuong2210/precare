import React from 'react';
import { Users, Calendar, AlertTriangle, FileText } from 'lucide-react';

interface PatientAppointment {
  id: string;
  name: string;
  gestational_age: string;
  time: string;
  reason: string;
  ocr_status: 'confirmed' | 'pending';
}

const APPOINTMENTS: PatientAppointment[] = [
  {
    id: 'prof-001',
    name: 'Nguyễn Thảo Chi',
    gestational_age: '32 tuần',
    time: '08:30 AM',
    reason: 'Khám định kỳ + Siêu âm',
    ocr_status: 'confirmed',
  },
  {
    id: 'prof-002',
    name: 'Phạm Minh Thư',
    gestational_age: '18 tuần',
    time: '09:15 AM',
    reason: 'Xét nghiệm sinh hóa',
    ocr_status: 'pending',
  },
  {
    id: 'prof-003',
    name: 'Trần Hồng Nhung',
    gestational_age: '36 tuần',
    time: '10:00 AM',
    reason: 'Theo dõi huyết áp cao',
    ocr_status: 'confirmed',
  },
];

interface DashboardProps {
  onSelectPatient: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectPatient }) => {
  return (
    <div className="space-y-6">
      {/* Top 4 KPI / Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Tổng thai phụ quản lý */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-slate-600">Tổng thai phụ quản lý</span>
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-800 tracking-tight">248</div>
            <p className="text-xs font-medium text-teal-600 mt-2">Tăng 8 thai kỳ mới tuần này</p>
          </div>
        </div>

        {/* Card 2: Lượt khám hôm nay */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-slate-600">Lượt khám hôm nay</span>
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-800 tracking-tight">18</div>
            <p className="text-xs text-slate-500 mt-2">Đã hoàn thành 12 ca</p>
          </div>
        </div>

        {/* Card 3: Cảnh báo chờ xử lý */}
        <div className="bg-[#FFF5F5] rounded-2xl p-5 border border-red-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-rose-600">Cảnh báo chờ xử lý</span>
            <div className="w-10 h-10 rounded-xl bg-red-100/70 flex items-center justify-center text-rose-500">
              <AlertTriangle className="w-5 h-5" />
            </div>  
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-rose-500 tracking-tight">04</div>
            <p className="text-xs font-normal text-rose-500/90 mt-2">2 ca nguy cơ cao (Tiền sản giật / Nhau tiền đạo)</p>
          </div>
        </div>

        {/* Card 4: Phiếu OCR chờ xác nhận */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-slate-600">Phiếu OCR chờ xác nhận</span>
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-800 tracking-tight">07</div>
            <p className="text-xs text-slate-500 mt-2">Độ chính xác trung bình 96%</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Lịch khám hôm nay & Bảng phân loại nguy cơ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Lịch khám hôm nay (Width ~ 68%) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between pb-5 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800">Lịch khám hôm nay (18 thai phụ)</h2>
            <button className="text-sm font-medium text-teal-700 hover:text-teal-800 hover:underline">
              Xem tất cả
            </button>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="text-xs text-slate-500 font-semibold border-b border-slate-100">
                  <th className="py-3.5 px-2 font-medium">Họ và tên</th>
                  <th className="py-3.5 px-2 font-medium">Tuổi thai</th>
                  <th className="py-3.5 px-2 font-medium">Giờ khám</th>
                  <th className="py-3.5 px-2 font-medium">Lý do khám</th>
                  <th className="py-3.5 px-2 font-medium">Trạng thái OCR</th>
                  <th className="py-3.5 px-2 font-medium text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {APPOINTMENTS.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-2 font-bold text-slate-800 whitespace-nowrap">
                      {item.name}
                    </td>
                    <td className="py-4 px-2 text-slate-600 whitespace-nowrap">
                      {item.gestational_age}
                    </td>
                    <td className="py-4 px-2 text-slate-600 whitespace-nowrap font-medium">
                      {item.time}
                    </td>
                    <td className="py-4 px-2 text-slate-600">
                      {item.reason}
                    </td>
                    <td className="py-4 px-2 whitespace-nowrap">
                      {item.ocr_status === 'confirmed' ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-emerald-100/70 text-emerald-700">
                          Đã xác nhận
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-rose-100/70 text-rose-600">
                          Chờ duyệt
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-2 text-center whitespace-nowrap">
                      <button
                        onClick={() => onSelectPatient(item.id)}
                        className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-[#345C59] hover:bg-[#2A4B48] transition-colors shadow-sm cursor-pointer"
                      >
                        Xem bệnh án
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Bảng phân loại nguy cơ (Width ~ 32%) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800">Bảng phân loại nguy cơ</h2>

          <div className="space-y-3.5 pt-1">
            {/* 1. Nguy cơ cao */}
            <div className="bg-[#FEF2F2] border border-rose-200/70 rounded-xl p-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shrink-0"></span>
                <span className="text-xs font-bold text-rose-600 tracking-tight">
                  NGUY CƠ CAO (CẤP BÁCH)
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pl-4.5">
                02 trường hợp nghi ngờ tiền sản giật, huyết áp đo được &gt; 140/90 mmHg.
              </p>
            </div>

            {/* 2. Cần theo dõi sát */}
            <div className="bg-[#FEFCE8] border border-amber-200/70 rounded-xl p-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shrink-0"></span>
                <span className="text-xs font-bold text-amber-600 tracking-tight">
                  CẦN THEO DÕI SÁT
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pl-4.5">
                05 thai kỳ chậm phát triển trong tử cung (bách phân vị &lt; bách phân vị thứ 10).
              </p>
            </div>

            {/* 3. Bình thường / Khỏe mạnh */}
            <div className="bg-[#F0FDF4] border border-emerald-200/70 rounded-xl p-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shrink-0"></span>
                <span className="text-xs font-bold text-emerald-600 tracking-tight">
                  BÌNH THƯỜNG / KHỎE MẠNH
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pl-4.5">
                241 thai phụ ghi nhận thể trạng và chỉ số thai nhi phát triển đồng đều.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
