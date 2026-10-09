import React, { useState } from 'react';
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
} from 'lucide-react';
import { UserAccount } from '../types/discipline';
import { getRolePermissionBadge } from '../utils/permissions';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: UserAccount[];
  currentAccountId: string;
  isLoggedIn?: boolean;
  onLogin: (accountId: string) => void;
  onLogout?: () => void;
  onOpenAccountManager?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  accounts,
  currentAccountId,
  isLoggedIn = true,
  onLogin,
  onLogout,
  onOpenAccountManager,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const currentAccount = accounts.find((a) => a.id === currentAccountId);
  const isCurrentlyActive = isLoggedIn && !!currentAccount;

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const matched = accounts.find(
      (a) =>
        a.username.toLowerCase() === username.trim().toLowerCase() &&
        a.password === password.trim()
    );

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
      onLogin(matched.id);
      setSuccessMessage('');
      setUsername('');
      setPassword('');
      onClose();
    }, 500);
  };

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
      setSuccessMessage('Đã đăng xuất khỏi tất cả các tài khoản thành công!');
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
      }, 700);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-indigo-950 flex items-center justify-center shadow-md font-bold text-lg shrink-0">
              <KeyRound className="w-5 h-5 text-indigo-950" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>Đăng Nhập Tài Khoản</span>
              </h3>
              <p className="text-xs text-indigo-200 mt-0.5">
                Nhập tên tài khoản và mật khẩu được cấp phát
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Trạng thái tài khoản hiện tại & Nút Đăng xuất tất cả các tài khoản */}
          {isCurrentlyActive && currentAccount ? (
            <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-300 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{currentAccount.avatarIcon}</span>
                  <div>
                    <div className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">
                      {currentAccount.role === 'gvcn' ? 'Giáo viên đang đăng nhập:' : 'Học sinh đang đăng nhập:'}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-emerald-950 bg-white px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                        {currentAccount.displayName}
                      </span>
                      <span className="text-[11px] bg-emerald-100 text-emerald-900 font-extrabold px-2 py-0.5 rounded-md border border-emerald-300">
                        {currentAccount.title}
                      </span>
                    </div>
                  </div>
                </div>

                {currentAccount.role === 'gvcn' && onOpenAccountManager && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAccountManager();
                    }}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-200 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                    title="Quản lý tài khoản & Mật khẩu học sinh"
                  >
                    <Settings2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Quản lý MK</span>
                  </button>
                )}
              </div>

              {/* Nút Đăng xuất tất cả các tài khoản nổi bật */}
              {onLogout && (
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01]"
                  title="Đăng xuất khỏi tất cả các tài khoản"
                >
                  <LogOut className="w-4 h-4 text-white" />
                  <span>Đăng xuất tất cả các tài khoản</span>
                </button>
              )}
            </div>
          ) : (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Hiện đang ở <strong>Chế độ chỉ xem</strong>. Vui lòng nhập thông tin đăng nhập bên dưới.</span>
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

          {/* Form đăng nhập sạch sẽ, không hiển thị gợi ý tài khoản */}
          <form onSubmit={handleFormLogin} className="space-y-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
            <div className="border-b border-slate-200 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-600" />
                {isCurrentlyActive ? 'Đăng Nhập Bằng Tài Khoản Khác' : 'Thông Tin Đăng Nhập'}
              </h4>
            </div>

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
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Nhập tên tài khoản..."
                    className="w-full text-xs font-bold p-2.5 pl-9 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    className="w-full text-xs font-bold p-2.5 pl-9 pr-9 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
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

            <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
              {onLogout ? (
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                  title="Đăng xuất khỏi tất cả các tài khoản"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span>Đăng xuất tất cả các tài khoản</span>
                </button>
              ) : <div />}

              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-all cursor-pointer hover:scale-[1.02]"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Xác Nhận Đăng Nhập</span>
              </button>
            </div>
          </form>

          {/* Lưu ý bảo mật */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
            <p className="font-bold text-slate-800 flex items-center gap-1">
              <span>🛡️</span>
              <span>Bảo mật tài khoản:</span>
            </p>
            <p>
              Vui lòng giữ bảo mật thông tin đăng nhập cá nhân. Sau khi hoàn thành việc ghi nhận nề nếp, hãy bấm "Đăng xuất tất cả các tài khoản" để bảo vệ dữ liệu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
