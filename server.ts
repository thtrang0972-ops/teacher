import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

// Khởi tạo Gemini SDK ở phía Server với telemetry bắt buộc
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// ============================================================================
// 1. API: TỰ ĐỘNG HÓA GIAO TIẾP - SOẠN TIN NHẮN / EMAIL GỬI PHỤ HUYNH
// ============================================================================
app.post('/api/ai/parent-message', async (req: Request, res: Response) => {
  try {
    const { student, weekName, scores, violationsSummary, tone, metadata } = req.body;

    if (!student || !scores) {
      return res.status(400).json({ error: 'Thiếu thông tin học sinh hoặc bảng điểm.' });
    }

    const studentName = student.name;
    const genderPronoun = student.gender === 'Nữ' ? 'em (cháu)' : 'em (cháu)';
    const className = metadata?.className || '9A3';
    const teacherName = metadata?.homeroomTeacher || 'Cô Nguyễn Thị Thuỳ Trang';
    const schoolName = metadata?.schoolName || 'Trường TH và THCS Phước Hưng';

    const prompt = `Bạn là trợ lý giáo viên chủ nhiệm trường THCS chuyên nghiệp, tận tâm và tinh tế.
Hãy soạn 2 định dạng thông báo gửi phụ huynh cho học sinh sau:
1. "zaloMessage": Bản tin ngắn gọn gửi qua Zalo/SMS cho phụ huynh (khoảng 80-140 từ), dùng biểu tượng cảm xúc (emoji) trang nhã, đủ thông tin cốt lõi, dễ đọc trên điện thoại.
2. "emailContent": Bản email trang trọng đầy đủ (gồm Tiêu đề email "subject" và Nội dung "body" khoảng 180-280 từ), có lời thưa gửi lịch sự, phân tích kết quả tuần, nêu rõ ưu điểm hoặc khuyết điểm cần phối hợp, và lời chào trân trọng.

Dữ liệu học sinh:
- Họ và tên: ${studentName} (Lớp ${className}, ${schoolName})
- Tuần: ${weekName || 'Tuần này'}
- Điểm rèn luyện nề nếp tuần: ${scores.finalScore}/100 điểm. Xếp loại: ${scores.classification}.
- Điểm trừ vi phạm: -${scores.totalPenalty}đ. Điểm thưởng: +${scores.totalBonus}đ.
- Thứ hạng Nhóm: Nhóm ${student.groupId} (Hạng ${scores.groupRank || 'trong lớp'}).
- Chi tiết vi phạm tuần (nếu có):
  + Đi trễ: ${violationsSummary.diTre || 0} lần
  + Nghỉ có phép: ${violationsSummary.nghiCP || 0} buổi, Nghỉ không phép: ${violationsSummary.nghiKP || 0} buổi
  + Không chuẩn bị bài / không thuộc bài: ${violationsSummary.ktbKlbKsb || 0} lần
  + Không đồng phục: ${violationsSummary.khongDongPhuc || 0} lần
  + Mất trật tự trong giờ: ${violationsSummary.matTratTu || 0} lần
  + Vi phạm 15 phút đầu giờ: ${violationsSummary.morningDutyCount || 0} lỗi
  + Vi phạm học trái buổi: ${violationsSummary.afternoonDutyCount || 0} lỗi
  + Điểm tốt / Phát biểu: ${violationsSummary.diemTot || 0} điểm tốt 9-10, ${violationsSummary.phatBieu || 0} lượt phát biểu
  + Ghi chú khác: ${violationsSummary.specificNotes?.join(', ') || 'Không có'}
- Giáo viên chủ nhiệm: ${teacherName}
- Phong cách yêu cầu: ${
      tone === 'encouraging'
        ? 'Khích lệ, ấm áp, ghi nhận nỗ lực và động viên phát huy'
        : tone === 'constructive'
        ? 'Nghiêm túc, chân thành, phân tích rõ tồn tại và đề nghị phụ huynh nhắc nhở tại nhà'
        : tone === 'concise_zalo'
        ? 'Rất ngắn gọn, súc tích, đi thẳng vào số liệu chính'
        : 'Cân bằng, khách quan, mang tính giáo dục sư phạm sâu sắc'
    }

Hãy trả về DUY NHẤT một chuỗi JSON hợp lệ với cấu trúc sau:
{
  "zaloMessage": "Nội dung tin nhắn Zalo/SMS...",
  "emailSubject": "Tiêu đề email...",
  "emailBody": "Nội dung email..."
}`;

    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const text = response.text || '{}';
      try {
        const parsed = JSON.parse(text);
        return res.json(parsed);
      } catch (parseErr) {
        console.warn('Lỗi parse JSON từ Gemini, dùng fallback regex:', parseErr);
      }
    }

    // Heuristic Fallback chất lượng cao nếu chưa cấu hình API key hoặc mạng bận
    const hasViolations = (scores.totalPenalty || 0) > 0;
    const hasAbsence = (violationsSummary.nghiCP || 0) > 0 || (violationsSummary.nghiKP || 0) > 0;
    const goodPoints = violationsSummary.diemTot || 0;

    let fallbackZalo = `Kính gửi PH em ${studentName} (Lớp ${className}):\n`;
    fallbackZalo += `📊 Tổng kết ${weekName}: Điểm rèn luyện ${scores.finalScore}/100 đ (${scores.classification}).\n`;
    if (goodPoints > 0) {
      fallbackZalo += `🌟 Em đạt ${goodPoints} điểm tốt, phát biểu xây dựng bài tích cực.\n`;
    }
    if (hasViolations) {
      fallbackZalo += `⚠️ Nhắc nhở: Tuần qua em bị trừ ${scores.totalPenalty}đ (${
        violationsSummary.diTre ? `đi trễ ${violationsSummary.diTre}l; ` : ''
      }${violationsSummary.ktbKlbKsb ? `chưa học/soạn bài ${violationsSummary.ktbKlbKsb}l; ` : ''}${
        violationsSummary.matTratTu ? 'mất trật tự; ' : ''
      }${hasAbsence ? `nghỉ học ${violationsSummary.nghiKP ? `${violationsSummary.nghiKP}b không phép` : 'có phép'}; ` : ''}).\n`;
      fallbackZalo += `Kính mong quý phụ huynh nhắc nhở cháu khắc phục trong tuần tới. Trân trọng cảm ơn!`;
    } else {
      fallbackZalo += `👏 Em chấp hành tốt nội quy nề nếp lớp học, không vi phạm. Rất mong gia đình tiếp tục đồng hành và khích lệ em!`;
    }

    const fallbackEmailSubject = `[${schoolName} - Lớp ${className}] Thông báo rèn luyện nề nếp ${weekName} - Em ${studentName}`;
    const fallbackEmailBody = `Kính gửi Quý Phụ huynh em ${studentName},\n\nGiáo viên chủ nhiệm lớp ${className} xin trân trọng gửi tới Quý Phụ huynh kết quả rèn luyện nề nếp và học tập của em trong ${weekName}:\n\n` +
      `- Điểm nề nếp đạt được: ${scores.finalScore}/100 điểm\n` +
      `- Xếp loại thi đua tuần: ${scores.classification}\n` +
      `- Điểm cộng khen thưởng: +${scores.totalBonus}đ\n` +
      `- Điểm trừ vi phạm: -${scores.totalPenalty}đ\n\n` +
      (hasViolations
        ? `* Điểm cần lưu ý chấn chỉnh: Trong tuần, em có một số hạn chế về chuẩn bị bài hoặc nội quy. Kính mong Quý Phụ huynh quan tâm đôn đốc việc tự học tại nhà của cháu.\n\n`
        : `* Nhận xét chung: Em duy trì tinh thần học tập nghiêm túc, tham gia nhiệt tình các hoạt động của nhóm và lớp.\n\n`) +
      `Sự đồng hành của Quý Phụ huynh là nguồn động viên quý báu giúp học sinh ngày một trưởng thành hơn.\n\nTrân trọng,\nGVCN: ${teacherName}\n${schoolName}`;

    return res.json({
      zaloMessage: fallbackZalo,
      emailSubject: fallbackEmailSubject,
      emailBody: fallbackEmailBody,
    });
  } catch (error: any) {
    console.error('Lỗi API parent-message:', error);
    res.status(500).json({ error: error.message || 'Lỗi xử lý soạn tin nhắn phụ huynh' });
  }
});

// ============================================================================
// 2. API: PHÂN TÍCH CẢNH BÁO SỚM HỌC SINH SA SÚT & TIẾN BỘ
// ============================================================================
app.post('/api/ai/early-warnings', async (req: Request, res: Response) => {
  try {
    const { students, weeklyHistory, currentWeekId, metadata } = req.body;

    if (!students || !weeklyHistory) {
      return res.status(400).json({ error: 'Thiếu dữ liệu học sinh hoặc lịch sử tuần.' });
    }

    const prompt = `Bạn là chuyên gia phân tích dữ liệu giáo dục và sư phạm THCS.
Nhiệm vụ: Phân tích diễn biến điểm số và nề nếp của các học sinh lớp ${metadata?.className || '9A3'} qua các tuần học để đưa ra CẢNH BÁO SỚM (Early Warnings) chính xác và thiết thực cho giáo viên chủ nhiệm.

Cụ thể cần phát hiện:
1. Báo động Đỏ ("high"): Học sinh đang có dấu hiệu sa sút rõ rệt trong 2-3 tuần gần đây (ví dụ: điểm giảm sút mạnh, liên tục vi phạm học bài, nghỉ học nhiều buổi, vắng không phép hoặc bỏ tiết).
2. Cảnh báo Vàng ("medium"): Học sinh bắt đầu có dấu hiệu chểnh mảng mới phát sinh (đi trễ lặp lại, quên đồng phục/phù hiệu, mất trật tự).
3. Khích lệ Xanh ("positive"): Học sinh có tiến bộ vượt bậc so với các tuần trước (điểm tăng rõ, nhiều điểm tốt, không còn vi phạm).
4. Nhóm sa sút ("group"): Nhóm học sinh có nguy cơ tụt hạng sâu cần nhắc nhở Nhóm trưởng.

Dữ liệu tổng hợp lịch sử các tuần:
${JSON.stringify(weeklyHistory).slice(0, 7000)}

Hãy trả về DUY NHẤT chuỗi JSON hợp lệ theo schema sau:
{
  "warnings": [
    {
      "id": "warn-1",
      "studentId": "hs-id",
      "studentName": "Họ và tên",
      "groupId": 1,
      "level": "high", // "high" (Đỏ - nguy cơ cao), "medium" (Vàng - cần theo dõi), "positive" (Xanh - tiến bộ), "group" (Cảnh báo nhóm)
      "category": "academic", // "academic" | "discipline" | "attendance" | "improvement"
      "title": "Tiêu đề ngắn gọn cảnh báo",
      "description": "Mô tả chi tiết nguyên nhân cụ thể kèm dữ liệu tuần (ví dụ: Tuần 2: 95đ -> Tuần 3: 84đ -> Tuần 4: 70đ)",
      "trendData": "Chuỗi tóm tắt xu hướng",
      "recommendation": "Hành động sư phạm gợi ý cho GVCN (gặp trao đổi riêng, liên hệ phụ huynh, cử bạn kèm cặp...)",
      "suggestedAction": "contact_parent" // "contact_parent" | "praise" | "counsel" | "assign_mentor"
    }
  ],
  "overallClassInsight": "Đánh giá khái quát chung tình hình toàn lớp tuần này (khoảng 3-4 câu)",
  "topPriorities": [
    "Việc ưu tiên số 1 cần giải quyết trong tiết sinh hoạt lớp",
    "Việc ưu tiên số 2"
  ]
}`;

    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.6,
        },
      });

      const text = response.text || '{}';
      try {
        const parsed = JSON.parse(text);
        return res.json(parsed);
      } catch (parseErr) {
        console.warn('Lỗi parse JSON cảnh báo sớm từ Gemini:', parseErr);
      }
    }

    // Heuristic Fallback phát hiện sa sút dựa trên quy tắc logic thực tế
    const warnings: any[] = [];
    const currentWeekData = weeklyHistory[weeklyHistory.length - 1];

    if (currentWeekData && currentWeekData.scores) {
      currentWeekData.scores.forEach((sc: any, index: number) => {
        const student = sc.student || students.find((s: any) => s.id === sc.studentId);
        if (!student) return;

        // Điểm thấp dưới 80đ hoặc bị trừ điểm nặng
        if (sc.finalScore < 75 || sc.totalPenalty >= 15) {
          warnings.push({
            id: `warn-${student.id}-low`,
            studentId: student.id,
            studentName: student.name,
            groupId: student.groupId,
            level: 'high',
            category: sc.record?.ktbKlbKsb > 0 ? 'academic' : 'discipline',
            title: `${student.name} sa sút nề nếp tuần này (${sc.finalScore}đ)`,
            description: `Học sinh bị trừ ${sc.totalPenalty} điểm trong ${currentWeekData.weekName || 'tuần này'}. Cần chú ý lỗi không chuẩn bị bài và nội quy.`,
            trendData: `Điểm hiện tại: ${sc.finalScore}/100đ`,
            recommendation: 'GVCN cần gặp trao đổi riêng sau giờ sinh hoạt và thông báo sớm với phụ huynh để phối hợp chấn chỉnh.',
            suggestedAction: 'contact_parent',
          });
        } else if (sc.finalScore >= 95 && sc.totalBonus >= 4) {
          if (warnings.filter((w) => w.level === 'positive').length < 3) {
            warnings.push({
              id: `warn-${student.id}-good`,
              studentId: student.id,
              studentName: student.name,
              groupId: student.groupId,
              level: 'positive',
              category: 'improvement',
              title: `${student.name} có thành tích xuất sắc (+${sc.totalBonus}đ)`,
              description: `Em đạt ${sc.finalScore}đ với nhiều điểm 9-10 và tích cực phát biểu xây dựng bài.`,
              trendData: `Điểm xuất sắc: ${sc.finalScore}/100đ`,
              recommendation: 'Tuyên dương trước toàn lớp trong tiết sinh hoạt cuối tuần để khích lệ tinh thần thi đua.',
              suggestedAction: 'praise',
            });
          }
        }
      });
    }

    return res.json({
      warnings: warnings.slice(0, 8),
      overallClassInsight: `Lớp ${metadata?.className || '9A3'} nhìn chung duy trì nề nếp ổn định. Cần tập trung nhắc nhở các trường hợp hay quên chuẩn bị bài vở và chấn chỉnh giờ giấc học trái buổi.`,
      topPriorities: [
        'Nhắc nhở học sinh chuẩn bị bài và soạn bài đầy đủ trước khi đến lớp',
        'Kiểm tra nề nếp tác phong và phù hiệu đầu giờ 15 phút',
        'Biểu dương các cá nhân và nhóm dẫn đầu thi đua tuần',
      ],
    });
  } catch (error: any) {
    console.error('Lỗi API early-warnings:', error);
    res.status(500).json({ error: error.message || 'Lỗi phân tích cảnh báo sớm' });
  }
});

// ============================================================================
// 3. API: CHATBOT TRA CỨU NHANH TRỢ LÝ LỚP HỌC (AI QUICK ASSISTANT)
// ============================================================================
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, history, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Nội dung tin nhắn không được để trống.' });
    }

    const {
      metadata,
      currentWeek,
      students,
      groupSummaries,
      currentWeekScores,
      morningDuties,
      afternoonSessions,
      dutySchedule,
    } = context || {};

    const className = metadata?.className || '9A3';
    const teacherName = metadata?.homeroomTeacher || 'Cô Nguyễn Thị Thuỳ Trang';
    const weekName = currentWeek?.name || 'Tuần 4';

    // Xác định lịch trực nhật hôm nay dựa trên ngày thực tế hoặc ngữ cảnh
    const today = new Date();
    const dayOfWeekIndex = today.getDay(); // 0: CN, 1: T2, 2: T3, 3: T4, 4: T5, 5: T6, 6: T7
    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const currentDayName = dayNames[dayOfWeekIndex];
    // Phân công chuẩn THCS 6 nhóm cho Thứ 2 -> Thứ 7:
    // Thứ 2: Nhóm 1, Thứ 3: Nhóm 2, Thứ 4: Nhóm 3, Thứ 5: Nhóm 4, Thứ 6: Nhóm 5, Thứ 7: Nhóm 6
    const todayGroupId = dayOfWeekIndex >= 1 && dayOfWeekIndex <= 6 ? dayOfWeekIndex : 1;
    const todayDutyGroup = groupSummaries?.find((g: any) => g.groupId === todayGroupId);
    const todayDutyStudents = students?.filter((s: any) => s.groupId === todayGroupId);

    // Tính điểm trung bình của lớp tuần này
    let classAverageScore = 0;
    if (currentWeekScores && currentWeekScores.length > 0) {
      const total = currentWeekScores.reduce((acc: number, curr: any) => acc + (curr.finalScore || 100), 0);
      classAverageScore = Math.round((total / currentWeekScores.length) * 10) / 10;
    }

    const systemPrompt = `Bạn là Trợ lý AI Quản Lý Nề Nếp & Học Tập thông minh dành riêng cho Giáo viên Chủ nhiệm Lớp ${className} (${metadata?.schoolName || 'Trường TH và THCS Phước Hưng'}), GVCN: ${teacherName}.
Hôm nay là: ${currentDayName}, ngày ${today.toLocaleDateString('vi-VN')}. Tuần học hiện tại: ${weekName}.

DỮ LIỆU THỰC TẾ ĐANG ĐƯỢC QUẢN LÝ TRONG HỆ THỐNG:
1. BAN CÁN SỰ LỚP:
- Lớp trưởng: ${metadata?.monitorName || 'Trần Gia Hưng'}
- Lớp phó Học tập: ${metadata?.academicViceMonitorName || 'Nguyễn Thảo Linh'}
- Lớp phó Lao động: ${metadata?.laborViceMonitorName || 'Bùi Quang Khải'}
- Lớp phó Trật tự: ${metadata?.disciplineViceMonitorName || 'Lê Hoàng Yến Nhi'}

2. PHÂN CÔNG 6 NHÓM VÀ NHÓM TRƯỞNG:
${
  groupSummaries
    ?.map(
      (g: any) =>
        `- Nhóm ${g.groupId} (${g.groupName}): Nhóm trưởng ${g.leaderName}, Sĩ số ${g.memberCount} hs. Điểm TB tuần: ${g.averageScore}đ. Hạng: ${g.rank}`
    )
    .join('\n') || 'Đang cập nhật danh sách 6 nhóm'
}

3. PHÂN CÔNG TRỰC NHẬT THEO NGÀY:
- Thứ 2: Nhóm 1 (Nhóm trưởng: ${metadata?.groupLeaders?.[1] || 'Nguyễn Văn An'})
- Thứ 3: Nhóm 2 (Nhóm trưởng: ${metadata?.groupLeaders?.[2] || 'Đặng Ngọc Mai'})
- Thứ 4: Nhóm 3 (Nhóm trưởng: ${metadata?.groupLeaders?.[3] || 'Ngô Hồng Phúc'})
- Thứ 5: Nhóm 4 (Nhóm trưởng: ${metadata?.groupLeaders?.[4] || 'Phạm Thanh Tùng'})
- Thứ 6: Nhóm 5 (Nhóm trưởng: ${metadata?.groupLeaders?.[5] || 'Hoàng Kim Cúc'})
- Thứ 7: Nhóm 6 (Nhóm trưởng: ${metadata?.groupLeaders?.[6] || 'Đào Thu Hiền'})
HÔM NAY (${currentDayName}): Trực nhật là Nhóm ${todayGroupId} do ${todayDutyGroup?.leaderName || 'Nhóm trưởng'} phụ trách. Danh sách thành viên trực: ${
      todayDutyStudents?.map((s: any) => s.name).join(', ') || 'Các thành viên trong nhóm'
    }.

4. THỐNG KÊ ĐIỂM SỐ & NỀ NẾP ${weekName}:
- Điểm trung bình cả lớp: ${classAverageScore} / 100 điểm.
- Nhóm dẫn đầu: ${
      groupSummaries?.slice().sort((a: any, b: any) => b.averageScore - a.averageScore)?.[0]?.groupName || 'Nhóm 1'
    } (${groupSummaries?.slice().sort((a: any, b: any) => b.averageScore - a.averageScore)?.[0]?.averageScore}đ).
- Tổng số học sinh: ${students?.length || 43} học sinh.
- Các bạn đạt điểm tốt (9, 10) và phát biểu nhiều nhất: ${
      currentWeekScores
        ?.filter((s: any) => (s.record?.diemTot || 0) > 0 || (s.record?.phatBieu || 0) > 0)
        ?.map((s: any) => `${s.student?.name || s.studentName} (+${s.totalBonus}đ)`)
        ?.slice(0, 5)
        ?.join('; ') || 'Các bạn đều cố gắng tích cực'
    }.
- Các bạn bị trừ điểm nhiều hoặc vi phạm cần chú ý: ${
      currentWeekScores
        ?.filter((s: any) => (s.totalPenalty || 0) >= 6)
        ?.map((s: any) => `${s.student?.name || s.studentName} (-${s.totalPenalty}đ: còn ${s.finalScore}đ)`)
        ?.slice(0, 5)
        ?.join('; ') || 'Không có học sinh bị trừ điểm nặng'
    }.
- Số lượt vi phạm 15p đầu giờ trong tuần: ${morningDuties?.length || 0} lượt.
- Số lượt vi phạm học trái buổi: ${afternoonSessions?.length || 0} lượt.

QUY TẮC TRẢ LỜI:
- Trả lời nhanh, chuẩn xác, tự nhiên bằng tiếng Việt chuẩn mực sư phạm.
- Nêu rõ số liệu cụ thể dựa trên dữ liệu trên. Tuyệt đối không bịa đặt số liệu khi đã có dữ liệu.
- Định dạng Markdown đẹp mắt: gạch đầu dòng, in đậm tên học sinh và nhóm, dùng emoji phù hợp.
- Nếu giáo viên hỏi câu hỏi ngắn, trả lời thẳng vào trọng tâm rồi bổ sung gợi ý ngắn hữu ích.`;

    if (ai) {
      // Build contents array with conversation history
      const formattedContents: any[] = [];
      if (Array.isArray(history) && history.length > 0) {
        history.slice(-6).forEach((h: any) => {
          formattedContents.push({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.text || '' }],
          });
        });
      }
      formattedContents.push({
        role: 'user',
        parts: [{ text: message }],
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: formattedContents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.6,
        },
      });

      return res.json({ reply: response.text });
    }

    // Heuristic Fallback khi chưa có API key
    const lower = message.toLowerCase();
    let reply = '';

    if (lower.includes('trực nhật')) {
      reply = `🧹 **Phân công trực nhật hôm nay (${currentDayName}):**\n` +
        `- Đơn vị phụ trách: **Nhóm ${todayGroupId}** (${todayDutyGroup?.groupName || `Nhóm ${todayGroupId}`})\n` +
        `- Nhóm trưởng đôn đốc: **${todayDutyGroup?.leaderName || 'Nhóm trưởng'}**\n` +
        `- Danh sách các bạn trực nhật: ${
          todayDutyStudents?.map((s: any) => s.name).join(', ') || 'Toàn bộ học sinh trong nhóm'
        }\n\n` +
        `*Nhiệm vụ gồm:* Quét lớp sạch sẽ, đổ rác cuối buổi, lau bảng đen và sắp xếp bàn ghế ngay ngắn. Lớp phó Lao động ${
          metadata?.laborViceMonitorName || 'Bùi Quang Khải'
        } sẽ kiểm tra vào cuối buổi!`;
    } else if (lower.includes('điểm trung bình') || lower.includes('điểm tb')) {
      reply = `📊 **Điểm trung bình nề nếp của lớp ${className} trong ${weekName}:**\n` +
        `- Điểm trung bình toàn lớp: **${classAverageScore} / 100 điểm**\n` +
        `- Nhóm có điểm TB cao nhất: **${
          groupSummaries?.[0]?.groupName || 'Nhóm 1'
        }** (${groupSummaries?.[0]?.averageScore || 98}đ)\n` +
        `- Tổng số học sinh: **${students?.length || 43} em**.`;
    } else if (lower.includes('đứng đầu') || lower.includes('dẫn đầu') || lower.includes('hạng nhất')) {
      const topGroup = groupSummaries?.slice().sort((a: any, b: any) => b.averageScore - a.averageScore)?.[0];
      reply = `🏆 **Nhóm dẫn đầu thi đua ${weekName}:**\n` +
        `- Vị trí Hạng 1: **${topGroup?.groupName || 'Nhóm 1'}**\n` +
        `- Nhóm trưởng: **${topGroup?.leaderName || 'Nguyễn Văn An'}**\n` +
        `- Điểm trung bình nhóm: **${topGroup?.averageScore || 98} điểm** (Tổng điểm: ${topGroup?.totalScore || 686}đ)\n` +
        `- Thành tích: ${topGroup?.goodCount || 7} bạn đạt loại Tốt.`;
    } else if (lower.includes('vi phạm') || lower.includes('trừ điểm') || lower.includes('sa sút')) {
      const penaltyStudents = currentWeekScores
        ?.filter((s: any) => (s.totalPenalty || 0) > 0)
        ?.sort((a: any, b: any) => b.totalPenalty - a.totalPenalty)
        ?.slice(0, 5);

      if (penaltyStudents && penaltyStudents.length > 0) {
        reply = `⚠️ **Các học sinh có điểm trừ nề nếp trong ${weekName}:**\n` +
          penaltyStudents
            .map(
              (s: any) =>
                `- **${s.student?.name || s.studentName}** (Nhóm ${s.student?.groupId || s.groupId}): bị trừ **-${
                  s.totalPenalty
                }đ** (Điểm còn lại: **${s.finalScore}đ**, xếp loại ${s.classification})`
            )
            .join('\n') +
          `\n\n*Gợi ý:* Cô có thể dùng tính năng **"Soạn tin nhắn PHHS bằng AI"** để gửi nhắc nhở tới gia đình các em.`;
      } else {
        reply = `🎉 Trong ${weekName}, lớp mình chấp hành nề nếp rất tốt, không có trường hợp nào bị trừ điểm nghiêm trọng!`;
      }
    } else {
      reply = `Dạ thưa cô Thuỳ Trang, em đã nhận được câu hỏi: "${message}".\n\n` +
        `- Lớp: **${className}** | **${weekName}** | Sĩ số: **${students?.length || 43} học sinh**\n` +
        `- Điểm trung bình nề nếp tuần: **${classAverageScore}đ**\n` +
        `- Nhóm trực nhật hôm nay (${currentDayName}): **Nhóm ${todayGroupId}** (Nhóm trưởng: ${
          todayDutyGroup?.leaderName || 'Nguyễn Văn An'
        })\n\n` +
        `Cô có thể hỏi em thêm về: *"Hôm nay ai trực nhật?"*, *"Điểm trung bình của lớp?"*, *"Nhóm nào đứng đầu tuần này?"*, hoặc *"Ai bị trừ điểm nhiều nhất?"*.`;
    }

    return res.json({ reply });
  } catch (error: any) {
    console.error('Lỗi API chatbot:', error);
    res.status(500).json({ error: error.message || 'Lỗi xử lý chatbot tra cứu' });
  }
});

// ============================================================================
// 4. API: TỰ ĐỘNG VIẾT NHẬN XÉT TỔNG KẾT TUẦN BẰNG GEMINI AI
// ============================================================================
app.post('/api/ai/weekly-comment', async (req: Request, res: Response) => {
  try {
    const { weekData, className, teacherName, weekName, groupSummaries } = req.body;

    const cName = className || '9A3';
    const tName = teacherName || 'Cô Nguyễn Thị Thuỳ Trang';
    const wName = weekName || 'Tuần này';

    const prompt = `Bạn là một Giáo viên chủ nhiệm bậc THCS tại Việt Nam xuất sắc, tận tâm và giàu kinh nghiệm sư phạm.
Hãy viết một đoạn nhận xét tổng kết tuần ngắn gọn, súc tích (khoảng 3-4 câu, khoảng 120-180 từ) để gửi cho phụ huynh và học sinh lớp ${cName}.
Lời văn cần trang trọng, ấm áp, mang tính xây dựng, biểu dương các nỗ lực tiến bộ của học sinh và định hướng rèn luyện cho tuần mới.

DƯỚI ĐÂY LÀ DỮ LIỆU THI ĐUA CỦA ${wName}:
${JSON.stringify(
  {
    lop: cName,
    gvcn: tName,
    tuan: wName,
    thong_ke_6_nhom: groupSummaries || weekData,
  },
  null,
  2
)}

Yêu cầu xuất ra:
Chỉ trả về trực tiếp đoạn nhận xét hoàn chỉnh (không kèm lời chào mở đầu thừa thãi hay chú thích).`;

    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      return res.json({ comment: response.text?.trim() || '' });
    }

    // Heuristic Fallback khi chưa cấu hình API key
    const fallbackComment = `Trong ${wName}, tập thể lớp ${cName} đã duy trì tốt nề nếp kỷ luật, các nhóm tích cực thi đua và có nhiều học sinh đạt điểm tốt trong các giờ học. Ban cán sự và các nhóm trưởng đã nêu cao tinh thần trách nhiệm, đôn đốc trực nhật vệ sinh sạch sẽ. Mong rằng sang tuần mới, các em tiếp tục phát huy tinh thần đoàn kết, khắc phục những thiếu sót nhỏ để đưa lớp ngày càng tiến bộ hơn nữa.`;

    return res.json({ comment: fallbackComment });
  } catch (error: any) {
    console.error('Lỗi API weekly-comment:', error);
    res.status(500).json({ error: error.message || 'Lỗi xử lý nhận xét AI' });
  }
});

// ============================================================================
// MOUNT VITE MIDDLEWARE IN DEV HOẶC STATIC FILES IN PROD
// ============================================================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server đang chạy tại http://0.0.0.0:${port}`);
  });
}

startServer();
