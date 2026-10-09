import React, { useState, useMemo } from 'react';
import {
  X,
  Zap,
  GraduationCap,
  Crown,
  ShieldCheck,
  CheckCircle2,
  Users,
  Search,
  ArrowRight,
  LogOut,
  KeyRound,
  Sparkles,
  Lock,
  Flag,
} from 'lucide-react';
import { Student, UserAccount, ClassMetadata } from '../types/discipline';
import { matchStudentQuery } from '../utils/vietnamese';

interface QuickLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  accounts: UserAccount[];
  metadata: ClassMetadata;
  currentAccountId: string;
  isLoggedIn?: boolean;
  onLogin: (accountId: string, studentUser?: Student) => void;
  onLogout?: () => void;
  onOpenFullAuthModal?: () => void;
}

export const QuickLoginModal: React.FC<QuickLoginModalProps> = ({
  isOpen,
  onClose,
  students,
  accounts,
  metadata,
  currentAccountId,
  isLoggedIn = true,
  onLogin,
  onLogout,
  onOpenFullAuthModal,
}) => {
  // Mặc định mở tab Cán sự & Nhóm trưởng theo đúng yêu cầu phân quyền
  const [activeTab, setActiveTab] = useState<'officer' | 'student'>('officer');
  const [selectedGroupId, setSelectedGroupId] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [successNotice, setSuccessNotice] = useState<string>('');

  // Xác thực mật khẩu bảo mật cho cán sự / GVCN
  const [selectedOfficerToLogin, setSelectedOfficerToLogin] = useState<UserAccount | null>(null);
  const [officerPasswordInput, setOfficerPasswordInput] = useState('');
  const [officerPasswordError, setOfficerPasswordError] = useState('');

  // Lọc danh sách học sinh (đặt trước if (!isOpen) để tuân thủ Rules of Hooks)
  const filteredStudents = useMemo(() => {
    if (!students || students.length === 0) return [];
    let list = students;
    if (selectedGroupId > 0) {
      list = list.filter((s) => s.groupId === selectedGroupId);
    }
    if (searchQuery.trim()) {
      list = list.filter((s) => matchStudentQuery(s, searchQuery.trim()));
    }
    return list;
  }, [students, selectedGroupId, searchQuery]);

  if (!isOpen) return null;

  const currentAccount = accounts.find((a) => a.id === currentAccountId);
  const isCurrentlyActive = isLoggedIn && !!currentAccount;

  // Yêu cầu xác thực mật khẩu do GVCN quản lý
  const handleSelectOfficerForLogin = (account: UserAccount) => {
    setSelectedOfficerToLogin(account);
    setOfficerPasswordInput('');
    setOfficerPasswordError('');
  };

  const handleConfirmOfficerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfficerToLogin) return;
    setOfficerPasswordError('');

    const targetPass = selectedOfficerToLogin.password || '123';
    if (officerPasswordInput.trim() === targetPass) {
      setSuccessNotice(`⚡ Xác thực thành công: ${selectedOfficerToLogin.displayName} (${selectedOfficerToLogin.title})!`);
      setTimeout(() => {
        onLogin(selectedOfficerToLogin.id);
        setSuccessNotice('');
        setSelectedOfficerToLogin(null);
        onClose();
      }, 350);
    } else {
      setOfficerPasswordError('Mật khẩu không chính xác! Vui lòng liên hệ Giáo viên chủ nhiệm để được cấp mật khẩu bảo mật.');
    }
  };

  // 1 chạm xem điểm cho học sinh
  const handleQuickStudentLogin = (student: Student) => {
    setSuccessNotice(`⚡ Chào mừng học sinh ${student.name} (Nhóm ${student.groupId}) xem điểm thi đua!`);
    setTimeout(() => {
      onLogin(`acc-${student.id}`, student);
      setSuccessNotice('');
      onClose();
    }, 350);
  };

  // 1. Phân loại Ban Cán Sự Lớp (Lớp trưởng + 3 Lớp phó + GVCN)
  const classOfficers = accounts.filter(
    (a) =>
      a.role === 'gvcn' ||
      a.role === 'lopTruong' ||
      a.role === 'lopPhoHocTap' ||
      a.role === 'lopPhoLaoDong' ||
      a.role === 'lopPhoTratTu'
  );

  // 2. Phân loại 6 Nhóm Trưởng (Nhóm 1 -> Nhóm 6: Nhóm nào thì phụ trách nhóm đó)
  const groupLeaders = [1, 2, 3, 4, 5, 6].map((g) => {
    const acc = accounts.find((a) => a.role === `nhomTruong${g}`);
    const leaderName = metadata.groupLeaders?.[g] || acc?.displayName || `Nhóm trưởng ${g}`;
    return {
      groupNum: g,
      account: acc || {
        id: `acc-nhom${g}`,
        username: `nhom${g}`,
        role: `nhomTruong${g}`,
        displayName: leaderName,
        title: `Nhóm trưởng ${g}`,
        assignedGroupIds: [g],
      },
      leaderName,
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150 my-auto">
        {/* Header Modal */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-slate-950 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/25 flex items-center justify-center border border-white/40 shadow-xs">
              <Zap className="w-5 h-5 text-slate-950 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base leading-tight tracking-tight text-slate-950">
                  ĐĂNG NHẬP NHANH PHÂN QUYỀN NỀ NẾP
                </h3>
                <span className="bg-slate-950 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  1 Chạm
                </span>
              </div>
              <p className="text-[11px] text-amber-950 font-bold leading-none mt-0.5">
                Chỉ Ban cán sự & 6 Nhóm trưởng được phân quyền ghi nhận (Nhóm nào phụ trách nhóm đó)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-amber-950 hover:text-black hover:bg-white/20 rounded-xl transition-all cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thanh trạng thái người dùng hiện tại */}
        {isCurrentlyActive && currentAccount && (
          <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between gap-2 flex-wrap shrink-0">
            <div className="flex items-center gap-2 text-xs text-emerald-900 font-bold">
              <span>{currentAccount.avatarIcon || '👤'}</span>
              <span>Đang đăng nhập:</span>
              <strong className="text-emerald-950 underline">{currentAccount.displayName}</strong>
              <span className="text-[11px] bg-emerald-200/80 px-2 py-0.5 rounded text-emerald-800">
                {currentAccount.title}
              </span>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  setSuccessNotice('Đã đăng xuất thành công!');
                  setTimeout(() => setSuccessNotice(''), 1000);
                }}
                className="text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-white hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-300 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                title="Đăng xuất tất cả các tài khoản"
              >
                <LogOut className="w-3 h-3 text-rose-600" />
                <span>Đăng xuất tất cả</span>
              </button>
            )}
          </div>
        )}

        {/* Tabs chọn đối tượng */}
        <div className="px-5 pt-3 pb-1 shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('officer');
              setSuccessNotice('');
            }}
            className={`flex-1 py-2.5 px-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              activeTab === 'officer'
                ? 'bg-indigo-700 text-white border-indigo-700 shadow-md scale-[1.01]'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>⭐ Ban Cán Sự & 6 Nhóm Trưởng (Có Quyền Nhập Điểm)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('student');
              setSuccessNotice('');
            }}
            className={`py-2.5 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
              activeTab === 'student'
                ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-[1.01]'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Học Sinh (Xem Điểm)</span>
          </button>
        </div>

        {/* Thông báo thành công */}
        {successNotice && (
          <div className="px-5 pt-2 shrink-0">
            <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-black flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
          </div>
        )}

        {/* Hộp thoại xác thực mật khẩu bảo mật cán sự / GVCN */}
        {selectedOfficerToLogin && (
          <div className="p-5 bg-indigo-50/90 border-b border-indigo-200 animate-in fade-in">
            <div className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{selectedOfficerToLogin.avatarIcon || '👤'}</span>
                  <div>
                    <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                      Xác thực bảo mật GVCN
                    </span>
                    <h4 className="text-sm font-black text-slate-900 leading-tight mt-0.5">
                      {selectedOfficerToLogin.displayName} ({selectedOfficerToLogin.title})
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      {selectedOfficerToLogin.role === 'gvcn'
                        ? 'Nhập mật khẩu Giáo viên chủ nhiệm để vào toàn quyền quản trị.'
                        : 'Nhập mật khẩu do GVCN cấp cho vai trò này để đăng nhập.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOfficerToLogin(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmOfficerLogin} className="space-y-2.5">
                <div className="relative">
                  <input
                    type="password"
                    required
                    autoFocus
                    value={officerPasswordInput}
                    onChange={(e) => {
                      setOfficerPasswordInput(e.target.value);
                      setOfficerPasswordError('');
                    }}
                    placeholder="Nhập mật khẩu do GVCN cấp..."
                    className="w-full text-xs font-bold p-2.5 pl-9 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all shadow-inner"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {officerPasswordError && (
                  <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2">
                    {officerPasswordError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedOfficerToLogin(null)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Xác Nhận Đăng Nhập</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Nội dung danh sách phân quyền 1 chạm */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'officer' ? (
            /* TAB CÁN SỰ & 6 NHÓM TRƯỞNG THEO ĐÚNG YÊU CẦU PHÂN QUYỀN */
            <div className="space-y-4">
              {/* KHỐI 1: BAN CÁN SỰ LỚP (Bao quát nề nếp toàn lớp) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>1. Ban Cán Sự Lớp (Quản Lý Bao Quát Toàn Lớp)</span>
                  </h4>
                  <span className="text-[11px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    Phụ trách 6 nhóm
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {classOfficers.map((acc) => {
                    const isGVCN = acc.role === 'gvcn';
                    const isMonitor = acc.role === 'lopTruong';
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => handleSelectOfficerForLogin(acc)}
                        className={`p-3 bg-white hover:bg-indigo-50/70 border rounded-2xl text-left flex items-center justify-between transition-all cursor-pointer shadow-2xs hover:shadow-xs group hover:scale-[1.01] ${
                          isGVCN
                            ? 'border-purple-300 hover:border-purple-500 bg-purple-50/20'
                            : isMonitor
                            ? 'border-indigo-300 hover:border-indigo-500 bg-indigo-50/30'
                            : 'border-slate-200 hover:border-indigo-400'
                        }`}
                        title={`Bấm 1 chạm để đăng nhập vai trò: ${acc.title}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-2xl shrink-0">{acc.avatarIcon || '👤'}</span>
                          <div className="min-w-0">
                            <p className="font-black text-xs text-slate-900 group-hover:text-indigo-700 truncate leading-tight">
                              {acc.displayName}
                            </p>
                            <p className="text-[11px] font-bold text-slate-600 group-hover:text-indigo-600 truncate leading-none mt-0.5">
                              {acc.title}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] font-black text-indigo-600 shrink-0">
                          <span className="hidden sm:inline">Vào ngay</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* KHỐI 2: 6 NHÓM TRƯỞNG (NHÓM NÀO THÌ PHỤ TRÁCH NHÓM ĐÓ) */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Flag className="w-4 h-4 text-sky-600" />
                    <h4 className="text-xs font-black text-sky-950 uppercase tracking-wide">
                      2. 6 Nhóm Trưởng (Nhóm nào thì phụ trách nhóm đó)
                    </h4>
                  </div>
                  <span className="text-[11px] font-extrabold text-sky-800 bg-sky-100 px-2 py-0.5 rounded border border-sky-300">
                    Phụ trách riêng từng nhóm
                  </span>
                </div>

                <div className="p-2.5 bg-sky-50/70 border border-sky-200 rounded-xl text-[11px] text-sky-900 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>
                    <strong>Quy định nề nếp:</strong> Mỗi nhóm trưởng chỉ được nhập điểm và nhận xét cho học sinh thuộc <strong>nhóm của mình</strong>, không được can thiệp vào nhóm khác.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {groupLeaders.map(({ groupNum, account, leaderName }) => (
                    <button
                      key={groupNum}
                      type="button"
                      onClick={() => handleSelectOfficerForLogin(account as UserAccount)}
                      className="p-3 bg-white hover:bg-sky-50 active:bg-sky-100 border border-sky-200 hover:border-sky-400 rounded-2xl text-left flex items-center justify-between transition-all cursor-pointer shadow-2xs hover:shadow-xs group hover:scale-[1.01]"
                      title={`Bấm 1 chạm để đăng nhập Nhóm trưởng Nhóm ${groupNum}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-sky-100 group-hover:bg-sky-600 group-hover:text-white text-sky-800 font-black text-xs flex flex-col items-center justify-center shrink-0 transition-colors">
                          <span className="text-[10px] leading-none">N{groupNum}</span>
                          <span className="text-xs leading-none">🚩</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <strong className="font-black text-xs text-slate-900 group-hover:text-sky-700 truncate leading-tight">
                              {leaderName}
                            </strong>
                          </div>
                          <p className="text-[11px] font-bold text-sky-700 truncate leading-none mt-1">
                            Nhóm trưởng {groupNum} (Chỉ phụ trách Nhóm {groupNum})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-black text-sky-700 shrink-0">
                        <span className="hidden sm:inline">Vào ngay</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* TAB HỌC SINH (CHẾ ĐỘ CHỈ XEM ĐIỂM) */
            <div className="space-y-3.5">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Chế độ xem điểm dành cho học sinh:</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Học sinh thông thường không có quyền chấm hay sửa điểm của lớp. Đăng nhập tại đây để theo dõi điểm thi đua và bảng xếp hạng cá nhân của bạn.
                  </p>
                </div>
              </div>

              {/* Bộ lọc 6 nhóm */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedGroupId(0)}
                  className={`py-1.5 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer shrink-0 ${
                    selectedGroupId === 0
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  Tất cả nhóm
                </button>
                {[1, 2, 3, 4, 5, 6].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSelectedGroupId(g)}
                    className={`py-1.5 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer shrink-0 ${
                      selectedGroupId === g
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    Nhóm {g}
                  </button>
                ))}
              </div>

              {/* Tìm kiếm nhanh */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm học sinh theo STT (1, 01...) hoặc tên (có dấu / không dấu)..."
                  className="w-full text-xs font-medium p-2.5 pl-9 pr-8 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Danh sách học sinh */}
              {filteredStudents.length === 0 ? (
                <div className="p-8 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center text-slate-500 text-xs">
                  {students.length === 0 ? (
                    <div>
                      <p className="font-bold text-slate-700">Chưa có danh sách học sinh nào trong lớp!</p>
                      <p className="mt-1 text-[11px]">
                        Giáo viên vui lòng vào mục "Danh sách lớp" để thêm hoặc tải file học sinh lên trước.
                      </p>
                    </div>
                  ) : (
                    <p>Không tìm thấy học sinh nào khớp với từ khóa "{searchQuery}". Vui lòng thử lại!</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-200">
                  {filteredStudents.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleQuickStudentLogin(s)}
                      className="p-2.5 bg-white hover:bg-blue-50 active:bg-blue-100 border border-slate-200 hover:border-blue-400 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer shadow-2xs hover:shadow-xs group hover:scale-[1.01]"
                      title={`Bấm để vào xem điểm: ${s.name}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-blue-100 group-hover:bg-blue-600 group-hover:text-white text-blue-700 font-black text-xs flex items-center justify-center shrink-0 transition-colors">
                          {s.stt}
                        </span>
                        <div className="min-w-0">
                          <p className="font-black text-xs text-slate-900 group-hover:text-blue-700 truncate leading-tight">
                            {s.name}
                          </p>
                          <p className="text-[10px] text-slate-500 group-hover:text-blue-600 truncate leading-none mt-0.5">
                            Nhóm {s.groupId} {s.role ? `• ${s.role}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600 opacity-80 group-hover:opacity-100 shrink-0">
                        <span className="hidden sm:inline">Xem điểm</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-2">
            {onOpenFullAuthModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullAuthModal();
                }}
                className="text-xs font-bold text-indigo-700 hover:text-indigo-900 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Đăng nhập thủ công có mật khẩu</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onLogout && isCurrentlyActive && (
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  setSuccessNotice('Đã đăng xuất thành công!');
                  setTimeout(() => {
                    setSuccessNotice('');
                    onClose();
                  }, 600);
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                title="Đăng xuất khỏi tất cả tài khoản"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600" />
                <span>Đăng xuất tất cả</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
