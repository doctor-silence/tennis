
import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Send } from 'lucide-react';
import { User, ChatMessage } from '../../types';
import Button from '../Button';
import { getTennisAdvice } from '../../services/geminiService';

const AiCoachView = ({ user }: { user: User }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'system', text: `Привет, ${user.name}! Я твой персональный AI тренер. Спроси меня о тактике, технике или подготовке к матчу.` }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
      if (!input.trim()) return;
      const userMsg: ChatMessage = { role: 'user', text: input };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setLoading(true);

      try {
          const advice = await getTennisAdvice(input);
          setMessages(prev => [...prev, { role: 'model', text: advice }]);
      } catch (e) {
          setMessages(prev => [...prev, { role: 'model', text: "Извините, сейчас я не могу ответить. Попробуйте позже." }]);
      } finally {
          setLoading(false);
      }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 h-[600px] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
               {messages.map((msg, idx) => (
                   <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                           msg.role === 'user' 
                           ? 'bg-slate-900 text-white rounded-tr-none' 
                           : msg.role === 'system' ? 'bg-lime-100 text-lime-800 border border-lime-200'
                           : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                       }`}>
                           {msg.text}
                       </div>
                   </div>
               ))}
               {loading && (
                   <div className="flex justify-start">
                       <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none">
                           <Loader2 className="animate-spin text-slate-400" size={20}/>
                       </div>
                   </div>
               )}
               <div ref={messagesEndRef} />
            </div>
            <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
                <input 
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 outline-none focus:ring-2 focus:ring-lime-400 transition-all"
                  placeholder="Спроси совет у тренера..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                />
                <Button onClick={handleSend} disabled={loading} className="w-12 px-0"><Send size={20}/></Button>
            </div>
        </div>
    );
};

export default AiCoachView;
