import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as Tone from 'tone';
import { LucidePlay, LucidePause, LucidePlus, LucideUndo } from 'lucide-react';
import ConfirmationModal from '../../components/ConfirmationModal';
import PlayerActionModal from './PlayerActionModal';
import AssistSelectorModal from './AssistSelectorModal';

const LiveMatchTracker = ({ teams, onEndMatch, durationInMinutes, onInitiateSubstitution }) => {
    const [timeLeft, setTimeLeft] = useState(durationInMinutes * 60);
    const [isPaused, setIsPaused] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [history, setHistory] = useState([]);
    const [score, setScore] = useState({ teamA: 0, teamB: 0 });
    const initialStats = useMemo(() => {
        const s = {};
        if (teams && teams.teamA && teams.teamB) {
            [...teams.teamA, ...teams.teamB].forEach(p => { 
                if (p) s[p.id] = { goals: 0, assists: 0, tackles: 0, saves: 0, failures: 0 }; 
            });
        }
        return s;
    }, [teams]);
    const [playerStats, setPlayerStats] = useState(initialStats);
    
    const [playerForAction, setPlayerForAction] = useState(null);
    const [isAssistModalOpen, setIsAssistModalOpen] = useState(false);
    const [goalScorerInfo, setGoalScorerInfo] = useState(null);

    const workerRef = useRef(null);
    const synth = useRef(null);

    useEffect(() => {
        synth.current = new Tone.Synth().toDestination();
        const worker = new Worker('/timer.worker.js');
        workerRef.current = worker;
        worker.postMessage({ command: 'start', value: durationInMinutes * 60 });
        worker.onmessage = (e) => {
            const { type, timeLeft: workerTimeLeft } = e.data;
            if (type === 'tick') setTimeLeft(workerTimeLeft);
            else if (type === 'done') {
                setTimeLeft(0);
                if (synth.current) {
                    synth.current.triggerAttackRelease("C5", "0.5");
                    setTimeout(() => { if (synth.current) synth.current.triggerAttackRelease("C5", "1"); }, 600);
                }
            }
        };
        return () => {
            worker.postMessage({ command: 'stop' });
            worker.terminate();
        };
    }, [durationInMinutes]);

    const togglePause = () => {
        if (workerRef.current) {
            if (isPaused) workerRef.current.postMessage({ command: 'start', value: timeLeft });
            else workerRef.current.postMessage({ command: 'pause' });
            setIsPaused(!isPaused);
        }
    };
    
    const confirmAddMinute = () => {
        const newTime = timeLeft + 60;
        setTimeLeft(newTime);
        if (workerRef.current) workerRef.current.postMessage({ command: 'start', value: newTime });
        setShowConfirm(false);
        if(isPaused) setIsPaused(false);
    };

    const formatTime = (s) => {
        if (isNaN(s) || s < 0) s = 0;
        return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    };

    const addStat = (playerId, stat, teamKey) => {
        setHistory(prev => [...prev, { score: { ...score }, playerStats: JSON.parse(JSON.stringify(playerStats)) }]);
        setPlayerStats(prev => {
            const currentStats = prev[playerId] || { goals: 0, assists: 0, tackles: 0, saves: 0, failures: 0 };
            return { ...prev, [playerId]: { ...currentStats, [stat]: (currentStats[stat] || 0) + 1 } };
        });
        if (stat === 'goals' && teamKey) setScore(prev => ({ ...prev, [teamKey]: prev[teamKey] + 1 }));
    };
    
    const handleGoal = () => {
        if (!playerForAction) return;
        setGoalScorerInfo(playerForAction);
        setIsAssistModalOpen(true);
        setPlayerForAction(null);
    };

    const handleSelectAssister = (assisterId) => {
        if (!goalScorerInfo) return;
        const { player, teamKey } = goalScorerInfo;
        addStat(player.id, 'goals', teamKey);
        if (assisterId) addStat(assisterId, 'assists', teamKey);
        setIsAssistModalOpen(false);
        setGoalScorerInfo(null);
    };
    
    const handleUndo = () => {
        if (history.length === 0) return;
        const lastState = history[history.length - 1];
        setScore(lastState.score);
        setPlayerStats(lastState.playerStats);
        setHistory(prev => prev.slice(0, -1));
    };

    const handleEndMatchClick = () => {
        onEndMatch({ teams, score, playerStats });
    };

    const renderTeam = (team, teamName, teamKey) => (
        <div className="w-full bg-gray-800/50 rounded-xl p-4 space-y-4">
            <h3 className="text-2xl font-bold text-yellow-400 mb-2 text-center">{teamName}</h3>
            {team.filter(p => p).map(p => (
                <button 
                    key={p.id} 
                    onClick={() => setPlayerForAction({ player: p, teamKey: teamKey })}
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
    
    const teammates = useMemo(() => {
        if (!goalScorerInfo) return [];
        const teamList = goalScorerInfo.teamKey === 'teamA' ? teams.teamA : teams.teamB;
        return teamList.filter(p => p && p.id !== goalScorerInfo.player.id);
    }, [goalScorerInfo, teams]);
    
    return (
        <>
            <PlayerActionModal 
                isOpen={!!playerForAction}
                onClose={() => setPlayerForAction(null)}
                player={playerForAction?.player}
                onStat={(stat) => {
                    addStat(playerForAction.player.id, stat, playerForAction.teamKey);
                    setPlayerForAction(null);
                }}
                onGoal={handleGoal}
                onSubstitute={() => {
                    onInitiateSubstitution(playerForAction.player);
                    setPlayerForAction(null);
                }}
            />
            
            <AssistSelectorModal 
                isOpen={isAssistModalOpen}
                onClose={() => setIsAssistModalOpen(false)}
                teammates={teammates}
                onSelectAssister={handleSelectAssister}
            />
        
            <ConfirmationModal isOpen={showConfirm} title="Confirmar Acréscimo" message="Deseja adicionar 1 minuto ao cronômetro?" onConfirm={confirmAddMinute} onClose={() => setShowConfirm(false)} />
            
            <div className="space-y-6">
                <div className="text-center bg-black/30 p-4 rounded-xl space-y-4">
                    <div>
                        <h2 className="text-6xl font-mono tracking-tighter text-white">{formatTime(timeLeft)}</h2>
                        <div className="flex justify-center items-center gap-2 sm:gap-4 mt-2">
                            <button onClick={togglePause} className="p-2 sm:p-3 bg-gray-700/80 rounded-full hover:bg-yellow-500 transition-colors">{isPaused ? <LucidePlay /> : <LucidePause />}</button>
                            <button onClick={() => setShowConfirm(true)} className="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs sm:text-sm font-semibold flex items-center gap-2"><LucidePlus /> Acréscimo</button>
                            <button onClick={handleUndo} disabled={history.length === 0} className="py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 text-xs sm:text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><LucideUndo /> Desfazer</button>
                        </div>
                    </div>
                    <h2 className="text-5xl font-black tracking-tighter">
                        <span className="text-white">{score.teamA}</span>
                        <span className="text-yellow-400 mx-4">VS</span>
                        <span className="text-white">{score.teamB}</span>
                    </h2>
                </div>
                <div className="flex flex-col md:flex-row gap-6">
                    {teams.teamA && renderTeam(teams.teamA, 'Time A', 'teamA')}
                    {teams.teamB && renderTeam(teams.teamB, 'Time B', 'teamB')}
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