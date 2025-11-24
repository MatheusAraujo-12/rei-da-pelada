import React from 'react';
import { LucideEdit, LucideShieldCheck, LucideUndo } from 'lucide-react';

const PrePostGameView = ({
    step,
    teamA = [],
    teamB = [],
    allTeams = [],
    benchIndex,
    benchPlayers = [],
    benchPreferenceIds = new Set(),
    waitingTeams = [],
    matchHistory = [],
    isEditModeActive,
    showBenchPanel,
    onToggleEditMode = () => {},
    onToggleBenchPanel = () => {},
    onOpenBenchConfig = () => {},
    onAddFromBenchToTeam = () => {},
    onReorderQueue = () => {},
    onStartNextMatch = () => {},
    onForceEndSession = () => {},
    onBackToConfig = () => {},
    onCreatePlayer,
    renderTeamCard = () => null,
    t = (s) => s,
}) => {
    const renderWaitingTeams = () => {
        if (waitingTeams.length === 0) return null;

        const buildCombinedPostGame = () => {
            const left = allTeams.slice(2, benchIndex);
            const right = allTeams.slice(benchIndex + 1);
            return { combined: [...left, ...right], leftLen: left.length };
        };

        if (step === 'post_game') {
            const { combined, leftLen } = buildCombinedPostGame();
            return combined.map((team, idx) => {
                const absIndex = idx < leftLen ? (2 + idx) : (benchIndex + 1 + (idx - leftLen));
                return (
                    <div key={absIndex} className="flex flex-col gap-2 items-center">
                        {renderTeamCard(team, absIndex)}
                        {isEditModeActive && (
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={() => onReorderQueue(idx, 'up')}
                                    disabled={idx === 0}
                                    className="bg-gray-700 p-2 rounded-full hover:bg-blue-600 disabled:opacity-50"
                                >
                                    <LucideUndo className="w-4 h-4 transform rotate-90" />
                                </button>
                                <button
                                    onClick={() => onReorderQueue(idx, 'down')}
                                    disabled={idx === combined.length - 1}
                                    className="bg-gray-700 p-2 rounded-full hover:bg-blue-600 disabled:opacity-50"
                                >
                                    <LucideUndo className="w-4 h-4 transform -rotate-90" />
                                </button>
                            </div>
                        )}
                    </div>
                );
            });
        }

        return waitingTeams.map((team, idx) => {
            const absIndex = 2 + idx;
            return (
                <div key={absIndex} className="flex flex-col gap-2 items-center">
                    {renderTeamCard(team, absIndex)}
                    {isEditModeActive && (
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={() => onReorderQueue(idx, 'up')}
                                disabled={idx === 0}
                                className="bg-gray-700 p-2 rounded-full hover:bg-blue-600 disabled:opacity-50"
                            >
                                <LucideUndo className="w-4 h-4 transform rotate-90" />
                            </button>
                            <button
                                onClick={() => onReorderQueue(idx, 'down')}
                                disabled={idx === waitingTeams.length - 1}
                                className="bg-gray-700 p-2 rounded-full hover:bg-blue-600 disabled:opacity-50"
                            >
                                <LucideUndo className="w-4 h-4 transform -rotate-90" />
                            </button>
                        </div>
                    )}
                </div>
            );
        });
    };

    return (
        <div className="text-center bg-gray-900/50 rounded-2xl p-4 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-indigo-300 mb-2">
                {isEditModeActive ? 'Modo de Edição' : (step === 'post_game' ? 'Fim da Partida' : 'Próxima Partida')}
            </h2>
            <p className="text-gray-400 mb-6">
                {isEditModeActive ? 'Organize os jogadores e os próximos times.' : 'Visualize os times ou inicie a Próxima partida.'}
            </p>
            {step === 'pre_game' && (matchHistory || []).length === 0 && (
                <div className="flex justify-center mb-4">
                    <button
                        onClick={onBackToConfig}
                        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg"
                    >
                        Voltar para Configurar
                    </button>
                </div>
            )}
            <div className="flex justify-center gap-4 mb-6">
                {onCreatePlayer && (
                    <button onClick={onCreatePlayer} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg">
                        {t('Adicionar Jogador')}
                    </button>
                )}
                {step === 'pre_game' && (
                    <button
                        onClick={onOpenBenchConfig}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-lg"
                    >
                        {t('Configurar Banco')}
                    </button>
                )}
                {!isEditModeActive ? (
                    <button
                        onClick={() => onToggleEditMode(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2"
                    >
                        <LucideEdit className="w-4 h-4" /> Editar Partida
                    </button>
                ) : (
                    <button
                        onClick={() => onToggleEditMode(false)}
                        className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2"
                    >
                        <LucideShieldCheck className="w-4 h-4" /> Salvar Alterações
                    </button>
                )}
            </div>
            <div className="flex flex-col md:flex-row gap-4 mb-6 justify-center items-start">
                {renderTeamCard(teamA, 0)}
                <div className="flex items-center justify-center h-full text-2xl font-bold text-gray-500 p-4">VS</div>
                {teamB.length > 0 ? renderTeamCard(teamB, 1) : (
                    <div className="bg-gray-800 p-4 rounded-lg w-full min-w-[280px] flex items-center justify-center">
                        <h3 className="text-indigo-300 font-bold text-xl">Sem desafiantes</h3>
                    </div>
                )}
            </div>
            {isEditModeActive && (
                <>
                    <button
                        onClick={onToggleBenchPanel}
                        className="inline-flex items-center gap-2 rounded-full text-white px-4 py-2 shadow mb-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:from-indigo-500 hover:via-violet-500 hover:to-fuchsia-500 ring-1 ring-inset ring-violet-400/40"
                    >
                        {`Reservas (${benchPlayers.length})`}
                    </button>
                        {showBenchPanel && (
                            <div className="mx-auto max-w-3xl rounded-xl border border-indigo-500/40 bg-[#0b1220]/95 p-4 shadow-2xl mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-bold text-indigo-200">Jogadores disponíveis</h3>
                                    <button onClick={onToggleBenchPanel} className="text-slate-300 hover:text-white">X</button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {benchPlayers.length === 0 ? (
                                    <p className="text-xs text-slate-400">Nenhum jogador disponível.</p>
                                ) : (
                                    benchPlayers.map(p => {
                                        const avatar = p.photoURL || p.avatarURL || null;
                                        const initials = p.name ? p.name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase() : '?';
                                        return (
                                            <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-indigo-500/20 bg-indigo-900/30 px-3 py-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center text-xs font-bold">
                                                        {avatar ? (
                                                            <img src={avatar} alt={p.name} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <span>{initials}</span>
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-semibold text-white truncate">
                                                        {p.name}
                                                        {benchPreferenceIds.has(p.id) && <span className="ml-1 text-[10px] text-indigo-200 uppercase">({t('fixo no banco')})</span>}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        className="bg-gray-800 text-white text-xs rounded p-1 border border-gray-600"
                                                        onChange={(e) => onAddFromBenchToTeam(p, e.target.value)}
                                                        defaultValue={'A'}
                                                    >
                                                        {allTeams.map((_, idx) => {
                                                            const label = `Time ${String.fromCharCode(65 + idx)}`;
                                                            const value = String.fromCharCode(65 + idx);
                                                            return (
                                                                <option key={idx} value={value}>{label}</option>
                                                            );
                                                        })}
                                                    </select>
                                                    <button onClick={() => { /* no-op, action via select */ }} className="hidden"></button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
            {waitingTeams.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-400 mb-4">Times na Fila</h3>
                    <div className="flex flex-wrap gap-4 justify-center">
                        {renderWaitingTeams()}
                    </div>
                </div>
            )}
            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8 border-t border-indigo-800 pt-6">
                <button
                    onClick={onStartNextMatch}
                    disabled={!teamB || teamB.length === 0}
                    className="bg-indigo-400 hover:bg-indigo-300 text-black font-bold py-3 px-8 rounded-lg text-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    Começar Próxima Partida
                </button>
                <button
                    onClick={onForceEndSession}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
                >
                    Encerrar Pelada
                </button>
            </div>
        </div>
    );
};

export default PrePostGameView;
