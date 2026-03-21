
import React from 'react';
import { Tournament } from '../../types';
import { Trash2, Edit, Plus, Megaphone } from 'lucide-react';
import Button from '../Button';

interface AdminTournamentsViewProps {
  tournaments: Tournament[];
  onDelete: (id: string) => void;
  onEdit: (tournament: Tournament) => void;
  onAdd: () => void;
  onPublishResult: (tournament: Tournament) => void;
}

const AdminTournamentsView: React.FC<AdminTournamentsViewProps> = ({ tournaments, onDelete, onEdit, onAdd, onPublishResult }) => {
  return (
    <div className="animate-fade-in-up">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <h3 className="font-bold">Всего турниров: {tournaments.length}</h3>
          <Button size="sm" onClick={onAdd} className="gap-2">
            <Plus size={16}/> Создать турнир
          </Button>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
            <tr>
              <th className="px-6 py-4">Название</th>
              <th className="px-6 py-4">Группа</th>
              <th className="px-6 py-4">Статус</th>
              <th className="px-6 py-4">Этап RTT</th>
              <th className="px-6 py-4">Приз</th>
              <th className="px-6 py-4 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(tournaments || []).map(t => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-bold">{t.name}</td>
                <td className="px-6 py-4 text-slate-600">{t.groupName || 'Без группы'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                    t.status === 'live' ? 'bg-green-100 text-green-700' :
                    t.status === 'open' ? 'bg-blue-100 text-blue-700' :
                    t.status === 'finished' ? 'bg-slate-100 text-slate-500' :
                    'bg-yellow-50 text-yellow-600'
                  }`}>
                    {t.status === 'live' ? 'В игре' : t.status === 'open' ? 'Регистрация' : t.status === 'finished' ? 'Завершён' : 'Черновик'}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600 max-w-[280px]">
                  <div className="line-clamp-2">{(t as any).stage_status || t.stageStatus || '—'}</div>
                </td>
                <td className="px-6 py-4 font-bold text-slate-700">{(t as any).prize_pool || t.prizePool || '—'}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onPublishResult(t)}
                      title="Опубликовать результат матча в сообщество"
                      className="p-2 hover:bg-amber-50 rounded-lg text-amber-500 transition-colors"
                    >
                      <Megaphone size={16}/>
                    </button>
                    <button onClick={() => onEdit(t)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600"><Edit size={16}/></button>
                    <button onClick={() => onDelete(t.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default AdminTournamentsView;
