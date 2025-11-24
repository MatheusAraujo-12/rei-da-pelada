import React from 'react';

const QuickAddModal = ({
    isOpen,
    benchPlayers = [],
    onAddToTeam = () => {},
    onClose = () => {},
    t,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-indigo-500/40 bg-[#0b1220]/95 p-5 shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-indigo-200">Adicionar jogador ao time</h3>
                    <button onClick={onClose} className="text-slate-300 hover:text-white">X</button>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {benchPlayers.length === 0 ? (
                        <p className="text-xs text-slate-400">Nenhum jogador disponA-vel nas reservas.</p>
                    ) : (
                        benchPlayers.map((p) => (
                            <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-indigo-500/20 bg-indigo-900/30 px-3 py-2">
                                <span className="text-sm font-semibold text-white truncate">{p.name}</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => onAddToTeam(p, 0)}
                                        className="text-xs bg-gray-700 hover:bg-indigo-500 text-white px-2 py-1 rounded-lg"
                                    >
                                        {t('Time A')}
                                    </button>
                                    <button
                                        onClick={() => onAddToTeam(p, 1)}
                                        className="text-xs bg-gray-700 hover:bg-indigo-500 text-white px-2 py-1 rounded-lg"
                                    >
                                        {t('Time B')}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuickAddModal;
