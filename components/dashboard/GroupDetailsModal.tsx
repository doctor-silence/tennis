import React from 'react';
import { Modal } from '../../components/Shared';
import { Group } from '../../types';
import Button from '../../components/Button';
import { Users, MapPin, Info, PlusCircle, UserPlus, X } from 'lucide-react';
import { api } from '../../services/api';

interface GroupDetailsModalProps {
    group: Group | null;
    onClose: () => void;
    onJoinGroup: (groupId: string) => void;
    onLeaveGroup: (groupId: string) => void;
    isMember: boolean;
    userId: string;
}

const GroupDetailsModal: React.FC<GroupDetailsModalProps> = ({ 
    group, 
    onClose, 
    onJoinGroup, 
    onLeaveGroup, 
    isMember, 
    userId 
}) => {
    if (!group) return null;

    return (
        <Modal isOpen={!!group} onClose={onClose} title={group.name}>
            <div className="space-y-4 p-4">
                {group.avatar && (
                    <img src={group.avatar} alt={group.name} className="w-full h-48 object-cover rounded-xl mb-4" />
                )}
                <div className="flex items-center gap-2 text-slate-600">
                    <MapPin size={18} />
                    <p className="text-sm">{group.location}</p>
                </div>
                <p className="text-slate-700 leading-relaxed">{group.description || 'Нет описания.'}</p>
                
                <div className="border-t border-slate-100 pt-4 mt-4">
                    <h4 className="font-bold text-lg mb-3">Участники</h4>
                    {/* Placeholder for members list - to be implemented later */}
                    <div className="flex -space-x-2 overflow-hidden mb-4">
                        <img className="inline-block h-10 w-10 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1491528323818-fdf18ddf7d81?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="Member 1"/>
                        <img className="inline-block h-10 w-10 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1550525811-e5869dd03033?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="Member 2"/>
                        <img className="inline-block h-10 w-10 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="Member 3"/>
                        <div className="inline-block h-10 w-10 rounded-full ring-2 ring-white bg-slate-100 flex items-center justify-center text-slate-500 text-sm font-bold">
                            +53
                        </div>
                    </div>
                    {isMember ? (
                        <Button variant="danger" onClick={() => onLeaveGroup(group.id)} className="w-full">
                            <X size={20} className="mr-2"/> Покинуть группу
                        </Button>
                    ) : (
                        <Button onClick={() => onJoinGroup(group.id)} className="w-full">
                            <UserPlus size={20} className="mr-2"/> Присоединиться
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default GroupDetailsModal;