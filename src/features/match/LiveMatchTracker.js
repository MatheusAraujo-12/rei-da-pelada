import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as Tone from 'tone';
import { LucidePlay, LucidePause, LucidePlus, LucideUndo, LucideGoal, LucideHandshake, LucideShield, LucideHand, LucideFrown } from 'lucide-react';
import ConfirmationModal from '../../components/ConfirmationModal';
import StatButton from '../../components/StatButton';

const LiveMatchTracker = ({ teams, onEndMatch, durationInMinutes }) => {
    const [timeLeft, setTimeLeft] = useState(durationInMinutes * 60);
    const [isPaused, setIsPaused] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [history, setHistory] = useState([]);
    const initialStats = useMemo(() => {
        const s = {};
        [...teams.teamA, ...teams.teamB].forEach(p => { s[p.id] = { goals: 0, assists: 0, tackles: 0, saves: 0, failures: 0 }; });
        return s;
    }, [teams]);
    const [score, setScore] = useState({ teamA: 0, teamB: 0 });
    const [playerStats, setPlayerStats] = useState(initialStats);

    const workerRef = useRef(null);
    const synth = useRef(null);

    useEffect(() => {
        synth.current = new Tone.Synth().toDestination();
        const worker = new Worker('/timer.worker.js');
        workerRef.current = worker;

        worker.postMessage({ command: 'start', value: durationInMinutes * 60 });

        worker.onmessage = (e) => {
            const { type, timeLeft: workerTimeLeft } = e.data;
            if (type === 'tick') {
                setTimeLeft(workerTimeLeft);
            } else if (type === 'done') {
                setTimeLeft(0);
                synth.current.triggerAttackRelease("C5", "0.5");
                setTimeout(() => synth.current.triggerAttackRelease("C5", "1"), 600);
            }
        };

        return () => {
            worker.postMessage({ command: 'stop' });
            worker.terminate();
        };
    }, [durationInMinutes]);

    const togglePause = () => {
        if (workerRef.current) {
            if (isPaused) {
                workerRef.current.postMessage({ command: 'start', value: timeLeft });
            } else {
                workerRef.current.postMessage({ command: 'pause' });
            }
            setIsPaused(!isPaused);
        }
    };
    
    const confirmAddMinute = () => {
        const newTime = timeLeft + 60;
        setTimeLeft(newTime);
        if (workerRef.current) {
            workerRef.current.postMessage({ command: 'start', value: newTime });
        }
        setShowConfirm(false);
        if(isPaused) setIsPaused(false);
    };

    const formatTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    const handleStat = (playerId, stat, team) => {
        setHistory(prev => [...prev, { score: { ...score }, playerStats: JSON.parse(JSON.stringify(playerStats)) }]);
        setPlayerStats(prev => ({ ...prev, [playerId]: { ...prev[playerId], [stat]: prev[playerId][stat] + 1 } }));
        if (stat === 'goals') { setScore(prev => ({ ...prev, [team]: prev[team] + 1 })); }
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const lastState = history[history.length - 1];
        setScore(lastState.score);
        setPlayerStats(lastState.playerStats);
        setHistory(prev => prev.slice(0, -1));
    };

    const handleEndMatchClick = () => onEndMatch({ teams, score, playerStats, date: new Date().toISOString() });

    const renderTeam = (team, teamName, scoreKey) => (
        <div className="w-full bg-gray-800/50 rounded-xl p-4 space-y-4">
            <h3 className="text-2xl font-bold text-yellow-400 mb-2 text-center">{teamName}</h3>
            {team.map(p => (
                <div key={p.id} className="bg-gray-900/70 p-4 rounded-lg">
                    <p className="font-bold text-lg text-center mb-3">{p.name}</p>
                    <div className="flex justify-center gap-2 flex-wrap">
                        <StatButton Icon={LucideGoal} label="Gol" count={playerStats[p.id].goals} onClick={() => handleStat(p.id, 'goals', scoreKey)} colorClass="bg-green-600/80 hover:bg-green-500" />
                        <StatButton Icon={LucideHandshake} label="Assistência" count={playerStats[p.id].assists} onClick={() => handleStat(p.id, 'assists')} colorClass="bg-blue-600/80 hover:bg-blue-500" />
                        <StatButton Icon={LucideShield} label="Desarme" count={playerStats[p.id].tackles} onClick={() => handleStat(p.id, 'tackles')} colorClass="bg-orange-600/80 hover:bg-orange-500" />
                        {p.position === 'Goleiro' && <StatButton Icon={LucideHand} label="Defesa Difícil" count={playerStats[p.id].saves} onClick={() => handleStat(p.id, 'saves')} colorClass="bg-purple-600/80 hover:bg-purple-500" />}
                        <StatButton Icon={LucideFrown} label="Falha" count={playerStats[p.id].failures} onClick={() => handleStat(p.id, 'failures')} colorClass="bg-red-800/80 hover:bg-red-700" />
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <>
            <ConfirmationModal isOpen={showConfirm} title="Confirmar Acréscimo" message="Deseja adicionar 1 minuto ao cronômetro?" onConfirm={confirmAddMinute} onClose={() => setShowConfirm(false)} />
            <div className="space-y-6">
                <div className="text-center bg-black/30 p-4 rounded-xl space-y-4">
                    <div>
                        <h2 className="text-4xl sm:text-6xl font-mono tracking-tighter text-white">{formatTime(timeLeft)}</h2>
                        <div className="flex justify-center items-center gap-2 sm:gap-4 mt-2">
                            <button onClick={togglePause} className="p-2 sm:p-3 bg-gray-700/80 rounded-full hover:bg-yellow-500 transition-colors">{isPaused ? <LucidePlay className="w-5 h-5 sm:w-6 sm:h-6" /> : <LucidePause className="w-5 h-5 sm:w-6 sm:h-6" />}</button>
                            <button onClick={() => setShowConfirm(true)} className="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs sm:text-sm font-semibold flex items-center gap-2"><LucidePlus className="w-4 h-4 sm:w-5 sm:h-5" /> Acréscimo</button>
                            <button onClick={handleUndo} disabled={history.length === 0} className="py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 text-xs sm:text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><LucideUndo className="w-4 h-4 sm:w-5 sm:h-5" /> Desfazer</button>
                        </div>
                    </div>
                    <h2 className="text-4xl sm:text-5xl font-black tracking-tighter"><span className="text-white">{score.teamA}</span><span className="text-yellow-400 mx-2 sm:mx-4">VS</span><span className="text-white">{score.teamB}</span></h2>
                </div>
                <div className="flex flex-col md:flex-row gap-6">{renderTeam(teams.teamA, 'Time A', 'teamA')}{renderTeam(teams.teamB, 'Time B', 'teamB')}</div>
                <div className="text-center mt-6"><button onClick={handleEndMatchClick} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-lg">Encerrar Partida</button></div>
            </div>
        </>
    );
};

export default LiveMatchTracker;