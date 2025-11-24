import React, { useState, useEffect } from 'react';
import { LucideTrash2 } from 'lucide-react';

const SessionHistoryList = ({ sessions, onSelectSession, onDeleteSession, isAdmin, t }) => {
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Remove seleções que não existem mais na lista
    useEffect(() => {
        setSelectedIds(prev => {
            const sessionSet = new Set((sessions || []).map(s => s.id));
            const next = new Set();
            prev.forEach(id => { if (sessionSet.has(id)) next.add(id); });
            return next;
        });
    }, [sessions]);

    const toggle = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const allSelected = selectedIds.size === sessions.length && sessions.length > 0;
    const anySelected = selectedIds.size > 0;

    const toggleAll = () => {
        if (allSelected) setSelectedIds(new Set());
        else setSelectedIds(new Set(sessions.map(s => s.id)));
    };

    const handleBulkDelete = () => {
        if (!anySelected) return;
        const toDelete = sessions.filter(s => selectedIds.has(s.id));
        if (toDelete.length > 0) onDeleteSession(toDelete);
    };

    const getParticipantCount = (session) => {
        const playersField = session?.players;
        if (Array.isArray(playersField)) return playersField.length;
        if (playersField && typeof playersField === 'object') return Object.keys(playersField).length;
        // Fallback: deduz do array de partidas
        const matches = Array.isArray(session?.matches) ? session.matches : [];
        if (matches.length > 0) {
            const ids = new Set();
            matches.forEach(m => {
                (m?.teams?.teamA || []).forEach(p => { if (p?.id) ids.add(p.id); });
                (m?.teams?.teamB || []).forEach(p => { if (p?.id) ids.add(p.id); });
            });
            return ids.size;
        }
        return 0;
    };

    if (sessions.length === 0) {
        return <div className="text-center text-gray-400 p-8">{t('Nenhuma sessão anterior encontrada.')}</div>;
    }

    return (
        <div className="space-y-4">
            <h2 className="text-3xl font-bold text-indigo-300 mb-6 text-center">{t('Histórico de Sessões')}</h2>
            {isAdmin && (
                <div className="flex items-center gap-3 mb-2">
                    <label className="flex items-center gap-2 text-sm text-slate-200">
                        <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-indigo-500" />
                        {t('Selecionar todas')}
                    </label>
                    <button
                        onClick={handleBulkDelete}
                        disabled={!anySelected}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold ${anySelected ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                    >
                        {t('Excluir selecionadas')} {anySelected ? `(${selectedIds.size})` : ''}
                    </button>
                </div>
            )}
            {sessions.map(session => (
                <div key={session.id} className="flex items-center gap-2">
                    {isAdmin && (
                        <input
                            type="checkbox"
                            className="accent-indigo-500 h-5 w-5"
                            checked={selectedIds.has(session.id)}
                            onChange={() => toggle(session.id)}
                        />
                    )}
                    <button 
                        onClick={() => onSelectSession(session)}
                        className="flex-grow text-left bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-yellow-500 transition-all"
                    >
                        <p className="font-bold text-xl text-white">
                            {t('Pelada de')} {session.date ? new Date(session.date.seconds * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : t('Data indefinida')}
                        </p>
                        <p className="text-sm text-gray-400">{getParticipantCount(session)} {t('participantes')}</p>
                    </button>
                    {isAdmin && (
                        <button onClick={() => onDeleteSession([session])} className="p-4 bg-red-800 hover:bg-red-700 rounded-lg" title={t('Apagar Sessão')}>
                            <LucideTrash2 />
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
};

export default SessionHistoryList;
