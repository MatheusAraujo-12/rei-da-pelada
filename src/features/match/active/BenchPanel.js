import React from 'react';

const BenchPanel = ({
    isOpen,
    benchPlayers = [],
    onAddToTeam = () => {},
    onClose = () => {},
    t,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed right-4 top-20 bottom-4 z-40 w-80 rounded-xl border border-indigo-500/40 bg-[#0b1220]/95 p-4 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-indigo-200">Jogadores disponA-veis</h3>
                <button onClick={onClose} className="text-slate-300 hover:text-white">X</button>
            </div>
            <div className="h-[calc(100%-2rem)] overflow-y-auto space-y-2 pr-1">
                {benchPlayers.length === 0 ? (
                    <p className="text-xs text-slate-400">Nenhum jogador disponA-vel.</p>
                ) : (
                    benchPlayers.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-indigo-500/20 bg-indigo-900/30 px-3 py-2">
                            <span className="text-sm font-semibold text-white truncate">{p.name}</span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onAddToTeam(p, 0)}
                                    className="text-xs rounded-md bg-green-600 hover:bg-green-500 text-white px-2 py-1"
                                    title={`Adicionar ao ${t('Time A')}`}
                                >
                                    A
                                </button>
                                <button
                                    onClick={() => onAddToTeam(p, 1)}
                                    className="text-xs rounded-md bg-blue-600 hover:bg-blue-500 text-white px-2 py-1"
                                    title={`Adicionar ao ${t('Time B')}`}
                                >
                                    B
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default BenchPanel;
