import React, { useState, useMemo, useEffect, useRef } from 'react';
import LiveMatchTracker from './LiveMatchTracker';
import SubstitutionModal from './SubstitutionModal';
import ReservePanel from './ReservePanel';
import BenchPanel from './active/BenchPanel';
import QueuePanel from './active/QueuePanel';
import QuickAddModal from './active/QuickAddModal';

const deepClone = (obj) => {
    try { if (typeof structuredClone === 'function') return structuredClone(obj); } catch {}
    return JSON.parse(JSON.stringify(obj));
};
const createEmptyPlayerStats = () => ({
    goals: 0,
    ownGoals: 0,
    assists: 0,
    dribbles: 0,
    tackles: 0,
    saves: 0,
    failures: 0,
});
const fillPlayerStats = (stats = {}) => ({ ...createEmptyPlayerStats(), ...stats });
const deriveStatsFromTimeline = (timeline = []) => {
    const derived = {};
    const ensure = (playerId) => {
        if (!playerId) return null;
        if (!derived[playerId]) derived[playerId] = createEmptyPlayerStats();
        return derived[playerId];
    };
    timeline.forEach((event) => {
        const target = ensure(event?.playerId);
        if (!target) return;
        switch (event.type) {
            case 'goal':
                target.goals += 1;
                break;
            case 'ownGoal':
                target.ownGoals += 1;
                break;
            case 'assist':
                target.assists += 1;
                break;
            case 'dribble':
                target.dribbles += 1;
                break;
            case 'tackle':
                target.tackles += 1;
                break;
            case 'save':
                target.saves += 1;
                break;
            case 'failure':
                target.failures += 1;
                break;
            default:
                break;
        }
    });
    return derived;
};

const ActiveMatch = ({ teams: allTeams, numberOfTeams = 2, onMatchEnd, onTeamsChange, groupId, initialDurationSec = 10 * 60, onCreatePlayer, t }) => {
    const [timeLeft, setTimeLeft] = useState(initialDurationSec);
    const [isPaused, setIsPaused] = useState(true);
    const [score, setScore] = useState({ teamA: 0, teamB: 0 });
    const [playerStats, setPlayerStats] = useState({});
    const [history, setHistory] = useState([]);
    const [eventTimeline, setEventTimeline] = useState([]);

    // Estados dos Modais
    const [playerForAction, setPlayerForAction] = useState(null);
    const [isAssistModalOpen, setIsAssistModalOpen] = useState(false);
    const [goalScorerInfo, setGoalScorerInfo] = useState(null);
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [showBench, setShowBench] = useState(false);
    const [showQueue, setShowQueue] = useState(false);
    const [playerToSubstitute, setPlayerToSubstitute] = useState(null);
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

    const workerRef = useRef(null);
    const fallbackIntervalRef = useRef(null);
    const watchdogRef = useRef(null);
    const lastTickRef = useRef(Date.now());
    const startedAtRef = useRef(Date.now());
    const participantsRef = useRef({ teamA: new Map(), teamB: new Map() });
    const liveStateKey = useMemo(() => `liveMatchState-${groupId || 'default'}`, [groupId]);

    const teammates = useMemo(() => {
        if (!goalScorerInfo || !allTeams[0] || !allTeams[1]) return [];
        const teamList = goalScorerInfo.teamKey === 'teamA' ? allTeams[0] : allTeams[1];
        return teamList.filter(p => p && p.id !== goalScorerInfo.player.id);
    }, [goalScorerInfo, allTeams]);

    const teamsInPlay = useMemo(() => ({
        teamA: allTeams[0] || [],
        teamB: allTeams[1] || []
    }), [allTeams]);

    useEffect(() => {
        const basePublicUrl = process.env.PUBLIC_URL || '';
        const normalizedPublicUrl = basePublicUrl.endsWith('/') ? basePublicUrl.slice(0, -1) : basePublicUrl;
        const workerUrl = normalizedPublicUrl ? `${normalizedPublicUrl}/timer.worker.js` : '/timer.worker.js';
        let workerInstance = null;

        try {
            workerInstance = new Worker(workerUrl);
        } catch (creationError) {
            console.error('Falha ao iniciar o cronometro com Web Worker:', creationError);
        }

        if (!workerInstance) {
            let fallbackInterval = null;
            let fallbackTimeLeft = 0;
            const fallbackWorker = {
                postMessage: ({ command, value }) => {
                    if (command === 'start') {
                        fallbackTimeLeft = typeof value === 'number' ? value : fallbackTimeLeft;
                        if (fallbackInterval) clearInterval(fallbackInterval);
                        fallbackInterval = setInterval(() => {
                            if (fallbackTimeLeft > 0) {
                                fallbackTimeLeft -= 1;
                                setTimeLeft(fallbackTimeLeft);
                            } else {
                                clearInterval(fallbackInterval);
                                fallbackInterval = null;
                            }
                        }, 1000);
                    } else if (command === 'pause') {
                        if (fallbackInterval) {
                            clearInterval(fallbackInterval);
                            fallbackInterval = null;
                        }
                    } else if (command === 'stop') {
                        if (fallbackInterval) {
                            clearInterval(fallbackInterval);
                            fallbackInterval = null;
                        }
                        fallbackTimeLeft = 0;
                        setTimeLeft(0);
                    }
                },
                terminate: () => {
                    if (fallbackInterval) {
                        clearInterval(fallbackInterval);
                        fallbackInterval = null;
                    }
                },
            };
            workerRef.current = fallbackWorker;
            return () => {
                fallbackWorker.terminate();
                workerRef.current = null;
            };
        }

        workerRef.current = workerInstance;

        workerInstance.onmessage = (e) => {
            if (e.data?.type === 'tick') setTimeLeft(e.data.timeLeft);
            if (e.data?.type === 'tick') lastTickRef.current = Date.now();
        };

        workerInstance.onerror = (errorEvent) => {
            console.error('Erro no cronometro (worker):', errorEvent);
        };

        return () => {
            if (workerRef.current) {
                try { workerRef.current.postMessage({ command: 'stop' }); } catch {}
                if (workerRef.current.terminate) {
                    workerRef.current.terminate();
                }
                workerRef.current = null;
            }
            if (watchdogRef.current) clearInterval(watchdogRef.current);
            if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);
        };
    }, []); // Roda apenas uma vez para inicializar o worker

    const workerStartedRef = useRef(false);
    useEffect(() => {
        if (!workerRef.current || workerStartedRef.current) return;
        workerRef.current.postMessage({ command: 'start', value: timeLeft });
        if (isPaused) workerRef.current.postMessage({ command: 'pause' });
        workerStartedRef.current = true;
        lastTickRef.current = Date.now();
    }, [timeLeft, isPaused]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(liveStateKey);
            if (raw) {
                const saved = JSON.parse(raw);
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
            } else {
                const stats = {};
                allTeams.flat().forEach(p => {
                    if (p) stats[p.id] = createEmptyPlayerStats();
                });
                setPlayerStats(stats);
            }
        } catch (e) {
            console.error(t('Falha ao restaurar estado ao vivo:'), e);
        }
    }, [liveStateKey, allTeams, t]);

    const saveTimerRef = useRef(null);
    useEffect(() => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            const stateToSave = { timeLeft, isPaused, score, playerStats, history, eventTimeline, startedAt: startedAtRef.current };
            try { localStorage.setItem(liveStateKey, JSON.stringify(stateToSave)); } catch {}
        }, 800);
        return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    }, [timeLeft, isPaused, score, playerStats, history, eventTimeline, liveStateKey]);

    // Fallback timer watchdog in caso de travamento do worker
    const clearFallbackTimer = () => {
        if (fallbackIntervalRef.current) {
            clearInterval(fallbackIntervalRef.current);
            fallbackIntervalRef.current = null;
        }
    };

    useEffect(() => {
        if (watchdogRef.current) {
            clearInterval(watchdogRef.current);
            watchdogRef.current = null;
        }
        if (isPaused) {
            clearFallbackTimer();
            return;
        }
        // Watchdog: se não houver tick do worker em 2s, liga fallback com setInterval
        watchdogRef.current = setInterval(() => {
            if (Date.now() - lastTickRef.current > 2000 && !fallbackIntervalRef.current) {
                fallbackIntervalRef.current = setInterval(() => {
                    setTimeLeft(prev => {
                        if (prev <= 0) {
                            clearFallbackTimer();
                            return 0;
                        }
                        lastTickRef.current = Date.now();
                        return prev - 1;
                    });
                }, 1000);
            }
        }, 1500);
        return () => {
            if (watchdogRef.current) clearInterval(watchdogRef.current);
            clearFallbackTimer();
        };
    }, [isPaused]);

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
            lastTickRef.current = Date.now();
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

        setHistory(prev => [...prev, { score: { ...score }, playerStats: deepClone(playerStats) }]);

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
        } else if (statToUpdate === 'ownGoals') {
            const oppKey = teamKey === 'teamA' ? 'teamB' : 'teamA';
            setScore(prev => ({ ...prev, [oppKey]: prev[oppKey] + 1 }));
        }

        const minuteStamp = getCurrentMinuteStamp();
        const baseEvent = {
            teamKey,
            minute: minuteStamp,
            playerId: player?.id,
            playerName: player?.name || t('Jogador'),
        };

        if (statToUpdate === 'goals') {
            const assister = assisterId ? findPlayerById(assisterId) : null;
            const assistName = assister ? (assister.name || null) : null;
            recordTimelineEvent({
                type: 'goal',
                assistName,
                ...baseEvent,
            });
            if (assister) {
                // Also log an explicit assist event entry
                recordTimelineEvent({
                    type: 'assist',
                    teamKey,
                    minute: minuteStamp,
                    playerId: assister.id,
                    playerName: assister.name || t('Jogador'),
                });
            }
        } else if (statToUpdate === 'ownGoals') {
            recordTimelineEvent({
                type: 'ownGoal',
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
        const newTeams = deepClone(allTeams);
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
            // Swap players between positions without introducing duplicates
            const tempOut = newTeams[posOut.tIndex][posOut.pIndex];
            const tempIn = newTeams[posIn.tIndex][posIn.pIndex];
            newTeams[posOut.tIndex][posOut.pIndex] = tempIn;
            newTeams[posIn.tIndex][posIn.pIndex] = tempOut;
        }

        if (onTeamsChange) onTeamsChange(newTeams);

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

    useEffect(() => {
        const registerPlayer = (player, targetKey) => {
            if (!player?.id) return;
            const current = participantsRef.current;
            const oppositeKey = targetKey === 'teamA' ? 'teamB' : 'teamA';
            current[oppositeKey].delete(player.id);
            current[targetKey].set(player.id, player);
        };
        (teamsInPlay.teamA || []).forEach(player => registerPlayer(player, 'teamA'));
        (teamsInPlay.teamB || []).forEach(player => registerPlayer(player, 'teamB'));
    }, [teamsInPlay]);

    useEffect(() => {
        return () => {
            participantsRef.current = { teamA: new Map(), teamB: new Map() };
        };
    }, []);

    const benchIndex = Math.max(2, Number(numberOfTeams) || 2);
    const benchPlayers = (allTeams[benchIndex] || []).filter(p => p);
    const waitingTeams = useMemo(() => {
        return (allTeams || []).slice(benchIndex + 1).filter(t => Array.isArray(t) && t.length > 0);
    }, [allTeams, benchIndex]);

    const availableSubsForPlayer = React.useMemo(() => {
        // Opção: permitir usar jogadores de outros times se o usuário quiser (não altera composição até confirmar)
        const inGamePlayers = [...(allTeams[0] || []), ...(allTeams[1] || [])].filter(Boolean);
        // Remove o próprio jogador de saída
        const unique = new Map();
        [...benchPlayers, ...inGamePlayers].forEach(p => {
            if (p?.id) unique.set(p.id, p);
        });
        return Array.from(unique.values());
    }, [benchPlayers, allTeams]);

    const handleAddPlayerToTeam = (player, targetIndex) => {
        if (!player || typeof targetIndex !== 'number') return;
        const newTeams = deepClone(allTeams);

        // Remove player from any team/bench they might be in
        newTeams.forEach((team, tIndex) => {
            if (!Array.isArray(team)) return;
            const idx = team.findIndex(p => p?.id === player.id);
            if (idx >= 0) team.splice(idx, 1);
        });
        // Ensure target team exists
        while (newTeams.length <= targetIndex) newTeams.push([]);
        newTeams[targetIndex].push(player);
        if (onTeamsChange) onTeamsChange(newTeams);
    };
    
    return (
        <>
            <SubstitutionModal 
                isOpen={isSubModalOpen} 
                onClose={() => setIsSubModalOpen(false)} 
                playerOut={playerToSubstitute} 
                availableSubs={availableSubsForPlayer} 
                onConfirm={handleConfirmSubstitution}
                t={t}
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
                    const finalTeams = {
                        teamA: Array.from(participantsRef.current.teamA.values()),
                        teamB: Array.from(participantsRef.current.teamB.values()),
                    };
                    const hasRecordedStats = Object.values(playerStats || {}).some((entry) => {
                        if (!entry) return false;
                        return Object.values(entry).some((value) => Number(value || 0) > 0);
                    });
                    const finalStats = hasRecordedStats
                        ? deepClone(playerStats || {})
                        : deriveStatsFromTimeline(eventTimeline || []);
                    // Garanta que cada jogador tenha o nome preenchido no mapa de stats
                    [...(finalTeams.teamA || []), ...(finalTeams.teamB || [])].forEach(p => {
                        if (!p?.id) return;
                        if (!finalStats[p.id]) finalStats[p.id] = createEmptyPlayerStats();
                        if (!finalStats[p.id].name) finalStats[p.id].name = p.name || t('Jogador');
                    });
                    const finalEvents = deepClone(eventTimeline || []);
                    const resultsPerPlayer = (() => {
                        const map = {};
                        const a = finalTeams.teamA || [];
                        const b = finalTeams.teamB || [];
                        const aScore = Number(score?.teamA || 0);
                        const bScore = Number(score?.teamB || 0);
                        const winnerKey = aScore > bScore ? 'teamA' : (bScore > aScore ? 'teamB' : null);
                        a.forEach(p => { if (!p?.id) return; map[p.id] = winnerKey === 'teamA' ? 'win' : (winnerKey === 'teamB' ? 'loss' : 'draw'); });
                        b.forEach(p => { if (!p?.id) return; map[p.id] = winnerKey === 'teamB' ? 'win' : (winnerKey === 'teamA' ? 'loss' : 'draw'); });
                        return map;
                    })();
                    onMatchEnd({
                        teams: finalTeams,
                        score: { ...score },
                        playerStats: finalStats,
                        events: finalEvents,
                        resultsPerPlayer,
                        startedAt: startedAtIso,
                        endedAt: finishedAt,
                    });
                    participantsRef.current = { teamA: new Map(), teamB: new Map() };
                }}
                onPlayerAction={(player, teamKey) => setPlayerForAction({ player, teamKey })}
                onGoal={handleGoal}
                onSelectAssister={handleSelectAssister}
                onInitiateSubstitution={handleInitiateSubstitution}
                timelineEvents={eventTimeline}
                openCreatePlayer={onCreatePlayer}
                openBench={() => setShowBench(true)}
                openQueue={() => setShowQueue(true)}
                disableFab={isQuickAddOpen}
                t={t}
            />


            <BenchPanel
                isOpen={showBench}
                benchPlayers={benchPlayers}
                onAddToTeam={handleAddPlayerToTeam}
                onClose={() => setShowBench(false)}
                t={t}
            />

            {showBench && (
                <ReservePanel
                    isOpen={showBench}
                    onClose={() => setShowBench(false)}
                    reserves={benchPlayers}
                    teamLabels={(allTeams || []).map((_, idx) => (
                        idx === 0 ? t('Time A') : idx === 1 ? t('Time B') : idx === benchIndex ? 'Reservas' : `Fila ${idx - 2}`
                    ))}
                    excludeIndices={[benchIndex]}
                    onAddToTeam={handleAddPlayerToTeam}
                    title="Jogadores disponA-veis"
                />
            )}

            <QueuePanel
                isOpen={showQueue}
                waitingTeams={waitingTeams}
                onClose={() => setShowQueue(false)}
                t={t}
            />

            <QuickAddModal
                isOpen={isQuickAddOpen}
                benchPlayers={benchPlayers}
                onAddToTeam={handleAddPlayerToTeam}
                onClose={() => setIsQuickAddOpen(false)}
                t={t}
            />
        </>
    );
};

export default ActiveMatch;





