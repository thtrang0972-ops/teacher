import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  Send,
  Copy,
  Check,
  Mail,
  MessageSquare,
  User,
  AlertTriangle,
  Award,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  Student,
  CalculatedStudentScore,
  WeekInfo,
  ClassMetadata,
  MorningDutyRecord,
  AfternoonRecord,
} from '../types/discipline';
import { AIMessageTone, StudentViolationsSummary, ParentMessageResult } from '../types/ai';
import { fetchParentMessage } from '../services/aiService';

interface AIParentMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  currentWeek: WeekInfo;
  calculatedScores: CalculatedStudentScore[];
  metadata: ClassMetadata;
  morningDuties?: MorningDutyRecord[];
  afternoonSessions?: AfternoonRecord[];
  initialStudentId?: string | null;
}

export const AIParentMessageModal: React.FC<AIParentMessageModalProps> = ({
  isOpen,
  onClose,
  students,
  currentWeek,
  calculatedScores,
  metadata,
  morningDuties = [],
  afternoonSessions = [],
  initialStudentId,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [tone, setTone] = useState<AIMessageTone>('encouraging');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kết quả do AI sinh ra (có thể chỉnh sửa trực tiếp)
  const [zaloDraft, setZaloDraft] = useState('');
  const [emailSubjectDraft, setEmailSubjectDraft] = useState('');
  const [emailBodyDraft, setEmailBodyDraft] = useState('');

  const [copiedZalo, setCopiedZalo] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [activeViewMode, setActiveViewMode] = useState<'zalo' | 'email'>('zalo');
  const [isApproved, setIsApproved] = useState(false);

  // Set student ban đầu khi mở modal
  useEffect(() => {
    if (isOpen) {
      if (initialStudentId && students.some((s) => s.id === initialStudentId)) {
        setSelectedStudentId(initialStudentId);
      } else if (students.length > 0 && !selectedStudentId) {
        setSelectedStudentId(students[0].id);
      }
      setIsApproved(false);
    }
  }, [isOpen, initialStudentId, students]);

  // Tìm học sinh hiện tại và điểm tính toán
  const currentStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || students[0];
  }, [students, selectedStudentId]);

  const currentScore = useMemo(() => {
    if (!currentStudent) return null;
    return calculatedScores.find((cs) => cs.student.id === currentStudent.id) || null;
  }, [calculatedScores, currentStudent]);

  // Thống kê chi tiết vi phạm của học sinh trong tuần
  const violationsSummary = useMemo<StudentViolationsSummary>(() => {
    if (!currentStudent || !currentScore) {
      return {
        diTre: 0,
        nghiCP: 0,
        nghiKP: 0,
        ktbKlbKsb: 0,
        khongDongPhuc: 0,
        matTratTu: 0,
        dungDienThoai: 0,
        morningDutyCount: 0,
        afternoonDutyCount: 0,
        diemTot: 0,
        phatBieu: 0,
        specificNotes: [],
      };
    }

    const rec = currentScore.record;
    const morningCount = morningDuties.filter(
      (m) => m.weekId === currentWeek.id && m.studentId === currentStudent.id
    ).length;
    const afternoonCount = afternoonSessions.filter(
      (a) => a.weekId === currentWeek.id && a.studentId === currentStudent.id
    ).length;

    const notes: string[] = [];
    if (rec.note) notes.push(rec.note);
    if (morningCount > 0) notes.push(`${morningCount} lần nhắc nhở 15p đầu giờ`);
    if (afternoonCount > 0) notes.push(`${afternoonCount} lần vi phạm học trái buổi`);

    return {
      diTre: rec.diTre || 0,
      nghiCP: rec.nghiCP || 0,
      nghiKP: rec.nghiKP || 0,
      ktbKlbKsb: rec.ktbKlbKsb || 0,
      khongDongPhuc: (rec.khongDongPhuc2 || 0) + (rec.khongDongPhuc5 || 0),
      matTratTu: rec.matTratTu || 0,
      dungDienThoai: rec.dungDienThoai || 0,
      morningDutyCount: morningCount,
      afternoonDutyCount: afternoonCount,
      diemTot: rec.diemTot || 0,
      phatBieu: rec.phatBieu || 0,
      specificNotes: notes,
    };
  }, [currentStudent, currentScore, morningDuties, afternoonSessions, currentWeek]);

  // Tự động gợi ý Tone dựa trên kết quả của học sinh
  useEffect(() => {
    if (currentScore) {
      if (currentScore.finalScore < 80 || (currentScore.totalPenalty || 0) >= 10) {
        setTone('constructive');
      } else {
        setTone('encouraging');
      }
    }
  }, [selectedStudentId, currentScore]);

  // Hàm gọi AI sinh tin nhắn
  const handleGenerateMessage = async () => {
    if (!currentStudent || !currentScore) return;

    setIsLoading(true);
    setError(null);
    setIsApproved(false);

    try {
      const result: ParentMessageResult = await fetchParentMessage({
        student: currentStudent,
        weekName: currentWeek.name,
        scores: {
          finalScore: currentScore.finalScore,
          classification: currentScore.classification,
          totalPenalty: currentScore.totalPenalty,
          totalBonus: currentScore.totalBonus,
        },
        violationsSummary,
        tone,
        metadata: {
          className: metadata.className || '9A3',
          schoolName: metadata.schoolName || 'Trường TH và THCS Phước Hưng',
          homeroomTeacher: metadata.homeroomTeacher || 'Cô Nguyễn Thị Thuỳ Trang',
        },
      });

      setZaloDraft(result.zaloMessage || '');
      setEmailSubjectDraft(result.emailSubject || '');
      setEmailBodyDraft(result.emailBody || '');
    } catch (err: any) {
      console.error('Lỗi sinh tin nhắn AI:', err);
      setError(err.message || 'Không thể tạo tin nhắn. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // Tự động sinh tin nhắn khi đổi học sinh nếu chưa có bản thảo
  useEffect(() => {
    if (isOpen && currentStudent && currentScore) {
      handleGenerateMessage();
    }
  }, [selectedStudentId, isOpen]);

  // Chuyển sang học sinh kế tiếp hoặc trước đó
  const handlePrevStudent = () => {
    const idx = students.findIndex((s) => s.id === selectedStudentId);
    if (idx > 0) {
      setSelectedStudentId(students[idx - 1].id);
    }
  };

  const handleNextStudent = () => {
    const idx = students.findIndex((s) => s.id === selectedStudentId);
    if (idx >= 0 && idx < students.length - 1) {
      setSelectedStudentId(students[idx + 1].id);
    }
  };

  // Copy tin nhắn Zalo
  const handleCopyZalo = async () => {
    if (!zaloDraft) return;
    try {
      await navigator.clipboard.writeText(zaloDraft);
      setCopiedZalo(true);
      setTimeout(() => setCopiedZalo(false), 2200);
    } catch {
      // Fallback
    }
  };

  // Copy Email
  const handleCopyEmail = async () => {
    const fullEmail = `Tiêu đề: ${emailSubjectDraft}\n\n${emailBodyDraft}`;
    try {
      await navigator.clipboard.writeText(fullEmail);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2200);
    } catch {
      // Fallback
    }
  };

  // Mở Email client (Mailto)
  const handleSendMailto = () => {
    if (!emailSubjectDraft || !emailBodyDraft) return;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(emailSubjectDraft)}&body=${encodeURIComponent(
      emailBodyDraft
    )}`;
    window.location.href = mailtoUrl;
    setIsApproved(true);
  };

  if (!isOpen) return null;

  const currentIndex = students.findIndex((s) => s.id === selectedStudentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs font-['Be_Vietnam_Pro',sans-serif] animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header Modal */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                Tự Động Hóa Giao Tiếp Phụ Huynh
                <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider leading-none shadow-xs">
                  AI
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Tự động soạn tin nhắn Zalo/SMS hoặc Email định kỳ dựa trên bảng điểm và chuyên cần • Giáo viên chỉ cần duyệt và bấm gửi
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

        {/* Thanh chọn học sinh & điều hướng nhanh */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
              Học sinh ({currentIndex + 1}/{students.length}):
            </span>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
            >
              {students.map((s) => {
                const sc = calculatedScores.find((cs) => cs.student.id === s.id);
                return (
                  <option key={s.id} value={s.id}>
                    STT {s.stt}. {s.name} (Nhóm {s.groupId}) — {sc ? `${sc.finalScore}đ [${sc.classification}]` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevStudent}
              disabled={currentIndex <= 0}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors shadow-2xs text-xs font-semibold flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Trước</span>
            </button>
            <button
              onClick={handleNextStudent}
              disabled={currentIndex >= students.length - 1}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors shadow-2xs text-xs font-semibold flex items-center gap-1"
            >
              <span>Sau</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body chính */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Card thông tin điểm số & chuyên cần thực tế của học sinh */}
          {currentStudent && currentScore && (
            <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/60 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                  {currentStudent.stt}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-base">{currentStudent.name}</span>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-blue-200 text-blue-800">
                      Nhóm {currentStudent.groupId}
                    </span>
                    {currentStudent.role && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                        {currentStudent.role}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {currentWeek.name} • GVCN: {metadata.homeroomTeacher || 'Cô Thuỳ Trang'}
                  </p>
                </div>
              </div>

              {/* Các chỉ số rèn luyện */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-center shadow-2xs">
                  <span className="block text-[10px] uppercase font-bold text-slate-600">Điểm rèn luyện</span>
                  <span className="text-base font-extrabold text-blue-700">
                    {currentScore.finalScore}
                    <span className="text-xs font-normal text-slate-600">/100</span>
                  </span>
                </div>

                <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-center shadow-2xs">
                  <span className="block text-[10px] uppercase font-bold text-slate-600">Xếp loại</span>
                  <span
                    className={`text-xs font-black px-2 py-0.5 rounded-md ${
                      currentScore.classification === 'Tốt'
                        ? 'bg-emerald-100 text-emerald-800'
                        : currentScore.classification === 'Khá'
                        ? 'bg-blue-100 text-blue-800'
                        : currentScore.classification === 'Đạt'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {currentScore.classification}
                  </span>
                </div>

                <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-center shadow-2xs">
                  <span className="block text-[10px] uppercase font-bold text-slate-600">Điểm trừ / Thưởng</span>
                  <span className="text-xs font-bold">
                    <span className="text-rose-600">-{currentScore.totalPenalty}</span> /{' '}
                    <span className="text-emerald-600">+{currentScore.totalBonus}</span>
                  </span>
                </div>

                <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-center shadow-2xs">
                  <span className="block text-[10px] uppercase font-bold text-slate-600">Nghỉ học / 15p</span>
                  <span className="text-xs font-bold text-slate-700">
                    {violationsSummary.nghiCP + violationsSummary.nghiKP} buổi / {violationsSummary.morningDutyCount} lỗi
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Thanh tùy chọn Phong cách (Tone) & Nút tái tạo AI */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700">Phong cách soạn:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'encouraging', label: 'Khích lệ & Động viên', icon: Award },
                  { id: 'constructive', label: 'Nghiêm túc nhắc nhở', icon: AlertTriangle },
                  { id: 'concise_zalo', label: 'Súc tích (gửi Zalo)', icon: MessageSquare },
                  { id: 'formal_email', label: 'Trang trọng (gửi Email)', icon: Mail },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = tone === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTone(item.id as AIMessageTone)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleGenerateMessage}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 border border-amber-500/60 shadow-xs disabled:opacity-50 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Đang tạo bản thảo...' : 'Soạn lại với AI'}</span>
              <span className="bg-red-600 text-white text-[9px] px-1 py-0.2 rounded font-black tracking-wider leading-none shadow-xs">
                AI
              </span>
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Tabs chuyển đổi giữa Tin nhắn Zalo/SMS và Email */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveViewMode('zalo')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeViewMode === 'zalo'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Tin nhắn Zalo / SMS ({zaloDraft ? zaloDraft.length : 0} ký tự)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveViewMode('email')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeViewMode === 'email'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>Thư điện tử (Email trang trọng)</span>
                </button>
              </div>

              {/* Huy hiệu trạng thái duyệt */}
              {isApproved && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" />
                  Đã duyệt & Sẵn sàng gửi
                </span>
              )}
            </div>

            {/* Chế độ xem Zalo/SMS */}
            {activeViewMode === 'zalo' && (
              <div className="space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="font-semibold flex items-center gap-1">
                    📱 Bản tin nhắn Zalo gửi phụ huynh (Giáo viên có thể chỉnh sửa trực tiếp):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyZalo}
                      className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    >
                      {copiedZalo ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedZalo ? 'Đã sao chép!' : 'Sao chép Zalo'}</span>
                    </button>
                    <a
                      href="https://chat.zalo.me"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Mở Zalo Web</span>
                    </a>
                  </div>
                </div>

                <textarea
                  value={zaloDraft}
                  onChange={(e) => {
                    setZaloDraft(e.target.value);
                    setIsApproved(true);
                  }}
                  rows={7}
                  placeholder={isLoading ? 'AI đang tạo nội dung tin nhắn...' : 'Nội dung tin nhắn Zalo...'}
                  className="w-full bg-slate-50/50 border border-slate-300 focus:bg-white focus:border-blue-500 rounded-xl p-3.5 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans focus:outline-hidden focus:ring-2 focus:ring-blue-400/20 shadow-inner"
                />
              </div>
            )}

            {/* Chế độ xem Email */}
            {activeViewMode === 'email' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Tiêu đề thư (Subject):</label>
                  <input
                    type="text"
                    value={emailSubjectDraft}
                    onChange={(e) => {
                      setEmailSubjectDraft(e.target.value);
                      setIsApproved(true);
                    }}
                    className="w-full bg-slate-50/50 border border-slate-300 focus:bg-white focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-400/20"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                    <span className="font-semibold">Nội dung thư gửi phụ huynh:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyEmail}
                        className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                      >
                        {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedEmail ? 'Đã sao chép!' : 'Sao chép Email'}</span>
                      </button>
                      <button
                        onClick={handleSendMailto}
                        className="px-2.5 py-1 bg-blue-50 border border-blue-300 hover:bg-blue-100 text-blue-800 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Mở ứng dụng Mail</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={emailBodyDraft}
                    onChange={(e) => {
                      setEmailBodyDraft(e.target.value);
                      setIsApproved(true);
                    }}
                    rows={8}
                    placeholder={isLoading ? 'AI đang tạo nội dung thư...' : 'Nội dung thư điện tử...'}
                    className="w-full bg-slate-50/50 border border-slate-300 focus:bg-white focus:border-blue-500 rounded-xl p-3.5 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans focus:outline-hidden focus:ring-2 focus:ring-blue-400/20 shadow-inner"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Modal: Duyệt & Bấm gửi */}
        <div className="px-5 py-3.5 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Giáo viên có toàn quyền kiểm tra, chỉnh sửa văn phong trước khi chuyển tiếp cho phụ huynh.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Đóng
            </button>

            {activeViewMode === 'zalo' ? (
              <button
                type="button"
                onClick={handleCopyZalo}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                {copiedZalo ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedZalo ? 'Đã sao chép tin Zalo!' : 'Duyệt & Sao chép gửi Zalo'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSendMailto}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Duyệt & Mở gửi Email</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
