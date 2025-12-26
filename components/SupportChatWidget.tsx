
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { User } from '../types';

const SOCKET_URL = 'http://localhost:3001';
const SUPPORT_ADMIN_ID = 1; // The user ID of the admin to chat with

interface SupportChatWidgetProps {
  user: User;
}

const SupportChatWidget: React.FC<SupportChatWidgetProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Connect to socket server
      socketRef.current = io(SOCKET_URL, {
        query: { userId: user.id, userRole: user.role },
      });

      const socket = socketRef.current;

      // Get message history
      socket.emit('support:get_history', SUPPORT_ADMIN_ID, (history: any[]) => {
        setMessages(history);
      });

      // Listen for incoming messages
      socket.on('support:receive_message', (message) => {
        setMessages((prevMessages) => [...prevMessages, { ...message, role: 'partner' }]);
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [isOpen, user.id, user.role]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim() && socketRef.current) {
      const messagePayload = {
        text: newMessage,
        recipientId: SUPPORT_ADMIN_ID,
      };
      
      socketRef.current.emit('support:send_message', messagePayload, (sentMessage: any) => {
        setMessages((prevMessages) => [...prevMessages, { ...sentMessage, role: 'user' }]);
      });
      setNewMessage('');
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
            </div>
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
