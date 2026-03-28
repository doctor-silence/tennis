
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../../types';
import { Send, Search, Loader2, UserPlus, X, ChevronLeft } from 'lucide-react';
import { api } from '../../services/api';

const SUPPORT_ADMIN_ID = '1';

interface AdminSupportChatProps {
  user: User;
  isDarkTheme?: boolean;
}

const AdminSupportChat: React.FC<AdminSupportChatProps> = ({ user, isDarkTheme = false }) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState({ convos: true, messages: false });
  const [convoSearch, setConvoSearch] = useState('');

  // New chat search
  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const scrollContainerRef = useRef<null | HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const isAtBottomRef = useRef(true);

  // Fetch all users for new chat search
  useEffect(() => {
    if (!showNewChat) return;
    setUsersLoading(true);
    api.admin.getUsers().then(users => {
      setAllUsers(users.filter((u: User) => u.role !== 'admin'));
    }).finally(() => setUsersLoading(false));
  }, [showNewChat]);

  // Fetch conversations periodically
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const convos = await api.support.getConversations();
        setConversations(convos);
      } catch (error) {
        console.error("Failed to fetch support conversations", error);
      } finally {
        setLoading(convo => ({...convo, convos: false}));
      }
    };

    fetchConversations();
    const interval = setInterval(fetchConversations, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch messages for the selected conversation periodically
  useEffect(() => {
    if (!selectedConversation) return;

    let isActive = true;
    const fetchMessages = async () => {
      setLoading(l => ({ ...l, messages: true }));
      try {
        const history = await api.support.getHistory(SUPPORT_ADMIN_ID, selectedConversation.partnerId);
        if (isActive) setMessages(history);
      } catch (error) {
        console.error("Failed to fetch messages", error);
      } finally {
        if (isActive) setLoading(l => ({ ...l, messages: false }));
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => { isActive = false; clearInterval(interval); };
  }, [selectedConversation]);

  useEffect(() => {
    const newCount = messages.length;
    const isFirstLoad = prevMessageCountRef.current === 0 && newCount > 0;
    const hasNewMessage = newCount > prevMessageCountRef.current;

    if (isFirstLoad || (hasNewMessage && isAtBottomRef.current)) {
      messagesEndRef.current?.scrollIntoView({ behavior: isFirstLoad ? 'auto' : 'smooth' });
    }
    prevMessageCountRef.current = newCount;
  }, [messages]);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    isAtBottomRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 60;
  };

  const selectConversation = (convo: any) => {
    if (selectedConversation?.id === convo.id) return;
    setMessages([]);
    prevMessageCountRef.current = 0;
    isAtBottomRef.current = true;
    setSelectedConversation(convo);
    setShowNewChat(false);
    setConversations(prev => prev.map(c => c.id === convo.id ? { ...c, unread: 0 } : c));
  };

  // Start a new chat with any user (even no existing conversation)
  const startNewChat = (targetUser: User) => {
    const fakeConvo = {
      id: `new_${targetUser.id}`,
      partnerId: targetUser.id,
      partnerName: targetUser.name,
      partnerAvatar: targetUser.avatar,
      lastMessage: '',
      unread: 0,
    };
    setMessages([]);
    prevMessageCountRef.current = 0;
    isAtBottomRef.current = true;
    setSelectedConversation(fakeConvo);
    setShowNewChat(false);
    setUserSearch('');
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() && selectedConversation) {
      const text = newMessage;
      setNewMessage('');
      try {
        const sentMessage = await api.support.sendMessage({
          senderId: user.id,
          recipientId: selectedConversation.partnerId,
          text: text,
        });
        setMessages(prev => [...prev, sentMessage]);
        // After first message refresh conversations list
        const convos = await api.support.getConversations();
        setConversations(convos);
        // Update selected with real convo id if it was a new chat
        if (String(selectedConversation.id).startsWith('new_')) {
          const realConvo = convos.find((c: any) => String(c.partnerId) === String(selectedConversation.partnerId));
          if (realConvo) setSelectedConversation({ ...realConvo, unread: 0 });
        }
      } catch (error) {
        console.error("Failed to send message", error);
        setNewMessage(text);
      }
    }
  };

  const filteredConvos = conversations.filter(c =>
    c.partnerName?.toLowerCase().includes(convoSearch.toLowerCase())
  );

  const filteredUsers = allUsers.filter(u => {
    const q = userSearch.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      String(u.rni ?? u.rttRank ?? '').includes(q)
    );
  });

  const getAvatar = (name: string, avatar?: string) => {
    if (avatar) return <img src={avatar} className="w-10 h-10 rounded-full object-cover" alt={name} />;
    const initials = name?.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';
    return <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">{initials}</div>;
  };

  return (
    <div className={`flex h-[calc(100vh-10rem)] rounded-2xl border shadow-sm overflow-hidden ${isDarkTheme ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200'}`}>
      {/* Sidebar */}
      <aside className={`w-1/3 flex flex-col ${isDarkTheme ? 'border-r border-slate-800 bg-slate-900' : 'border-r border-slate-200'}`}>
        <div className={`p-4 space-y-2 ${isDarkTheme ? 'border-b border-slate-800' : 'border-b'}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Чаты поддержки</h2>
            <button
              onClick={() => { setShowNewChat(!showNewChat); setUserSearch(''); }}
              className={`p-2 rounded-xl transition-colors ${showNewChat ? 'bg-slate-900 text-white' : isDarkTheme ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
              title="Написать пользователю"
            >
              {showNewChat ? <X size={16} /> : <UserPlus size={16} />}
            </button>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={showNewChat ? 'Имя или РТТ номер...' : 'Поиск чата...'}
              value={showNewChat ? userSearch : convoSearch}
              onChange={e => showNewChat ? setUserSearch(e.target.value) : setConvoSearch(e.target.value)}
              className={`w-full rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 ${isDarkTheme ? 'bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:ring-lime-400/40' : 'bg-slate-50 border border-slate-200 focus:ring-slate-300'}`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {showNewChat ? (
            // User search results
            usersLoading ? (
              <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-slate-400" size={20}/></div>
            ) : (
              <>
                <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${isDarkTheme ? 'text-slate-400 bg-slate-800' : 'text-slate-400 bg-slate-50'}`}>
                  Все пользователи ({filteredUsers.length})
                </div>
                {filteredUsers.map(u => (
                  <div
                    key={u.id}
                    onClick={() => startNewChat(u)}
                    className={`p-3 cursor-pointer flex items-center gap-3 border-b ${isDarkTheme ? 'hover:bg-slate-800/70 border-slate-800' : 'hover:bg-slate-50 border-slate-100'}`}
                  >
                    {getAvatar(u.name, u.avatar)}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{u.name}</p>
                      <p className={`text-xs truncate ${isDarkTheme ? 'text-slate-400' : 'text-slate-400'}`}>
                        {u.role === 'rtt_pro' ? `РТТ • ${u.rni || u.rttRank || '—'}` : u.role === 'coach' ? 'Тренер' : 'Игрок'} • {u.city || '—'}
                      </p>
                    </div>
                    <Send size={14} className="text-slate-300 shrink-0" />
                  </div>
                ))}
              </>
            )
          ) : (
            // Conversations list
            loading.convos ? (
              <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-slate-400" size={20}/></div>
            ) : filteredConvos.length === 0 ? (
              <div className={`p-6 text-center text-sm ${isDarkTheme ? 'text-slate-400' : 'text-slate-400'}`}>
                <p>Нет чатов</p>
                <button onClick={() => setShowNewChat(true)} className={`mt-2 font-medium hover:underline flex items-center gap-1 mx-auto ${isDarkTheme ? 'text-slate-300' : 'text-slate-600'}`}>
                  <UserPlus size={14}/> Написать первым
                </button>
              </div>
            ) : (
              filteredConvos.map(convo => (
                <div
                  key={convo.id}
                  onClick={() => selectConversation(convo)}
                  className={`p-4 cursor-pointer border-l-4 transition-colors ${selectedConversation?.id === convo.id ? isDarkTheme ? 'bg-slate-800 border-lime-400' : 'bg-slate-50 border-slate-900' : isDarkTheme ? 'border-transparent hover:bg-slate-800/70' : 'border-transparent hover:bg-slate-50'}`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {getAvatar(convo.partnerName, convo.partnerAvatar)}
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm truncate">{convo.partnerName}</h4>
                        <p className={`text-xs truncate max-w-[140px] ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>{convo.lastMessage || '—'}</p>
                      </div>
                    </div>
                    {convo.unread > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shrink-0">
                        {convo.unread}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </aside>

      {/* Main chat window */}
      <main className={`w-2/3 flex flex-col ${isDarkTheme ? 'bg-slate-950' : ''}`}>
        {selectedConversation ? (
          <>
            <header className={`p-4 border-b flex items-center gap-3 ${isDarkTheme ? 'bg-slate-900 border-slate-800' : 'bg-slate-50'}`}>
              {getAvatar(selectedConversation.partnerName, selectedConversation.partnerAvatar)}
              <div>
                <h3 className="font-bold">{selectedConversation.partnerName}</h3>
                {String(selectedConversation.id).startsWith('new_') && (
                  <p className="text-xs text-amber-500 font-medium">Новый чат — сообщение ещё не отправлено</p>
                )}
              </div>
            </header>
            <div ref={scrollContainerRef} onScroll={handleScroll} className={`flex-1 p-6 overflow-y-auto ${isDarkTheme ? 'bg-slate-950' : 'bg-slate-50'}`}>
              {loading.messages && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-slate-400"/></div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <Send size={32} className="opacity-30" />
                  <p className="text-sm">Напишите первое сообщение</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, index) => (
                    <div key={msg.id || index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'partner' && getAvatar(selectedConversation.partnerName, selectedConversation.partnerAvatar)}
                      <div className={`max-w-md px-4 py-2 rounded-2xl text-sm ${
                          msg.role === 'user' ? 'bg-slate-900 text-white' : isDarkTheme ? 'bg-slate-800 border border-slate-700 text-slate-100' : 'bg-white border border-slate-100 text-slate-800'
                        }`}
                      >
                        {msg.text}
                      </div>
                      {msg.role === 'user' && getAvatar(user.name, user.avatar)}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            <footer className={`p-4 border-t ${isDarkTheme ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={`Написать ${selectedConversation.partnerName}...`}
                  className={`w-full rounded-lg px-4 py-3 outline-none focus:ring-2 text-sm ${isDarkTheme ? 'bg-slate-800 text-slate-100 border border-slate-700 placeholder:text-slate-500 focus:ring-lime-400/40' : 'bg-slate-100 border-transparent focus:ring-slate-900'}`}
                />
                <button onClick={handleSendMessage} className="p-4 bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:bg-slate-300 transition-colors" disabled={!newMessage.trim()}>
                  <Send size={18} />
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className={`flex-1 flex flex-col items-center justify-center gap-3 ${isDarkTheme ? 'text-slate-400 bg-slate-950' : 'text-slate-400'}`}>
            <Send size={40} className="opacity-20" />
            <p className="text-sm">Выберите чат или напишите пользователю первым</p>
            <button
              onClick={() => setShowNewChat(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              <UserPlus size={16}/> Новый чат
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminSupportChat;


