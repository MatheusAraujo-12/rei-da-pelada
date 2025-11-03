import React, { useState } from 'react';

const ReservePanel = ({
    isOpen,
    onClose,
    reserves = [],
    teamLabels = [],
    excludeIndices = [],
    onAddToTeam,
    title = 'Jogadores disponíveis',
}) => {
    const [selectedTargets, setSelectedTargets] = useState({});

    if (!isOpen) return null;

    const allowedTargets = teamLabels
        .map((label, idx) => ({ label, idx }))
        .filter(({ idx }) => !excludeIndices.includes(idx));

    const getDefaultTarget = () => (allowedTargets.length > 0 ? allowedTargets[0].idx : null);

    const handleSelectChange = (playerId, value) => {
        setSelectedTargets(prev => ({ ...prev, [playerId]: Number(value) }));
    };

    const handleAdd = (player) => {
        const target = selectedTargets[player.id] ?? getDefaultTarget();
        if (target == null) return;
        onAddToTeam(player, target);
    };

    return (
        <div className="fixed right-4 top-20 bottom-4 z-40 w-96 rounded-xl border border-indigo-500/40 bg-[#0b1220]/95 p-4 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-indigo-200">{title}</h3>
                <button onClick={onClose} className="text-slate-300 hover:text-white">✕</button>
            </div>
            <div className="h-[calc(100%-2rem)] overflow-y-auto space-y-2 pr-1">
                {reserves.length === 0 ? (
                    <p className="text-xs text-slate-400">Nenhum jogador disponível.</p>
                ) : (
                    reserves.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-indigo-500/20 bg-indigo-900/30 px-3 py-2">
                            <span className="text-sm font-semibold text-white truncate">{p.name}</span>
                            <div className="flex items-center gap-2">
                                <select
                                    className="bg-gray-800 text-white text-xs rounded p-1 border border-gray-600"
                                    value={(selectedTargets[p.id] ?? getDefaultTarget()) ?? ''}
                                    onChange={(e) => handleSelectChange(p.id, e.target.value)}
                                >
                                    {allowedTargets.map(({ label, idx }) => (
                                        <option key={idx} value={idx}>{label}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => handleAdd(p)}
                                    className="text-xs rounded-md bg-green-600 hover:bg-green-500 text-white px-2 py-1"
                                >Adicionar</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ReservePanel;

