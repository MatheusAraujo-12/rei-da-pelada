import React, { useState, useEffect, useRef } from 'react';
import { LucideX } from 'lucide-react';
import { autoBuildTeams } from './Times';
import ActiveMatch from './ActiveMatch';
import MatchConfigView from './flow/MatchConfigView';
import ManualSetupView from './flow/ManualSetupView';
import PrePostGameView from './flow/PrePostGameView';
import BenchConfigModal from './flow/BenchConfigModal';

// Deep clone helper (usa structuredClone quando disponível)
const deepClone = (obj) => {
    try { if (typeof structuredClone === 'function') return structuredClone(obj); } catch {}
    return JSON.parse(JSON.stringify(obj));
};
const MatchFlow = ({ players, groupId, onMatchEnd, onSessionEnd, onCreatePlayer, t }) => {
    const localStorageKey = `reiDaPeladaConfig-${groupId}`;
    const sessionStateKey = `sessionState-${groupId}`;

    const [step, setStep] = useState('config');
    const [selectedPlayerIds, setSelectedPlayerIds] = useState(new Set());
    const [benchPreferenceIds, setBenchPreferenceIds] = useState(new Set());
    const [allTeams, setAllTeams] = useState([]);
    const [matchHistory, setMatchHistory] = useState([]);
    const [sessionPlayerStats, setSessionPlayerStats] = useState({});
    const [numberOfTeams, setNumberOfTeams] = useState(2);
    const [drawType, setDrawType] = useState('self');
    const [isEditModeActive, setIsEditModeActive] = useState(false);
    const [showBenchPanel, setShowBenchPanel] = useState(false);
    const [isBenchConfigOpen, setIsBenchConfigOpen] = useState(false);
    const endingMatchRef = useRef(false);
    const [streakLimit, setStreakLimit] = useState(2);
    const [tieBreakerRule, setTieBreakerRule] = useState('winnerStays');
    const [winnerStreak, setWinnerStreak] = useState({ teamId: null, count: 0 });
    const [setupMode, setSetupMode] = useState('auto');
    const [availablePlayersForSetup, setAvailablePlayersForSetup] = useState([]);
    const [matchDurationMin, setMatchDurationMin] = useState(10);
    const [playersPerTeam, setPlayersPerTeam] = useState(0);

    // Keep setup lists in sync when new players are added mid-flow
    useEffect(() => {
        if (!Array.isArray(players) || players.length === 0) return;
        if (step === 'manual_setup') {
            const eligiblePlayers = players.filter(p => p && selectedPlayerIds.has(p.id));
            const assignedIds = new Set((allTeams || []).flat().map(p => p?.id).filter(Boolean));
            const availableIds = new Set((availablePlayersForSetup || []).map(p => p?.id).filter(Boolean));
            const knownIds = new Set([...assignedIds, ...availableIds]);
            const newcomers = eligiblePlayers.filter(p => !knownIds.has(p.id));
            if (newcomers.length > 0) {
                setAvailablePlayersForSetup(prev => ([...(prev || []), ...newcomers].sort((a, b) => a.name.localeCompare(b.name))));
            }
        } else if (step === 'in_game') {
            setAllTeams(prevTeams => {
                const benchIndex = Math.max(2, Number(numberOfTeams) || 2);
                const cloned = (prevTeams && prevTeams.length > 0)
                    ? prevTeams.map(t => Array.isArray(t) ? [...t] : [])
                    : Array.from({ length: benchIndex }, () => []);

                // Ensure we always have at least `benchIndex` fixed team slots (A, B, C.. up to N)
                const fixedTeams = cloned.slice(0, benchIndex);
                while (fixedTeams.length < benchIndex) fixedTeams.push([]);

                // Compute bench as players não presentes em nenhum time/fila (exclui apenas o slot de banco)
                const assignedIds = new Set(
                    cloned
                        .filter((_, idx) => idx !== benchIndex)
                        .flatMap(team => team)
                        .map(p => p?.id)
                        .filter(Boolean)
                );
                // Only allow pre-selected players to be in the session
                const desiredBench = players.filter(p => p && selectedPlayerIds.has(p.id) && !assignedIds.has(p.id));

                // Waiting queue should exclude the previous bench at benchIndex
                const waitingTail = cloned.slice(benchIndex + 1);

                return [...fixedTeams, desiredBench, ...waitingTail];
            });
        }
    }, [players, step, allTeams, availablePlayersForSetup, numberOfTeams, selectedPlayerIds]);

    useEffect(() => {
        try {
            const savedConfig = localStorage.getItem(localStorageKey);
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                setSelectedPlayerIds(new Set(config.selectedPlayerIds || []));
                setNumberOfTeams(config.numberOfTeams || 2);
                setDrawType(config.drawType || 'self');
                setStreakLimit(config.streakLimit ?? 2);
                setTieBreakerRule(config.tieBreakerRule || 'winnerStays');
                setSetupMode(config.setupMode || 'auto');
                setBenchPreferenceIds(new Set(config.benchPreferenceIds || []));
                if (typeof config.matchDurationMin === 'number') setMatchDurationMin(config.matchDurationMin);
                if (typeof config.playersPerTeam === 'number') setPlayersPerTeam(config.playersPerTeam);
            }
            const savedSession = localStorage.getItem(sessionStateKey);
            if (savedSession) {
                const session = JSON.parse(savedSession);
                setStep(session.step);
                setAllTeams(session.allTeams);
                setMatchHistory(session.matchHistory);
                setSessionPlayerStats(session.sessionPlayerStats);
                setWinnerStreak(session.winnerStreak);
                setSelectedPlayerIds(new Set(session.selectedPlayerIds || []));
                setBenchPreferenceIds(new Set(session.benchPreferenceIds || []));
            }
        } catch (error) {
            console.error("Erro ao carregar do localStorage:", error);
            localStorage.removeItem(sessionStateKey);
            localStorage.removeItem(localStorageKey);
        }
    }, [groupId, localStorageKey, sessionStateKey]);

    useEffect(() => {
        if (step !== 'config' && step !== 'manual_setup') {
            const sessionToSave = { 
                step, 
                allTeams, 
                matchHistory, 
                sessionPlayerStats, 
                winnerStreak,
                selectedPlayerIds: Array.from(selectedPlayerIds),
                benchPreferenceIds: Array.from(benchPreferenceIds)
            };
            localStorage.setItem(sessionStateKey, JSON.stringify(sessionToSave));
        }
        if (step === 'config') {
            const configToSave = {
                selectedPlayerIds: Array.from(selectedPlayerIds),
                benchPreferenceIds: Array.from(benchPreferenceIds),
                numberOfTeams, drawType, streakLimit, tieBreakerRule, setupMode,
                matchDurationMin, playersPerTeam
            };
            localStorage.setItem(localStorageKey, JSON.stringify(configToSave));
        }
    }, [step, allTeams, matchHistory, sessionPlayerStats, winnerStreak, selectedPlayerIds, benchPreferenceIds, numberOfTeams, drawType, streakLimit, tieBreakerRule, setupMode, matchDurationMin, playersPerTeam, localStorageKey, sessionStateKey]);

    // Reseta guarda de encerramento ao iniciar uma nova partida
    useEffect(() => {
        if (step === 'in_game') endingMatchRef.current = false;
    }, [step]);

    // Ao entrar no in_game, zera o estado ao vivo para iniciar partida nova
    useEffect(() => {
        if (step === 'in_game') {
            try { localStorage.removeItem(`liveMatchState-${groupId}`); } catch {}
        }
    }, [step, groupId]);

    // Sempre filtra times/filas/banco para conter apenas jogadores selecionados
    useEffect(() => {
        if (step === 'config' || step === 'manual_setup') return;
        if (!selectedPlayerIds || selectedPlayerIds.size === 0) return;
        setAllTeams(prev => {
            if (!Array.isArray(prev)) return prev;
            let changed = false;
            const filtered = prev.map(team => {
                if (!Array.isArray(team)) return [];
                const cleaned = team.filter(p => p && selectedPlayerIds.has(p.id));
                if (cleaned.length !== team.length) changed = true;
                return cleaned;
            });
            return changed ? filtered : prev;
        });
    }, [selectedPlayerIds, step]);

    // Garante que jogadores marcados como "sempre no banco" fiquem no banco
    useEffect(() => {
        if (!benchPreferenceIds || benchPreferenceIds.size === 0) return;
        if (!['pre_game', 'post_game', 'in_game'].includes(step)) return;
        setAllTeams(prevTeams => {
            const benchIndex = Math.max(2, Number(numberOfTeams) || 2);
            const cloned = deepClone(Array.isArray(prevTeams) && prevTeams.length > 0 ? prevTeams : Array.from({ length: benchIndex + 1 }, () => []));
            let changed = false;
            const benchList = Array.isArray(cloned[benchIndex]) ? [...cloned[benchIndex]] : [];
            const benchIdsSet = new Set(benchPreferenceIds);
            cloned.forEach((team, idx) => {
                if (!Array.isArray(team)) return;
                for (let i = team.length - 1; i >= 0; i--) {
                    const p = team[i];
                    if (p && benchIdsSet.has(p.id) && idx !== benchIndex) {
                        benchList.push(p);
                        team.splice(i, 1);
                        changed = true;
                    }
                }
            });
            const uniqueBench = [];
            const seen = new Set();
            benchList.forEach(p => {
                if (p?.id && !seen.has(p.id)) {
                    seen.add(p.id);
                    uniqueBench.push(p);
                }
            });
            cloned[benchIndex] = uniqueBench;
            return changed ? cloned : prevTeams;
        });
    }, [benchPreferenceIds, step, numberOfTeams]);

    const handlePlayerToggle = (playerId) => {
        setSelectedPlayerIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(playerId)) newSet.delete(playerId);
            else newSet.add(playerId);
            return newSet;
        });
    };

    const handleProceedToSetup = () => {
        const available = players.filter(p => selectedPlayerIds.has(p.id));
        if (available.length < 2) {
            alert(`Você precisa de pelo menos 2 jogadores selecionados.`);
            return;
        }
        const totalTeams = Math.max(2, Number(numberOfTeams) || 2);
        setNumberOfTeams(totalTeams);
        setBenchPreferenceIds(prev => new Set(Array.from(prev).filter(id => selectedPlayerIds.has(id))));
        if (setupMode === 'auto') {
            handleAutoDrawTeams(available, totalTeams);
        } else {
            setAvailablePlayersForSetup([...available].sort((a,b) => a.name.localeCompare(b.name)));
            setAllTeams(Array.from({ length: totalTeams }, () => []));
            setStep('manual_setup');
        }
    };

    const handleAutoDrawTeams = (availablePlayers, totalTeams = numberOfTeams) => {
        const targetTeams = Math.max(2, Number(totalTeams) || 2);
        const finalTeams = autoBuildTeams({
            players: availablePlayers,
            numberOfTeams: targetTeams,
            playersPerTeam,
            drawType
        });
        finishSessionSetup(finalTeams, availablePlayers);
    };

    const handleConfirmManualTeams = () => {
        if (allTeams.some(team => team.length === 0)) {
            alert("Todos os times precisam ter pelo menos um jogador.");
            return;
        }
        const available = players.filter(p => selectedPlayerIds.has(p.id));
        finishSessionSetup(allTeams, available);
    };

    const handleAddFromBenchToTeam = (player, teamKey) => {
        if (!player || !teamKey) return;
        setAllTeams(prevTeams => {
            const newTeams = deepClone(prevTeams && prevTeams.length > 0 ? prevTeams : [[], []]);
            const letter = String(teamKey).toUpperCase();
            const targetIndex = Math.max(0, (letter.charCodeAt(0) - 65) | 0);
            // Remove from any team if present
            newTeams.forEach((team, i) => {
                if (!Array.isArray(team)) return;
                const idx = team.findIndex(p => p?.id === player.id);
                if (idx >= 0) newTeams[i].splice(idx, 1);
            });
            while (newTeams.length <= targetIndex) newTeams.push([]);
            newTeams[targetIndex].push(player);
            return newTeams;
        });
    };

    const handleToggleEditMode = (value) => setIsEditModeActive(value);
    const handleToggleBenchPanel = () => setShowBenchPanel(v => !v);
    const handleBenchPreferenceSave = (idsSet) => {
        setBenchPreferenceIds(new Set(idsSet || []));
    };
    const handleBackToConfig = () => {
        try { localStorage.removeItem(sessionStateKey); } catch {}
        setIsEditModeActive(false);
        setAllTeams([]);
        setMatchHistory([]);
        setSessionPlayerStats({});
        setWinnerStreak({ teamId: null, count: 0 });
        setStep('config');
    };

    const finishSessionSetup = (finalTeams, availablePlayers) => {
        if (finalTeams.length < 2) {
            alert("Não foi possível formar pelo menos 2 times completos.");
            return;
        }
        const initialStats = {};
        availablePlayers.forEach(p => {
            initialStats[p.id] = {
                name: p.name,
                wins: 0,
                draws: 0,
                losses: 0,
                goals: 0,
                ownGoals: 0,
                assists: 0,
                dribbles: 0,
                tackles: 0,
                saves: 0,
                failures: 0,
            };
        });
        setSessionPlayerStats(initialStats);
        setAllTeams(finalTeams);
        setMatchHistory([]);
        setStep('pre_game');
    };
    
    const handleSingleMatchEnd = async (matchResult) => {
        if (endingMatchRef.current || step !== 'in_game') return;
        endingMatchRef.current = true;
        setIsEditModeActive(false);
        if (!matchResult || !matchResult.teams) {
            console.error("Resultado da partida inválido recebido:", matchResult);
            endingMatchRef.current = false;
            return;
        }
        let savedMatch;
        try {
            savedMatch = await onMatchEnd(matchResult);
        } catch (e) {
            console.error('Falha ao salvar partida externamente:', e);
            alert(t('Nao foi possivel salvar esta partida na nuvem. Ela ficara apenas nesta sessao ate que a conexao seja restabelecida.'));
        }
        if (!savedMatch) {
            const fallbackMatch = { ...matchResult, id: String(Date.now()), endedAt: new Date().toISOString() };
            setMatchHistory(prev => [...prev, fallbackMatch]);
        }
        setSessionPlayerStats(prevStats => {
            const newStats = deepClone(prevStats);
            const baseEntry = (name) => ({
                name: name || 'Desconhecido',
                wins: 0,
                draws: 0,
                losses: 0,
                goals: 0,
                ownGoals: 0,
                assists: 0,
                dribbles: 0,
                tackles: 0,
                saves: 0,
                failures: 0,
            });
            const ensureEntry = (player) => {
                if (!player?.id) return null;
                if (!newStats[player.id]) {
                    newStats[player.id] = baseEntry(player.name);
                } else if (player.name && (!newStats[player.id].name || newStats[player.id].name === 'Desconhecido')) {
                    newStats[player.id].name = player.name;
                }
                return newStats[player.id];
            };
            const { teamA = [], teamB = [] } = matchResult.teams;
            [...teamA, ...teamB].forEach(ensureEntry);

            const findPlayerName = (playerId) => {
                const found = [...teamA, ...teamB].find(p => p?.id === playerId);
                return found?.name || 'Desconhecido';
            };

            if (matchResult.playerStats && typeof matchResult.playerStats === 'object') {
                Object.entries(matchResult.playerStats).forEach(([playerId, statMap]) => {
                    if (!playerId) return;
                    if (!newStats[playerId]) newStats[playerId] = baseEntry(findPlayerName(playerId));
                    const target = newStats[playerId];
                    Object.entries(statMap || {}).forEach(([statKey, value]) => {
                        const prevVal = Number(target[statKey] || 0);
                        const addVal = Number(value || 0);
                        target[statKey] = prevVal + addVal;
                    });
                });
            }

            if (matchResult.score.teamA === matchResult.score.teamB) {
                teamA.forEach(p => {
                    const entry = ensureEntry(p);
                    if (entry) entry.draws = Number(entry.draws || 0) + 1;
                });
                teamB.forEach(p => {
                    const entry = ensureEntry(p);
                    if (entry) entry.draws = Number(entry.draws || 0) + 1;
                });
            } else {
                const winnerTeam = matchResult.score.teamA > matchResult.score.teamB ? teamA : teamB;
                const loserTeam = winnerTeam === teamA ? teamB : teamA;
                winnerTeam.forEach(p => {
                    const entry = ensureEntry(p);
                    if (entry) entry.wins = Number(entry.wins || 0) + 1;
                });
                loserTeam.forEach(p => {
                    const entry = ensureEntry(p);
                    if (entry) entry.losses = Number(entry.losses || 0) + 1;
                });
            }
            return newStats;
        });
        
        const { teamA, teamB } = matchResult.teams;
        // Dynamic bench index after fixed teams
        const benchIndex = Math.max(2, Number(numberOfTeams) || 2);
        const bench = allTeams[benchIndex] || [];
        // Build the queue as: fixed remaining (after A/B) + after-bench queue
        const fixedRemainder = allTeams.slice(2, benchIndex);
        const tailQueue = allTeams.slice(benchIndex + 1);
        const queue = [...fixedRemainder, ...tailQueue];
        const winnerTeam = matchResult.score.teamA >= matchResult.score.teamB ? teamA : teamB;
        const loserTeam = winnerTeam === teamA ? teamB : teamA;
        const getTeamId = (team) => team.map(p => p?.id).sort().join('-');
        const sanitizeQueue = (list, playingA, playingB) => {
            const playingKeys = new Set([getTeamId(playingA), getTeamId(playingB)]);
            const seen = new Set();
            return list.filter(team => {
                if (!Array.isArray(team) || team.length === 0) return false;
                const id = getTeamId(team);
                if (!id || playingKeys.has(id) || seen.has(id)) return false;
                seen.add(id);
                return true;
            });
        };
        const winnerId = getTeamId(winnerTeam);
        let currentStreak = (winnerId === winnerStreak.teamId) ? winnerStreak.count + 1 : 1;
        const hasWaitingTeams = queue.length > 0;

        // Helper to rebuild allTeams with bench positioned at benchIndex and fixed slots count respected
        const rebuildWithQueue = (newA, newB, updatedQueue) => {
            const fixedSlotsAfterAB = Math.max(0, benchIndex - 2);
            const front = updatedQueue.slice(0, fixedSlotsAfterAB);
            const rest = updatedQueue.slice(fixedSlotsAfterAB);
            return [newA, newB, ...front, bench, ...rest].filter(Array.isArray);
        };

        // Se não há times na fila, apenas mantém winner vs loser e não cria duplicados
        if (!hasWaitingTeams) {
            setAllTeams(rebuildWithQueue(winnerTeam, loserTeam, []));
            setWinnerStreak(matchResult.score.teamA === matchResult.score.teamB ? { teamId: null, count: 0 } : { teamId: winnerId, count: currentStreak });
            setStep('post_game');
            return;
        }

        if (matchResult.score.teamA === matchResult.score.teamB) {
            if (tieBreakerRule === 'bothExit') {
                const nextTeams = queue.splice(0, 2);
                const nextA = nextTeams[0] || teamA;
                const nextB = nextTeams[1] || teamB;
                const updatedQueue = sanitizeQueue([...queue, teamA, teamB], nextA, nextB);
                setAllTeams(rebuildWithQueue(nextA, nextB, updatedQueue));
                setWinnerStreak({ teamId: null, count: 0 });
            } else if (tieBreakerRule === 'challengerStaysOnDraw') {
                const nextChallenger = queue.shift();
                const nextA = teamB;
                const nextB = nextChallenger || teamA;
                const updatedQueue = sanitizeQueue([...queue, teamA], nextA, nextB);
                setAllTeams(rebuildWithQueue(nextA, nextB, updatedQueue));
                setWinnerStreak({ teamId: getTeamId(teamB), count: 1 });
            } else {
                const nextChallenger = queue.shift();
                const nextA = teamA;
                const nextB = nextChallenger || teamB;
                const updatedQueue = sanitizeQueue([...queue, teamB], nextA, nextB);
                setAllTeams(rebuildWithQueue(nextA, nextB, updatedQueue));
            }
        } else if (streakLimit > 0 && currentStreak >= streakLimit) {
            const nextTeams = queue.splice(0, 2);
            const nextA = nextTeams[0] || winnerTeam;
            const nextB = nextTeams[1] || loserTeam;
            const updatedQueue = sanitizeQueue([...queue, winnerTeam, loserTeam], nextA, nextB);
            setAllTeams(rebuildWithQueue(nextA, nextB, updatedQueue));
            setWinnerStreak({ teamId: null, count: 0 });
        } else {
            const nextChallenger = queue.length > 0 ? queue.shift() : null;
            const nextA = winnerTeam;
            const nextB = nextChallenger || loserTeam;
            const updatedQueue = sanitizeQueue([...queue, loserTeam], nextA, nextB);
            setAllTeams(rebuildWithQueue(nextA, nextB, updatedQueue));
            setWinnerStreak({ teamId: winnerId, count: currentStreak });
        }
        setStep('post_game');
        endingMatchRef.current = false;
    };

    const handleForceEndSession = () => {
        const sessionData = {
            groupId,
            players: Array.from(selectedPlayerIds),
            matches: matchHistory,
            matchIds: matchHistory.map(m => m.id).filter(Boolean),
            stats: sessionPlayerStats,
            endedAt: new Date().toISOString(),
        };
        try { onSessionEnd(sessionData); } catch (e) { console.error('Falha ao encerrar sessão:', e); }
        localStorage.removeItem(sessionStateKey);
        localStorage.removeItem(localStorageKey);
        try { localStorage.removeItem(`liveMatchState-${groupId}`); } catch {}
        setStep('config');
    };

    const handleStartNextMatch = () => {
        try { localStorage.removeItem(`liveMatchState-${groupId}`); } catch {}
        setStep('in_game');
    };
    
    const handleMovePlayer = (playerToMove, fromTeamIndex, toTeamIndex) => {
        setAllTeams(currentTeams => {
            const newTeams = deepClone(currentTeams.map(t => t || []));
            const fromTeam = newTeams[fromTeamIndex];
            const toTeam = newTeams[toTeamIndex];
            if (!fromTeam) return currentTeams;
            const playerIndex = fromTeam.findIndex(p => p.id === playerToMove.id);
            if (playerIndex === -1) return currentTeams;
            const [player] = fromTeam.splice(playerIndex, 1);
            if (toTeam) toTeam.push(player);
            else newTeams[toTeamIndex] = [player];
            // Preserve empty teams to keep fixed number of teams
            return newTeams;
        });
    };

    const handleRemovePlayer = (playerToRemove, fromTeamIndex) => {
        setAllTeams(currentTeams => {
            let newTeams = deepClone(currentTeams);
            const fromTeam = newTeams[fromTeamIndex];
            if (!fromTeam) return currentTeams;
            const updatedTeam = fromTeam.filter(p => p.id !== playerToRemove.id);
            newTeams[fromTeamIndex] = updatedTeam;
            // Preserve empty teams to keep fixed number of teams
            return newTeams;
        });
    };

    const handleSetPlayingTeam = (teamRole, indexToSet) => {
        setAllTeams(currentTeams => {
            const newTeams = [...currentTeams];
            const targetIndex = teamRole === 'A' ? 0 : 1;
            [newTeams[targetIndex], newTeams[indexToSet]] = [newTeams[indexToSet], newTeams[targetIndex]];
            return newTeams;
        });
    };

    const handleReorderQueue = (indexInWaitingQueue, direction) => {
        setAllTeams(currentTeams => {
            const benchIndex = Math.max(2, Number(numberOfTeams) || 2);
            const isPostGame = step === 'post_game';
            if (!isPostGame) {
                // Pre-game: waiting teams are from index 2 onward
                const waiting = currentTeams.slice(2);
                if (direction === 'up' && indexInWaitingQueue > 0) [waiting[indexInWaitingQueue], waiting[indexInWaitingQueue - 1]] = [waiting[indexInWaitingQueue - 1], waiting[indexInWaitingQueue]];
                else if (direction === 'down' && indexInWaitingQueue < waiting.length - 1) [waiting[indexInWaitingQueue], waiting[indexInWaitingQueue + 1]] = [waiting[indexInWaitingQueue + 1], waiting[indexInWaitingQueue]];
                return [currentTeams[0], currentTeams[1], ...waiting];
            }
            // Post-game: queue is teams between A/B and bench, plus after-bench
            const fixedRemainder = currentTeams.slice(2, benchIndex);
            const tail = currentTeams.slice(benchIndex + 1);
            const queue = [...fixedRemainder, ...tail];
            if (direction === 'up' && indexInWaitingQueue > 0) [queue[indexInWaitingQueue], queue[indexInWaitingQueue - 1]] = [queue[indexInWaitingQueue - 1], queue[indexInWaitingQueue]];
            else if (direction === 'down' && indexInWaitingQueue < queue.length - 1) [queue[indexInWaitingQueue], queue[indexInWaitingQueue + 1]] = [queue[indexInWaitingQueue + 1], queue[indexInWaitingQueue]];
            const frontCount = Math.max(0, benchIndex - 2);
            const front = queue.slice(0, frontCount);
            const rest = queue.slice(frontCount);
            return [currentTeams[0], currentTeams[1], ...front, currentTeams[benchIndex] || [], ...rest];
        });
    };
    
    const renderTeamCard = (team, teamIndex) => {
        const teamLetter = String.fromCharCode(65 + teamIndex);
        let teamLabel = `Time ${teamLetter}`;
        return (
            <div className="bg-gray-800 p-4 rounded-lg w-full min-w-[280px]">
                <h3 className="text-indigo-300 font-bold text-xl mb-3">{teamLabel}</h3>
                <ul className="space-y-2">
                    {team.filter(p => p).map(p => {
                        const avatar = p.photoURL || p.avatarURL || null;
                        const initials = p.name ? p.name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase() : '?';
                        return (
                            <li key={p.id} className="bg-gray-900 p-2 rounded flex justify-between items-center text-white">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center text-xs font-bold">
                                        {avatar ? (
                                            <img src={avatar} alt={p.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <span>{initials}</span>
                                        )}
                                    </div>
                                    <span className="truncate">{p.name}</span>
                                </div>
                                {isEditModeActive && (
                                    <div className="flex items-center gap-2">
                                        <select value={teamIndex} onChange={(e) => handleMovePlayer(p, teamIndex, parseInt(e.target.value))} className="bg-gray-700 text-white text-xs rounded p-1 border-0">
                                            {allTeams.map((_, i) => (<option key={i} value={i}>Time {String.fromCharCode(65 + i)}</option>))}
                                        </select>
                                        <button onClick={() => handleRemovePlayer(p, teamIndex)} className="text-red-500 hover:text-red-400 p-1"><LucideX size={14} /></button>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
                {isEditModeActive && teamIndex > 1 && (
                    <div className="flex justify-center gap-2 mt-3">
                        <button onClick={() => handleSetPlayingTeam('A', teamIndex)} className="text-xs bg-gray-700 hover:bg-indigo-400 hover:text-black py-1 px-2 rounded">Definir como Time A</button>
                        <button onClick={() => handleSetPlayingTeam('B', teamIndex)} className="text-xs bg-gray-700 hover:bg-indigo-400 hover:text-black py-1 px-2 rounded">Definir como Time B</button>
                    </div>
                )}
            </div>
        );
    };
    
    if (step === 'in_game') {
        return <ActiveMatch 
            teams={allTeams}
            numberOfTeams={numberOfTeams}
            onMatchEnd={handleSingleMatchEnd}
            onTeamsChange={setAllTeams}
            groupId={groupId}
            initialDurationSec={Math.max(1, Number(matchDurationMin) || 10) * 60}
            onCreatePlayer={onCreatePlayer}
            t={t}
        />
    }

    if (step === 'manual_setup') {
        return (
            <ManualSetupView
                availablePlayersForSetup={availablePlayersForSetup}
                numberOfTeams={numberOfTeams}
                playersPerTeam={playersPerTeam}
                teams={allTeams}
                onChangeTeams={setAllTeams}
                onConfirm={handleConfirmManualTeams}
                t={t}
            />
        );
    }

    if (step === 'pre_game' || step === 'post_game') {
        const teamA = allTeams[0] || [];
        const teamB = allTeams[1] || [];
        const benchIndex = Math.max(2, Number(numberOfTeams) || 2);
        const waitingTeams = (step === 'post_game')
            ? [...allTeams.slice(2, benchIndex), ...allTeams.slice(benchIndex + 1)]
            : allTeams.slice(2);
        const assignedIds = new Set(allTeams.flat().filter(Boolean).map(p => p.id));
        const benchPlayers = (players || []).filter(p => p && selectedPlayerIds.has(p.id) && !assignedIds.has(p.id));

        const sessionPlayers = (players || []).filter(p => p && selectedPlayerIds.has(p.id));
        return (
            <>
                <PrePostGameView
                    step={step}
                    teamA={teamA}
                    teamB={teamB}
                    allTeams={allTeams}
                    benchIndex={benchIndex}
                    benchPlayers={benchPlayers}
                    benchPreferenceIds={benchPreferenceIds}
                    waitingTeams={waitingTeams}
                    matchHistory={matchHistory}
                    isEditModeActive={isEditModeActive}
                    showBenchPanel={showBenchPanel}
                    onToggleEditMode={handleToggleEditMode}
                    onToggleBenchPanel={handleToggleBenchPanel}
                    onOpenBenchConfig={() => setIsBenchConfigOpen(true)}
                    onAddFromBenchToTeam={handleAddFromBenchToTeam}
                    onReorderQueue={handleReorderQueue}
                    onStartNextMatch={handleStartNextMatch}
                    onForceEndSession={handleForceEndSession}
                    onBackToConfig={handleBackToConfig}
                    onCreatePlayer={onCreatePlayer}
                    renderTeamCard={renderTeamCard}
                    t={t}
                />
                <BenchConfigModal
                    isOpen={isBenchConfigOpen}
                    onClose={() => setIsBenchConfigOpen(false)}
                    players={sessionPlayers}
                    benchIds={benchPreferenceIds}
                    onSave={handleBenchPreferenceSave}
                    t={t}
                />
            </>
        );
    }
    return (
        <MatchConfigView
            players={players}
            selectedPlayerIds={selectedPlayerIds}
            setupMode={setupMode}
            onSetupModeChange={setSetupMode}
            numberOfTeams={numberOfTeams}
            onChangeNumberOfTeams={setNumberOfTeams}
            drawType={drawType}
            onChangeDrawType={setDrawType}
            matchDurationMin={matchDurationMin}
            onChangeMatchDuration={setMatchDurationMin}
            playersPerTeam={playersPerTeam}
            onChangePlayersPerTeam={setPlayersPerTeam}
            onTogglePlayer={handlePlayerToggle}
            onProceed={handleProceedToSetup}
            t={t}
        />
    );
}

export default MatchFlow;

