import React, { useState, useEffect } from 'react';
import { LucideEdit, LucideTrash2 } from 'lucide-react';

const MatchHistory = ({ matches = [], onEditMatch, onDeleteMatch }) => {
    const [selectedIds, setSelectedIds] = useState(new Set());

    useEffect(() => {
        setSelectedIds(prev => {
            const current = new Set((matches || []).map(m => m.id));
            const next = new Set();
            prev.forEach(id => { if (current.has(id)) next.add(id); });
            return next;
        });
    }, [matches]);

    const toggle = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const allSelected = selectedIds.size === matches.length && matches.length > 0;
    const anySelected = selectedIds.size > 0;

    const toggleAll = () => {
        if (allSelected) setSelectedIds(new Set());
        else setSelectedIds(new Set(matches.map(m => m.id)));
    };

    const handleBulkDelete = () => {
        if (!anySelected) return;
        const toDelete = matches.filter(m => selectedIds.has(m.id));
        if (toDelete.length > 0) onDeleteMatch(toDelete);
    };

    return (
        <div className="bg-gray-900/50 rounded-2xl p-4 sm:p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-indigo-300 mb-6 text-center">Histórico de Partidas Individuais</h2>
            {matches.length === 0 && (
                <div className="text-center text-gray-400 py-6">Nenhuma partida registrada.</div>
            )}
            {matches.length > 0 && (
                <div className="flex items-center gap-3 mb-4">
                    <label className="flex items-center gap-2 text-sm text-slate-200">
                        <input type="checkbox" className="accent-indigo-500" checked={allSelected} onChange={toggleAll} />
                        Selecionar todas
                    </label>
                    <button
                        onClick={handleBulkDelete}
                        disabled={!anySelected}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold ${anySelected ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                    >
                        Excluir selecionadas {anySelected ? `(${selectedIds.size})` : ''}
                    </button>
                </div>
            )}
            <div className="space-y-4">
                {matches.map(match => {
                    let scoreA = Number(match?.score?.teamA);
                    let scoreB = Number(match?.score?.teamB);
                    if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) {
                        scoreA = 0; scoreB = 0;
                        if (match.playerStats && match.teams) {
                            match.teams.teamA?.forEach(p => { scoreA += match.playerStats[p.id]?.goals || 0; });
                            match.teams.teamB?.forEach(p => { scoreB += match.playerStats[p.id]?.goals || 0; });
                        }
                    }
                    
                    const winner = scoreA > scoreB ? 'Time A' : (scoreB > scoreA ? 'Time B' : 'Empate');

                    return (
                        <div key={match.id} className="bg-gray-800 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="text-center sm:text-left">
                                <p className="text-sm text-gray-400">{match.date ? new Date((match.date.seconds || 0) * 1000).toLocaleString('pt-BR') : '-'}</p>
                                <p className="text-xl font-bold text-white">
                                    Time A <span className="text-indigo-300">{scoreA}</span> vs <span className="text-indigo-300">{scoreB}</span> Time B
                                </p>
                                <p className="text-xs font-semibold text-green-400">{`Vencedor: ${winner}`}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    className="accent-indigo-500 h-5 w-5"
                                    checked={selectedIds.has(match.id)}
                                    onChange={() => toggle(match.id)}
                                />
                                <button onClick={() => onEditMatch(match)} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg" title="Editar Partida"><LucideEdit/></button>
                                <button onClick={() => onDeleteMatch([match])} className="p-2 bg-red-600 hover:bg-red-500 rounded-lg" title="Apagar Partida"><LucideTrash2/></button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MatchHistory;
