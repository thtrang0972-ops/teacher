import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  GraduationCap,
  Crown,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  School,
  KeyRound,
  Users,
  Flag,
} from 'lucide-react';
import { Student, UserAccount, ClassMetadata } from '../types/discipline';
import { matchStudentQuery } from '../utils/vietnamese';

interface ManHinhDangNhapProps {
  metadata: ClassMetadata;
  students: Student[];
  accounts: UserAccount[];
  onLoginSuccess: (accountId: string, studentUser?: Student) => void;
}

export const ManHinhDangNhap: React.FC<ManHinhDangNhapProps> = ({
  metadata,
  students = [],
  accounts = [],
  onLoginSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'officer' | 'student'>('officer');

  // Form Cán sự / GVCN
  const [selectedOfficer, setSelectedOfficer] = useState<UserAccount | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [useManualForm, setUseManualForm] = useState(false);

  // Form Học sinh
  const [selectedGroup, setSelectedGroup] = useState<number>(0);
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentPassword, setStudentPassword] = useState('');
  const [showStudentPassword, setShowStudentPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Lọc học sinh
  const filteredStudents = students.filter((s) => {
    if (selectedGroup > 0 && s.groupId !== selectedGroup) return false;
    if (searchStudent.trim() && !matchStudentQuery(s, searchStudent.trim())) return false;
    return true;
  });

  // 1. Xử lý đăng nhập Cán sự / GVCN qua chọn thẻ nhanh
  const handleQuickOfficerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfficer) return;
    setErrorMessage('');

    const expectedPass = selectedOfficer.password || '123';
    if (passwordInput.trim() === expectedPass) {
      setSuccessNotice(`Chào mừng ${selectedOfficer.displayName} (${selectedOfficer.title})!`);
      setTimeout(() => {
        onLoginSuccess(selectedOfficer.id);
      }, 300);
    } else {
      setErrorMessage('Mật khẩu không chính xác! Vui lòng liên hệ Giáo viên chủ nhiệm.');
    }
  };

  // 2. Xử lý đăng nhập bằng Username / Mật khẩu
  const handleManualOfficerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const u = usernameInput.trim().toLowerCase();
    const p = passwordInput.trim();

    const matched = accounts.find((a) => a.username.toLowerCase() === u);
    if (!matched) {
      setErrorMessage('Tên tài khoản không tồn tại trong hệ thống!');
      return;
    }

    if (matched.password !== p) {
      setErrorMessage('Mật khẩu không chính xác! Vui lòng thử lại.');
      return;
    }

    setSuccessNotice(`Đăng nhập thành công: ${matched.displayName} (${matched.title})!`);
    setTimeout(() => {
      onLoginSuccess(matched.id);
    }, 300);
  };

  // 3. Xử lý đăng nhập Học sinh
  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setErrorMessage('Vui lòng chọn tên học sinh của bạn trong danh sách!');
      return;
    }

    setErrorMessage('');
    // Học sinh đăng nhập chế độ chỉ xem điểm thi đua
    setSuccessNotice(`Chào mừng học sinh ${selectedStudent.name} (Nhóm ${selectedStudent.groupId})!`);
    setTimeout(() => {
      onLoginSuccess(`acc-${selectedStudent.id}`, selectedStudent);
    }, 300);
  };

  // Phân loại tài khoản cán sự
  const classOfficers = accounts.filter(
    (a) =>
      a.role === 'gvcn' ||
      a.role === 'lopTruong' ||
      a.role === 'lopPhoHocTap' ||
      a.role === 'lopPhoLaoDong' ||
      a.role === 'lopPhoTratTu'
  );

  const groupLeaders = [1, 2, 3, 4, 5, 6].map((g) => {
    const acc = accounts.find((a) => a.role === `nhomTruong${g}`);
    const leaderName = metadata.groupLeaders?.[g] || acc?.displayName || `Nhóm trưởng ${g}`;
    return {
      groupNum: g,
      account: acc || {
        id: `acc-nhom${g}`,
        username: `nhom${g}`,
        password: '123',
        role: `nhomTruong${g}`,
        displayName: leaderName,
        title: `Nhóm trưởng ${g}`,
        assignedGroupIds: [g],
      },
      leaderName,
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex flex-col items-center justify-center p-4 sm:p-6 font-['Be_Vietnam_Pro',sans-serif] text-slate-800">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-amber-500 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-500 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-2xl w-full">
        {/* Card chính */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden backdrop-blur-md">
          {/* Header Brand */}
          <div className="px-6 py-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white relative">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg border-2 border-white/40">
                  <School className="w-6 h-6 text-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                      Cổng Bảo Mật
                    </span>
                    <span className="text-xs text-blue-200 font-semibold">
                      Lớp {metadata.className || '9A3'} · Năm học {metadata.academicYear || '2024 - 2025'}
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-xl font-black tracking-tight text-white mt-1">
                    HỆ THỐNG THI ĐUA NỀ NẾP 6 NHÓM
                  </h1>
                  <p className="text-xs text-blue-200 mt-0.5">
                    GVCN: <strong className="text-amber-300">{metadata.homeroomTeacher || 'Cô Nguyễn Thị Thuỳ Trang'}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Thông báo bảo mật */}
            <div className="mt-4 p-2.5 rounded-xl bg-white/10 border border-white/15 text-xs text-blue-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-300 shrink-0" />
              <span>
                <strong>Bảo mật điểm số:</strong> Bảng thi đua chỉ mở sau khi bạn đăng nhập xác thực danh tính.
              </span>
            </div>
          </div>

          {/* Thanh chọn 2 Tab Đăng nhập */}
          <div className="px-6 pt-5 pb-2 flex items-center gap-2 border-b border-slate-100 bg-slate-50/70">
            <button
              type="button"
              onClick={() => {
                setActiveTab('officer');
                setErrorMessage('');
                setSelectedOfficer(null);
              }}
              className={`flex-1 py-3 px-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                activeTab === 'officer'
                  ? 'bg-indigo-700 text-white border-indigo-700 shadow-md scale-[1.01]'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span>Cán Sự Lớp & GVCN</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('student');
                setErrorMessage('');
                setSelectedOfficer(null);
              }}
              className={`flex-1 py-3 px-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                activeTab === 'student'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-[1.01]'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Học Sinh Xem Điểm</span>
            </button>
          </div>

          {/* Thông báo phản hồi */}
          {errorMessage && (
            <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-900 flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-black text-emerald-900 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Nội dung Tab */}
          <div className="p-6">
            {activeTab === 'officer' ? (
              /* TAB 1: CÁN SỰ & GVCN */
              <div className="space-y-4">
                {/* Form xác thực mật khẩu khi đã bấm chọn 1 Cán sự */}
                {selectedOfficer ? (
                  <form
                    onSubmit={handleQuickOfficerSubmit}
                    className="p-5 bg-indigo-50/80 rounded-2xl border border-indigo-200 space-y-4 animate-in fade-in"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{selectedOfficer.avatarIcon || '👤'}</span>
                        <div>
                          <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-200/80 px-2 py-0.5 rounded">
                            {selectedOfficer.role === 'gvcn' ? 'Giáo viên chủ nhiệm' : 'Ban cán sự'}
                          </span>
                          <h3 className="text-base font-black text-slate-900 mt-0.5">
                            {selectedOfficer.displayName}
                          </h3>
                          <p className="text-xs text-slate-600 font-bold">
                            Chức danh: {selectedOfficer.title}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedOfficer(null)}
                        className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                      >
                        Đổi người khác
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Nhập mật khẩu xác thực do GVCN quản lý:
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoFocus
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder="Nhập mật khẩu để mở khóa..."
                          className="w-full text-xs font-bold p-3 pl-10 pr-10 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-inner"
                        />
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedOfficer(null)}
                        className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Mở Khóa Vào Sử Dụng</span>
                      </button>
                    </div>
                  </form>
                ) : useManualForm ? (
                  /* Form nhập Username & Password */
                  <form onSubmit={handleManualOfficerSubmit} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tên tài khoản (Username)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={usernameInput}
                          onChange={(e) => setUsernameInput(e.target.value)}
                          placeholder="Ví dụ: gvcn, loptruong, nhom1..."
                          className="w-full text-xs font-bold p-2.5 pl-9 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600"
                        />
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Mật khẩu</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder="Nhập mật khẩu..."
                          className="w-full text-xs font-bold p-2.5 pl-9 pr-9 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600"
                        />
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setUseManualForm(false)}
                        className="text-xs text-indigo-700 hover:underline font-bold cursor-pointer"
                      >
                        ← Quay lại chọn nhanh vai trò
                      </button>
                      <button
                        type="submit"
                        className="py-2.5 px-6 bg-indigo-700 hover:bg-indigo-800 text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
                      >
                        Đăng Nhập
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Danh sách thẻ Cán sự & Nhóm trưởng */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-700 uppercase">
                        Chọn vai trò của bạn:
                      </span>
                      <button
                        type="button"
                        onClick={() => setUseManualForm(true)}
                        className="text-[11px] font-bold text-indigo-700 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Đăng nhập bằng Username</span>
                      </button>
                    </div>

                    {/* Ban Cán Sự Toàn Lớp */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold text-indigo-900 uppercase">
                        1. Ban Cán Sự Lớp (Toàn lớp)
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {classOfficers.map((acc) => (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => {
                              setSelectedOfficer(acc);
                              setPasswordInput('');
                              setErrorMessage('');
                            }}
                            className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer shadow-2xs hover:shadow-sm group hover:scale-[1.01] ${
                              acc.role === 'gvcn'
                                ? 'bg-purple-50/60 border-purple-200 hover:border-purple-400'
                                : 'bg-slate-50 border-slate-200 hover:border-indigo-400'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-2xl">{acc.avatarIcon || '👤'}</span>
                              <div className="min-w-0">
                                <p className="font-black text-xs text-slate-900 group-hover:text-indigo-700 truncate">
                                  {acc.displayName}
                                </p>
                                <p className="text-[11px] font-bold text-slate-500 truncate mt-0.5">
                                  {acc.title}
                                </p>
                              </div>
                            </div>
                            <span className="text-[11px] font-black text-indigo-600 shrink-0">
                              Chọn →
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 6 Nhóm Trưởng */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-sky-900 uppercase">
                          2. 6 Nhóm Trưởng (Nhóm nào phụ trách nhóm đó)
                        </p>
                        <span className="text-[10px] text-sky-700 font-bold bg-sky-50 px-1.5 py-0.5 rounded">
                          Chấm theo nhóm
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {groupLeaders.map(({ groupNum, account, leaderName }) => (
                          <button
                            key={groupNum}
                            type="button"
                            onClick={() => {
                              setSelectedOfficer(account as UserAccount);
                              setPasswordInput('');
                              setErrorMessage('');
                            }}
                            className="p-2.5 rounded-xl border border-sky-200 bg-sky-50/50 hover:bg-sky-50 hover:border-sky-400 text-left transition-all cursor-pointer group hover:scale-[1.01]"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs">🚩</span>
                              <span className="text-[11px] font-black text-sky-900">
                                Nhóm {groupNum}
                              </span>
                            </div>
                            <p className="font-bold text-xs text-slate-900 truncate mt-1 group-hover:text-sky-700">
                              {leaderName}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* TAB 2: HỌC SINH VÀO ĐÚNG TÊN XEM ĐIỂM */
              <form onSubmit={handleStudentSubmit} className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Dành cho Học sinh:</p>
                    <p className="text-[11px] text-blue-800 mt-0.5">
                      Chọn đúng tên của bạn để theo dõi điểm thi đua cá nhân và thứ hạng của nhóm.
                    </p>
                  </div>
                </div>

                {/* Bộ lọc nhóm */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setSelectedGroup(0)}
                    className={`py-1.5 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer shrink-0 ${
                      selectedGroup === 0
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                    }`}
                  >
                    Tất cả nhóm
                  </button>
                  {[1, 2, 3, 4, 5, 6].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setSelectedGroup(g)}
                      className={`py-1.5 px-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer shrink-0 ${
                        selectedGroup === g
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                      }`}
                    >
                      N{g}
                    </button>
                  ))}
                </div>

                {/* Tìm kiếm tên */}
                <input
                  type="text"
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  placeholder="Gõ STT hoặc tên học sinh..."
                  className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />

                {/* Danh sách học sinh */}
                <div className="max-h-48 overflow-y-auto p-1 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  {filteredStudents.slice(0, 30).map((s) => {
                    const isSelected = selectedStudent?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedStudent(s)}
                        className={`w-full p-2 rounded-xl text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold shadow-xs'
                            : 'hover:bg-slate-200/70 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {s.stt}
                          </span>
                          <span>
                            {s.name} (Nhóm {s.groupId})
                          </span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="submit"
                  disabled={!selectedStudent}
                  className={`w-full py-3 px-4 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${
                    selectedStudent
                      ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer hover:scale-[1.01]'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>
                    {selectedStudent
                      ? `Vào Xem Điểm: ${selectedStudent.name}`
                      : 'Vui lòng chọn tên học sinh ở trên'}
                  </span>
                </button>
              </form>
            )}
          </div>

          {/* Footer thông tin lớp */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Phiên bản thi đua chuẩn THCS</span>
            <span className="flex items-center gap-1 text-emerald-700 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Đồng bộ dữ liệu thời gian thực
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
