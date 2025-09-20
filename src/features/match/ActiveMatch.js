import React, { useState, useMemo, useEffect, useRef } from 'react';
import LiveMatchTracker from './LiveMatchTracker';
import SubstitutionModal from './SubstitutionModal';

const EMPTY_MATCH_PLAYER_STATS = { goals: 0, assists: 0, tackles: 0, saves: 0, failures: 0, dribbles: 0 };
const fillPlayerStats = (stats = {}) => ({ ...EMPTY_MATCH_PLAYER_STATS, ...stats });

const ActiveMatch = ({ initialTeams, onMatchEnd, onTeamsUpdate, groupId, initialDurationSec = 10 * 60 }) => {
    const [allTeams, setAllTeams] = useState(initialTeams);
    const [timeLeft, setTimeLeft] = useState(initialDurationSec);
    const [isPaused, setIsPaused] = useState(true);
    const [score, setScore] = useState({ teamA: 0, teamB: 0 });
    
    // Inicializa as estatísticas apenas para os jogadores desta partida
    const initialPlayerStats = useMemo(() => {
        const stats = {};
        initialTeams.flat().forEach(p => {
            if (p) stats[p.id] = { ...EMPTY_MATCH_PLAYER_STATS };
        });
        return stats;
    }, [initialTeams]);
    
    const [playerStats, setPlayerStats] = useState(initialPlayerStats);
    const [history, setHistory] = useState([]);
    const [eventTimeline, setEventTimeline] = useState([]);
    
    // Estados dos Modais
    const [playerForAction, setPlayerForAction] = useState(null);
    const [isAssistModalOpen, setIsAssistModalOpen] = useState(false);
    const [goalScorerInfo, setGoalScorerInfo] = useState(null);
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [playerToSubstitute, setPlayerToSubstitute] = useState(null);

    const workerRef = useRef(null);
    const startedAtRef = useRef(Date.now());
    const liveStateKey = useMemo(() => `liveMatchState-${groupId || 'default'}`, [groupId]);

    const teammates = useMemo(() => {
        if (!goalScorerInfo || !allTeams[0] || !allTeams[1]) return [];
        const teamList = goalScorerInfo.teamKey === 'teamA' ? allTeams[0] : allTeams[1];
        return teamList.filter(p => p && p.id !== goalScorerInfo.player.id);
    }, [goalScorerInfo, allTeams]);

    useEffect(() => {
        const worker = new Worker('/timer.worker.js');
        workerRef.current = worker;

        worker.onmessage = (e) => {
            if (e.data.type === 'tick') setTimeLeft(e.data.timeLeft);
        };
        return () => {
            if(workerRef.current) {
                workerRef.current.postMessage({ command: 'stop' });
                workerRef.current.terminate();
            }
        };
    }, []); // Roda apenas uma vez para inicializar o worker

    // Dispara os comandos iniciais do worker uma única vez com o estado atual
    const workerStartedRef = useRef(false);
    useEffect(() => {
        if (!workerRef.current || workerStartedRef.current) return;
        workerRef.current.postMessage({ command: 'start', value: timeLeft });
        if (isPaused) workerRef.current.postMessage({ command: 'pause' });
        workerStartedRef.current = true;
        // deps intencionais: garantimos execução após restaurar timeLeft/isPaused
    }, [timeLeft, isPaused]);

    // Restaurar estado salvo do live ao montar
    useEffect(() => {
        try {
            const raw = localStorage.getItem(liveStateKey);
            if (raw) {
                const saved = JSON.parse(raw);
                const ids = (teams) => [0,1].map(i => (teams?.[i]||[]).map(p=>p?.id).join(','));
                const savedIds = ids(saved.allTeams || []);
                const initialIds = ids(initialTeams || []);
                const sameTopTeams = savedIds[0] === initialIds[0] && savedIds[1] === initialIds[1];
                if (!sameTopTeams) {
                    // Se os times mudaram, não restaura estado antigo
                    try { localStorage.removeItem(liveStateKey); } catch {}
                } else {
                    if (Array.isArray(saved.allTeams)) setAllTeams(saved.allTeams);
                    if (typeof saved.timeLeft === 'number') setTimeLeft(saved.timeLeft);
                    if (typeof saved.isPaused === 'boolean') setIsPaused(saved.isPaused);
                    if (saved.score && typeof saved.score.teamA === 'number' && typeof saved.score.teamB === 'number') setScore(saved.score);
                    if (saved.playerStats && typeof saved.playerStats === 'object') {
                        const normalizedStats = Object.fromEntries(Object.entries(saved.playerStats).map(([id, stats]) => [id, fillPlayerStats(stats)]));
                        setPlayerStats(normalizedStats);
                    }
                    if (Array.isArray(saved.history)) setHistory(saved.history);
                    if (Array.isArray(saved.eventTimeline)) setEventTimeline(saved.eventTimeline);
                    if (saved.startedAt) startedAtRef.current = saved.startedAt;
                    // worker será configurado no efeito dedicado acima
                }
            }
        } catch (e) {
            console.error('Falha ao restaurar estado ao vivo:', e);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [liveStateKey]);

    // Persistir estado principal (salva de forma desacoplada)
    const saveTimerRef = useRef(null);
    useEffect(() => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            const stateToSave = { allTeams, timeLeft, isPaused, score, playerStats, history, eventTimeline, startedAt: startedAtRef.current };
            try { localStorage.setItem(liveStateKey, JSON.stringify(stateToSave)); } catch {}
        }, 800);
        return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    }, [allTeams, timeLeft, isPaused, score, playerStats, history, eventTimeline, liveStateKey]);

    // Efeito para atualizar os times se a prop externa mudar (após substituição)
    useEffect(() => {
        setAllTeams(initialTeams);
    }, [initialTeams]);

    const findPlayerById = (playerId) => {
        for (const team of allTeams) {
            if (!Array.isArray(team)) continue;
            const found = team.find((member) => member?.id === playerId);
            if (found) return found;
        }
        return null;
    };

    const getCurrentMinuteStamp = () => {
        const elapsed = Math.max(initialDurationSec - timeLeft, 0);
        return Math.floor(elapsed / 60);
    };

    const recordTimelineEvent = (payload) => {
        setEventTimeline((prev) => [
            ...prev,
            {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                ...payload,
            },
        ]);
    };

    const handleTogglePause = () => {
        if (workerRef.current) {
            if (isPaused) workerRef.current.postMessage({ command: 'start', value: timeLeft });
            else workerRef.current.postMessage({ command: 'pause' });
            setIsPaused(!isPaused);
        }
    };
    
    const handleAddMinute = () => {
        const newTime = timeLeft + 60;
        setTimeLeft(newTime);
        if (workerRef.current) {
            workerRef.current.postMessage({ command: 'start', value: newTime });
            if (isPaused) setIsPaused(false);
        }
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const lastState = history.pop();
        setScore(lastState.score);
        setPlayerStats(lastState.playerStats);
        setHistory([...history]);
        setEventTimeline((prev) => prev.slice(0, -1));
    };

    const handleGoal = () => {
        if (!playerForAction) return;
        setGoalScorerInfo(playerForAction);
        setIsAssistModalOpen(true);
        setPlayerForAction(null);
    };

    const handleSelectAssister = (assisterId, stat, cancel = false) => {
        if (cancel) {
            setIsAssistModalOpen(false);
            setGoalScorerInfo(null);
            return;
        }
        const { player, teamKey } = goalScorerInfo || playerForAction;
        const statToUpdate = stat || 'goals';

        setHistory(prev => [...prev, { score: { ...score }, playerStats: JSON.parse(JSON.stringify(playerStats)) }]);

        setPlayerStats(prev => {
            const newPlayerStats = { ...prev };
            const pStats = fillPlayerStats(newPlayerStats[player.id]);
            newPlayerStats[player.id] = { ...pStats, [statToUpdate]: (pStats[statToUpdate] || 0) + 1 };
            if (assisterId) {
                const aStats = fillPlayerStats(newPlayerStats[assisterId]);
                newPlayerStats[assisterId] = { ...aStats, assists: (aStats.assists || 0) + 1 };
            }
            return newPlayerStats;
        });

        if (statToUpdate === 'goals') {
            setScore(prev => ({ ...prev, [teamKey]: prev[teamKey] + 1 }));
        }

        const minuteStamp = getCurrentMinuteStamp();
        const baseEvent = {
            teamKey,
            minute: minuteStamp,
            playerId: player?.id,
            playerName: player?.name || 'Jogador',
        };

        if (statToUpdate === 'goals') {
            const assistName = assisterId ? (findPlayerById(assisterId)?.name || null) : null;
            recordTimelineEvent({
                type: 'goal',
                assistName,
                ...baseEvent,
            });
        } else {
            const typeMap = {
                assists: 'assist',
                dribbles: 'dribble',
                tackles: 'tackle',
                failures: 'failure',
                saves: 'save',
            };
            const normalizedType = typeMap[statToUpdate] || statToUpdate;
            recordTimelineEvent({
                type: normalizedType,
                ...baseEvent,
            });
        }

        setIsAssistModalOpen(false);
        setGoalScorerInfo(null);
        setPlayerForAction(null);
    };
    
    const handleInitiateSubstitution = (player) => {
        setPlayerToSubstitute(player);
        setIsSubModalOpen(true);
        setPlayerForAction(null);
    };

    const handleConfirmSubstitution = (playerOut, playerIn) => {
        let substitutionTeamKey = null;
        setAllTeams(currentTeams => {
            const newTeams = JSON.parse(JSON.stringify(currentTeams));
            let posOut;
            let posIn;
            newTeams.forEach((team, tIndex) => {
                if (Array.isArray(team)) team.forEach((p, pIndex) => {
                    if (p?.id === playerOut.id) posOut = { tIndex, pIndex };
                    if (p?.id === playerIn.id) posIn = { tIndex, pIndex };
                });
            });
            if (posOut) substitutionTeamKey = posOut.tIndex === 0 ? 'teamA' : 'teamB';
            if (posOut && posIn) {
                [newTeams[posOut.tIndex][posOut.pIndex], newTeams[posIn.tIndex][posIn.pIndex]] = [newTeams[posIn.tIndex][posIn.pIndex], newTeams[posOut.tIndex][posOut.pIndex]];
            }
            if (onTeamsUpdate) onTeamsUpdate(newTeams);
            return newTeams;
        });
        if (substitutionTeamKey) {
            recordTimelineEvent({
                type: 'substitution',
                minute: getCurrentMinuteStamp(),
                teamKey: substitutionTeamKey,
                playerOutName: playerOut.name,
                playerInName: playerIn.name,
            });
        }
        setIsSubModalOpen(false);
        setPlayerToSubstitute(null);
    };

    const teamsInPlay = {
        teamA: allTeams[0] || [],
        teamB: allTeams[1] || []
    };
    
    return (
        <>
            <SubstitutionModal 
                isOpen={isSubModalOpen} 
                onClose={() => setIsSubModalOpen(false)} 
                playerOut={playerToSubstitute} 
                availableSubs={allTeams.slice(2).flat().filter(p => p)} 
                onConfirm={handleConfirmSubstitution}
            />
            <LiveMatchTracker 
                teams={teamsInPlay}
                score={score}
                timeLeft={timeLeft}
                isPaused={isPaused}
                history={history}
                playerStats={playerStats}
                playerForAction={playerForAction}
                isAssistModalOpen={isAssistModalOpen}
                teammates={teammates}
                onTogglePause={handleTogglePause}
                onAddMinute={handleAddMinute}
                onUndo={handleUndo}
                onEndMatch={() => {
                    try { localStorage.removeItem(liveStateKey); } catch {}
                    const finishedAt = new Date().toISOString();
                    const startedAtIso = new Date(startedAtRef.current).toISOString();
                    onMatchEnd({ teams: teamsInPlay, score, playerStats, startedAt: startedAtIso, endedAt: finishedAt });
                }}
                onPlayerAction={(player, teamKey) => setPlayerForAction({ player, teamKey })}
                onGoal={handleGoal}
                onSelectAssister={handleSelectAssister}
                onInitiateSubstitution={handleInitiateSubstitution}
                timelineEvents={eventTimeline}
            />
        </>
    );
};

export default ActiveMatch;
