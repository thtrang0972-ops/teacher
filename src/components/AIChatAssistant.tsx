import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  X,
  Send,
  Minimize2,
  Maximize2,
  Trash2,
  Copy,
  Check,
  Bot,
  User,
  HelpCircle,
  TrendingUp,
  Award,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';
import {
  ClassMetadata,
  WeekInfo,
  Student,
  GroupSummary,
  CalculatedStudentScore,
  MorningDutyRecord,
  AfternoonRecord,
} from '../types/discipline';
import { ChatMessage } from '../types/ai';
import { sendChatMessage } from '../services/aiService';

interface AIChatAssistantProps {
  metadata: ClassMetadata;
  currentWeek: WeekInfo;
  students: Student[];
  groupSummaries: GroupSummary[];
  calculatedScores: CalculatedStudentScore[];
  morningDuties?: MorningDutyRecord[];
  afternoonSessions?: AfternoonRecord[];
  isOpen: boolean;
  onToggle: () => void;
}

export const AIChatAssistant: React.FC<AIChatAssistantProps> = ({
  metadata,
  currentWeek,
  students,
  groupSummaries,
  calculatedScores,
  morningDuties = [],
  afternoonSessions = [],
  isOpen,
  onToggle,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: `Xin chào cô Thuỳ Trang! Em là **Trợ lý AI Lớp 9A3**.\nCô có thể hỏi nhanh em bất cứ thông tin nào về trực nhật, điểm số, thứ hạng thi đua hoặc vi phạm của học sinh mà không cần tìm kiếm thủ công trong bảng tính.`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Các câu hỏi gợi ý nhanh chuẩn theo yêu cầu của giáo viên
  const quickQuestions = [
    { label: '🧹 Hôm nay ai trực nhật?', query: 'Hôm nay nhóm nào và những em nào trực nhật?' },
    { label: '📊 Điểm trung bình cả lớp?', query: 'Điểm trung bình nề nếp của lớp tuần này là bao nhiêu?' },
    { label: '🏆 Nhóm nào đang dẫn đầu?', query: 'Nhóm nào đang đứng đầu bảng thi đua tuần này?' },
    { label: '⚠️ Học sinh bị trừ điểm nhiều?', query: 'Tuần này có những bạn nào bị trừ điểm nhiều nhất?' },
    { label: '🚪 Có ai vắng học không?', query: 'Tuần này có bạn nào vắng học chính khóa hoặc trái buổi không?' },
    { label: '🌟 Top phát biểu & điểm tốt?', query: 'Những bạn nào tích cực phát biểu và đạt nhiều điểm 9, 10 nhất?' },
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Build history
      const history = messages.slice(-6).map((m) => ({
        role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        text: m.content,
      }));

      const context = {
        metadata,
        currentWeek,
        students,
        groupSummaries,
        currentWeekScores: calculatedScores,
        morningDuties,
        afternoonSessions,
      };

      const res = await sendChatMessage({
        message: text,
        history,
        context,
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.reply || 'Dạ em đã nhận thông tin.',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Lỗi gửi chat AI:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Dạ em gặp sự cố khi tra cứu: ${err.message || 'Lỗi kết nối'}. Cô có thể thử lại câu hỏi nhé.`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome-cleared',
        role: 'assistant',
        content: `Đã làm mới cuộc trò chuyện. Cô muốn tra cứu thông tin gì về nề nếp và học tập của Lớp 9A3 ạ?`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Render markdown đơn giản: bold text, bullet points, newline
  const formatContent = (content: string) => {
    return content.split('\n').map((line, idx) => {
      // Parse bold **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');

      return (
        <div key={idx} className={`${isBullet ? 'pl-2 my-0.5' : 'my-0.5'}`}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-bold text-slate-900">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return <span key={pIdx}>{part}</span>;
          })}
        </div>
      );
    });
  };

  return (
    <>
      {/* Nút nổi (Floating Trigger) khi đóng - Đồng bộ chuẩn màu Vàng Hổ Phách & Huy hiệu AI Đỏ */}
      {!isOpen && (
        <button
          onClick={onToggle}
          type="button"
          aria-label="Mở Trợ lý tra cứu nhanh AI"
          className="fixed bottom-5 right-5 z-40 group flex items-center gap-2.5 px-4 py-3 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 rounded-full shadow-2xl border-2 border-amber-500/70 hover:scale-105 active:scale-95 transition-all cursor-pointer font-['Be_Vietnam_Pro',sans-serif]"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-slate-950" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-amber-400"></span>
          </div>
          <span className="text-xs sm:text-sm font-black tracking-wide">Trợ lý Tra cứu</span>
          <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black tracking-wider leading-none shadow-xs">
            AI
          </span>
        </button>
      )}

      {/* Cửa sổ chat nổi (Floating Chat Widget) */}
      {isOpen && (
        <div className="fixed bottom-5 right-3 sm:right-5 z-40 w-[95vw] sm:w-[420px] h-[550px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-300/80 flex flex-col overflow-hidden font-['Be_Vietnam_Pro',sans-serif] animate-in slide-in-from-bottom-5 duration-200">
          {/* Header Chat */}
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-xs border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5 text-white">
                  Trợ Lý Tra Cứu Nhanh
                  <span className="bg-red-600 text-white text-[9px] px-1 py-0.2 rounded font-black tracking-wider leading-none">
                    AI
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 ml-0.5"></span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Lớp {metadata.className || '9A3'} • {currentWeek.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearHistory}
                title="Làm mới trò chuyện"
                className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onToggle}
                title="Thu nhỏ"
                className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Prompt chips gợi ý câu hỏi nhanh */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 overflow-x-auto shrink-0 flex items-center gap-1.5 scrollbar-none">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(q.query)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/80 text-slate-700 hover:text-blue-700 transition-all cursor-pointer shadow-2xs"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Vùng tin nhắn chat */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      isUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-indigo-700 text-amber-300 shadow-2xs'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-2xs ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-xs'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                    }`}
                  >
                    {formatContent(msg.content)}

                    <div
                      className={`mt-1.5 flex items-center justify-between text-[10px] ${
                        isUser ? 'text-blue-100' : 'text-slate-600'
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="hover:text-blue-600 transition-colors ml-2 cursor-pointer flex items-center gap-0.5"
                          title="Sao chép nội dung"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600">Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Chép</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-700 text-amber-300 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-3 shadow-2xs flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  <span className="text-xs text-slate-600 font-medium ml-1">Đang tra cứu dữ liệu...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Chat */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi nhanh: Hôm nay ai trực nhật? Điểm TB..."
                disabled={isLoading}
                className="flex-1 bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-blue-400/20 shadow-inner"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-xs transition-colors cursor-pointer"
                title="Gửi câu hỏi"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
