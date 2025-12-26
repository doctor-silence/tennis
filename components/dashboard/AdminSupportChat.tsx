
import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { User, Conversation, ChatMessage } from '../../types';
import { Send, Search } from 'lucide-react';

const SOCKET_URL = 'http://localhost:3001';

interface AdminSupportChatProps {
  user: User;
}

const AdminSupportChat: React.FC<AdminSupportChatProps> = ({ user }) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    // Connect to socket server
    socketRef.current = io(SOCKET_URL, {
      query: { userId: user.id, userRole: user.role },
    });
    const socket = socketRef.current;

    // Get all conversations
    socket.emit('support:admin_get_conversations', (allConversations: any[]) => {
      setConversations(allConversations);
    });

    // Listen for incoming messages
    socket.on('support:receive_message', (message) => {
        // If it belongs to the currently open conversation, add it
        if (selectedConversation && message.sender_id.toString() === selectedConversation.partnerId) {
            setMessages(prev => [...prev, { ...message, role: 'partner' }]);
        } else {
            // Otherwise, update the conversation list with unread status
            setConversations(prev => prev.map(c => 
                c.partnerId === message.sender_id.toString() 
                ? { ...c, lastMessage: message.text, timestamp: message.created_at, unread: (c.unread || 0) + 1 }
                : c
            ));
        }
    });

    return () => {
      socket.disconnect();
    };
  }, [user.id, user.role, selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectConversation = (convo: any) => {
    setSelectedConversation(convo);
    // Reset unread count locally
    setConversations(prev => prev.map(c => c.id === convo.id ? { ...c, unread: 0 } : c));
    
    // Fetch message history
    if (socketRef.current) {
      socketRef.current.emit('support:get_history', convo.partnerId, (history: any[]) => {
        setMessages(history);
      });
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && socketRef.current && selectedConversation) {
      const messagePayload = {
        text: newMessage,
        recipientId: selectedConversation.partnerId,
      };
      
      socketRef.current.emit('support:send_message', messagePayload, (sentMessage: any) => {
        setMessages(prev => [...prev, { ...sentMessage, role: 'user' }]);
      });
      setNewMessage('');
    }
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] bg-white rounded-2xl border border-slate-200 shadow-sm">
      {/* Sidebar with conversations */}
      <aside className="w-1/3 border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold">Чаты поддержки</h2>
          <div className="relative mt-2">
            <Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
            <input type="text" placeholder="Поиск..." className="w-full bg-slate-50 border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm"/>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(convo => (
            <div
              key={convo.id}
              onClick={() => selectConversation(convo)}
              className={`p-4 cursor-pointer border-l-4 ${selectedConversation?.id === convo.id ? 'bg-slate-50 border-slate-900' : 'border-transparent hover:bg-slate-50'}`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <img src={convo.partnerAvatar} alt={convo.partnerName} className="w-10 h-10 rounded-full" />
                  <div>
                    <h4 className="font-bold">{convo.partnerName}</h4>
                    <p className="text-sm text-slate-500 truncate max-w-[150px]">{convo.lastMessage}</p>
                  </div>
                </div>
                {convo.unread > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {convo.unread}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main chat window */}
      <main className="w-2/3 flex flex-col">
        {selectedConversation ? (
          <>
            <header className="p-4 border-b flex items-center gap-3 bg-slate-50">
              <img src={selectedConversation.partnerAvatar} alt={selectedConversation.partnerName} className="w-10 h-10 rounded-full" />
              <div>
                <h3 className="font-bold">{selectedConversation.partnerName}</h3>
                <p className="text-sm text-green-600">Online</p>
              </div>
            </header>
            <div className="flex-1 p-6 overflow-y-auto bg-slate-50">
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role !== 'user' && <img src={selectedConversation.partnerAvatar} className="w-6 h-6 rounded-full" alt="" />}
                    <div className={`max-w-md px-4 py-2 rounded-2xl ${
                        msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-100 text-slate-800'
                      }`}
                    >
                      {msg.text}
                    </div>
                     {msg.role === 'user' && <img src={user.avatar} className="w-6 h-6 rounded-full" alt="" />}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <footer className="p-4 border-t bg-white">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={`Ответить ${selectedConversation.partnerName}...`}
                  className="w-full bg-slate-100 border-transparent rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900"
                />
                <button onClick={handleSendMessage} className="p-4 bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:bg-slate-300" disabled={!newMessage.trim()}>
                  <Send size={20} />
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <p>Выберите чат для начала общения</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminSupportChat;
