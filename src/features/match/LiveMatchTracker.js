import React, { useState } from 'react';
import { LucidePlay, LucidePause, LucidePlus, LucideUndo, LucideGoal, LucideHandshake, LucideShield, LucideAlertTriangle, LucideArrowLeftRight, LucideMove, LucideHand, LucideSparkles } from 'lucide-react';
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
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
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
    timelineEvents = [],
}) => {
    const [showConfirm, setShowConfirm] = useState(false);
    const [isPlayerPickerOpen, setIsPlayerPickerOpen] = useState(false);
    const fieldStripes = React.useMemo(() => Array.from({ length: 6 }), []);

    const getEventVisual = (type) => {
        const baseVisual = {
            Icon: LucideSparkles,
            iconClass: 'text-[#eef2ff]',
            iconWrapperClass: 'bg-gradient-to-br from-[#1b2148]/80 via-[#121737]/80 to-[#0a0f29]/90 ring-1 ring-inset ring-[#364398]/60',
            chipClass: 'bg-[#111739]/80 border border-[#343f8c]/60 text-[#d6dcff]',
            accentBarClass: 'from-[#4338ca]/80 via-[#a855f7]/45 to-transparent',
            glowClass: 'bg-[#4c5cf2]/35 opacity-60 group-hover:opacity-100',
        };
        switch (type) {
            case 'goal':
                return {
                    ...baseVisual,
                    Icon: LucideGoal,
                    iconWrapperClass: 'bg-gradient-to-br from-[#4338ca]/85 via-[#06b6d4]/70 to-[#1a1f49]/90 ring-1 ring-[#7dd3fc]/50 shadow-[0_0_22px_rgba(96,165,250,0.45)]',
                    chipClass: 'bg-gradient-to-r from-[#0f172a]/95 via-[#1c2358]/85 to-[#122040]/90 border border-[#5f7cff]/50 text-[#f8fafc]',
                    accentBarClass: 'from-[#06b6d4]/90 via-[#4338ca]/70 to-transparent',
                    glowClass: 'bg-[#60a5fa]/40 opacity-70 group-hover:opacity-100',
                };
            case 'assist':
                return {
                    ...baseVisual,
                    Icon: LucideHandshake,
                    iconWrapperClass: 'bg-gradient-to-br from-[#a855f7]/85 via-[#4338ca]/65 to-[#1a1f49]/90 ring-1 ring-[#c084fc]/50 shadow-[0_0_22px_rgba(168,85,247,0.4)]',
                    chipClass: 'bg-gradient-to-r from-[#130f3a]/95 via-[#2a1c57]/85 to-[#1c1746]/90 border border-[#c084fc]/45 text-[#f4e9ff]',
                    accentBarClass: 'from-[#a855f7]/85 via-[#4338ca]/70 to-transparent',
                    glowClass: 'bg-[#c084fc]/35 opacity-70 group-hover:opacity-100',
                };
            case 'dribble':
                return {
                    ...baseVisual,
                    Icon: LucideMove,
                    iconWrapperClass: 'bg-gradient-to-br from-[#7c3aed]/80 via-[#06b6d4]/60 to-[#1a1f49]/90 ring-1 ring-[#a78bfa]/45 shadow-[0_0_20px_rgba(124,58,237,0.35)]',
                    chipClass: 'bg-gradient-to-r from-[#0f152f]/95 via-[#261d56]/85 to-[#111a3c]/90 border border-[#a78bfa]/45 text-[#ede9fe]',
                    accentBarClass: 'from-[#7c3aed]/80 via-[#06b6d4]/60 to-transparent',
                    glowClass: 'bg-[#a78bfa]/35 opacity-70 group-hover:opacity-100',
                };
            case 'tackle':
                return {
                    ...baseVisual,
                    Icon: LucideShield,
                    iconWrapperClass: 'bg-gradient-to-br from-[#06b6d4]/85 via-[#4338ca]/65 to-[#132444]/90 ring-1 ring-[#22d3ee]/45 shadow-[0_0_20px_rgba(6,182,212,0.35)]',
                    chipClass: 'bg-gradient-to-r from-[#0f172a]/95 via-[#12304d]/85 to-[#0b1d33]/90 border border-[#38bdf8]/45 text-[#dff9ff]',
                    accentBarClass: 'from-[#06b6d4]/80 via-[#4338ca]/65 to-transparent',
                    glowClass: 'bg-[#22d3ee]/40 opacity-70 group-hover:opacity-100',
                };
            case 'failure':
                return {
                    ...baseVisual,
                    Icon: LucideAlertTriangle,
                    iconWrapperClass: 'bg-gradient-to-br from-[#f43f5e]/75 via-[#a855f7]/55 to-[#1b1b3d]/90 ring-1 ring-[#fb7185]/45 shadow-[0_0_20px_rgba(244,63,94,0.35)]',
                    chipClass: 'bg-gradient-to-r from-[#1a102f]/95 via-[#351a4f]/85 to-[#211536]/90 border border-[#fb7185]/40 text-[#ffe4e6]',
                    accentBarClass: 'from-[#f43f5e]/70 via-[#a855f7]/60 to-transparent',
                    glowClass: 'bg-[#fb7185]/40 opacity-70 group-hover:opacity-100',
                };
            case 'save':
                return {
                    ...baseVisual,
                    Icon: LucideHand,
                    iconWrapperClass: 'bg-gradient-to-br from-[#0ea5e9]/85 via-[#4338ca]/60 to-[#122240]/90 ring-1 ring-[#38bdf8]/45 shadow-[0_0_20px_rgba(14,165,233,0.35)]',
                    chipClass: 'bg-gradient-to-r from-[#0f172a]/95 via-[#1a2f4f]/85 to-[#0b1d33]/90 border border-[#38bdf8]/40 text-[#e0f7ff]',
                    accentBarClass: 'from-[#0ea5e9]/80 via-[#4338ca]/60 to-transparent',
                    glowClass: 'bg-[#38bdf8]/35 opacity-70 group-hover:opacity-100',
                };
            case 'substitution':
                return {
                    ...baseVisual,
                    Icon: LucideArrowLeftRight,
                    iconWrapperClass: 'bg-gradient-to-br from-[#22d3ee]/80 via-[#a855f7]/60 to-[#1a1f49]/90 ring-1 ring-[#67e8f9]/45 shadow-[0_0_20px_rgba(34,211,238,0.35)]',
                    chipClass: 'bg-gradient-to-r from-[#0f162f]/95 via-[#1e2952]/85 to-[#141b3b]/90 border border-[#67e8f9]/45 text-[#e0f9ff]',
                    accentBarClass: 'from-[#22d3ee]/80 via-[#a855f7]/65 to-transparent',
                    glowClass: 'bg-[#67e8f9]/35 opacity-70 group-hover:opacity-100',
                };
            default:
                return baseVisual;
        }
    };
    const renderEventDescription = (event) => {
        switch (event.type) {
            case 'goal':
                return event.assistName
                    ? `${event.playerName} marcou (assistencia de ${event.assistName})`
                    : `${event.playerName} marcou`;
            case 'assist':
                return `${event.playerName} registrou uma assistencia`;
            case 'dribble':
                return `${event.playerName} realizou um drible`;
            case 'tackle':
                return `${event.playerName} fez um desarme`;
            case 'failure':
                return `${event.playerName} cometeu uma falha`;
            case 'save':
                return `${event.playerName} fez uma defesa`;
            case 'substitution':
                return `${event.playerOutName} saiu para ${event.playerInName}`;
            default:
                return `${event.playerName} registrou ${event.type}`;
        }
    };

    const formatMinuteLabel = (minute) => `${Math.max(minute, 0)}'`;
    const getTeamLabel = (teamKey) => {
        if (teamKey === 'teamA') return 'Time A';
        if (teamKey === 'teamB') return 'Time B';
        return '';
    };

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
                    className="relative mx-auto mt-4 h-64 w-full max-w-3xl cursor-pointer select-none overflow-hidden rounded-[32px] border border-slate-700/50 bg-[#101530] shadow-[0_18px_45px_rgba(8,11,30,0.5)] transition-transform hover:scale-[1.01]"
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-indigo-100/90">
                        <span className="text-[10px] uppercase tracking-[0.45em]">Campo Interativo</span>
                        <span className="mt-1 text-xs font-semibold rounded-full bg-slate-900/40 px-3 py-1">Toque para registrar um evento</span>
                    </div>
                </div>
                {timelineEvents.length > 0 && (
                    <div className="rounded-3xl border border-[#2f3c92]/60 bg-gradient-to-br from-[#0b1024]/90 via-[#0b1330]/92 to-[#040714]/96 p-5 shadow-[0_22px_48px_rgba(7,10,26,0.55)]">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-semibold uppercase tracking-[0.45em] text-indigo-100/90">Eventos</h3>
                            <span className="text-[10px] text-indigo-200/70">tempo real</span>
                        </div>
                        <div className="mt-4 max-h-56 space-y-3 overflow-y-auto pr-1">
                            {timelineEvents.map((event) => {
                                const { Icon, iconClass, iconWrapperClass, chipClass, accentBarClass, glowClass } = getEventVisual(event.type);
                                return (
                                    <div
                                        key={event.id}
                                        className="group relative overflow-hidden rounded-2xl border border-[#273078]/60 bg-[#0c132f]/85 px-4 py-3 shadow-[0_16px_36px_rgba(9,13,32,0.55)] transition-all duration-300 hover:border-[#5f6df1]/60 hover:shadow-[0_24px_56px_rgba(11,16,39,0.65)]">
                                        <span className={`pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${accentBarClass}`} />
                                        <div className="relative flex items-start gap-4">
                                            <div className="flex w-16 flex-col items-center gap-1 pt-1">
                                                <span className={`rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${chipClass}`}>
                                                    {formatMinuteLabel(event.minute)}
                                                </span>
                                                {getTeamLabel(event.teamKey) && (
                                                    <span className="text-[9px] font-semibold uppercase tracking-[0.35em] text-indigo-200/60">
                                                        {getTeamLabel(event.teamKey)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="relative mt-1 flex h-12 w-12 flex-shrink-0 items-center justify-center">
                                                <div className={`flex h-full w-full items-center justify-center rounded-full ${iconWrapperClass}`}>
                                                    <Icon className={`h-5 w-5 ${iconClass}`} />
                                                </div>
                                                <span className={`pointer-events-none absolute inset-0 -z-10 rounded-full blur-xl transition-opacity duration-300 ${glowClass}`} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-[#f4f6ff]">{renderEventDescription(event)}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
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


