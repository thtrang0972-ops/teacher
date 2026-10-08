import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Users,
  MessageSquare,
  ArrowRight,
  RefreshCw,
  Info,
  Calendar,
  Filter,
  Flame,
  Award,
} from 'lucide-react';
import {
  Student,
  CalculatedStudentScore,
  WeekInfo,
  ClassMetadata,
  MorningDutyRecord,
  AfternoonRecord,
} from '../types/discipline';
import { EarlyWarningItem, EarlyWarningsResponse, WarningLevel } from '../types/ai';
import { fetchEarlyWarnings } from '../services/aiService';

interface AIEarlyWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  weeks: WeekInfo[];
  currentWeekId: number;
  calculatedScores: CalculatedStudentScore[];
  metadata: ClassMetadata;
  morningDuties?: MorningDutyRecord[];
  afternoonSessions?: AfternoonRecord[];
  weeklyRecords?: Record<number, Record<string, any>>;
  onOpenParentMessageForStudent?: (studentId: string) => void;
}

export const AIEarlyWarningModal: React.FC<AIEarlyWarningModalProps> = ({
  isOpen,
  onClose,
  students,
  weeks,
  currentWeekId,
  calculatedScores,
  metadata,
  morningDuties = [],
  afternoonSessions = [],
  weeklyRecords = {},
  onOpenParentMessageForStudent,
}) => {
  const [warnings, setWarnings] = useState<EarlyWarningItem[]>([]);
  const [classInsight, setClassInsight] = useState<string>('');
  const [topPriorities, setTopPriorities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<'all' | WarningLevel>('all');

  // Chuẩn bị dữ liệu lịch sử các tuần để gửi lên AI phân tích xu hướng
  const prepareHistoryPayload = () => {
    // Thu thập dữ liệu các tuần gần đây (tối đa 4 tuần)
    const recentWeeks = weeks.slice(Math.max(0, currentWeekId - 4), currentWeekId);

    return recentWeeks.map((w) => {
      // Tính điểm tóm tắt của tuần đó
      const wDuties = morningDuties.filter((m) => m.weekId === w.id);
      const wAfternoons = afternoonSessions.filter((a) => a.weekId === w.id);

      const studentScoresSummary = students.map((s) => {
        const cs = calculatedScores.find((c) => c.student.id === s.id);
        return {
          studentId: s.id,
          studentName: s.name,
          groupId: s.groupId,
          finalScore: cs?.finalScore ?? 100,
          totalPenalty: cs?.totalPenalty ?? 0,
          totalBonus: cs?.totalBonus ?? 0,
          classification: cs?.classification ?? 'Tốt',
          violations: {
            ktbKlbKsb: cs?.record?.ktbKlbKsb || 0,
            diTre: cs?.record?.diTre || 0,
            matTratTu: cs?.record?.matTratTu || 0,
            nghiKP: cs?.record?.nghiKP || 0,
            nghiCP: cs?.record?.nghiCP || 0,
          },
        };
      });

      return {
        weekId: w.id,
        weekName: w.name,
        scores: studentScoresSummary,
        morningDutiesCount: wDuties.length,
        afternoonSessionsCount: wAfternoons.length,
      };
    });
  };

  const handleRunAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const historyPayload = prepareHistoryPayload();
      const res: EarlyWarningsResponse = await fetchEarlyWarnings({
        students,
        weeklyHistory: historyPayload,
        currentWeekId,
        metadata: {
          className: metadata.className || '9A3',
          schoolName: metadata.schoolName || 'Trường TH và THCS Phước Hưng',
          homeroomTeacher: metadata.homeroomTeacher || 'Cô Nguyễn Thị Thuỳ Trang',
        },
      });

      setWarnings(res.warnings || []);
      setClassInsight(res.overallClassInsight || '');
      setTopPriorities(res.topPriorities || []);
    } catch (err: any) {
      console.error('Lỗi chạy phân tích cảnh báo sớm:', err);
      setError(err.message || 'Không thể tải phân tích cảnh báo. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && warnings.length === 0) {
      handleRunAnalysis();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredWarnings = warnings.filter((w) => {
    if (filterLevel === 'all') return true;
    return w.level === filterLevel;
  });

  const highCount = warnings.filter((w) => w.level === 'high').length;
  const mediumCount = warnings.filter((w) => w.level === 'medium').length;
  const positiveCount = warnings.filter((w) => w.level === 'positive').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs font-['Be_Vietnam_Pro',sans-serif] animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header Modal */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                Hệ Thống Phân Tích Cảnh Báo Sớm
                <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider leading-none shadow-xs">
                  AI
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Tự động nhận diện học sinh sa sút nề nếp & khích lệ học sinh tiến bộ qua nhiều tuần
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thanh trạng thái & bộ lọc */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Lọc cảnh báo:
            </span>
            <button
              onClick={() => setFilterLevel('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterLevel === 'all'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Tất cả ({warnings.length})
            </button>
            <button
              onClick={() => setFilterLevel('high')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterLevel === 'high'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Báo động đỏ ({highCount})
            </button>
            <button
              onClick={() => setFilterLevel('medium')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterLevel === 'medium'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Cần lưu ý ({mediumCount})
            </button>
            <button
              onClick={() => setFilterLevel('positive')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterLevel === 'positive'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Tiến bộ ({positiveCount})
            </button>
          </div>

          <button
            onClick={handleRunAnalysis}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>{isLoading ? 'Đang phân tích...' : 'Phân tích lại'}</span>
          </button>
        </div>

        {/* Nội dung danh sách cảnh báo */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Khối Đánh giá khái quát chung của AI */}
          {classInsight && (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Nhận định tổng quan tình hình lớp tuần này (AI Insight):</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                {classInsight}
              </p>
              {topPriorities && topPriorities.length > 0 && (
                <div className="pt-2 border-t border-amber-200/80 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-amber-900">Ưu tiên xử lý:</span>
                  {topPriorities.map((p, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-white border border-amber-300 text-slate-800 shadow-2xs"
                    >
                      <span className="text-amber-600 font-bold">#{idx + 1}</span> {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full border-3 border-blue-600 border-t-transparent animate-spin mx-auto"></div>
              <p className="text-sm font-bold text-slate-700">Gemini đang phân tích biểu đồ và lịch sử điểm số...</p>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Hệ thống đang quét các lỗi lặp lại, dấu hiệu sa sút và so sánh hiệu suất rèn luyện giữa các tuần để đưa ra khuyến nghị sư phạm.
              </p>
            </div>
          ) : filteredWarnings.length === 0 ? (
            <div className="py-12 text-center space-y-2 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Không có cảnh báo nào trong mục này</h4>
              <p className="text-xs text-slate-600">
                Tất cả học sinh đều duy trì phong độ tốt hoặc không có trường hợp bất thường đáng báo động.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWarnings.map((item) => {
                const isHigh = item.level === 'high';
                const isMedium = item.level === 'medium';
                const isPositive = item.level === 'positive';

                const borderClass = isHigh
                  ? 'border-rose-300 bg-rose-50/40'
                  : isMedium
                  ? 'border-amber-300 bg-amber-50/40'
                  : 'border-emerald-300 bg-emerald-50/40';

                const badgeClass = isHigh
                  ? 'bg-rose-600 text-white'
                  : isMedium
                  ? 'bg-amber-500 text-white'
                  : 'bg-emerald-600 text-white';

                const badgeText = isHigh
                  ? 'BÁO ĐỘNG ĐỎ'
                  : isMedium
                  ? 'CẦN LƯU Ý'
                  : 'TIẾN BỘ RÕ RỆT';

                const Icon = isHigh ? Flame : isMedium ? AlertTriangle : Award;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border ${borderClass} shadow-2xs hover:shadow-xs transition-shadow flex flex-col sm:flex-row items-start justify-between gap-4`}
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider ${badgeClass} flex items-center gap-1`}>
                          <Icon className="w-3 h-3" />
                          {badgeText}
                        </span>
                        <span className="font-bold text-slate-900 text-sm sm:text-base">
                          {item.title}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-200 text-slate-700">
                          Nhóm {item.groupId}
                        </span>
                        {item.trendData && (
                          <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-white border border-slate-300 text-slate-800 flex items-center gap-1">
                            {isHigh ? (
                              <TrendingDown className="w-3 h-3 text-rose-600" />
                            ) : (
                              <TrendingUp className="w-3 h-3 text-emerald-600" />
                            )}
                            {item.trendData}
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                        {item.description}
                      </p>

                      {/* Đề xuất giải pháp sư phạm */}
                      <div className="p-2.5 rounded-lg bg-white/80 border border-slate-200/80 text-xs text-slate-800 space-y-1">
                        <span className="font-bold text-blue-800 block flex items-center gap-1">
                          <Info className="w-3.5 h-3.5" /> Khuyến nghị sư phạm cho GVCN:
                        </span>
                        <p className="text-slate-600 leading-normal">{item.recommendation}</p>
                      </div>
                    </div>

                    {/* Tác vụ nhanh: Soạn tin nhắn gửi phụ huynh ngay */}
                    <div className="shrink-0 flex sm:flex-col gap-2 w-full sm:w-auto">
                      {onOpenParentMessageForStudent && item.studentId && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenParentMessageForStudent(item.studentId);
                          }}
                          className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 border border-amber-500/60 shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                          <span>Soạn tin gửi PH</span>
                          <span className="bg-red-600 text-white text-[9px] px-1 py-0.2 rounded font-black tracking-wider leading-none shadow-xs">
                            AI
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-600">
            Dữ liệu được phân tích bảo mật nội bộ dành riêng cho Giáo viên Chủ nhiệm Lớp {metadata.className || '9A3'}.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
