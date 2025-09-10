import React, { useState } from 'react';
import { LucidePlay, LucidePause, LucidePlus, LucideUndo } from 'lucide-react';
import ConfirmationModal from '../../components/ConfirmationModal';
import PlayerActionModal from './PlayerActionModal';
import AssistSelectorModal from './AssistSelectorModal';

// Substituição controlada pelo componente pai (ActiveMatch)
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

    const formatTime = (s) => {
        if (isNaN(s) || s < 0) s = 0;
        return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    };

    const handleEndMatchClick = () => {
        const result = { teams, score, playerStats };
        onEndMatch(result);
    };

    const renderTeam = (team, teamName, teamKey) => (
        <div className="w-full bg-gray-800/50 rounded-xl p-4 space-y-4">
            <h3 className="text-2xl font-bold text-indigo-300 mb-2 text-center">{teamName}</h3>
            {team && team.filter(p => p).map(p => (
                <button 
                    key={p.id} 
                    onClick={() => onPlayerAction(p, teamKey)}
                    className="w-full bg-gray-900/70 p-3 rounded-lg text-left hover:bg-gray-700 transition-colors"
                >
                    <p className="font-bold text-lg text-center text-white">{p.name}</p>
                    <div className="flex justify-around text-xs text-gray-400 mt-2">
                        <span>G: {playerStats[p.id]?.goals || 0}</span>
                        <span>A: {playerStats[p.id]?.assists || 0}</span>
                        <span>D: {playerStats[p.id]?.tackles || 0}</span>
                    </div>
                </button>
            ))}
        </div>
    );

    return (
        <>
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
                title="Confirmar Acréscimo" 
                message="Deseja adicionar 1 minuto ao cronômetro?" 
                onConfirm={() => { onAddMinute(); setShowConfirm(false); }} 
                onClose={() => setShowConfirm(false)} 
            />
            
            <div className="space-y-6">
                <div className="text-center bg-black/30 p-4 rounded-xl space-y-4">
                    <div>
                        <h2 className="text-6xl font-mono tracking-tighter text-white">{formatTime(timeLeft)}</h2>
                        <div className="flex justify-center items-center gap-2 sm:gap-4 mt-2">
                            <button onClick={onTogglePause} className="p-2 sm:p-3 bg-gray-700/80 rounded-full hover:bg-indigo-400 transition-colors">{isPaused ? <LucidePlay /> : <LucidePause />}</button>
                            <button onClick={() => setShowConfirm(true)} className="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs sm:text-sm font-semibold flex items-center gap-2"><LucidePlus /> Acréscimo</button>
                            <button onClick={onUndo} disabled={history.length === 0} className="py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 text-xs sm:text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><LucideUndo /> Desfazer</button>
                        </div>
                    </div>
                    <h2 className="text-5xl font-black tracking-tighter">
                        <span className="text-white">{score.teamA}</span>
                        <span className="text-indigo-300 mx-4">VS</span>
                        <span className="text-white">{score.teamB}</span>
                    </h2>
                </div>
                <div className="flex flex-col md:flex-row gap-6">
                    {teams?.teamA && renderTeam(teams.teamA, 'Time A', 'teamA')}
                    {teams?.teamB && renderTeam(teams.teamB, 'Time B', 'teamB')}
                </div>
                <div className="text-center mt-6">
                    <button onClick={handleEndMatchClick} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-lg">
                        Encerrar Partida
                    </button>
                </div>
            </div>
        </>
    );
};

export default LiveMatchTracker;


