import React, { useState } from 'react';
import { LucidePlay, LucidePause, LucidePlus, LucideUndo } from 'lucide-react';
import ConfirmationModal from '../../components/ConfirmationModal';
import PlayerActionModal from './PlayerActionModal';
import AssistSelectorModal from './AssistSelectorModal';

const PlayerPickerModal = ({ isOpen, onClose, teams, onSelect }) => {
    if (!isOpen) return null;
    const teamA = (teams?.teamA || []).filter(Boolean);
    const teamB = (teams?.teamB || []).filter(Boolean);
    const renderTeamGroup = (players, label, teamKey) => (
        <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-300">{label}</h3>
            {players.length > 0 ? (
                <div className="space-y-2">
                    {players.map((player) => (
                        <button
                            key={`${teamKey}-${player.id}`}
                            onClick={() => onSelect(player, teamKey)}
                            className="w-full rounded-lg border border-indigo-500/30 bg-indigo-900/40 px-3 py-2 text-left text-sm font-semibold text-white hover:border-indigo-400 hover:bg-indigo-800/60 transition-colors"
                        >
                            {player.name}
                        </button>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-slate-400">Nenhum jogador disponivel.</p>
            )}
        </div>
    );


    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-xl rounded-2xl border border-indigo-500/40 bg-[#0b1220]/95 p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Selecionar jogador</h2>
                    <button onClick={onClose} className="rounded-full border border-slate-600 p-2 text-slate-300 hover:text-white">
                        <span className="sr-only">Fechar</span>
                        <span aria-hidden="true">X</span>
                    </button>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {renderTeamGroup(teamA, 'Time A', 'teamA')}
                    {renderTeamGroup(teamB, 'Time B', 'teamB')}
                </div>
            </div>
        </div>
    );
};
// Substituicao controlada pelo componente pai (ActiveMatch)
const LiveMatchTracker = ({
    teams,
    score,
    timeLeft,
    isPaused,
    history = [],
    playerStats,
    playerForAction,
    isAssistModalOpen,
    teammates,
    onInitiateSubstitution,
    onTogglePause,
    onAddMinute,
    onUndo,
    onEndMatch,
    onPlayerAction,
    onGoal,
    onSelectAssister,
}) => {
    const [showConfirm, setShowConfirm] = useState(false);
    const [isPlayerPickerOpen, setIsPlayerPickerOpen] = useState(false);
    const fieldStripes = React.useMemo(() => Array.from({ length: 6 }), []);

    const formatTime = (s) => {
        if (isNaN(s) || s < 0) s = 0;
        return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    };

    const handleEndMatchClick = () => {
        const result = { teams, score, playerStats };
        onEndMatch(result);
    };

    const handleOpenPlayerPicker = () => setIsPlayerPickerOpen(true);
    const handleClosePlayerPicker = () => setIsPlayerPickerOpen(false);
    const handleSelectPlayerFromPicker = (player, teamKey) => {
        setIsPlayerPickerOpen(false);
        if (player) onPlayerAction(player, teamKey);
    };

    const fieldAnimationStyles = `@keyframes interactive-field-ball {
        0% { transform: translate(-50%, -50%) translateX(-120px) translateY(0); }
        25% { transform: translate(-50%, -50%) translateX(-60px) translateY(-12px); }
        50% { transform: translate(-50%, -50%) translateX(0) translateY(0); }
        75% { transform: translate(-50%, -50%) translateX(60px) translateY(-12px); }
        100% { transform: translate(-50%, -50%) translateX(-120px) translateY(0); }
    }`;

    return (
        <>
            <style>{fieldAnimationStyles}</style>
            <PlayerActionModal 
                isOpen={!!playerForAction}
                onClose={() => onPlayerAction(null, null)}
                player={playerForAction?.player}
                onStat={(stat) => onSelectAssister(null, stat)}
                onGoal={onGoal}
                onSubstitute={() => {
                    if (onInitiateSubstitution && playerForAction?.player) {
                        onInitiateSubstitution(playerForAction.player);
                    }
                }}
            />
            
            <AssistSelectorModal 
                isOpen={isAssistModalOpen}
                onClose={() => onSelectAssister(null, null, true)}
                teammates={teammates}
                onSelectAssister={(assisterId) => onSelectAssister(assisterId, 'goals')}
            />

            <ConfirmationModal 
                isOpen={showConfirm} 
                title="Confirmar Acrescimo" 
                message="Deseja adicionar 1 minuto ao cronometro?" 
                onConfirm={() => { onAddMinute(); setShowConfirm(false); }} 
                onClose={() => setShowConfirm(false)} 
            />
            
            <div className="space-y-6">
                <div className="text-center bg-black/30 p-4 rounded-xl space-y-4">
                    <div>
                        <h2 className="text-6xl font-mono tracking-tighter text-white">{formatTime(timeLeft)}</h2>
                        <div className="flex justify-center items-center gap-2 sm:gap-4 mt-2">
                            <button onClick={onTogglePause} className="p-2 sm:p-3 bg-gray-700/80 rounded-full hover:bg-indigo-400 transition-colors">{isPaused ? <LucidePlay /> : <LucidePause />}</button>
                            <button onClick={() => setShowConfirm(true)} className="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs sm:text-sm font-semibold flex items-center gap-2"><LucidePlus /> Acrescimo</button>
                            <button onClick={onUndo} disabled={history.length === 0} className="py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 text-xs sm:text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><LucideUndo /> Desfazer</button>
                        </div>
                    </div>
                    <h2 className="text-5xl font-black tracking-tighter">
                        <span className="text-white">{score.teamA}</span>
                        <span className="text-indigo-300 mx-4">VS</span>
                        <span className="text-white">{score.teamB}</span>
                    </h2>
                </div>
                <div
                    className="relative mx-auto mt-4 h-64 w-full max-w-3xl cursor-pointer select-none overflow-hidden rounded-[32px] border border-emerald-900/60 bg-[#0b3a14] shadow-[0_18px_45px_rgba(6,24,10,0.4)] transition-transform hover:scale-[1.01]"
                    role="button"
                    tabIndex={0}
                    onClick={handleOpenPlayerPicker}
                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleOpenPlayerPicker(); } }}
                >
                    <div className="pointer-events-none absolute inset-0 flex">
                        {fieldStripes.map((_, index) => (
                            <span
                                key={`field-stripe-${index}`}
                                className={`flex-1 ${index % 2 === 0 ? 'bg-[#134820]/45' : 'bg-[#0d3116]'}`}
                            />
                        ))}
                    </div>
                    <div className="pointer-events-none absolute inset-2 rounded-[28px] border border-white/15" />
                    <div className="pointer-events-none absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-white/25" />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="h-36 w-36 rounded-full border border-white/18" />
                        <div className="h-2 w-2 rounded-full bg-white/70" />
                    </div>
                    <div className="pointer-events-none absolute inset-y-10 left-4 w-24 rounded-r-[26px] border border-white/18" />
                    <div className="pointer-events-none absolute inset-y-18 left-8 w-12 rounded-r-[20px] border border-white/12" />
                    <div className="pointer-events-none absolute inset-y-10 right-4 w-24 rounded-l-[26px] border border-white/18" />
                    <div className="pointer-events-none absolute inset-y-18 right-8 w-12 rounded-l-[20px] border border-white/12" />
                    <div
                        className="pointer-events-none absolute top-1/2 left-1/2 h-5 w-5 rounded-full border border-white/55 bg-gradient-to-br from-white via-slate-200 to-slate-500 shadow-[0_6px_10px_rgba(0,0,0,0.35)]"
                        style={{ animation: 'interactive-field-ball 3.4s ease-in-out infinite' }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-emerald-50/90">
                        <span className="text-[10px] uppercase tracking-[0.45em]">Campo Interativo</span>
                        <span className="mt-1 text-xs font-semibold rounded-full bg-black/25 px-3 py-1">Toque para registrar um evento</span>
                    </div>
                </div>
                <div className="text-center mt-6">
                    <button onClick={handleEndMatchClick} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-lg">
                        Encerrar Partida
                    </button>
                </div>
            </div>
            <PlayerPickerModal
                isOpen={isPlayerPickerOpen}
                onClose={handleClosePlayerPicker}
                teams={teams}
                onSelect={handleSelectPlayerFromPicker}
            />
        </>
    );
};

export default LiveMatchTracker;

