import { Student, ClassMetadata, UserAccount, UserRoleType } from '../types/discipline';

export interface SyncResult {
  syncedStudents: Student[];
  syncedMetadata: ClassMetadata;
  syncedAccounts: UserAccount[];
}

/**
 * Chuẩn hóa và đồng bộ tuyệt đối giữa:
 * 1. Danh sách học sinh (students) và chức vụ từng bạn
 * 2. Cấu hình thông tin ban cán sự & 6 nhóm trưởng (metadata)
 * 3. Danh sách tài khoản đăng nhập (accounts): Nhóm trưởng nhóm nào thì gắn đúng tên và phụ trách nhóm đó
 */
export function syncRolesAndAccounts(
  students: Student[],
  metadata: ClassMetadata,
  accounts: UserAccount[]
): SyncResult {
  const syncedStudents: Student[] = students.map((s) => ({ ...s }));
  const syncedMetadata: ClassMetadata = {
    ...metadata,
    groupLeaders: { ...(metadata.groupLeaders || {}) },
  };

  // 1. Đồng bộ 4 chức danh Ban cán sự lớp
  // 1.1 Lớp trưởng
  let monitorStudent = syncedStudents.find((s) => s.role === 'Lớp trưởng');
  if (!monitorStudent && syncedMetadata.monitorName) {
    monitorStudent = syncedStudents.find(
      (s) => s.name.trim().toLowerCase() === syncedMetadata.monitorName.trim().toLowerCase()
    );
    if (monitorStudent) {
      monitorStudent.role = 'Lớp trưởng';
    }
  }
  if (monitorStudent) {
    syncedMetadata.monitorName = monitorStudent.name;
  } else {
    const exists = syncedStudents.some(
      (s) => s.name.trim().toLowerCase() === syncedMetadata.monitorName?.trim().toLowerCase()
    );
    if (!exists) {
      syncedMetadata.monitorName = '';
    }
  }

  // 1.2 Lớp phó Học tập
  let academicStudent = syncedStudents.find((s) => s.role === 'Lớp phó Học tập');
  if (!academicStudent && syncedMetadata.academicViceMonitorName) {
    academicStudent = syncedStudents.find(
      (s) => s.name.trim().toLowerCase() === syncedMetadata.academicViceMonitorName.trim().toLowerCase()
    );
    if (academicStudent) {
      academicStudent.role = 'Lớp phó Học tập';
    }
  }
  if (academicStudent) {
    syncedMetadata.academicViceMonitorName = academicStudent.name;
  } else {
    const exists = syncedStudents.some(
      (s) => s.name.trim().toLowerCase() === syncedMetadata.academicViceMonitorName?.trim().toLowerCase()
    );
    if (!exists) {
      syncedMetadata.academicViceMonitorName = '';
    }
  }

  // 1.3 Lớp phó Lao động
  let laborStudent = syncedStudents.find((s) => s.role === 'Lớp phó Lao động');
  if (!laborStudent && syncedMetadata.laborViceMonitorName) {
    laborStudent = syncedStudents.find(
      (s) => s.name.trim().toLowerCase() === syncedMetadata.laborViceMonitorName.trim().toLowerCase()
    );
    if (laborStudent) {
      laborStudent.role = 'Lớp phó Lao động';
    }
  }
  if (laborStudent) {
    syncedMetadata.laborViceMonitorName = laborStudent.name;
  } else {
    const exists = syncedStudents.some(
      (s) => s.name.trim().toLowerCase() === syncedMetadata.laborViceMonitorName?.trim().toLowerCase()
    );
    if (!exists) {
      syncedMetadata.laborViceMonitorName = '';
    }
  }

  // 1.4 Lớp phó Trật tự
  let disciplineStudent = syncedStudents.find((s) => s.role === 'Lớp phó Trật tự');
  const discName = syncedMetadata.disciplineViceMonitorName || syncedMetadata.viceMonitorName;
  if (!disciplineStudent && discName) {
    disciplineStudent = syncedStudents.find(
      (s) => s.name.trim().toLowerCase() === discName.trim().toLowerCase()
    );
    if (disciplineStudent) {
      disciplineStudent.role = 'Lớp phó Trật tự';
    }
  }
  if (disciplineStudent) {
    syncedMetadata.disciplineViceMonitorName = disciplineStudent.name;
    syncedMetadata.viceMonitorName = disciplineStudent.name;
  } else {
    const exists = syncedStudents.some(
      (s) => s.name.trim().toLowerCase() === discName?.trim().toLowerCase()
    );
    if (!exists) {
      syncedMetadata.disciplineViceMonitorName = '';
      syncedMetadata.viceMonitorName = '';
    }
  }

  // 2. Đồng bộ 6 Nhóm trưởng cho 6 nhóm (Nhóm 1 -> Nhóm 6)
  for (let g = 1; g <= 6; g++) {
    const groupMembers = syncedStudents.filter((s) => s.groupId === g);
    if (groupMembers.length === 0) continue;

    // Tìm xem trong nhóm g có bạn nào được đánh dấu là Nhóm trưởng không
    let leader = groupMembers.find(
      (s) => s.isLeader && s.role !== 'Lớp trưởng' && !s.role?.includes('Lớp phó')
    );

    // Nếu chưa có isLeader, tìm theo role "Nhóm trưởng" hoặc "Nhóm trưởng g"
    if (!leader) {
      leader = groupMembers.find(
        (s) =>
          (s.role === 'Nhóm trưởng' ||
            s.role === `Nhóm trưởng ${g}` ||
            s.role?.toLowerCase().includes('nhóm trưởng') ||
            s.role?.toLowerCase().includes('tổ trưởng')) &&
          s.role !== 'Lớp trưởng' &&
          !s.role?.includes('Lớp phó')
      );
    }

    // Nếu vẫn chưa có, kiểm tra xem metadata.groupLeaders[g] có khớp tên bạn nào trong nhóm không
    const metaLeaderName = syncedMetadata.groupLeaders?.[g];
    if (!leader && metaLeaderName) {
      leader = groupMembers.find(
        (s) => s.name.trim().toLowerCase() === metaLeaderName.trim().toLowerCase()
      );
    }

    // Nếu vẫn chưa có và nhóm có học sinh, chọn bạn đầu tiên (không phải Lớp trưởng/Lớp phó)
    if (!leader) {
      leader =
        groupMembers.find((s) => s.role !== 'Lớp trưởng' && !s.role?.includes('Lớp phó')) ||
        groupMembers[0];
    }

    if (leader) {
      // Đảm bảo chỉ duy nhất bạn này là Nhóm trưởng của nhóm g
      groupMembers.forEach((m) => {
        if (m.id === leader!.id) {
          m.isLeader = true;
          m.role = `Nhóm trưởng ${g}`;
        } else if (m.isLeader) {
          m.isLeader = false;
          if (m.role?.includes('Nhóm trưởng') || m.role?.includes('Tổ trưởng')) {
            m.role = undefined;
          }
        }
      });

      if (!syncedMetadata.groupLeaders) syncedMetadata.groupLeaders = {};
      syncedMetadata.groupLeaders[g] = leader.name;
    }
  }

  // 3. Đồng bộ vào danh sách tài khoản (accounts)
  // Mỗi tài khoản chức vụ khớp tên học sinh và nhóm phụ trách
  const syncedAccounts: UserAccount[] = accounts.map((acc) => {
    const copy = { ...acc };

    switch (copy.role) {
      case 'gvcn':
        copy.displayName = syncedMetadata.homeroomTeacher || 'Giáo viên Chủ nhiệm';
        copy.title = 'Giáo viên Chủ nhiệm';
        break;

      case 'lopTruong':
        copy.displayName = syncedMetadata.monitorName || 'Lớp trưởng (Chưa phân công)';
        copy.title = 'Lớp trưởng';
        copy.assignedGroupIds = [1, 2, 3, 4, 5, 6];
        break;

      case 'lopPhoHocTap':
        copy.displayName = syncedMetadata.academicViceMonitorName || 'Lớp phó Học tập (Chưa phân công)';
        copy.title = 'Lớp phó Học tập';
        copy.assignedGroupIds = [1, 2, 3, 4, 5, 6];
        break;

      case 'lopPhoLaoDong':
        copy.displayName = syncedMetadata.laborViceMonitorName || 'Lớp phó Lao động (Chưa phân công)';
        copy.title = 'Lớp phó Lao động';
        copy.assignedGroupIds = [1, 2, 3, 4, 5, 6];
        break;

      case 'lopPhoTratTu':
        copy.displayName =
          syncedMetadata.disciplineViceMonitorName ||
          syncedMetadata.viceMonitorName ||
          'Lớp phó Trật tự (Chưa phân công)';
        copy.title = 'Lớp phó Trật tự';
        copy.assignedGroupIds = [1, 2, 3, 4, 5, 6];
        break;

      case 'nhomTruong1':
        copy.displayName = syncedMetadata.groupLeaders?.[1] || 'Nhóm trưởng 1 (Chưa phân công)';
        copy.title = 'Nhóm trưởng 1';
        copy.assignedGroupIds = [1];
        copy.description = `Nhóm trưởng 1: Phụ trách theo dõi và chấm điểm các học sinh thuộc Nhóm 1.`;
        break;

      case 'nhomTruong2':
        copy.displayName = syncedMetadata.groupLeaders?.[2] || 'Nhóm trưởng 2 (Chưa phân công)';
        copy.title = 'Nhóm trưởng 2';
        copy.assignedGroupIds = [2];
        copy.description = `Nhóm trưởng 2: Phụ trách theo dõi và chấm điểm các học sinh thuộc Nhóm 2.`;
        break;

      case 'nhomTruong3':
        copy.displayName = syncedMetadata.groupLeaders?.[3] || 'Nhóm trưởng 3 (Chưa phân công)';
        copy.title = 'Nhóm trưởng 3';
        copy.assignedGroupIds = [3];
        copy.description = `Nhóm trưởng 3: Phụ trách theo dõi và chấm điểm các học sinh thuộc Nhóm 3.`;
        break;

      case 'nhomTruong4':
        copy.displayName = syncedMetadata.groupLeaders?.[4] || 'Nhóm trưởng 4 (Chưa phân công)';
        copy.title = 'Nhóm trưởng 4';
        copy.assignedGroupIds = [4];
        copy.description = `Nhóm trưởng 4: Phụ trách theo dõi và chấm điểm các học sinh thuộc Nhóm 4.`;
        break;

      case 'nhomTruong5':
        copy.displayName = syncedMetadata.groupLeaders?.[5] || 'Nhóm trưởng 5 (Chưa phân công)';
        copy.title = 'Nhóm trưởng 5';
        copy.assignedGroupIds = [5];
        copy.description = `Nhóm trưởng 5: Phụ trách theo dõi và chấm điểm các học sinh thuộc Nhóm 5.`;
        break;

      case 'nhomTruong6':
        copy.displayName = syncedMetadata.groupLeaders?.[6] || 'Nhóm trưởng 6 (Chưa phân công)';
        copy.title = 'Nhóm trưởng 6';
        copy.assignedGroupIds = [6];
        copy.description = `Nhóm trưởng 6: Phụ trách theo dõi và chấm điểm các học sinh thuộc Nhóm 6.`;
        break;

      default:
        break;
    }

    return copy;
  });

  return {
    syncedStudents,
    syncedMetadata,
    syncedAccounts,
  };
}
