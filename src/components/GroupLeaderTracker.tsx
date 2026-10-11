import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Send,
  Eye,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Award,
  BellRing,
  Check,
  Copy,
} from 'lucide-react';
import { GroupSummary, UserRoleType } from '../types/discipline';

interface GroupLeaderTrackerProps {
  groups: GroupSummary[];
  currentWeekId: number;
  currentWeekName: string;
  currentRole: UserRoleType;
  assignedGroupIds?: number[];
  groupSubmissions?: Record<
    number,
    Record<number, { confirmed: boolean; confirmedAt: string; confirmedBy: string }>
  >;
  onConfirmGroupSubmission?: (groupId: number) => void;
  onSelectGroup: (groupId: number) => void;
  groupLeaders?: Record<number, string>;
  className?: string;
}

export const GroupLeaderTracker: React.FC<GroupLeaderTrackerProps> = ({
  groups,
  currentWeekId,
  currentWeekName,
  currentRole,
  assignedGroupIds,
  groupSubmissions,
  onConfirmGroupSubmission,
  onSelectGroup,
  groupLeaders,
  className = '9A3',
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filterMode, setFilterMode] = useState<'ALL' | 'RECORDED' | 'NOT_RECORDED'>('ALL');
  const [copiedGroupMsg, setCopiedGroupMsg] = useState<number | null>(null);

  const weekSubmissions = groupSubmissions?.[currentWeekId] || {};

  // Tính toán trạng thái ghi nhận cho 6 nhóm
  const groupStatuses = [1, 2, 3, 4, 5, 6].map((gId) => {
    const groupData = groups.find((g) => g.groupId === gId);
    const leaderName =
      groupLeaders?.[gId] ||
      groupData?.leaderName ||
      `Nhóm trưởng ${gId}`;

    // Kiểm tra xem nhóm đã có ghi nhận nào trong tuần chưa
    let violationCount = 0;
    let bonusCount = 0;
    let hasNoteCount = 0;

    if (groupData?.students) {
      groupData.students.forEach((s) => {
        const r = s.record;
        if (r) {
          const sumPenalty =
            (r.diTre || 0) +
            (r.nghiCP || 0) +
            (r.nghiKP || 0) +
            (r.boTiet || 0) +
            (r.ktbKlbKsb || 0) +
            (r.khongDongPhuc2 || 0) +
            (r.khongDongPhuc5 || 0) +
            (r.matTratTu || 0) +
            (r.khongThamGiaVS || 0) +
            (r.noiTuc || 0) +
            (r.xaRac || 0) +
            (r.trucVSBan || 0) +
            (r.huHongTS || 0) +
            (r.voLeGV || 0) +
            (r.dungDienThoai || 0);
          const sumBonus = (r.diemTot || 0) + (r.phatBieu || 0);

          violationCount += sumPenalty;
          bonusCount += sumBonus;
          if (r.note && r.note.trim().length > 0) hasNoteCount++;
        }
      });
    }

    const hasRecorded =
      violationCount > 0 ||
      bonusCount > 0 ||
      hasNoteCount > 0 ||
      !!weekSubmissions[gId]?.confirmed;

    const submissionInfo = weekSubmissions[gId];

    // Xác định xem người dùng hiện tại có phải nhóm trưởng nhóm này không
    const isLeaderOfThisGroup =
      currentRole === `nhomTruong${gId}` ||
      (currentRole.startsWith('nhomTruong') && assignedGroupIds?.includes(gId));

    return {
      groupId: gId,
      groupName: `Nhóm ${gId}`,
      leaderName,
      memberCount: groupData?.memberCount || 0,
      averageScore: groupData?.averageScore ?? 100,
      violationCount,
      bonusCount,
      hasRecorded,
      isConfirmed: !!submissionInfo?.confirmed,
      confirmedAt: submissionInfo?.confirmedAt,
      confirmedBy: submissionInfo?.confirmedBy,
      rank: groupData?.rank || gId,
      isLeaderOfThisGroup,
    };
  });

  const totalRecorded = groupStatuses.filter((g) => g.hasRecorded).length;
  const totalConfirmed = groupStatuses.filter((g) => g.isConfirmed).length;
  const isAllRecorded = totalRecorded === 6;

  const filteredGroups = groupStatuses.filter((g) => {
    if (filterMode === 'RECORDED') return g.hasRecorded;
    if (filterMode === 'NOT_RECORDED') return !g.hasRecorded;
    return true;
  });

  const handleCopyReminder = (g: (typeof groupStatuses)[0]) => {
    const msg = `📢 [Nhắc nhở Nề nếp Lớp ${className} - ${currentWeekName}]\nChào bạn ${g.leaderName} (Nhóm trưởng ${g.groupName})!\nHiện hệ thống chưa ghi nhận dữ liệu nề nếp thi đua tuần này của ${g.groupName}. Bạn vui lòng kiểm tra và ghi nhận thi đua các bạn trong nhóm để GVCN tổng kết nhé. Cảm ơn bạn!`;
    navigator.clipboard.writeText(msg);
    setCopiedGroupMsg(g.groupId);
    setTimeout(() => setCopiedGroupMsg(null), 3000);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden mb-6 transition-all">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-4 sm:p-5 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md border border-amber-300 shrink-0">
              <ShieldCheck className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full shadow-2xs">
                  Theo Dõi Nhóm Trưởng
                </span>
                <span className="text-xs text-blue-200 font-bold">
                  {currentWeekName} · Lớp {className}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                Tiến Độ Ghi Nhận Của 6 Nhóm Trưởng
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Huy hiệu tổng kết số nhóm đã nộp */}
            <div
              className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 shadow-xs ${
                isAllRecorded
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                  : totalRecorded >= 4
                  ? 'bg-blue-500/20 border-blue-400/40 text-blue-200'
                  : 'bg-amber-500/20 border-amber-400/40 text-amber-200'
              }`}
            >
              {isAllRecorded ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-300" />
              )}
              <span>
                {totalRecorded}/6 Nhóm Đã Ghi Nhận
              </span>
              {totalConfirmed > 0 && (
                <span className="text-[10px] text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded-md border border-amber-500/30 font-bold ml-1">
                  {totalConfirmed} đã chốt
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-all cursor-pointer"
              title={isExpanded ? 'Thu gọn tiến độ' : 'Mở rộng tiến độ'}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Thanh filter pills khi mở rộng */}
        {isExpanded && (
          <div className="flex items-center justify-between gap-2 flex-wrap mt-3.5 pt-3.5 border-t border-white/15 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-blue-200 font-semibold mr-1">
                Lọc trạng thái:
              </span>
              <button
                type="button"
                onClick={() => setFilterMode('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterMode === 'ALL'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Tất cả (6)
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('RECORDED')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  filterMode === 'RECORDED'
                    ? 'bg-emerald-400 text-slate-950 shadow-xs font-black'
                    : 'bg-white/10 text-emerald-300 hover:bg-white/20'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Đã ghi nhận ({totalRecorded})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('NOT_RECORDED')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  filterMode === 'NOT_RECORDED'
                    ? 'bg-amber-400 text-slate-950 shadow-xs font-black'
                    : 'bg-white/10 text-amber-300 hover:bg-white/20'
                }`}
              >
                <AlertCircle className="w-3 h-3" />
                <span>Chưa ghi nhận ({6 - totalRecorded})</span>
              </button>
            </div>

            <div className="text-[11px] text-blue-200/90 italic">
              💡 Cập nhật tức thì 2 chiều giữa điện thoại Nhóm trưởng và máy GVCN
            </div>
          </div>
        )}
      </div>

      {/* Grid 6 Thẻ Nhóm */}
      {isExpanded && (
        <div className="p-4 sm:p-5 bg-slate-50/70">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredGroups.map((g) => {
              return (
                <div
                  key={g.groupId}
                  className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                    g.isConfirmed
                      ? 'bg-gradient-to-br from-emerald-50/80 to-teal-50/80 border-emerald-300 shadow-xs'
                      : g.hasRecorded
                      ? 'bg-white border-blue-200 shadow-2xs hover:border-blue-400'
                      : 'bg-amber-50/50 border-amber-200/80 shadow-2xs'
                  }`}
                >
                  <div>
                    {/* Hàng trên: Nhóm và Huy hiệu Trạng thái */}
                    <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-700 text-white font-black text-xs flex items-center justify-center shrink-0">
                            {g.groupId}
                          </span>
                          <h4 className="text-sm font-black text-slate-900">
                            {g.groupName}
                          </h4>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {g.memberCount} HS
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 flex items-center gap-1 font-medium">
                          <span>Nhóm trưởng:</span>
                          <strong className="text-slate-900 font-bold">
                            {g.leaderName}
                          </strong>
                        </p>
                      </div>

                      {/* Huy hiệu tình trạng */}
                      <div className="shrink-0 text-right">
                        {g.isConfirmed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ĐÃ CHỐT SỔ
                          </span>
                        ) : g.hasRecorded ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 text-[10px] font-black">
                            <CheckCircle2 className="w-3 h-3 text-blue-600" />
                            ĐÃ GHI NHẬN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold animate-pulse">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            CHƯA CÓ DỮ LIỆU
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Chỉ số chi tiết */}
                    <div className="py-3 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-slate-100/80 p-2 rounded-xl">
                        <span className="text-[10px] text-slate-500 font-semibold block">
                          Điểm TB
                        </span>
                        <span className="font-mono font-black text-slate-900 text-sm">
                          {g.averageScore}
                        </span>
                      </div>
                      <div className="bg-rose-50 p-2 rounded-xl border border-rose-100">
                        <span className="text-[10px] text-rose-600 font-semibold block">
                          Vi phạm
                        </span>
                        <span className="font-mono font-black text-rose-700 text-sm">
                          {g.violationCount > 0 ? `-${g.violationCount}` : '0'}
                        </span>
                      </div>
                      <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                        <span className="text-[10px] text-emerald-600 font-semibold block">
                          Điểm tốt
                        </span>
                        <span className="font-mono font-black text-emerald-700 text-sm">
                          {g.bonusCount > 0 ? `+${g.bonusCount}` : '0'}
                        </span>
                      </div>
                    </div>

                    {/* Mốc thời gian chốt hoặc thông báo */}
                    {g.confirmedAt && (
                      <div className="text-[10px] text-emerald-700 font-medium pb-2 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        <span>
                          Chốt lúc {g.confirmedAt} bởi {g.confirmedBy}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Nút hành động */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onSelectGroup(g.groupId)}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-all cursor-pointer flex items-center gap-1"
                      title={`Xem chi tiết danh sách học sinh ${g.groupName}`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem nhóm</span>
                    </button>

                    {/* Nút dành cho Nhóm trưởng của nhóm này: Chốt sổ tuần */}
                    {(g.isLeaderOfThisGroup || currentRole === 'gvcn') && onConfirmGroupSubmission && (
                      <button
                        type="button"
                        onClick={() => onConfirmGroupSubmission(g.groupId)}
                        className={`px-2.5 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
                          g.isConfirmed
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 hover:scale-[1.02]'
                        }`}
                        title="Xác nhận nhóm đã hoàn tất kiểm tra và ghi nhận nề nếp tuần này"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          {g.isConfirmed ? 'Đã Chốt ✓' : 'Xác Nhận Nộp'}
                        </span>
                      </button>
                    )}

                    {/* Nút nhắc nhở nếu chưa ghi nhận (dành cho GVCN / Cán sự) */}
                    {!g.hasRecorded && currentRole === 'gvcn' && (
                      <button
                        type="button"
                        onClick={() => handleCopyReminder(g)}
                        className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-xl border border-amber-300 transition-all cursor-pointer flex items-center gap-1"
                        title="Sao chép tin nhắn nhắc nhở nhóm trưởng gửi qua Zalo"
                      >
                        {copiedGroupMsg === g.groupId ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Đã chép!</span>
                          </>
                        ) : (
                          <>
                            <BellRing className="w-3.5 h-3.5 text-amber-700" />
                            <span>Nhắc Zalo</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
