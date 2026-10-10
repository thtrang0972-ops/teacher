import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Lock,
  User,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  LogOut,
  Settings2,
  Users,
  Search,
  GraduationCap,
  Check,
  ArrowRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Student, UserAccount, UserRoleType } from '../types/discipline';
import { matchStudentQuery, removeVietnameseTones } from '../utils/vietnamese';
import { determineStudentRole } from '../utils/permissions';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: UserAccount[];
  students?: Student[];
  currentAccountId: string;
  isLoggedIn?: boolean;
  onLogin: (accountId: string, studentUser?: Student) => void;
  onLogout?: () => void;
  onOpenQuickLogin?: () => void;
  onOpenAccountManager?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  accounts,
  students = [],
  currentAccountId,
  isLoggedIn = true,
  onLogin,
  onLogout,
  onOpenQuickLogin,
  onOpenAccountManager,
}) => {
  // Tab: 'student' (Dành cho học sinh - vào đúng tên) hoặc 'officer' (GVCN & Ban cán sự)
  const [activeTab, setActiveTab] = useState<'student' | 'officer'>('student');

  // Trạng thái cho tab Học sinh
  const [selectedGroupId, setSelectedGroupId] = useState<number>(0); // 0 = tất cả
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentPassword, setStudentPassword] = useState<string>('');
  const [showStudentPassword, setShowStudentPassword] = useState<boolean>(false);

  // Trạng thái cho tab Cán sự / GVCN
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Trạng thái giải quyết khi nhập tài khoản nhóm chung (nhom1 -> nhom6)
  const [groupDisambiguation, setGroupDisambiguation] = useState<number | null>(null);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Tự động chọn tab học sinh nếu chưa đăng nhập hoặc đang đăng nhập tài khoản học sinh
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setSuccessMessage('');
      setGroupDisambiguation(null);
      const curAcc = accounts.find((a) => a.id === currentAccountId);
      if (curAcc && curAcc.role === 'gvcn') {
        setActiveTab('officer');
      } else {
        setActiveTab('student');
      }
    }
  }, [isOpen, currentAccountId, accounts]);

  // Lọc danh sách học sinh theo nhóm và từ khóa tìm kiếm (Phải gọi trước if (!isOpen) để tuân thủ Rules of Hooks)
  const filteredStudents = useMemo(() => {
    if (!students || students.length === 0) return [];

    let list = students;
    if (selectedGroupId > 0) {
      list = list.filter((s) => s.groupId === selectedGroupId);
    }

    if (studentSearch.trim()) {
      const q = studentSearch.trim();
      list = list.filter((s) => matchStudentQuery(s, q));
    }

    return list;
  }, [students, selectedGroupId, studentSearch]);

  if (!isOpen) return null;

  const currentAccount = accounts.find((a) => a.id === currentAccountId);
  const isCurrentlyActive = isLoggedIn && !!currentAccount;

  // Xử lý học sinh đăng nhập với tên của chính mình
  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedStudent) {
      setErrorMessage('Vui lòng bấm chọn đúng Tên của bạn trong danh sách học sinh!');
      return;
    }

    const trimmedPass = studentPassword.trim();
    if (!trimmedPass) {
      setErrorMessage('Vui lòng nhập mật khẩu học sinh!');
      return;
    }

    // Xác nhận đăng nhập đúng tên học sinh
    setSuccessMessage(`Đăng nhập thành công: Học sinh ${selectedStudent.name} (Nhóm ${selectedStudent.groupId})!`);
    setTimeout(() => {
      onLogin(`acc-${selectedStudent.id}`, selectedStudent);
      setSuccessMessage('');
      onClose();
    }, 450);
  };

  // Xử lý đăng nhập bằng tài khoản Cán sự / GVCN
  const handleOfficerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = password.trim();

    // 1. Kiểm tra tài khoản nhóm chung: nhom1, nhom2, ..., nhom6
    const groupMatch = trimmedUser.match(/^nhom\s*([1-6])$/i) || trimmedUser.match(/^to\s*([1-6])$/i);
    if (groupMatch && students.length > 0) {
      const gNum = parseInt(groupMatch[1], 10);
      const groupMembers = students.filter((s) => s.groupId === gNum);
      if (groupMembers.length > 0) {
        // Hỏi học sinh xem họ là ai trong nhóm đó để tránh hiển thị sai tên
        setGroupDisambiguation(gNum);
        return;
      }
    }

    // 2. Tìm tài khoản trong danh sách accounts
    let matched = accounts.find(
      (a) => a.username.toLowerCase() === trimmedUser && a.password === trimmedPass
    );

    // 3. Nếu gõ tên hoặc STT ở tab này, tự động nhận diện học sinh
    let studentMatched: Student | undefined = undefined;
    if (!matched && students.length > 0) {
      studentMatched = students.find((s) => matchStudentQuery(s, trimmedUser));
      if (studentMatched && (trimmedPass === '123' || trimmedPass.length > 0)) {
        const roleInfo = determineStudentRole(studentMatched);
        matched = {
          id: `acc-${studentMatched.id}`,
          username: studentMatched.stt ? studentMatched.stt.toString() : studentMatched.id,
          password: trimmedPass,
          role: roleInfo.role,
          displayName: studentMatched.name,
          title: roleInfo.title,
          avatarIcon: roleInfo.avatarIcon,
          assignedGroupIds: roleInfo.assignedGroupIds,
          description: `${roleInfo.title}: ${roleInfo.scopeDescription}`,
        };
      }
    }

    if (!matched) {
      setErrorMessage('Tên đăng nhập hoặc mật khẩu không chính xác!');
      return;
    }

    const isStudent = matched.role !== 'gvcn';
    setSuccessMessage(
      isStudent
        ? `Đăng nhập thành công: Học sinh ${matched.displayName} (${matched.title})!`
        : `Đăng nhập thành công: ${matched.displayName} (${matched.title})!`
    );

    setTimeout(() => {
      onLogin(matched.id, studentMatched);
      setSuccessMessage('');
      setUsername('');
      setPassword('');
      onClose();
    }, 450);
  };

  // Học sinh chọn tên mình trong nhóm sau khi nhập nhom1..6
  const handleSelectFromGroup = (student: Student) => {
    setSuccessMessage(`Đăng nhập thành công: Học sinh ${student.name} (Nhóm ${student.groupId})!`);
    setTimeout(() => {
      onLogin(`acc-${student.id}`, student);
      setSuccessMessage('');
      setGroupDisambiguation(null);
      onClose();
    }, 400);
  };

  // Đăng xuất toàn bộ
  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
      setSuccessMessage('Đã đăng xuất khỏi tất cả các tài khoản thành công!');
      setSelectedStudent(null);
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
      }, 700);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              <KeyRound className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base leading-tight">
                ĐĂNG NHẬP HỆ THỐNG NỀ NẾP
              </h3>
              <p className="text-[11px] text-blue-100 font-medium leading-none mt-0.5">
                Đăng nhập đúng tên học sinh hoặc ban cán sự / GVCN
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-blue-100 hover:text-white hover:bg-white/15 rounded-xl transition-all cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thông tin tài khoản hiện đang đăng nhập & Nút Đăng xuất */}
        <div className="px-5 pt-3 pb-2 shrink-0 border-b border-slate-100 bg-slate-50/60">
          {isCurrentlyActive && currentAccount ? (
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl shrink-0">{currentAccount.avatarIcon || '👤'}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-emerald-800 font-extrabold uppercase bg-emerald-200/80 px-1.5 py-0.5 rounded">
                      Đang đăng nhập:
                    </span>
                    <strong className="text-xs sm:text-sm font-black text-slate-900 truncate">
                      {currentAccount.displayName}
                    </strong>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold block truncate">
                    {currentAccount.title} {currentAccount.username ? `(@${currentAccount.username})` : ''}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {currentAccount.role === 'gvcn' && onOpenAccountManager && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAccountManager();
                    }}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 px-2.5 py-1.5 rounded-xl border border-indigo-200 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                    title="Quản lý tài khoản & Mật khẩu học sinh"
                  >
                    <Settings2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Quản lý MK</span>
                  </button>
                )}

                {onLogout && (
                  <button
                    type="button"
                    onClick={handleLogoutClick}
                    className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    title="Đăng xuất khỏi tất cả các tài khoản"
                  >
                    <LogOut className="w-3.5 h-3.5 text-white" />
                    <span>Đăng xuất tất cả</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-2.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Hiện đang ở <strong>Chế độ chỉ xem</strong>. Vui lòng đăng nhập bên dưới:</span>
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="text-[11px] font-bold text-rose-700 hover:text-rose-800 bg-white px-2.5 py-1 rounded-lg border border-rose-300 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  title="Đăng xuất khỏi tất cả các tài khoản"
                >
                  <LogOut className="w-3 h-3 text-rose-600" />
                  <span>Đăng xuất tất cả tài khoản</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Nút chuyển nhanh sang chế độ ĐĂNG NHẬP NHANH 1 CHẠM */}
        {onOpenQuickLogin && (
          <div className="px-5 pt-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenQuickLogin();
              }}
              className="w-full p-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 active:from-amber-500 text-slate-950 font-black text-xs rounded-2xl shadow-sm border border-amber-300 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01]"
              title="Mở hộp thoại đăng nhập nhanh 1 chạm"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-white/40 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
                </div>
                <span>⚡ Bấm vào đây để ĐĂNG NHẬP NHANH 1 CHẠM</span>
              </div>
              <span className="text-[10px] bg-slate-950 text-amber-300 font-extrabold px-2 py-0.5 rounded-full uppercase">
                Không cần gõ mật khẩu
              </span>
            </button>
          </div>
        )}

        {/* Thanh chọn 2 Tab: Dành cho Học Sinh & Dành cho Ban Cán Sự / GVCN */}
        <div className="px-5 pt-3 pb-1 shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('student');
              setGroupDisambiguation(null);
              setErrorMessage('');
            }}
            className={`flex-1 py-2.5 px-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              activeTab === 'student'
                ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-[1.01]'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>🎓 Dành Cho Học Sinh (Vào đúng tên)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('officer');
              setGroupDisambiguation(null);
              setErrorMessage('');
            }}
            className={`py-2.5 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
              activeTab === 'officer'
                ? 'bg-indigo-700 text-white border-indigo-700 shadow-md scale-[1.01]'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Cán Sự & GVCN</span>
          </button>
        </div>

        {/* Thông báo Lỗi / Thành Công */}
        <div className="px-5 pt-2 shrink-0">
          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* NỘI DUNG CHÍNH (Có thanh cuộn) */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* TRƯỜNG HỢP 1: Popup chọn đúng tên khi đăng nhập tài khoản chung của nhóm */}
          {groupDisambiguation !== null ? (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-900">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <h4 className="font-black text-sm">
                  Bạn đang đăng nhập tài khoản Nhóm {groupDisambiguation}
                </h4>
              </div>
              <p className="text-xs text-amber-800">
                Để <strong>không bị hiển thị sai tên của bạn</strong>, vui lòng bấm chọn đúng Tên của bạn trong danh sách học sinh Nhóm {groupDisambiguation} dưới đây:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pt-1">
                {students
                  .filter((s) => s.groupId === groupDisambiguation)
                  .map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectFromGroup(s)}
                      className="p-2.5 bg-white hover:bg-blue-50 border border-amber-200 hover:border-blue-400 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer shadow-2xs group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0">
                          {s.stt}
                        </span>
                        <div className="min-w-0">
                          <p className="font-extrabold text-xs text-slate-900 group-hover:text-blue-700 truncate">
                            {s.name}
                          </p>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {s.role || (s.isLeader ? 'Nhóm trưởng' : 'Thành viên')}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                    </button>
                  ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200">
                <button
                  type="button"
                  onClick={() => setGroupDisambiguation(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl"
                >
                  Quay lại
                </button>
              </div>
            </div>
          ) : activeTab === 'student' ? (
            /* TAB 1: DÀNH CHO HỌC SINH - CHỌN TÊN ĐẢM BẢO CHÍNH XÁC 100% */
            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3 text-xs text-blue-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Cách vào đúng tên chính xác 100%:</p>
                  <p className="text-[11px] text-blue-800 mt-0.5">
                    Học sinh chỉ cần bấm chọn Nhóm và bấm đúng Tên của mình trong danh sách lớp. Hệ thống sẽ ghi nhận đúng tên bạn ngay lập tức!
                  </p>
                </div>
              </div>

              {/* Lọc theo 6 nhóm */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  1. Chọn Nhóm của bạn:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-7 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedGroupId(0)}
                    className={`py-1.5 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      selectedGroupId === 0
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    Tất cả
                  </button>
                  {[1, 2, 3, 4, 5, 6].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setSelectedGroupId(g)}
                      className={`py-1.5 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        selectedGroupId === g
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      Nhóm {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tìm kiếm nhanh học sinh */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. Hoặc tìm nhanh theo STT hoặc Tên:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Gõ STT (1, 01, 15...) hoặc tên (có dấu hoặc không dấu)..."
                    className="w-full text-xs font-medium p-2.5 pl-9 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-2xs"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  {studentSearch && (
                    <button
                      type="button"
                      onClick={() => setStudentSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Danh sách học sinh để bấm chọn */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    3. Bấm chọn đúng Tên của bạn:
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    (Tìm thấy {filteredStudents.length} học sinh)
                  </span>
                </div>

                {filteredStudents.length === 0 ? (
                  <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center text-slate-500 text-xs">
                    {students.length === 0 ? (
                      <div>
                        <p className="font-bold text-slate-700">Chưa có danh sách học sinh nào trong lớp!</p>
                        <p className="mt-1 text-[11px]">
                          Giáo viên vui lòng vào mục "Danh sách lớp" để thêm hoặc tải danh sách học sinh lên trước.
                        </p>
                      </div>
                    ) : (
                      <p>Không tìm thấy học sinh nào khớp với từ khóa "{studentSearch}". Vui lòng thử lại!</p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-200">
                    {filteredStudents.map((s) => {
                      const isSelected = selectedStudent?.id === s.id;
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSelectedStudent(s);
                            setErrorMessage('');
                          }}
                          className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
                              : 'bg-white hover:bg-blue-50 text-slate-800 border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {s.stt}
                            </span>
                            <div className="min-w-0">
                              <p className="font-black text-xs leading-tight truncate">
                                {s.name}
                              </p>
                              <p
                                className={`text-[10px] leading-none mt-0.5 truncate ${
                                  isSelected ? 'text-blue-100' : 'text-slate-500'
                                }`}
                              >
                                Nhóm {s.groupId} {s.role ? `• ${s.role}` : ''}
                              </p>
                            </div>
                          </div>

                          {isSelected ? (
                            <Check className="w-4 h-4 text-white shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Thẻ học sinh đã chọn */}
              {selectedStudent && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl">👤</span>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block leading-none">
                        Bạn đã chọn chính xác:
                      </span>
                      <strong className="text-xs sm:text-sm font-black text-slate-900 truncate block mt-0.5">
                        {selectedStudent.name} (STT {selectedStudent.stt} - Nhóm {selectedStudent.groupId})
                      </strong>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-md bg-emerald-600 text-white font-extrabold text-[10px] shrink-0">
                    Đã khớp
                  </span>
                </div>
              )}

              {/* Mật khẩu học sinh (Mặc định 123) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  4. Mật khẩu học sinh:
                </label>
                <div className="relative">
                  <input
                    type={showStudentPassword ? 'text' : 'password'}
                    required
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu học sinh..."
                    className="w-full text-xs font-bold p-2.5 pl-9 pr-9 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowStudentPassword(!showStudentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    title={showStudentPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showStudentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
              </div>

              {/* Nút Đăng nhập */}
              <div className="flex items-center justify-between pt-2 gap-2 flex-wrap">
                {onLogout ? (
                  <button
                    type="button"
                    onClick={handleLogoutClick}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                    title="Đăng xuất khỏi tất cả các tài khoản"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span>Đăng xuất tất cả</span>
                  </button>
                ) : <div />}

                <button
                  type="submit"
                  disabled={!selectedStudent}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-md transition-all cursor-pointer hover:scale-[1.01]"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {selectedStudent
                      ? `Vào Hệ Thống Đúng Tên: ${selectedStudent.name}`
                      : 'Vui lòng chọn tên của bạn ở trên'}
                  </span>
                </button>
              </div>
            </form>
          ) : (
            /* TAB 2: DÀNH CHO GIÁO VIÊN & BAN CÁN SỰ LỚP */
            <form onSubmit={handleOfficerLogin} className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-700 space-y-1">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Đăng nhập dành cho GVCN và Ban Cán sự</span>
                </p>
                <p className="text-[11px] text-slate-600">
                  Dành cho Giáo viên chủ nhiệm, Lớp trưởng, Lớp phó và Nhóm trưởng. Nhập tên tài khoản và mật khẩu được phân công.
                </p>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên tài khoản (Username)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Nhập tên tài khoản (ví dụ: gvcn, loptruong...)"
                      className="w-full text-xs font-bold p-2.5 pl-9 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-2xs"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mật khẩu (Password)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu..."
                      className="w-full text-xs font-bold p-2.5 pl-9 pr-9 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-2xs"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 gap-2 flex-wrap">
                {onLogout ? (
                  <button
                    type="button"
                    onClick={handleLogoutClick}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                    title="Đăng xuất khỏi tất cả các tài khoản"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span>Đăng xuất tất cả các tài khoản</span>
                  </button>
                ) : <div />}

                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-all cursor-pointer hover:scale-[1.01]"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Xác Nhận Đăng Nhập</span>
                </button>
              </div>
            </form>
          )}

          {/* Hướng dẫn bảo mật */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 space-y-1">
            <p className="font-bold text-slate-800 flex items-center gap-1">
              <span>🛡️</span>
              <span>Lưu ý nề nếp & bảo mật:</span>
            </p>
            <p>
              Mỗi học sinh chỉ đăng nhập đúng tên của mình để theo dõi điểm và thi đua của nhóm. Sau khi hoàn thành, hãy bấm "Đăng xuất tất cả các tài khoản" nếu dùng chung máy tính với người khác.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
