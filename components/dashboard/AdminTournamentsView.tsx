
import React from 'react';
import { Tournament } from '../../types';
import { Trash2, Edit } from 'lucide-react';

interface AdminTournamentsViewProps {
  tournaments: Tournament[];
  onDelete: (id: string) => void;
  onEdit: (tournament: Tournament) => void;
}

const AdminTournamentsView: React.FC<AdminTournamentsViewProps> = ({ tournaments, onDelete, onEdit }) => {
  return (
    <div className="animate-fade-in-up">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold">Всего турниров: {tournaments.length}</h3>
          {/* <Button size="sm" onClick={() => {}} className="gap-2">
            <Plus size={16}/> Создать турнир
          </Button> */}
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
            <tr>
              <th className="px-6 py-4">Название</th>
              <th className="px-6 py-4">Группа</th>
              <th className="px-6 py-4">Статус</th>
              <th className="px-6 py-4">Приз</th>
              <th className="px-6 py-4 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(tournaments || []).map(t => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-bold">{t.name}</td>
                <td className="px-6 py-4 text-slate-600">{t.groupName || 'N/A'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                    t.status === 'live' ? 'bg-green-100 text-green-700' :
                    t.status === 'finished' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-slate-700">{t.prizePool}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
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
  );
};

export default AdminTournamentsView;
