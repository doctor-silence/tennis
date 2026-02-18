
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { User } from '../types';
import { api } from '../services/api';

const SUPPORT_ADMIN_ID = 1; // The user ID of the admin to chat with

interface SupportChatWidgetProps {
  user: User;
}

const SupportChatWidget: React.FC<SupportChatWidgetProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Fetch messages periodically when the widget is open
  useEffect(() => {
    if (!isOpen) return;

    let isActive = true;
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const history = await api.support.getHistory(user.id, SUPPORT_ADMIN_ID);
        if (isActive) {
          setMessages(history);
        }
      } catch (error) {
        console.error("Failed to fetch support history", error);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchMessages(); // Initial fetch
    const interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [isOpen, user.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (newMessage.trim()) {
      const text = newMessage;
      setNewMessage(''); // Clear input immediately

      try {
        const sentMessage = await api.support.sendMessage({
          senderId: user.id,
          recipientId: SUPPORT_ADMIN_ID,
          text: text,
        });
        setMessages(prev => [...prev, sentMessage]);
      } catch (error) {
        console.error("Failed to send message", error);
        setNewMessage(text); // Restore message on error
      }
    }
  };

  if (!user || user.role === 'admin') {
    return null; // Don't show chat widget for admins or if no user
  }

  return (
    <>
      <div className="fixed bottom-8 right-8 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-slate-900 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg hover:bg-slate-700 transition-colors"
        >
          {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </button>
      </div>

      {isOpen && (
        <div className="fixed bottom-28 right-8 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-200 z-50 animate-fade-in-up">
          <header className="p-4 border-b bg-slate-50 rounded-t-2xl">
            <h3 className="font-bold text-lg">Чат с поддержкой</h3>
            <p className="text-sm text-slate-500">Обычно отвечаем в течении нескольких минут</p>
          </header>
          <div className="flex-1 p-4 overflow-y-auto">
            {loading && messages.length === 0 ? <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-slate-400"/></div> :
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-2xl ${
                      msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>}
          </div>
          <footer className="p-4 border-t">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Напишите сообщение..."
                className="w-full bg-slate-100 border-transparent rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-slate-900"
              />
              <button onClick={handleSendMessage} className="p-3 bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:bg-slate-300" disabled={!newMessage.trim()}>
                <Send size={20} />
              </button>
            </div>
          </footer>
        </div>
      )}
    </>
  );
};

export default SupportChatWidget;
