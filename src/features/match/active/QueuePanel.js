import React from 'react';

const QueuePanel = ({
    isOpen,
    waitingTeams = [],
    onClose = () => {},
    t,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed left-4 top-20 bottom-4 z-40 w-96 rounded-xl border border-purple-500/40 bg-[#0b1220]/95 p-4 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-purple-200">Times na fila</h3>
                <button onClick={onClose} className="text-slate-300 hover:text-white">X</button>
            </div>
            <div className="mb-3">
                <span className="text-xs text-slate-300">Próximo:</span>
                {waitingTeams.length > 0 ? (
                    <div className="mt-1 rounded-lg border border-purple-500/30 bg-purple-900/20 p-2">
                        <div className="flex flex-wrap gap-2">
                            {waitingTeams[0].map(p => (
                                <span key={p.id} className="text-xs font-semibold text-white bg-purple-800/40 border border-purple-600/30 px-2 py-1 rounded">
                                    {p.name}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="mt-1 text-xs text-slate-400">Nenhuma equipe na fila.</div>
                )}
            </div>
            <div className="h-[calc(100%-6.5rem)] overflow-y-auto space-y-3 pr-1">
                {waitingTeams.slice(1).map((team, idx) => (
                    <div key={idx} className="rounded-lg border border-purple-500/20 bg-purple-900/10 p-2">
                        <div className="text-[11px] uppercase tracking-widest text-purple-300 mb-1">Fila {idx + 2}</div>
                        <div className="flex flex-wrap gap-2">
                            {team.map(p => (
                                <span key={p.id} className="text-xs font-semibold text-white bg-purple-800/30 border border-purple-600/20 px-2 py-1 rounded">
                                    {p.name}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
                {waitingTeams.length <= 1 && (
                    <p className="text-xs text-slate-400">Sem mais equipes na fila.</p>
                )}
            </div>
        </div>
    );
};

export default QueuePanel;
