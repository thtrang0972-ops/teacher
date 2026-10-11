import React, { useState } from 'react';
import {
  X,
  Copy,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  FileCheck2,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { WeekInfo } from '../types/discipline';

interface CopyWeekDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  weeks: WeekInfo[];
  currentWeekId: number;
  onCopyWeekData: (
    fromWeekId: number,
    toWeekId: number,
    options: {
      copyRecords: boolean;
      copySubmissions: boolean;
      copyRemarks: boolean;
      switchWeek: boolean;
    }
  ) => void;
}

export const CopyWeekDataModal: React.FC<CopyWeekDataModalProps> = ({
  isOpen,
  onClose,
  weeks,
  currentWeekId,
  onCopyWeekData,
}) => {
  const [fromWeekId, setFromWeekId] = useState<number>(6);
  const [toWeekId, setToWeekId] = useState<number>(5);
  const [copyRecords, setCopyRecords] = useState(true);
  const [copySubmissions, setCopySubmissions] = useState(true);
  const [copyRemarks, setCopyRemarks] = useState(true);
  const [switchWeek, setSwitchWeek] = useState(true);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromWeekId === toWeekId) {
      alert('Tuần nguồn và Tuần đích không được trùng nhau!');
      return;
    }

    onCopyWeekData(fromWeekId, toWeekId, {
      copyRecords,
      copySubmissions,
      copyRemarks,
      switchWeek,
    });

    const fromName = weeks.find((w) => w.id === fromWeekId)?.name || `Tuần ${fromWeekId}`;
    const toName = weeks.find((w) => w.id === toWeekId)?.name || `Tuần ${toWeekId}`;
    setSuccessNotice(`Đã chuyển toàn bộ dữ liệu từ ${fromName} sang ${toName} thành công!`);

    setTimeout(() => {
      setSuccessNotice(null);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-['Be_Vietnam_Pro',sans-serif]">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Sao Chép / Chuyển Dữ Liệu Giữa Các Tuần
              </h3>
              <p className="text-[11px] text-slate-500">
                Khắc phục khi nhập nhầm tuần hoặc sao chép dữ liệu nề nếp
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-700">
          {/* Hướng dẫn an toàn */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-blue-950">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Chuyển dữ liệu nề nếp an toàn:</span>
            </p>
            <p className="text-[11px] leading-relaxed text-blue-800">
              Nếu bạn lỡ ghi nhận dữ liệu ở một tuần khác (ví dụ: ghi nhầm vào <strong>Tuần 6</strong> thay vì <strong>Tuần 5</strong>), hệ thống sẽ sao chép toàn bộ dữ liệu học sinh sang tuần mới mà <strong>vẫn giữ nguyên dữ liệu gốc</strong>.
            </p>
          </div>

          {/* Chọn tuần nguồn và đích */}
          <div className="grid grid-cols-2 gap-3 items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Sao chép TỪ (Tuần nguồn):
              </label>
              <select
                value={fromWeekId}
                onChange={(e) => setFromWeekId(Number(e.target.value))}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {weeks.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.id === currentWeekId ? '(Hiện tại)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Chuyển SANG (Tuần đích):
              </label>
              <select
                value={toWeekId}
                onChange={(e) => setToWeekId(Number(e.target.value))}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {weeks.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.id === 5 ? '★ Tuần 5' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tùy chọn dữ liệu muốn sao chép */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-black text-slate-800 uppercase tracking-wide block">
              Dữ liệu cần sao chép:
            </span>

            <label className="flex items-center gap-2.5 p-2 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={copyRecords}
                onChange={(e) => setCopyRecords(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <div>
                <p className="font-bold text-slate-900 text-xs">
                  Điểm & lỗi vi phạm của tất cả học sinh
                </p>
                <p className="text-[10px] text-slate-500">
                  Bao gồm: phát biểu, điểm tốt, đi trễ, mất trật tự, bài tập, đồng phục...
                </p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-2 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={copySubmissions}
                onChange={(e) => setCopySubmissions(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <div>
                <p className="font-bold text-slate-900 text-xs">
                  Trạng thái nộp báo cáo của 6 Nhóm trưởng
                </p>
                <p className="text-[10px] text-slate-500">
                  Bao gồm xác nhận hoàn thành, thời gian nộp và người nộp của 6 nhóm
                </p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-2 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={copyRemarks}
                onChange={(e) => setCopyRemarks(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <div>
                <p className="font-bold text-slate-900 text-xs">
                  Nhận xét của Ban cán sự & 6 Nhóm trưởng
                </p>
                <p className="text-[10px] text-slate-500">
                  Nhận xét học tập, lao động, kỷ luật, lớp trưởng và lời dặn GVCN
                </p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-2 bg-indigo-50/70 rounded-lg border border-indigo-200 cursor-pointer">
              <input
                type="checkbox"
                checked={switchWeek}
                onChange={(e) => setSwitchWeek(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <div>
                <p className="font-bold text-indigo-950 text-xs">
                  Tự động chuyển sang xem Tuần đích ({weeks.find((w) => w.id === toWeekId)?.name || `Tuần ${toWeekId}`})
                </p>
                <p className="text-[10px] text-indigo-700">
                  Mở ngay tuần vừa sao chép xong để bạn kiểm tra kết quả ngay lập tức
                </p>
              </div>
            </label>
          </div>

          {/* Thông báo thành công */}
          {successNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Thực hiện sao chép ngay</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
