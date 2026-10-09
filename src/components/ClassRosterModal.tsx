import React, { useState } from 'react';
import {
  X,
  Users,
  Plus,
  Trash2,
  Edit2,
  Check,
  Shield,
  Star,
  Settings,
  RefreshCw,
  Download,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { Student, ClassMetadata, UserAccount } from '../types/discipline';
import { downloadSampleExcelTemplate, exportCurrentStudentsToExcel } from '../utils/excelImport';
import { syncRolesAndAccounts } from '../utils/syncRoles';

interface ClassRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  metadata: ClassMetadata;
  accounts?: UserAccount[];
  onUpdateMetadata: (meta: ClassMetadata) => void;
  onUpdateAccounts?: (accs: UserAccount[]) => void;
  onAddStudent: (student: Omit<Student, 'id' | 'stt'>) => void;
  onUpdateStudent: (id: string, updated: Partial<Student>) => void;
  onDeleteStudent: (id: string) => void;
  onResetData: () => void;
  onOpenImportModal: () => void;
  onClearAllStudents?: () => void;
  onSyncAllRoles?: () => void;
}

export const ClassRosterModal: React.FC<ClassRosterModalProps> = ({
  isOpen,
  onClose,
  students,
  metadata,
  accounts = [],
  onUpdateMetadata,
  onUpdateAccounts,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onResetData,
  onOpenImportModal,
  onClearAllStudents,
  onSyncAllRoles,
}) => {
  const [selectedGroup, setSelectedGroup] = useState<number>(1);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // Chỉnh sửa tên trực tiếp
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [syncSuccessNotice, setSyncSuccessNotice] = useState<string | null>(null);

  // Form thêm học sinh mới
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [newRole, setNewRole] = useState('Thành viên');

  const [confirmDeleteStudentId, setConfirmDeleteStudentId] = useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  if (!isOpen) return null;

  const groupStudents = students.filter((s) => s.groupId === selectedGroup);

  // Hàm kích hoạt đồng bộ toàn diện giữa Học sinh - Chức vụ - Tài khoản
  const triggerSync = (
    updatedStudentsList: Student[],
    updatedMeta?: ClassMetadata
  ) => {
    const metaToUse = updatedMeta || metadata;
    const { syncedStudents, syncedMetadata, syncedAccounts } = syncRolesAndAccounts(
      updatedStudentsList,
      metaToUse,
      accounts
    );

    if (onUpdateMetadata) onUpdateMetadata(syncedMetadata);
    if (onUpdateAccounts) onUpdateAccounts(syncedAccounts);
    if (onSyncAllRoles) onSyncAllRoles();

    setSyncSuccessNotice('Đã khớp chức vụ và đồng bộ tài khoản thành công!');
    setTimeout(() => setSyncSuccessNotice(null), 2500);
  };

  const handleRoleChange = (student: Student, newRoleVal: string) => {
    const isLeader = newRoleVal === 'Nhóm trưởng';
    const role = newRoleVal === 'Thành viên' ? undefined : newRoleVal;

    // Cập nhật danh sách học sinh
    const updatedStudents = students.map((s) => {
      // Học sinh được chọn
      if (s.id === student.id) {
        return {
          ...s,
          role,
          isLeader,
        };
      }

      // Nếu bạn này thành Nhóm trưởng, hủy Nhóm trưởng của bạn khác trong cùng nhóm
      if (isLeader && s.groupId === student.groupId && s.isLeader) {
        return {
          ...s,
          isLeader: false,
          role: s.role?.includes('Nhóm trưởng') ? undefined : s.role,
        };
      }

      // Nếu bạn này thành Lớp trưởng / Lớp phó, hủy chức danh đó ở bạn khác trong lớp
      if (
        (newRoleVal === 'Lớp trưởng' && s.role === 'Lớp trưởng') ||
        (newRoleVal === 'Lớp phó Học tập' && s.role === 'Lớp phó Học tập') ||
        (newRoleVal === 'Lớp phó Lao động' && s.role === 'Lớp phó Lao động') ||
        (newRoleVal === 'Lớp phó Trật tự' && s.role === 'Lớp phó Trật tự')
      ) {
        return {
          ...s,
          role: undefined,
        };
      }

      return s;
    });

    onUpdateStudent(student.id, { role, isLeader });

    // Cập nhật metadata tương ứng
    let updatedMeta = { ...metadata };
    if (isLeader) {
      updatedMeta = {
        ...updatedMeta,
        groupLeaders: {
          ...(updatedMeta.groupLeaders || {}),
          [student.groupId]: student.name,
        },
      };
    } else if (newRoleVal === 'Lớp trưởng') {
      updatedMeta = { ...updatedMeta, monitorName: student.name };
    } else if (newRoleVal === 'Lớp phó Học tập') {
      updatedMeta = { ...updatedMeta, academicViceMonitorName: student.name };
    } else if (newRoleVal === 'Lớp phó Lao động') {
      updatedMeta = { ...updatedMeta, laborViceMonitorName: student.name };
    } else if (newRoleVal === 'Lớp phó Trật tự') {
      updatedMeta = {
        ...updatedMeta,
        disciplineViceMonitorName: student.name,
        viceMonitorName: student.name,
      };
    }

    triggerSync(updatedStudents, updatedMeta);
  };

  const handleStartEditName = (student: Student) => {
    setEditingStudentId(student.id);
    setEditingName(student.name);
  };

  const handleSaveStudentName = (studentId: string) => {
    if (!editingName.trim()) return;
    const trimmed = editingName.trim();

    const targetStudent = students.find((s) => s.id === studentId);
    onUpdateStudent(studentId, { name: trimmed });

    if (targetStudent) {
      const updatedList = students.map((s) => (s.id === studentId ? { ...s, name: trimmed } : s));
      let updatedMeta = { ...metadata };

      if (targetStudent.isLeader) {
        updatedMeta.groupLeaders = {
          ...(updatedMeta.groupLeaders || {}),
          [targetStudent.groupId]: trimmed,
        };
      }
      if (targetStudent.role === 'Lớp trưởng') {
        updatedMeta.monitorName = trimmed;
      } else if (targetStudent.role === 'Lớp phó Học tập') {
        updatedMeta.academicViceMonitorName = trimmed;
      } else if (targetStudent.role === 'Lớp phó Lao động') {
        updatedMeta.laborViceMonitorName = trimmed;
      } else if (targetStudent.role === 'Lớp phó Trật tự') {
        updatedMeta.disciplineViceMonitorName = trimmed;
        updatedMeta.viceMonitorName = trimmed;
      }

      triggerSync(updatedList, updatedMeta);
    }

    setEditingStudentId(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const isLeader = newRole === 'Nhóm trưởng';
    const role = newRole === 'Thành viên' ? undefined : newRole;

    onAddStudent({
      name: newName.trim(),
      gender: newGender,
      groupId: selectedGroup,
      role,
      isLeader,
    });

    setNewName('');
    setNewRole('Thành viên');
    setIsAddingStudent(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Quản Lý Danh Sách 6 Nhóm Học Sinh
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Lớp {metadata.className} · Sĩ số: {students.length} học sinh (chia đều 6 nhóm)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Thanh công cụ Excel: File mẫu, Chèn file, Xuất Excel & Xóa sạch danh sách */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    Nhập & Phân Chia Danh Sách Học Sinh Bằng File Excel
                  </h4>
                  <p className="text-[11px] text-emerald-800">
                    Tải file mẫu có sẵn cấu trúc chuẩn THCS, sau đó nạp file để hệ thống tự động chia 6 nhóm
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={downloadSampleExcelTemplate}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-xs transition-colors"
                    title="Tải file Excel mẫu (.xlsx)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>File Excel mẫu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenImportModal();
                      onClose();
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Nạp file danh sách Excel</span>
                  </button>

                  {students.length > 0 && (
                    <button
                      type="button"
                      onClick={() => exportCurrentStudentsToExcel(students, metadata.className)}
                      className="p-1.5 text-emerald-700 hover:bg-emerald-100 bg-white border border-emerald-300 rounded-lg transition-colors"
                      title="Xuất danh sách hiện tại ra Excel"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Nút xóa sạch danh sách để đưa danh sách mới lên */}
              {onClearAllStudents && students.length > 0 && (
                <div className="flex items-center justify-between px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl text-xs">
                  <span className="text-rose-900 font-semibold">
                    Đang có <strong>{students.length} học sinh</strong> trong danh sách. Muốn xóa sạch để nạp danh sách mới?
                  </span>
                  {confirmClearAll ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-rose-700 font-bold">Xác nhận xóa hết?</span>
                      <button
                        type="button"
                        onClick={() => {
                          onClearAllStudents();
                          setConfirmClearAll(false);
                        }}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-xs cursor-pointer"
                      >
                        Xóa sạch ngay
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClearAll(false)}
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs cursor-pointer font-semibold"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClearAll(true)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-700 hover:text-white bg-rose-100 hover:bg-rose-600 border border-rose-300 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa hết danh sách học sinh</span>
                    </button>
                  )}
                </div>
              )}

              {/* Khối trạng thái rỗng khi chưa có học sinh nào */}
              {students.length === 0 ? (
                <div className="py-12 px-6 border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50/30 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
                    <Users className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-extrabold text-slate-900">
                    Danh Sách Học Sinh Hiện Đang Trống
                  </h4>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    Toàn bộ danh sách mẫu đã được xóa sạch. Bây giờ bạn có thể tải file Excel danh sách học sinh của bạn lên hoặc thêm từng bạn vào 6 nhóm.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        onOpenImportModal();
                        onClose();
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Nạp danh sách học sinh từ file Excel</span>
                    </button>
                    <button
                      type="button"
                      onClick={downloadSampleExcelTemplate}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-emerald-600" />
                      <span>Tải file Excel mẫu</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingStudent(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl shadow-2xs transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-indigo-600" />
                      <span>Thêm từng học sinh</span>
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Thông báo đồng bộ thành công */}
              {syncSuccessNotice && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{syncSuccessNotice}</span>
                </div>
              )}

              {/* Bảng đối chiếu chức vụ và 6 nhóm trưởng */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                    <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                      Khớp Tên Học Sinh & Chức Vụ (Đồng Bộ 100% Với Tài Khoản Đăng Nhập)
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => triggerSync(students)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-100 border border-indigo-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                    title="Tự động đối chiếu và khớp chức vụ toàn lớp với tài khoản"
                  >
                    <RefreshCw className="w-3 h-3 text-indigo-600" />
                    <span>Đồng bộ khớp chức vụ ngay</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2 bg-white rounded-lg border border-indigo-100">
                    <span className="text-[10px] text-slate-500 block">🎖️ Lớp trưởng</span>
                    <span className="font-bold text-slate-900 truncate block">
                      {metadata.monitorName || 'Chưa chỉ định'}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-indigo-100">
                    <span className="text-[10px] text-slate-500 block">📚 LP Học tập</span>
                    <span className="font-bold text-slate-900 truncate block">
                      {metadata.academicViceMonitorName || 'Chưa chỉ định'}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-indigo-100">
                    <span className="text-[10px] text-slate-500 block">🧹 LP Lao động</span>
                    <span className="font-bold text-slate-900 truncate block">
                      {metadata.laborViceMonitorName || 'Chưa chỉ định'}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-indigo-100">
                    <span className="text-[10px] text-slate-500 block">🛡️ LP Trật tự</span>
                    <span className="font-bold text-slate-900 truncate block">
                      {metadata.disciplineViceMonitorName || metadata.viceMonitorName || 'Chưa chỉ định'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 pt-1 border-t border-indigo-100 text-[11px]">
                  {[1, 2, 3, 4, 5, 6].map((g) => {
                    const leaderName = metadata.groupLeaders?.[g] || 'Chưa có';
                    return (
                      <div key={g} className="p-1.5 bg-white rounded-lg border border-sky-100">
                        <span className="text-[10px] text-sky-700 font-semibold block">🚩 Nhóm trưởng {g}</span>
                        <span className="font-bold text-slate-900 truncate block text-[11px]">{leaderName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chọn Nhóm 1 -> 6 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                  {[1, 2, 3, 4, 5, 6].map((g) => (
                    <button
                      key={g}
                      onClick={() => setSelectedGroup(g)}
                      className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                        selectedGroup === g
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Nhóm {g} ({students.filter((s) => s.groupId === g).length})
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setIsAddingStudent(!isAddingStudent)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm vào Nhóm {selectedGroup}</span>
                </button>
              </div>

              {/* Form thêm học sinh mới */}
              {isAddingStudent && (
                <form
                  onSubmit={handleAddSubmit}
                  className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3"
                >
                  <h4 className="text-xs font-bold text-indigo-950">
                    Thêm học sinh mới vào Nhóm {selectedGroup}
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Họ và tên
                      </label>
                      <input
                        type="text"
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="VD: Nguyễn Văn Hoàng"
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Giới tính
                      </label>
                      <select
                        value={newGender}
                        onChange={(e) => setNewGender(e.target.value as 'Nam' | 'Nữ')}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                      >
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Vai trò / Nhiệm vụ
                    </label>
                    <input
                      type="text"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      placeholder="VD: Nhóm trưởng, Cờ đỏ, Thành viên..."
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingStudent(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded font-medium"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded"
                    >
                      Lưu học sinh
                    </button>
                  </div>
                </form>
              )}

              {/* Danh sách học sinh trong nhóm đang chọn */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                      <th className="py-2.5 px-3 w-12">STT</th>
                      <th className="py-2.5 px-3">Họ và tên</th>
                      <th className="py-2.5 px-3">Giới tính</th>
                      <th className="py-2.5 px-3">Vai trò</th>
                      <th className="py-2.5 px-3">Chuyển nhóm</th>
                      <th className="py-2.5 px-3 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groupStudents.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-400 tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {editingStudentId === s.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="text-xs p-1 font-bold border border-indigo-400 rounded bg-white w-36 sm:w-44 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveStudentName(s.id);
                                  if (e.key === 'Escape') setEditingStudentId(null);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveStudentName(s.id)}
                                className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold cursor-pointer"
                              >
                                Lưu
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingStudentId(null)}
                                className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900">{s.name}</span>
                              <button
                                type="button"
                                onClick={() => handleStartEditName(s)}
                                className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 cursor-pointer transition-colors shadow-2xs"
                                title="Bị sai tên học sinh? Bấm vào đây để sửa lại tên"
                              >
                                <Edit2 className="w-2.5 h-2.5 text-indigo-600" />
                                <span>Sửa tên</span>
                              </button>
                              {s.isLeader && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold border border-amber-200">
                                  🚩 Nhóm trưởng N{s.groupId}
                                </span>
                              )}
                              {s.role === 'Lớp trưởng' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-800 font-bold border border-indigo-200">
                                  🎖️ Lớp trưởng
                                </span>
                              )}
                              {s.role === 'Lớp phó Học tập' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800 font-bold border border-blue-200">
                                  📚 LP Học tập
                                </span>
                              )}
                              {s.role === 'Lớp phó Lao động' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                                  🧹 LP Lao động
                                </span>
                              )}
                              {s.role === 'Lớp phó Trật tự' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold border border-amber-200">
                                  🛡️ LP Trật tự
                                </span>
                              )}
                              {s.role === 'Cờ đỏ' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-100 text-rose-800 font-bold border border-rose-200">
                                  🚩 Cờ đỏ
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{s.gender}</td>
                        <td className="py-2.5 px-3">
                          <select
                            value={s.isLeader ? 'Nhóm trưởng' : (s.role || 'Thành viên')}
                            onChange={(e) => handleRoleChange(s, e.target.value)}
                            className="text-xs p-1.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                          >
                            <option value="Thành viên">Thành viên</option>
                            <option value="Nhóm trưởng">🚩 Nhóm trưởng</option>
                            <option value="Lớp trưởng">🎖️ Lớp trưởng</option>
                            <option value="Lớp phó Học tập">📚 LP Học tập</option>
                            <option value="Lớp phó Lao động">🧹 LP Lao động</option>
                            <option value="Lớp phó Trật tự">🛡️ LP Trật tự</option>
                            <option value="Cờ đỏ">🚩 Cờ đỏ</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={s.groupId}
                            onChange={(e) =>
                              onUpdateStudent(s.id, { groupId: Number(e.target.value) })
                            }
                            className="text-xs p-1 border border-slate-200 rounded bg-white"
                          >
                            {[1, 2, 3, 4, 5, 6].map((g) => (
                              <option key={g} value={g}>
                                Nhóm {g}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {confirmDeleteStudentId === s.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  onDeleteStudent(s.id);
                                  setConfirmDeleteStudentId(null);
                                }}
                                className="px-1.5 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded cursor-pointer"
                              >
                                Xóa
                              </button>
                              <button
                                onClick={() => setConfirmDeleteStudentId(null)}
                                className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[10px] rounded cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteStudentId(s.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                              title="Xóa học sinh"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          {confirmResetOpen ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-600 font-bold">Xác nhận nạp lại 43 học sinh mẫu ban đầu?</span>
              <button
                type="button"
                onClick={() => {
                  onResetData();
                  setConfirmResetOpen(false);
                  onClose();
                }}
                className="px-2.5 py-1 bg-rose-600 text-white text-xs font-bold rounded cursor-pointer hover:bg-rose-700"
              >
                Đồng ý
              </button>
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="px-2.5 py-1 bg-slate-200 text-slate-700 text-xs rounded cursor-pointer hover:bg-slate-300"
              >
                Hủy
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
              title="Khôi phục 43 học sinh mẫu ban đầu"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Khôi phục dữ liệu mẫu ban đầu</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
