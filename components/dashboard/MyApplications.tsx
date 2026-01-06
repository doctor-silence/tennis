import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { User } from '../../types';
import { Loader2, Clock, CheckCircle2, XCircle } from 'lucide-react';

const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
        case 'pending':
            return <Clock className="text-yellow-500" size={20} />;
        case 'approved':
            return <CheckCircle2 className="text-green-500" size={20} />;
        case 'rejected':
            return <XCircle className="text-red-500" size={20} />;
        default:
            return null;
    }
};

const statusTranslations: { [key: string]: string } = {
    pending: 'На рассмотрении',
    approved: 'Принята',
    rejected: 'Отклонена',
};


export const MyApplications = ({ user }: { user: User }) => {
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchApplications = async () => {
            try {
                setLoading(true);
                const apps = await api.tournaments.getUserApplications(user.id);
                setApplications(apps);
            } catch (error) {
                console.error("Failed to fetch user applications", error);
            } finally {
                setLoading(false);
            }
        };

        fetchApplications();
    }, [user.id]);

    if (loading) {
        return <div className="flex justify-center items-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <h3 className="text-xl font-bold mb-4">Мои заявки на турниры</h3>
            {applications.length === 0 ? (
                <p className="text-slate-500">У вас пока нет заявок.</p>
            ) : (
                <div className="space-y-4">
                    {applications.map(app => (
                        <div key={app.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                            <div>
                                <p className="font-bold">{app.tournament_name}</p>
                                <p className="text-sm text-slate-500">
                                    Дата подачи: {new Date(app.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 font-bold text-sm">
                                <StatusIcon status={app.status} />
                                {statusTranslations[app.status] || app.status}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};