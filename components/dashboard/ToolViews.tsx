
import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Video, Upload, Users, Plus, Undo, Trash2, Eraser, PenTool, Download } from 'lucide-react';
import { User, Student } from '../../types';
import Button from '../Button';
import { api } from '../../services/api';

export const SettingsView = ({ user }: { user: User }) => (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 max-w-2xl mx-auto">
        <h3 className="font-bold text-xl mb-6">Настройки аккаунта</h3>
        <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                    <div className="font-bold">Уведомления</div>
                    <div className="text-xs text-slate-500">О матчах и сообщениях</div>
                </div>
                <div className="w-12 h-6 bg-lime-400 rounded-full relative cursor-pointer"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                 <div>
                    <div className="font-bold">Приватность</div>
                    <div className="text-xs text-slate-500">Показывать профиль в поиске</div>
                </div>
                <div className="w-12 h-6 bg-lime-400 rounded-full relative cursor-pointer"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
            </div>
            <Button variant="outline" className="w-full text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300">Удалить аккаунт</Button>
        </div>
    </div>
);

export const TacticsView = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#bef264'); // Default lime
    const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
    
    // Setup canvas resolution
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const resizeCanvas = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.offsetWidth;
                canvas.height = parent.offsetHeight;
                
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 3;
                }
            }
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    // Update context when color/tool changes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.strokeStyle = tool === 'eraser' ? 'rgba(0,0,0,0)' : color;
            ctx.lineWidth = tool === 'eraser' ? 20 : 3;
            ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
        }
    }, [color, tool]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsDrawing(true);
        const { offsetX, offsetY } = getCoordinates(e, canvas);
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { offsetX, offsetY } = getCoordinates(e, canvas);
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.beginPath(); // Reset path to avoid connecting lines
        }
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }
        
        const rect = canvas.getBoundingClientRect();
        return {
            offsetX: clientX - rect.left,
            offsetY: clientY - rect.top
        };
    };

    const clearBoard = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden h-[700px] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between bg-white z-10">
                <div className="flex items-center gap-2">
                    <BookOpen className="text-lime-500" size={24}/>
                    <h3 className="font-bold text-lg">Тактическая доска</h3>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={() => setTool('pen')} 
                        className={`p-2 rounded-lg transition-colors ${tool === 'pen' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}
                        title="Карандаш"
                    >
                        <PenTool size={18}/>
                    </button>
                    <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                        {['#bef264', '#ef4444', '#3b82f6', '#ffffff'].map(c => (
                            <button 
                                key={c} 
                                onClick={() => { setColor(c); setTool('pen'); }}
                                className={`w-6 h-6 rounded-md border border-slate-200 ${color === c && tool === 'pen' ? 'ring-2 ring-slate-900' : ''}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                    <button 
                        onClick={() => setTool('eraser')} 
                        className={`p-2 rounded-lg transition-colors ${tool === 'eraser' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}
                        title="Ластик"
                    >
                        <Eraser size={18}/>
                    </button>
                    <div className="w-px h-8 bg-slate-200 mx-2"></div>
                    <button onClick={clearBoard} className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="Очистить">
                        <Trash2 size={18}/>
                    </button>
                </div>
            </div>

            <div className="flex-1 relative bg-[#4a8a3a] overflow-hidden cursor-crosshair select-none touch-none">
                {/* Tennis Court CSS Representation - Corrected Dimensions */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60">
                    {/* Main Court Rectangle (Doubles) */}
                    <div className="w-[80%] h-[90%] border-4 border-white relative box-border">
                         
                         {/* Singles Sidelines (12.5% from each side to approximate 4.5ft alleys on 36ft width) */}
                         <div className="absolute inset-y-0 left-[12.5%] border-l-4 border-white"></div>
                         <div className="absolute inset-y-0 right-[12.5%] border-r-4 border-white"></div>
                         
                         {/* Service Lines (23% from top and bottom to approximate 18ft from baseline in 39ft half) */}
                         <div className="absolute top-[23%] left-[12.5%] right-[12.5%] border-t-4 border-white"></div>
                         <div className="absolute bottom-[23%] left-[12.5%] right-[12.5%] border-b-4 border-white"></div>
                        
                         {/* Center Service Line */}
                         <div className="absolute top-[23%] bottom-[23%] left-1/2 w-1 bg-white -translate-x-1/2"></div>
                        
                         {/* Net */}
                         <div className="absolute top-1/2 left-[-4%] right-[-4%] h-1 bg-white/90 border-y border-black/10 -translate-y-1/2 z-0 shadow-sm"></div>
                        
                         {/* Center Marks */}
                         <div className="absolute top-0 left-1/2 w-1 h-3 bg-white -translate-x-1/2"></div>
                         <div className="absolute bottom-0 left-1/2 w-1 h-3 bg-white -translate-x-1/2"></div>
                    </div>
                </div>

                <canvas 
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full z-10 touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
            </div>
            
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-center text-slate-400">
                Используйте разные цвета для обозначения движения игрока и полета мяча.
            </div>
        </div>
    );
};

export const VideoAnalysisView = () => (
    <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-200 text-center">
         <div className="max-w-md mx-auto">
             <div className="w-20 h-20 bg-lime-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-lime-600">
                 <Video size={40}/>
             </div>
             <h3 className="text-2xl font-bold mb-4">AI Анализ Техники</h3>
             <p className="text-slate-500 mb-8">Загрузите видео вашего удара (форхенд, бэкхенд или подача), и наш алгоритм определит точки роста.</p>
             <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 hover:bg-slate-50 transition-colors cursor-pointer">
                 <Upload size={32} className="mx-auto mb-4 text-slate-400"/>
                 <p className="font-bold text-slate-900">Перетащите видео сюда</p>
                 <p className="text-xs text-slate-400 mt-2">MP4, MOV до 50MB</p>
             </div>
         </div>
    </div>
);

export const StudentsView = ({ user }: { user: User }) => {
    const [students, setStudents] = useState<Student[]>([]);
    
    useEffect(() => {
        const fetchStudents = async () => {
            const data = await api.students.getAll(user.id);
            setStudents(data);
        };
        fetchStudents();
    }, [user.id]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h3 className="font-bold text-lg">Мои ученики</h3>
                    <p className="text-slate-500 text-sm">Всего активных: {students.length}</p>
                </div>
                <Button size="sm" className="gap-2"><Plus size={16}/> Добавить</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {students.map(s => (
                     <div key={s.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative group hover:border-lime-400 transition-colors">
                         <div className="flex items-center gap-4 mb-6">
                             <img src={s.avatar} className="w-14 h-14 rounded-full bg-slate-100" alt={s.name}/>
                             <div>
                                 <div className="font-bold text-lg">{s.name}</div>
                                 <div className="text-sm text-slate-500">{s.age} лет • {s.level}</div>
                             </div>
                         </div>
                         <div className="space-y-3">
                             <div className="flex justify-between text-sm border-b border-slate-50 pb-2">
                                 <span className="text-slate-500">Баланс</span>
                                 <span className={`font-bold ${s.balance < 0 ? 'text-red-500' : 'text-green-500'}`}>{s.balance} ₽</span>
                             </div>
                             <div className="flex justify-between text-sm border-b border-slate-50 pb-2">
                                 <span className="text-slate-500">След. занятие</span>
                                 <span className="font-bold text-slate-900">{s.nextLesson}</span>
                             </div>
                         </div>
                         <Button variant="secondary" className="w-full mt-6">Профиль</Button>
                     </div>
                 ))}
                 {students.length === 0 && (
                     <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                         <Users size={32} className="mx-auto mb-2 opacity-50"/>
                         <p>Список учеников пуст</p>
                     </div>
                 )}
            </div>
        </div>
    );
};
