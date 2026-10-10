import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  X,
  Send,
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
  Mic,
  MicOff,
  ChevronDown,
  Maximize2,
  Minimize2,
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
      content: `Xin chào cô ${metadata.homeroomTeacher || 'Nguyễn Thị Thuỳ Trang'}! Em là **Trợ lý Gemini AI Lớp ${metadata.className || '9A3'}**.\n\nCô có thể hỏi nhanh em bất cứ điều gì về **quy chế thi đua THCS**, **phân công trực nhật hôm nay**, **học sinh vi phạm**, hoặc bấm nút **Micro 🎙️** để tra cứu bằng giọng nói cực kỳ nhanh chóng!`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto scroll
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Thiết lập Speech Recognition (Web Speech API)
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'vi-VN';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError('');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          // Tự động gửi sau khi nhận diện giọng nói
          handleSendMessage(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError('Trình duyệt chưa được cấp quyền micro.');
        } else {
          setSpeechError('Không nhận diện được giọng nói, vui lòng thử lại.');
        }
        setTimeout(() => setSpeechError(''), 3000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleToggleVoice = () => {
    if (!recognitionRef.current) {
      setSpeechError('Trình duyệt này chưa hỗ trợ nhận diện giọng nói tiếng Việt.');
      setTimeout(() => setSpeechError(''), 3000);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const quickQuestions = [
    { label: '🧹 Hôm nay ai trực nhật?', query: 'Hôm nay nhóm nào và những em nào trực nhật?' },
    { label: '📜 Quy chế trừ điểm THCS?', query: 'Quy chế trừ điểm đi trễ, không đồng phục, mất trật tự cấp THCS như thế nào?' },
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
      const historyForApi = messages.map((m) => ({
        role: (m.role === 'assistant' ? 'model' : 'user') as 'model' | 'user',
        text: m.content,
      }));

      const contextData = {
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
        history: historyForApi,
        context: contextData,
      });

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.reply || 'Xin lỗi cô, em chưa xử lý được câu hỏi này. Cô vui lòng thử lại nhé!',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Có lỗi kết nối với Gemini AI: ${err.message || 'Không thể kết nối server'}. Cô vui lòng thử lại sau giây lát.`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    if (window.confirm('Xóa toàn bộ lịch sử trò chuyện tra cứu với Gemini AI?')) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Lịch sử tra cứu đã được làm mới. Cô ${metadata.homeroomTeacher || 'Nguyễn Thị Thuỳ Trang'} muốn tra cứu điều gì tiếp theo ạ?`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  const formatContent = (content: string) => {
    return content.split('\n').map((line, idx) => {
      let formattedLine = line.replace(
        /\*\*(.*?)\*\*/g,
        '<strong class="font-bold text-slate-900">$1</strong>'
      );
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return (
          <li
            key={idx}
            className="ml-4 list-disc text-slate-700"
            dangerouslySetInnerHTML={{ __html: formattedLine.replace(/^[-•]\s*/, '') }}
          />
        );
      }
      return (
        <p
          key={idx}
          className={`${line.trim() === '' ? 'h-2' : 'mb-1 text-slate-700'}`}
          dangerouslySetInnerHTML={{ __html: formattedLine }}
        />
      );
    });
  };

  return (
    <>
      {/* Nút kích hoạt nổi (Floating Action Button) - Màu Cam Amber hiện đại */}
      {!isOpen && (
        <button
          onClick={onToggle}
          type="button"
          aria-label="Mở Trợ lý tra cứu nhanh Gemini AI"
          className="fixed bottom-5 right-5 z-40 group flex items-center gap-2.5 px-4 sm:px-5 py-3 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 active:from-orange-600 text-slate-950 rounded-full shadow-2xl border-2 border-amber-300/80 hover:scale-105 active:scale-95 transition-all cursor-pointer font-['Be_Vietnam_Pro',sans-serif]"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-slate-950 fill-slate-950" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-amber-400 animate-ping"></span>
          </div>
          <span className="text-xs sm:text-sm font-black tracking-wide">Trợ Lý Gemini AI</span>
          <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black tracking-wider leading-none shadow-xs">
            PRO
          </span>
        </button>
      )}

      {/* CỬA SỔ BOTTOMSHEET TRƯỢT TỪ DƯỚI MÀN HÌNH LÊN */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-none animate-in fade-in duration-200">
          {/* Backdrop mờ tối */}
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs pointer-events-auto transition-opacity"
            onClick={onToggle}
          />

          {/* BottomSheet Container */}
          <div className="relative z-10 w-full max-w-4xl mx-auto h-[80vh] max-h-[88vh] bg-white rounded-t-3xl shadow-2xl border-t border-x border-slate-200 flex flex-col overflow-hidden pointer-events-auto animate-in slide-in-from-bottom duration-300 font-['Be_Vietnam_Pro',sans-serif]">
            {/* Drag Handle Bar ở đỉnh */}
            <div
              onClick={onToggle}
              className="w-full pt-2 pb-1 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors shrink-0"
              title="Nhấn để trượt xuống"
            >
              <div className="w-14 h-1.5 rounded-full bg-slate-300 group-hover:bg-slate-400 transition-colors" />
            </div>

            {/* Header BottomSheet */}
            <div className="px-5 py-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-black shadow-md border border-amber-300">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black flex items-center gap-2 text-white leading-tight">
                    Trợ Lý Tra Cứu Quy Chế & Nề Nếp
                    <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-md font-black tracking-wider leading-none shadow-xs">
                      Gemini AI
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 ml-0.5 animate-pulse"></span>
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Lớp {metadata.className || '9A3'} • {currentWeek.name} • GVCN: {metadata.homeroomTeacher || 'Cô Thuỳ Trang'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleClearHistory}
                  title="Xóa lịch sử trò chuyện"
                  className="p-2 rounded-xl hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onToggle}
                  title="Thu gọn cửa sổ trượt xuống"
                  className="p-2 rounded-xl hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 font-bold text-xs"
                >
                  <ChevronDown className="w-5 h-5 text-amber-300" />
                  <span className="hidden sm:inline">Trượt xuống</span>
                </button>
              </div>
            </div>

            {/* Prompt Chips (Gợi ý câu hỏi nhanh 1 chạm) */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 overflow-x-auto shrink-0 flex items-center gap-2 scrollbar-none">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Gợi ý:
              </span>
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(q.query)}
                  className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50/70 text-slate-700 hover:text-amber-900 transition-all cursor-pointer shadow-2xs hover:scale-[1.02] shrink-0"
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* Thông báo lỗi giọng nói nếu có */}
            {speechError && (
              <div className="px-5 py-2 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{speechError}</span>
              </div>
            )}

            {/* Vùng tin nhắn chat */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-slate-50/40">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 text-xs font-bold shadow-xs ${
                        isUser
                          ? 'bg-blue-600 text-white'
                          : 'bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-950 font-black'
                      }`}
                    >
                      {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    <div
                      className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-xs ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-tr-xs'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-slate-100'
                      }`}
                    >
                      {formatContent(msg.content)}

                      <div
                        className={`mt-2 flex items-center justify-between text-[10px] ${
                          isUser ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        <span>{msg.timestamp}</span>
                        {!isUser && (
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className="hover:text-blue-600 transition-colors ml-2 cursor-pointer flex items-center gap-1 font-bold"
                            title="Sao chép nội dung câu trả lời"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600">Đã sao chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Sao chép</span>
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
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    <span className="text-xs text-slate-600 font-bold ml-1">
                      Gemini đang tra cứu quy chế & dữ liệu lớp học...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar với Voice Recognition Micro */}
            <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                {/* Nút Micro thu âm giọng nói */}
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  title={isListening ? 'Đang lắng nghe... Bấm để dừng' : 'Bấm để nói bằng giọng nói'}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                    isListening
                      ? 'bg-red-600 text-white border-red-500 animate-pulse shadow-lg scale-105'
                      : 'bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border-slate-300'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    isListening
                      ? '🎙️ Đang lắng nghe giọng nói tiếng Việt...'
                      : 'Hỏi Gemini: Điểm trừ đi trễ? Ai trực nhật? Tìm em An...'
                  }
                  disabled={isLoading}
                  className={`flex-1 bg-slate-50 border border-slate-300 focus:bg-white focus:border-amber-500 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/30 shadow-inner ${
                    isListening ? 'ring-2 ring-red-400 bg-red-50/50' : ''
                  }`}
                />

                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black shadow-md transition-all cursor-pointer flex items-center justify-center shrink-0 hover:scale-[1.03] active:scale-[0.97]"
                  title="Gửi câu hỏi"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
