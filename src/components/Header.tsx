import React, { useState, useMemo } from 'react';
import {
  Home,
  MoreVertical,
  Search,
  X,
  Trophy,
  TableProperties,
  Clock,
  SunMoon,
  BarChart3,
  Printer,
  Settings,
  GraduationCap,
  Sparkles,
  Palette,
  Users,
  Calendar,
  FileSpreadsheet,
  ShieldAlert,
  MessageSquare,
  Bot,
  LogOut,
  Zap,
} from 'lucide-react';
import { WeekInfo, ClassMetadata, UserAccount, Student } from '../types/discipline';
import { ColorTheme } from '../types/theme';
import { formatWeekDateRangeVN, formatWeekHeaderBadgeVN } from '../utils/date';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  metadata?: ClassMetadata;
  students?: Student[];
  weeks?: WeekInfo[];
  currentWeekId?: number;
  currentAccount?: UserAccount;
  currentTheme?: ColorTheme;
  onSelectStudent?: (student: Student) => void;
  onSelectWeek?: (weekId: number) => void;
  onUpdateWeekDates?: (weekId: number, startDate: string, endDate: string) => void;
  onOpenQuickEntry?: () => void;
  onOpenClassRoster?: () => void;
  onOpenSettings?: () => void;
  onOpenPrint?: () => void;
  onOpenThemeModal?: () => void;
  onOpenAuthModal?: () => void;
  onOpenQuickLogin?: () => void;
  onOpenImportRoster?: () => void;
  onOpenEarlyWarning?: () => void;
  onToggleChatAssistant?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  metadata = {} as ClassMetadata,
  students = [],
  weeks = [],
  currentWeekId = 1,
  currentAccount,
  onSelectStudent,
  onSelectWeek,
  onUpdateWeekDates,
  onOpenQuickEntry,
  onOpenClassRoster,
  onOpenSettings,
  onOpenPrint,
  onOpenThemeModal,
  onOpenAuthModal,
  onOpenQuickLogin,
  onOpenImportRoster,
  onOpenEarlyWarning,
  onToggleChatAssistant,
  onLogout,
}) => {
  const currentWeek =
    (weeks && weeks.find((w) => w.id === currentWeekId)) ||
    (weeks && weeks[0]) || { id: 1, name: 'Tuần 1', startDate: '', endDate: '' };
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const navItems = [
    { id: 'competition', label: 'Trang chủ thi đua 6 nhóm', shortLabel: 'Thi đua 6 nhóm', icon: Trophy },
    { id: 'weeklyTable', label: 'Sổ nề nếp tuần', shortLabel: 'Sổ nề nếp', icon: TableProperties },
    { id: 'morningDuty', label: '15p đầu giờ', shortLabel: '15p đầu giờ', icon: Clock },
    { id: 'afternoon', label: 'Học trái buổi', shortLabel: 'Học trái buổi', icon: SunMoon },
    { id: 'reports', label: 'Thống kê & Báo cáo', shortLabel: 'Báo cáo', icon: BarChart3 },
  ];

  // Tìm kiếm học sinh nhanh
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !students) return [];
    return (students || [])
      .filter((s) => s.name?.toLowerCase().includes(q) || s.stt?.toString() === q || `nhóm ${s.groupId}`.includes(q))
      .slice(0, 6);
  }, [searchQuery, students]);

  const handlePickStudent = (s: Student) => {
    setSearchQuery('');
    setShowSearchDropdown(false);
    if (onSelectStudent) {
      onSelectStudent(s);
    }
  };

  return (
    <header className="sticky top-0 z-30 shadow-xl font-['Be_Vietnam_Pro',sans-serif]">
      {/* 0. THANH TRẠNG THÁI MỎNG TRÊN CÙNG (Top Slim Status Bar) */}
      <div className="bg-slate-950 text-slate-300 text-[11px] py-1 px-4 sm:px-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Lớp {metadata.className || '9A3'} · THCS
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-slate-400 hidden sm:inline">
              GVCN: <strong className="text-slate-200">{metadata.homeroomTeacher || 'Cô Nguyễn Thị Thuỳ Trang'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 font-medium">
            {currentAccount ? (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 hidden xs:inline">Tài khoản:</span>
                <span className="font-black text-amber-300">
                  {currentAccount.displayName}
                </span>
                <span className="text-slate-300 text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-bold">
                  {currentAccount.title}
                </span>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="text-blue-300 hover:text-white hover:underline cursor-pointer font-bold transition-colors"
                >
                  Đổi tài khoản
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-rose-400 hover:text-rose-300 hover:underline cursor-pointer font-bold transition-colors"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Chưa đăng nhập</span>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="text-amber-300 hover:text-amber-200 hover:underline font-bold cursor-pointer"
                >
                  ⚡ Đăng nhập
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 1. THANH THÔNG BÁO PHÍA TRÊN (Top Notification Bar) - Nhập Tuần và Ngày */}
      <div className="bg-blue-900 border-b border-blue-800/90 text-blue-100 text-xs py-2 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          {/* Khu vực Nhập Tuần và Ngày (thay thế hoàn toàn -52%) */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Nhóm 1: Chọn / Nhập Tuần */}
            <div className="flex items-center gap-1.5 bg-blue-950/80 px-2.5 py-1 rounded-xl border border-blue-400/30 text-white shadow-xs">
              <Calendar className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="text-[11px] font-extrabold text-blue-200 uppercase whitespace-nowrap">
                Tuần:
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const idx = weeks.findIndex((w) => w.id === currentWeekId);
                    if (idx > 0) onSelectWeek?.(weeks[idx - 1].id);
                  }}
                  disabled={weeks.findIndex((w) => w.id === currentWeekId) <= 0}
                  className="w-5 h-5 rounded-md flex items-center justify-center bg-blue-800 hover:bg-blue-700 active:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors cursor-pointer text-xs font-black"
                  title="Chuyển về tuần trước"
                >
                  ‹
                </button>
                <select
                  value={currentWeekId}
                  onChange={(e) => onSelectWeek?.(Number(e.target.value))}
                  aria-label="Chọn hoặc nhập tuần học"
                  className="bg-white text-slate-900 font-bold text-xs px-2 py-0.5 rounded-lg border border-white/40 focus:outline-none focus:ring-2 focus:ring-amber-300 cursor-pointer shadow-2xs"
                  title="Chọn tuần thi đua"
                >
                  {weeks.map((w) => (
                    <option key={w.id} value={w.id} className="text-slate-900 font-semibold">
                      {w.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const idx = weeks.findIndex((w) => w.id === currentWeekId);
                    if (idx >= 0 && idx < weeks.length - 1) onSelectWeek?.(weeks[idx + 1].id);
                  }}
                  disabled={weeks.findIndex((w) => w.id === currentWeekId) >= weeks.length - 1}
                  className="w-5 h-5 rounded-md flex items-center justify-center bg-blue-800 hover:bg-blue-700 active:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors cursor-pointer text-xs font-black"
                  title="Chuyển sang tuần sau"
                >
                  ›
                </button>
              </div>
            </div>

            {/* Nhóm 2: Nhập Ngày (Từ ngày - Đến ngày) */}
            <div className="flex items-center gap-2 bg-blue-950/80 px-2.5 py-1 rounded-xl border border-blue-400/30 text-white shadow-xs flex-wrap xs:flex-nowrap">
              <span className="text-[11px] font-bold text-blue-200 whitespace-nowrap">
                Từ ngày:
              </span>
              <input
                type="date"
                value={currentWeek.startDate || ''}
                onChange={(e) =>
                  onUpdateWeekDates?.(currentWeek.id, e.target.value, currentWeek.endDate || '')
                }
                className="bg-white text-slate-900 font-semibold text-xs px-2 py-0.5 rounded-lg border border-white/40 focus:outline-none focus:ring-2 focus:ring-amber-300 cursor-pointer shadow-2xs"
                title="Chọn ngày bắt đầu tuần"
              />

              <span className="text-blue-300 text-xs font-bold whitespace-nowrap">
                đến
              </span>

              <span className="text-[11px] font-bold text-blue-200 whitespace-nowrap xs:inline hidden">
                Đến ngày:
              </span>
              <input
                type="date"
                value={currentWeek.endDate || ''}
                onChange={(e) =>
                  onUpdateWeekDates?.(currentWeek.id, currentWeek.startDate || '', e.target.value)
                }
                className="bg-white text-slate-900 font-semibold text-xs px-2 py-0.5 rounded-lg border border-white/40 focus:outline-none focus:ring-2 focus:ring-amber-300 cursor-pointer shadow-2xs"
                title="Chọn ngày kết thúc tuần"
              />
            </div>

            {/* Hiển thị khoảng ngày dạng văn bản tiếng Việt chuẩn */}
            {currentWeek.startDate && currentWeek.endDate && (
              <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-md bg-blue-800/80 text-amber-200 text-[11px] font-bold border border-blue-500/30">
                {formatWeekDateRangeVN(currentWeek.startDate, currentWeek.endDate)}
              </span>
            )}
          </div>

          {/* Góc phải: Năm học & Học kỳ */}
          <div className="flex items-center gap-2 shrink-0 ml-auto text-[11px] text-blue-200">
            <span className="bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-400/20 font-bold">
              Năm học {metadata?.academicYear || '2026 - 2027'}
            </span>
            <span className="bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-400/20 font-bold">
              Học kỳ {metadata?.semester || 1}
            </span>
          </div>
        </div>
      </div>

      {/* 2. THANH ĐIỀU HƯỚNG CHÍNH (Header Main Bar) - Màu chủ đạo XANH DƯƠNG (Blue) */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 text-white border-b border-blue-500/30 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4 flex-wrap lg:flex-nowrap">
          {/* Brand Logo & Tên lớp với điểm nhấn ĐỎ (Red) và TRẮNG (White) */}
          <div className="flex items-center gap-3 shrink-0 min-w-0">
            {/* Logo thương hiệu với viền đỏ nổi bật */}
            <div
              onClick={onOpenSettings}
              className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-600 via-red-700 to-blue-900 text-white flex flex-col items-center justify-center font-black shadow-lg shadow-blue-950/40 border-2 border-red-300/80 cursor-pointer hover:scale-105 transition-all shrink-0 ring-2 ring-white/30 group"
              title="Cài đặt thông tin Lớp / GVCN"
            >
              <GraduationCap className="w-5 h-5 text-amber-200 group-hover:rotate-6 transition-transform" />
              <span className="text-[10px] font-black text-white leading-none -mt-0.5">
                {metadata.className}
              </span>
            </div>

            <div className="min-w-0">
              {/* Tiêu đề chữ trắng to rõ, tương phản cao */}
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight whitespace-nowrap">
                  QUẢN LÝ NỀ NẾP LỚP {metadata.className}
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-extrabold uppercase shadow-xs">
                  {metadata.className}
                </span>
              </div>
              <p className="text-[11px] text-blue-100 flex items-center gap-1.5 whitespace-nowrap mt-0.5">
                <span>{metadata.schoolName || 'Trường TH và THCS Phước Hưng'}</span>
                <span className="text-blue-300">·</span>
                <span>Năm học {metadata.academicYear || '2026 - 2027'}</span>
              </p>
            </div>

            {/* Nút "Trang chủ" nền TRẮNG (White) theo đúng yêu cầu: độ tương phản cao trên nền xanh */}
            <button
              type="button"
              onClick={() => setActiveTab('competition')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-blue-50 active:bg-blue-100 text-blue-700 font-black text-xs rounded-xl shadow-md border border-white/80 transition-all cursor-pointer hover:scale-[1.02] shrink-0"
              title="Quay lại Trang chủ Bảng Thi Đua 6 Nhóm"
            >
              <Home className="w-4 h-4 text-blue-700 shrink-0" />
              <span>Trang chủ</span>
            </button>
          </div>

          {/* Khu vực Tìm Kiếm: Nền TRẮNG (White) - Thanh tìm kiếm tương phản cao */}
          <div className="relative flex-1 max-w-xs sm:max-w-md w-full min-w-[200px]">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setShowSearchDropdown(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
                placeholder="Tìm kiếm học sinh theo tên, STT, nhóm..."
                className="w-full bg-white text-slate-900 placeholder:text-slate-400 text-xs font-medium py-2.5 pl-9 pr-8 rounded-xl shadow-inner border border-blue-200 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-white transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-700 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown gợi ý tìm kiếm học sinh */}
            {showSearchDropdown && filteredStudents.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 flex items-center justify-between">
                  <span>Học sinh tìm thấy ({filteredStudents.length})</span>
                  <span className="text-blue-600">Bấm để chấm điểm / xem</span>
                </div>
                {filteredStudents.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handlePickStudent(s)}
                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                        {s.stt}
                      </span>
                      <div>
                        <p className="font-bold text-slate-900">{s.name}</p>
                        <p className="text-[10px] text-slate-500">
                          Nhóm {s.groupId} {s.role ? `· ${s.role}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      Chấm điểm →
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nhóm công cụ bên phải: Màu Xanh Ngọc / Xanh Lá Nhạt (Tươi mới, dịu mắt) + Công cụ */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Điểm nhấn Màu Xanh Ngọc / Xanh Lá Nhạt tươi mới, dịu mắt */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-400/20 text-teal-100 border border-teal-300/40 text-xs font-bold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-teal-200" />
              <span>Nề Nếp Tích Cực</span>
            </div>

            {/* NÚT THAO TÁC KHÁC (...) - Gộp các nút In, Thành viên, Cài đặt, Theme */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                title="Thao tác khác (In, Danh sách học sinh, Theme, Cài đặt)"
                className="flex items-center gap-1.5 px-3 py-2 text-white bg-white/15 hover:bg-white/25 active:bg-white/30 rounded-xl border border-white/20 transition-all cursor-pointer shadow-xs text-xs font-bold"
              >
                <MoreVertical className="w-4 h-4" />
                <span className="hidden sm:inline">Thao tác khác</span>
              </button>

              {showMoreMenu && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 font-['Be_Vietnam_Pro',sans-serif] text-slate-800"
                  onClick={() => setShowMoreMenu(false)}
                >
                  <div className="px-3.5 py-1.5 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Công Cụ & Tiện Ích Lớp
                  </div>

                  <button
                    type="button"
                    onClick={onOpenPrint}
                    className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="leading-tight font-black">In / Xuất phiếu nề nếp A4</p>
                      <p className="text-[10px] font-normal text-slate-400">Xuất báo cáo tuần in giấy</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenClassRoster}
                    className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="leading-tight font-black">Danh sách lớp ({students?.length || 0} HS)</p>
                      <p className="text-[10px] font-normal text-slate-400">Xem và sửa danh sách 6 nhóm</p>
                    </div>
                  </button>

                  {onOpenImportRoster && (
                    <button
                      type="button"
                      onClick={onOpenImportRoster}
                      className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                      <div>
                        <p className="leading-tight font-black">Tải danh sách từ Excel</p>
                        <p className="text-[10px] font-normal text-slate-400">Import học sinh từ file mẫu</p>
                      </div>
                    </button>
                  )}

                  {onOpenThemeModal && (
                    <button
                      type="button"
                      onClick={onOpenThemeModal}
                      className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Palette className="w-4 h-4 text-slate-500" />
                      <div>
                        <p className="leading-tight font-black">Đổi màu sắc & giao diện</p>
                        <p className="text-[10px] font-normal text-slate-400">Tùy biến màu sắc chủ đạo</p>
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer border-t border-slate-100"
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="leading-tight font-black">Cài đặt thông tin Lớp & GVCN</p>
                      <p className="text-[10px] font-normal text-slate-400">Đổi tên lớp, niên khóa, GVCN</p>
                    </div>
                  </button>
                </div>
              )}
            </div>



            {/* Thẻ người dùng đăng nhập nổi bật trên Header */}
            {currentAccount && onOpenAuthModal && (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/15 hover:bg-white/25 active:bg-white/30 rounded-xl border border-white/25 transition-all cursor-pointer shadow-xs text-left shrink-0"
                title={`Đang đăng nhập: ${currentAccount.displayName} (${currentAccount.title}) - Bấm để quản lý hoặc đổi tài khoản`}
              >
                <span className="text-lg">{currentAccount.avatarIcon || '👤'}</span>
                <div className="leading-tight">
                  <span className="text-[10px] text-blue-200 block font-semibold leading-none mb-0.5">
                    {currentAccount.role === 'gvcn' ? 'Giáo viên:' : 'Học sinh:'}
                  </span>
                  <p className="text-xs sm:text-sm font-black text-amber-300 truncate max-w-[120px] sm:max-w-[170px] leading-tight">
                    {currentAccount.displayName}
                  </p>
                  <p className="text-[10px] text-blue-100 font-bold truncate leading-none mt-0.5">
                    {currentAccount.title}
                  </p>
                </div>
              </button>
            )}

            {/* Nút Đăng xuất tất cả các tài khoản trên Header */}
            {currentAccount && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-600/90 hover:bg-red-700 active:bg-red-800 text-white rounded-xl font-bold text-xs shadow-sm border border-red-400/40 transition-all cursor-pointer hover:scale-[1.02] shrink-0"
                title="Đăng xuất khỏi tất cả các tài khoản (quay về chế độ chỉ xem)"
              >
                <LogOut className="w-3.5 h-3.5 text-white" />
                <span className="hidden xl:inline">Đăng xuất tất cả tài khoản</span>
                <span className="xl:hidden">Đăng xuất</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. THANH TAB ĐIỀU HƯỚNG CHUYÊN SÂU (Navigation Sub-Bar) - Chữ trắng, tab active nền trắng tương phản cao */}
      <div className="bg-blue-800/90 border-t border-blue-500/30 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1.5 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-1.5 text-xs rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white text-blue-700 shadow-md font-black ring-2 ring-white/60'
                    : 'text-white hover:text-white hover:bg-white/15 font-semibold'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${isActive ? 'text-blue-700' : 'text-blue-200'}`}
                />
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.shortLabel}</span>
              </button>
            );
          })}

          {/* Dải phân cách */}
          <div className="h-5 w-px bg-blue-400/30 mx-1 shrink-0 hidden sm:block" />

          {/* Các tính năng AI chung cho toàn lớp (Đồng bộ chuẩn màu Vàng Hổ Phách & Huy hiệu AI Đỏ) */}
          {onOpenEarlyWarning && (
            <button
              type="button"
              onClick={onOpenEarlyWarning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-bold whitespace-nowrap transition-all border border-amber-500/60 shadow-xs cursor-pointer hover:scale-[1.02]"
              title="AI phân tích biểu đồ điểm số để đưa ra cảnh báo sớm học sinh sa sút"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-slate-950" />
              <span>Cảnh báo sớm</span>
              <span className="bg-red-600 text-white text-[9px] px-1 py-0.2 rounded font-black tracking-wider leading-none shadow-xs">
                AI
              </span>
            </button>
          )}

          {onToggleChatAssistant && (
            <button
              type="button"
              onClick={onToggleChatAssistant}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-bold whitespace-nowrap transition-all border border-amber-500/60 shadow-xs cursor-pointer hover:scale-[1.02]"
              title="Khung chat nhỏ tra cứu nhanh: Hôm nay ai trực nhật? Điểm TB lớp..."
            >
              <Bot className="w-3.5 h-3.5 text-slate-950" />
              <span>Trợ lý hỏi nhanh</span>
              <span className="bg-red-600 text-white text-[9px] px-1 py-0.2 rounded font-black tracking-wider leading-none shadow-xs">
                AI
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
