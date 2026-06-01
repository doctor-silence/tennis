import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, Loader2, Phone, RefreshCw, Trash2, MapPin } from 'lucide-react';
import { api } from '../../services/api';
import { TenniixRentalBooking, TenniixRentalBookingStatus } from '../../types';

const STATUS_LABELS: Record<TenniixRentalBookingStatus, string> = {
  new: 'Новая',
  contacted: 'Связались',
  confirmed: 'Подтверждена',
  cancelled: 'Отменена',
};

const STATUS_STYLES: Record<TenniixRentalBookingStatus, string> = {
  new: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  contacted: 'bg-amber-100 text-amber-800 border-amber-200',
  confirmed: 'bg-lime-100 text-lime-800 border-lime-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
};

type AdminTenniixBookingsViewProps = {
  isDarkTheme: boolean;
  panelCardClass: string;
  panelHeaderDividerClass: string;
  panelRowClass: string;
  panelMutedTextClass: string;
  panelHeadingClass: string;
  onToast: (message: string, type?: 'success' | 'error') => void;
};

const AdminTenniixBookingsView: React.FC<AdminTenniixBookingsViewProps> = ({
  isDarkTheme,
  panelCardClass,
  panelHeaderDividerClass,
  panelRowClass,
  panelMutedTextClass,
  panelHeadingClass,
  onToast,
}) => {
  const [bookings, setBookings] = useState<TenniixRentalBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.admin.getTenniixBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Не удалось загрузить заявки';
      onToast(message, 'error');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleStatusChange = async (id: string, status: TenniixRentalBookingStatus) => {
    try {
      await api.admin.updateTenniixBookingStatus(id, status);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
      onToast('Статус обновлён');
    } catch (e: any) {
      onToast(e?.message || 'Ошибка обновления', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Удалить заявку?')) return;
    try {
      await api.admin.deleteTenniixBooking(id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
      onToast('Заявка удалена');
    } catch (e: any) {
      onToast(e?.message || 'Ошибка удаления', 'error');
    }
  };

  const newCount = bookings.filter((b) => b.status === 'new').length;

  return (
    <div className="animate-fade-in-up space-y-4">
      <div className={`${panelCardClass} overflow-hidden`}>
        <div className={`p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 ${panelHeaderDividerClass}`}>
          <div>
            <h3 className="font-bold">Заявки на аренду Tenniix Pro</h3>
            <p className={`text-sm mt-0.5 ${panelMutedTextClass}`}>
              Всего: {bookings.length}
              {newCount > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 px-2 py-0.5 text-xs font-bold">
                  {newCount} новых
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={loadBookings}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Обновить
          </button>
        </div>

        {loading && bookings.length === 0 ? (
          <div className={`p-12 text-center ${panelMutedTextClass}`}>
            <Loader2 size={32} className="mx-auto mb-3 animate-spin opacity-50" />
            <p>Загрузка заявок…</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className={`p-12 text-center ${panelMutedTextClass}`}>
            <Calendar size={40} className="mx-auto mb-2 opacity-40" />
            <p>Заявок пока нет</p>
          </div>
        ) : (
          <div className={isDarkTheme ? 'divide-y divide-slate-800' : 'divide-y divide-slate-100'}>
            {bookings.map((booking) => (
              <div key={booking.id} className={`px-4 sm:px-6 py-5 ${panelRowClass}`}>
                <div className="flex flex-col lg:flex-row lg:items-start gap-4 justify-between">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[booking.status]}`}>
                        {STATUS_LABELS[booking.status]}
                      </span>
                      <span className={`text-xs ${panelMutedTextClass}`}>
                        {new Date(booking.created_at).toLocaleString('ru-RU')}
                      </span>
                    </div>
                    <p className={`text-lg font-bold ${panelHeadingClass}`}>{booking.name}</p>
                    <a
                      href={`tel:${booking.phone.replace(/\s/g, '')}`}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-600 hover:text-cyan-500"
                    >
                      <Phone size={14} />
                      {booking.phone}
                    </a>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <div
                        className={`inline-flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${
                          isDarkTheme
                            ? 'border-lime-500/30 bg-lime-500/10'
                            : 'border-lime-300 bg-lime-50'
                        }`}
                      >
                        <MapPin
                          size={14}
                          className={`shrink-0 mt-0.5 ${isDarkTheme ? 'text-lime-400' : 'text-lime-700'}`}
                        />
                        <span>
                          <span
                            className={`block text-[10px] font-black uppercase tracking-wider mb-0.5 ${
                              isDarkTheme ? 'text-lime-400/80' : 'text-lime-700'
                            }`}
                          >
                            Город
                          </span>
                          <span className={`font-bold ${isDarkTheme ? 'text-lime-100' : 'text-slate-900'}`}>
                            {booking.city}
                          </span>
                          <span className={`block mt-0.5 ${isDarkTheme ? 'text-slate-300' : 'text-slate-600'}`}>
                            {booking.club}
                          </span>
                        </span>
                      </div>
                      <div
                        className={`inline-flex flex-col rounded-xl border px-3 py-2 text-sm min-w-[140px] ${
                          isDarkTheme
                            ? 'border-cyan-500/30 bg-cyan-500/10'
                            : 'border-cyan-200 bg-cyan-50'
                        }`}
                      >
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider mb-0.5 ${
                            isDarkTheme ? 'text-cyan-400/80' : 'text-cyan-700'
                          }`}
                        >
                          Тариф
                        </span>
                        <span className={`font-bold ${isDarkTheme ? 'text-cyan-50' : 'text-slate-900'}`}>
                          {booking.plan}
                        </span>
                      </div>
                      {booking.preferred_date && (
                        <div
                          className={`inline-flex flex-col rounded-xl border px-3 py-2 text-sm min-w-[140px] sm:min-w-[200px] ${
                            isDarkTheme
                              ? 'border-violet-500/30 bg-violet-500/10'
                              : 'border-violet-200 bg-violet-50'
                          }`}
                        >
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider mb-0.5 ${
                              isDarkTheme ? 'text-violet-400/80' : 'text-violet-700'
                            }`}
                          >
                            Дата
                          </span>
                          <span className={`font-bold leading-snug ${isDarkTheme ? 'text-violet-50' : 'text-slate-900'}`}>
                            {booking.preferred_date}
                          </span>
                        </div>
                      )}
                    </div>
                    {booking.comment && (
                      <p className={`text-sm rounded-xl p-3 ${isDarkTheme ? 'bg-slate-800/80 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                        {booking.comment}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-row lg:flex-col items-center gap-2 shrink-0">
                    <select
                      value={booking.status}
                      onChange={(e) => handleStatusChange(booking.id, e.target.value as TenniixRentalBookingStatus)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium min-w-[160px] ${
                        isDarkTheme
                          ? 'bg-slate-800 border-slate-600 text-white'
                          : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    >
                      {(Object.keys(STATUS_LABELS) as TenniixRentalBookingStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleDelete(booking.id)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 transition-colors"
                      title="Удалить"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTenniixBookingsView;
