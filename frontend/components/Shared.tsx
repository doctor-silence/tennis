
import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Match } from '../types';
import { X } from 'lucide-react';

export const StatCard = ({ label, value, icon }: { label: string, value: string | number, icon: React.ReactNode }) => (
  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-2 text-center hover:bg-white hover:shadow-md transition-all duration-300">
    <div className="p-2 bg-white rounded-full shadow-sm">{icon}</div>
    <div className="text-2xl font-bold text-slate-900">{value}</div>
    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</div>
  </div>
);

export const ProgressChart = ({ matches, type }: { matches: Match[], type: 'serve' | 'errors' }) => {
  const data = matches.slice(0, 10).reverse(); // Last 10 matches, chronological
  const maxVal = type === 'serve' ? 100 : 30;
  
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
        <p className="text-xs text-slate-400">Нет данных</p>
      </div>
    );
  }
  
  return (
    <div className="flex items-end justify-between h-32 gap-2 mb-6 mt-8">
      {data.map((m, i) => {
        const val = type === 'serve' ? (m.stats?.firstServePercent || 0) : (m.stats?.unforcedErrors || 0);
        const height = val === 0 ? 5 : Math.max(25, Math.min((val / maxVal) * 100, 100));
        return (
          <div key={i} className="flex-1 min-w-0 relative flex flex-col items-center">
             <div className="w-full h-32 bg-slate-200 rounded-t-lg relative group mb-1">
               <div 
                 className={`absolute bottom-0 w-full rounded-t-lg transition-all shadow-sm ${type === 'serve' ? 'bg-lime-400' : 'bg-red-400'}`}
                 style={{ height: `${height}%` }}
               ></div>
               <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-2 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white px-2 py-1 rounded z-10 whitespace-nowrap pointer-events-none">
                  {m.opponentName || `Матч ${i + 1}`}
               </div>
             </div>
             <div className="text-[10px] font-bold text-slate-700 whitespace-nowrap mt-1">
                {val}{type === 'serve' ? '%' : ''}
             </div>
          </div>
        )
      })}
    </div>
  )
};

const modalRoot = document.getElementById('modal-root');

export const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-lg", bodyClassName = "" }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode; maxWidth?: string; bodyClassName?: string }) => {
  const elRef = useRef<HTMLDivElement | null>(null);
  if (!elRef.current) {
    elRef.current = document.createElement('div');
  }

  useEffect(() => {
    const el = elRef.current!;
    if (isOpen) {
      modalRoot?.appendChild(el);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      if (isOpen) {
        // Check if the element is still a child before removing
        if (modalRoot?.contains(el)) {
            modalRoot?.removeChild(el);
        }
        document.body.style.overflow = 'unset';
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className={`relative bg-white rounded-3xl w-full ${maxWidth} max-h-[90vh] shadow-2xl animate-fade-in-up flex flex-col`}>
        <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0">
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-900 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className={`p-6 overflow-y-auto ${bodyClassName}`}>
          {children}
        </div>
      </div>
    </div>,
    elRef.current
  );
};


export const NavButton = ({ active, onClick, icon, label, badge }: any) => (
  <button 
    onClick={onClick} 
    className={`relative flex flex-col items-center gap-0.5 flex-1 py-1 transition-colors ${active ? 'text-lime-500' : 'text-slate-400 hover:text-slate-600'}`}
  >
    <span className={`relative flex items-center justify-center w-7 h-7 rounded-xl transition-colors ${active ? 'bg-slate-900' : ''}`}>
      {icon}
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center border border-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </span>
    {label && <span className={`text-[10px] font-semibold leading-none ${active ? 'text-lime-500' : 'text-slate-400'}`}>{label}</span>}
  </button>
);
