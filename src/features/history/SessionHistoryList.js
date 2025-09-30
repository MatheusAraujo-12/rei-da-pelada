import React from 'react';
import { LucideTrash2 } from 'lucide-react';

const SessionHistoryList = ({ sessions, onSelectSession, onDeleteSession, isAdmin, t }) => {
    if (sessions.length === 0) {
        return <div className="text-center text-gray-400 p-8">{t('Nenhuma sessão anterior encontrada.')}</div>;
    }

    return (
        <div className="space-y-4">
            <h2 className="text-3xl font-bold text-indigo-300 mb-6 text-center">{t('Histórico de Sessões')}</h2>
            {sessions.map(session => (
                <div key={session.id} className="flex items-center gap-2">
                    <button 
                        onClick={() => onSelectSession(session)}
                        className="flex-grow text-left bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-yellow-500 transition-all"
                    >
                        <p className="font-bold text-xl text-white">
                            {t('Pelada de')} {session.date ? new Date(session.date.seconds * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : t('Data indefinida')}
                        </p>
                        <p className="text-sm text-gray-400">{session.players ? Object.keys(session.players).length : 0} {t('participantes')}</p>
                    </button>
                    {isAdmin && (
                        <button onClick={() => onDeleteSession(session)} className="p-4 bg-red-800 hover:bg-red-700 rounded-lg" title={t('Apagar Sessão')}>
                            <LucideTrash2 />
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
};

export default SessionHistoryList;