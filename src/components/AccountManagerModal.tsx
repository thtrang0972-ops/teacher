import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Edit2,
  Save,
  RotateCcw,
  Printer,
  Eye,
  EyeOff,
  User,
  Users,
  RefreshCw,
} from 'lucide-react';
import { UserAccount, ClassMetadata, UserRoleType, Student } from '../types/discipline';
import { INITIAL_ACCOUNTS } from '../data/initialData';
import { getRolePermissionBadge } from '../utils/permissions';
import { syncRolesAndAccounts } from '../utils/syncRoles';

interface AccountManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: ClassMetadata;
  students?: Student[];
  accounts: UserAccount[];
  currentRole?: UserRoleType;
  onUpdateAccounts: (accounts: UserAccount[]) => void;
  onUpdateMetadata?: (metadata: ClassMetadata) => void;
  onUpdateStudents?: (students: Student[]) => void;
  onSelectAccount: (accountId: string) => void;
}

export const AccountManagerModal: React.FC<AccountManagerModalProps> = ({
  isOpen,
  onClose,
  metadata,
  students = [],
  accounts,
  currentRole = 'gvcn',
  onUpdateAccounts,
  onUpdateMetadata,
  onUpdateStudents,
  onSelectAccount,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editAssignedGroup, setEditAssignedGroup] = useState<string>('1');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<string | null>(null);

  // Bảo mật: Xác thực mật khẩu GVCN trước khi cho phép xem và quản lý
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [masterPasswordInput, setMasterPasswordInput] = useState('');
  const [unlockError, setUnlockError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setIsUnlocked(false);
      setMasterPasswordInput('');
      setUnlockError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Quyền hạn: Chỉ GVCN được quản lý mật khẩu
  if (currentRole !== 'gvcn') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Quyền Truy Cập Bị Hạn Chế</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Chức năng Quản lý Tài khoản & Mật khẩu chỉ dành riêng cho <strong>Giáo viên chủ nhiệm ({metadata.homeroomTeacher})</strong>. Các tài khoản ban cán sự lớp không có quyền truy cập khu vực này.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  // Khóa bảo mật: Yêu cầu mật khẩu GVCN để mở khóa
  if (!isUnlocked) {
    const handleVerify = (e: React.FormEvent) => {
      e.preventDefault();
      setUnlockError('');
      const gvcnAccount = accounts.find((a) => a.role === 'gvcn');
      const expectedPass = gvcnAccount?.password || '123';
      if (masterPasswordInput.trim() === expectedPass) {
        setIsUnlocked(true);
        setMasterPasswordInput('');
      } else {
        setUnlockError('Mật khẩu Giáo viên chủ nhiệm không chính xác! Vui lòng thử lại.');
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">
              Khu Vực Bảo Mật Giáo Viên Chủ Nhiệm
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Tài khoản và mật khẩu của lớp được bảo mật tuyệt đối. Học sinh khác không thể xem được. Vui lòng nhập mật khẩu tài khoản <strong>{metadata.homeroomTeacher || 'GVCN'}</strong> để mở khóa.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-3 pt-2">
            <div className="relative">
              <input
                type="password"
                required
                autoFocus
                value={masterPasswordInput}
                onChange={(e) => {
                  setMasterPasswordInput(e.target.value);
                  setUnlockError('');
                }}
                placeholder="Nhập mật khẩu GVCN để mở khóa..."
                className="w-full text-center text-sm font-bold tracking-widest p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all shadow-inner"
              />
            </div>

            {unlockError && (
              <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2">
                {unlockError}
              </p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
              >
                Mở Khóa Quản Lý
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const handleStartEdit = (acc: UserAccount) => {
    setEditingId(acc.id);
    setEditDisplayName(acc.displayName);
    setEditUsername(acc.username);
    setEditPassword(acc.password);
    setEditAssignedGroup(acc.assignedGroupIds ? acc.assignedGroupIds.join(',') : '1');
  };

  const handleSaveEdit = (accId: string) => {
    if (!editUsername.trim() || !editPassword.trim()) return;

    const parsedGroups = editAssignedGroup
      .split(',')
      .map((g) => parseInt(g.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= 6);

    const updated = accounts.map((acc) => {
      if (acc.id !== accId) return acc;
      return {
        ...acc,
        displayName: editDisplayName.trim() || acc.displayName,
        username: editUsername.trim(),
        password: editPassword.trim(),
        assignedGroupIds: parsedGroups.length > 0 ? parsedGroups : acc.assignedGroupIds,
      };
    });

    onUpdateAccounts(updated);

    // Đồng bộ ngược lại vào metadata & students nếu sửa tên học sinh đảm nhiệm
    const currentAcc = accounts.find((a) => a.id === accId);
    if (currentAcc && students.length > 0) {
      const newName = editDisplayName.trim();
      const updatedMeta = { ...metadata };
      if (currentAcc.role.startsWith('nhomTruong')) {
        const gNum = parseInt(currentAcc.role.replace('nhomTruong', ''), 10);
        if (updatedMeta.groupLeaders) {
          updatedMeta.groupLeaders[gNum] = newName;
        }
      } else if (currentAcc.role === 'lopTruong') {
        updatedMeta.monitorName = newName;
      } else if (currentAcc.role === 'lopPhoHocTap') {
        updatedMeta.academicViceMonitorName = newName;
      } else if (currentAcc.role === 'lopPhoLaoDong') {
        updatedMeta.laborViceMonitorName = newName;
      } else if (currentAcc.role === 'lopPhoTratTu') {
        updatedMeta.disciplineViceMonitorName = newName;
        updatedMeta.viceMonitorName = newName;
      }
      if (onUpdateMetadata) onUpdateMetadata(updatedMeta);
    }

    setEditingId(null);
    setNotice(`Đã cập nhật tài khoản và khớp chức vụ thành công!`);
    setTimeout(() => setNotice(null), 2000);
  };

  // Đồng bộ tự động 1 click từ danh sách học sinh
  const handleAutoSyncFromStudents = () => {
    const { syncedStudents, syncedMetadata, syncedAccounts } = syncRolesAndAccounts(
      students,
      metadata,
      accounts
    );
    onUpdateAccounts(syncedAccounts);
    if (onUpdateMetadata) onUpdateMetadata(syncedMetadata);
    if (onUpdateStudents) onUpdateStudents(syncedStudents);
    setNotice('Đã khớp 100% tên học sinh và chức vụ 6 nhóm trưởng vào tài khoản!');
    setTimeout(() => setNotice(null), 2500);
  };

  const handleResetToDefault = () => {
    onUpdateAccounts(INITIAL_ACCOUNTS);
    setNotice('Đã khôi phục tất cả tài khoản và mật khẩu về mặc định (123)!');
    setTimeout(() => setNotice(null), 2500);
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePrintCredentials = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-indigo-950 flex items-center justify-center shadow-md font-bold text-lg shrink-0">
              <KeyRound className="w-5 h-5 text-indigo-950" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>Quản Lý Tài Khoản & Mật Khẩu Ban Cán Sự</span>
              </h3>
              <p className="text-xs text-indigo-200 mt-0.5">
                Lớp {metadata.className} · Năm học {metadata.academicYear} · GVCN: {metadata.homeroomTeacher}
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

        {/* Toolbar & Alert */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Tổng số: {accounts.length} tài khoản</span>
            <span className="text-slate-300">|</span>
            <span className="text-[11px] text-purple-700 font-extrabold flex items-center gap-1">🔒 Bảo mật riêng tư: Chỉ GVCN quản lý</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleAutoSyncFromStudents}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 shadow-2xs transition-colors cursor-pointer"
              title="Tự động đồng bộ và khớp tên học sinh theo chức vụ trong lớp"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
              <span>Khớp tên theo DS học sinh</span>
            </button>

            <button
              type="button"
              onClick={handlePrintCredentials}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
              title="In danh sách cấp phát tài khoản cho học sinh"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>In danh sách cấp tài khoản</span>
            </button>

            <button
              type="button"
              onClick={handleResetToDefault}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 shadow-2xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Khôi phục mật khẩu ban đầu</span>
            </button>
          </div>
        </div>

        {notice && (
          <div className="mx-6 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1.5 animate-in fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{notice}</span>
          </div>
        )}

        {/* Table Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3 w-12 text-center">STT</th>
                  <th className="py-2.5 px-3">Vai trò chức vụ</th>
                  <th className="py-2.5 px-3">Học sinh / GV phụ trách</th>
                  <th className="py-2.5 px-3">Tên đăng nhập</th>
                  <th className="py-2.5 px-3">Mật khẩu</th>
                  <th className="py-2.5 px-3">Phạm vi quyền hạn</th>
                  <th className="py-2.5 px-3 text-center w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map((acc, index) => {
                  const isEditing = editingId === acc.id;
                  const badge = getRolePermissionBadge(acc.role, acc.assignedGroupIds);
                  const isPassVisible = showPasswords[acc.id];

                  return (
                    <tr
                      key={acc.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isEditing ? 'bg-indigo-50/60' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-bold text-slate-400">
                        {index + 1}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{acc.avatarIcon}</span>
                          <div>
                            <span className="font-bold text-slate-900 block">{acc.title}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border inline-block mt-0.5 ${badge.badgeColor}`}>
                              {badge.badgeText}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={editDisplayName}
                              onChange={(e) => setEditDisplayName(e.target.value)}
                              placeholder="Họ và tên"
                              className="w-full text-xs font-bold p-1.5 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
                            />
                            {students.length > 0 && acc.role !== 'gvcn' && (
                              <select
                                onChange={(e) => {
                                  if (e.target.value) setEditDisplayName(e.target.value);
                                }}
                                className="w-full text-[10px] p-1 bg-indigo-50/70 border border-indigo-200 rounded text-indigo-900 font-semibold cursor-pointer"
                              >
                                <option value="">-- Khớp với học sinh trong lớp --</option>
                                {(acc.role.startsWith('nhomTruong')
                                  ? students.filter(
                                      (s) =>
                                        s.groupId ===
                                        parseInt(acc.role.replace('nhomTruong', ''), 10)
                                    )
                                  : students
                                ).map((s) => (
                                  <option key={s.id} value={s.name}>
                                    {s.stt}. {s.name} (N{s.groupId}{s.role ? ` - ${s.role}` : ''})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        ) : (
                          <span className="font-black text-slate-900 block text-xs">
                            {acc.displayName}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 block">
                          {acc.role === 'gvcn' ? 'Giáo viên chủ nhiệm' : 'Học sinh đảm nhiệm'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value)}
                            className="w-full text-xs font-bold p-1.5 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
                          />
                        ) : (
                          <code className="px-2 py-1 bg-slate-100 rounded text-slate-800 font-bold border border-slate-200">
                            {acc.username}
                          </code>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            className="w-full text-xs font-bold p-1.5 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-800">
                              {isPassVisible ? acc.password : '••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(acc.id)}
                              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                              title="Ẩn/hiện mật khẩu"
                            >
                              {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {isEditing && acc.role.startsWith('nhomTruong') ? (
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">Nhóm phụ trách (VD: 1 hoặc 1,2):</label>
                            <input
                              type="text"
                              value={editAssignedGroup}
                              onChange={(e) => setEditAssignedGroup(e.target.value)}
                              placeholder="1 hoặc 1,2"
                              className="w-24 text-xs font-bold p-1 bg-white border border-slate-300 rounded"
                            />
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-600 block max-w-xs">
                            {badge.scopeText}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(acc.id)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-xs cursor-pointer"
                            >
                              Lưu
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded cursor-pointer"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(acc)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Sửa tên đăng nhập hoặc mật khẩu"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onSelectAccount(acc.id);
                                onClose();
                              }}
                              className="px-2 py-1 text-[10px] font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                              title="Đăng nhập ngay với tài khoản này"
                            >
                              Đăng nhập
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Hướng dẫn quy tắc phân quyền */}
          <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
            <h5 className="font-bold text-indigo-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Quy tắc phân quyền bảo mật cấp THCS:
            </h5>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-600">
              <li><strong>Giáo viên chủ nhiệm (GVCN)</strong>: Toàn quyền nhập/sửa học sinh mọi nhóm, quản lý tài khoản, mật khẩu và phê duyệt tuần.</li>
              <li><strong>Lớp trưởng</strong>: Bao quát toàn bộ lớp, được ghi nhận và chỉnh sửa cho cả 6 nhóm và các mặt thi đua.</li>
              <li><strong>Lớp phó Học tập</strong>: Chỉ được nhập các tiêu chí: <em>KTB/KLB/KSB</em>, <em>Điểm tốt (+2đ)</em>, <em>Phát biểu (+1đ)</em> và truy bài 15p.</li>
              <li><strong>Lớp phó Lao động</strong>: Chỉ được nhập các tiêu chí: <em>Vệ sinh bẩn</em>, <em>Xả rác</em>, <em>Không tham gia VS</em>, <em>Hư hỏng tài sản</em>.</li>
              <li><strong>Lớp phó Trật tự</strong>: Chỉ được nhập các tiêu chí: <em>Chuyên cần, đi trễ, nghỉ học, đồng phục, khăn quàng, trật tự, học trái buổi</em>.</li>
              <li><strong>6 Nhóm trưởng</strong>: Nhóm trưởng nhóm nào thì phụ trách chấm điểm học sinh nhóm đó (Nhóm trưởng 1 phụ trách Nhóm 1, Nhóm trưởng 2 phụ trách Nhóm 2; tương tự Nhóm trưởng 3, 4, 5, 6 phụ trách chấm điểm nhóm tương ứng).</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Dữ liệu tài khoản được lưu bảo mật trong trình duyệt
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            Hoàn tất & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
