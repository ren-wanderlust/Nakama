import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, MoreVertical, Send } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'me' | 'other';
  timestamp: string;
}

interface ChatRoomProps {
  onBack: () => void;
  partnerName: string;
  partnerImage: string;
}

export function ChatRoom({ onBack, partnerName, partnerImage }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'はじめまして！プロフィール拝見しました。',
      sender: 'other',
      timestamp: '10:30',
    },
    {
      id: '2',
      text: 'AIを活用したプロダクト開発に興味があります！',
      sender: 'other',
      timestamp: '10:31',
    },
    {
      id: '3',
      text: 'はじめまして！メッセージありがとうございます。',
      sender: 'me',
      timestamp: '10:35',
    },
    {
      id: '4',
      text: 'ぜひ一度お話ししませんか？',
      sender: 'me',
      timestamp: '10:35',
    },
    {
      id: '5',
      text: 'ぜひお願いします！来週の平日で都合の良い日はありますか？',
      sender: 'other',
      timestamp: '10:40',
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (inputText.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: inputText,
        sender: 'me',
        timestamp: new Date().toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages([...messages, newMessage]);
      setInputText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReport = () => {
    setShowOptions(false);
    alert('通報・ブロック機能は実装予定です');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-gray-700 active:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Partner Info */}
        <div className="flex items-center gap-3 flex-1 mx-3">
          <img
            src={partnerImage}
            alt={partnerName}
            className="w-10 h-10 rounded-full object-cover border-2 border-teal-500"
          />
          <span className="text-gray-900">{partnerName}</span>
        </div>

        {/* Options Menu */}
        <div className="relative">
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="p-2 -mr-2 text-gray-700 active:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* Options Dropdown */}
          {showOptions && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowOptions(false)}
              ></div>

              {/* Menu */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                <button
                  onClick={handleReport}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  通報・ブロック
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === 'me' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[75%] ${
                message.sender === 'me' ? 'items-end' : 'items-start'
              } flex flex-col gap-1`}
            >
              {/* Message Bubble */}
              <div
                className={`px-4 py-3 rounded-2xl ${
                  message.sender === 'me'
                    ? 'bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-br-sm'
                    : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.text}
                </p>
              </div>

              {/* Timestamp */}
              <span className="text-xs text-gray-400 px-1">
                {message.timestamp}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 sticky bottom-0">
        <div className="flex items-end gap-3">
          {/* Text Input */}
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="メッセージを入力..."
            rows={1}
            className="flex-1 px-4 py-3 border border-gray-300 bg-white text-gray-900 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder:text-gray-400 resize-none max-h-24 overflow-y-auto"
            style={{
              minHeight: '44px',
              height: 'auto',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 96)}px`;
            }}
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
              inputText.trim()
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white active:scale-95'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
