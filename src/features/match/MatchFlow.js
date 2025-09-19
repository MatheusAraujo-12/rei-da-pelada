import React, { useState, useEffect } from 'react';
import { LucideEdit, LucideShieldCheck, LucideUndo, LucideX, LucideUsers, LucideShuffle, LucidePlus } from 'lucide-react';
import { calculateOverall } from '../../utils/helpers';
import ActiveMatch from './ActiveMatch';

const MatchFlow = ({ players, groupId, onMatchEnd, onSessionEnd }) => {
    const localStorageKey = `reiDaPeladaConfig-${groupId}`;
    const sessionStateKey = `sessionState-${groupId}`;

    const [step, setStep] = useState('config');
    const [selectedPlayerIds, setSelectedPlayerIds] = useState(new Set());
    const [allTeams, setAllTeams] = useState([]);
    const [matchHistory, setMatchHistory] = useState([]);
    const [sessionPlayerStats, setSessionPlayerStats] = useState({});
    const [numberOfTeams, setNumberOfTeams] = useState(2);
    const [drawType, setDrawType] = useState('self');
    const [isEditModeActive, setIsEditModeActive] = useState(false);
    const [streakLimit, setStreakLimit] = useState(2);
    const [tieBreakerRule, setTieBreakerRule] = useState('winnerStays');
    const [winnerStreak, setWinnerStreak] = useState({ teamId: null, count: 0 });
    const [setupMode, setSetupMode] = useState('auto');
    const [availablePlayersForSetup, setAvailablePlayersForSetup] = useState([]);
    const [matchDurationMin, setMatchDurationMin] = useState(10);
    const [playersPerTeam, setPlayersPerTeam] = useState(0);

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
                selectedPlayerIds: Array.from(selectedPlayerIds)
            };
            localStorage.setItem(sessionStateKey, JSON.stringify(sessionToSave));
        }
        if (step === 'config') {
            const configToSave = {
                selectedPlayerIds: Array.from(selectedPlayerIds),
                numberOfTeams, drawType, streakLimit, tieBreakerRule, setupMode,
                matchDurationMin, playersPerTeam
            };
            localStorage.setItem(localStorageKey, JSON.stringify(configToSave));
        }
    }, [step, allTeams, matchHistory, sessionPlayerStats, winnerStreak, selectedPlayerIds, numberOfTeams, drawType, streakLimit, tieBreakerRule, setupMode, matchDurationMin, playersPerTeam, localStorageKey, sessionStateKey]);

    // Ao entrar no in_game, zera o estado ao vivo para iniciar partida nova
    useEffect(() => {
        if (step === 'in_game') {
            try { localStorage.removeItem(`liveMatchState-${groupId}`); } catch {}
        }
    }, [step, groupId]);

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
        if (setupMode === 'auto') {
            handleAutoDrawTeams(available);
        } else {
            setAvailablePlayersForSetup([...available].sort((a,b) => a.name.localeCompare(b.name)));
            setAllTeams(Array.from({ length: numberOfTeams }, () => []));
            setStep('manual_setup');
        }
    };

    const handleAutoDrawTeams = (availablePlayers) => {
        const playersWithOverall = availablePlayers.map(p => {
            let overall;
            if (drawType === 'admin' && p.adminOverall) overall = calculateOverall(p.adminOverall);
            else if (drawType === 'peer' && p.peerOverall) overall = calculateOverall(p.peerOverall.avgSkills);
            else overall = calculateOverall(p.selfOverall);
            return { ...p, overall };
        });
        const posOrder = { 'Goleiro': 1, 'Defensor': 2, 'Volante': 3, 'Meio-Campo': 4, 'Ponta': 5, 'Atacante': 6 };
        playersWithOverall.sort((a, b) => (posOrder[a.detailedPosition] || 99) - (posOrder[b.detailedPosition] || 99) || b.overall - a.overall);
        if (playersPerTeam && playersPerTeam > 0) {
            const baseTeams = Array.from({ length: numberOfTeams }, () => ({ players: [] }));
            const waitingTeams = [];
            for (const player of playersWithOverall) {
                const spot = baseTeams.find(t => t.players.length < playersPerTeam);
                if (spot) spot.players.push(player);
                else {
                    let last = waitingTeams[waitingTeams.length - 1];
                    if (!last || last.length >= playersPerTeam) {
                        last = [];
                        waitingTeams.push(last);
                    }
                    last.push(player);
                }
            }
            const finalTeams = [
                ...baseTeams.filter(t => t.players.length > 0).map(t => t.players),
                ...waitingTeams.filter(t => t.length > 0)
            ];
            finishSessionSetup(finalTeams, availablePlayers);
        } else {
            let teams = Array.from({ length: numberOfTeams }, () => ({ players: [] }));
            playersWithOverall.forEach(player => {
                teams.sort((a, b) => a.players.length - b.players.length);
                teams[0].players.push(player);
            });
            const finalTeams = teams.filter(t => t.players.length > 0).map(t => t.players);
            finishSessionSetup(finalTeams, availablePlayers);
        }
    };

    const handleAssignPlayer = (playerToAssign, toTeamIndex) => {
        setAvailablePlayersForSetup(prev => prev.filter(p => p.id !== playerToAssign.id));
        setAllTeams(prevTeams => {
            const newTeams = prevTeams.map(team => team.filter(p => p.id !== playerToAssign.id));
            if (playersPerTeam && playersPerTeam > 0 && newTeams[toTeamIndex].length >= playersPerTeam) {
                return prevTeams;
            }
            newTeams[toTeamIndex].push(playerToAssign);
            return newTeams;
        });
    };

    const handleUnassignPlayer = (playerToUnassign, fromTeamIndex) => {
        setAllTeams(prevTeams => {
            const newTeams = [...prevTeams];
            newTeams[fromTeamIndex] = newTeams[fromTeamIndex].filter(p => p.id !== playerToUnassign.id);
            return newTeams;
        });
        setAvailablePlayersForSetup(prev => {
            if (!prev.some(p => p.id === playerToUnassign.id)) {
                return [...prev, playerToUnassign].sort((a, b) => a.name.localeCompare(b.name));
            }
            return prev;
        });
    };

    const handleConfirmManualTeams = () => {
        if (allTeams.some(team => team.length === 0)) {
            alert("Todos os times precisam ter pelo menos um jogador.");
            return;
        }
        const available = players.filter(p => selectedPlayerIds.has(p.id));
        finishSessionSetup(allTeams, available);
    };

    const finishSessionSetup = (finalTeams, availablePlayers) => {
        if (finalTeams.length < 2) {
            alert("Não foi possível formar pelo menos 2 times completos.");
            return;
        }
        const initialStats = {};
        availablePlayers.forEach(p => {
            initialStats[p.id] = { name: p.name, wins: 0, draws: 0, losses: 0, goals: 0, assists: 0, dribbles: 0, tackles: 0, saves: 0, failures: 0 };
        });
        setSessionPlayerStats(initialStats);
        setAllTeams(finalTeams);
        setMatchHistory([]);
        setStep('pre_game');
    };
    
    const handleSingleMatchEnd = async (matchResult) => {
        setIsEditModeActive(false);
        if (!matchResult || !matchResult.teams) {
            console.error("Resultado da partida inválido recebido:", matchResult);
            return;
        }
        let savedMatch;
        try {
            savedMatch = await onMatchEnd(matchResult);
        } catch (e) {
            console.error('Falha ao salvar partida externamente:', e);
        }
        const toStore = savedMatch || { ...matchResult, id: String(Date.now()), endedAt: new Date().toISOString() };
        setMatchHistory(prev => [...prev, toStore]);
        setSessionPlayerStats(prevStats => {
            const newStats = JSON.parse(JSON.stringify(prevStats));
            for (const playerId in matchResult.playerStats) {
                if (newStats[playerId]) {
                    for (const stat in matchResult.playerStats[playerId]) {
                        newStats[playerId][stat] = (newStats[playerId][stat] || 0) + matchResult.playerStats[playerId][stat];
                    }
                }
            }
            const { teamA, teamB } = matchResult.teams;
            if (matchResult.score.teamA === matchResult.score.teamB) {
                teamA.forEach(p => { if(p && newStats[p.id]) newStats[p.id].draws++; });
                teamB.forEach(p => { if(p && newStats[p.id]) newStats[p.id].draws++; });
            } else {
                const winnerTeam = matchResult.score.teamA > matchResult.score.teamB ? teamA : teamB;
                const loserTeam = winnerTeam === teamA ? teamB : teamA;
                winnerTeam.forEach(p => { if(p && newStats[p.id]) newStats[p.id].wins++; });
                loserTeam.forEach(p => { if(p && newStats[p.id]) newStats[p.id].losses++; });
            }
            return newStats;
        });
        
        const { teamA, teamB } = matchResult.teams;
        const remainingTeams = allTeams.slice(2);
        const winnerTeam = matchResult.score.teamA >= matchResult.score.teamB ? teamA : teamB;
        const loserTeam = winnerTeam === teamA ? teamB : teamA;
        const getTeamId = (team) => team.map(p => p?.id).sort().join('-');
        const winnerId = getTeamId(winnerTeam);
        let currentStreak = (winnerId === winnerStreak.teamId) ? winnerStreak.count + 1 : 1;

        if (matchResult.score.teamA === matchResult.score.teamB) {
            if (tieBreakerRule === 'bothExit') {
                const nextTeams = remainingTeams.splice(0, 2);
                const newQueue = [...remainingTeams, teamA, teamB];
                setAllTeams([...nextTeams, ...newQueue].filter(Boolean));
                setWinnerStreak({ teamId: null, count: 0 });
            } else if (tieBreakerRule === 'challengerStaysOnDraw') {
                const nextChallenger = remainingTeams.shift();
                const newQueue = [...remainingTeams, teamA];
                setAllTeams([teamB, ...(nextChallenger ? [nextChallenger] : []), ...newQueue].filter(Boolean));
                setWinnerStreak({ teamId: getTeamId(teamB), count: 1 });
            } else {
                const nextChallenger = remainingTeams.shift();
                const newQueue = [...remainingTeams, teamB];
                setAllTeams([teamA, ...(nextChallenger ? [nextChallenger] : []), ...newQueue].filter(Boolean));
            }
        } else if (streakLimit > 0 && currentStreak >= streakLimit) {
            const nextTeams = remainingTeams.splice(0, 2);
            const newQueue = [...remainingTeams, winnerTeam, loserTeam];
            setAllTeams([...nextTeams, ...newQueue].filter(Boolean));
            setWinnerStreak({ teamId: null, count: 0 });
        } else {
            const nextChallenger = remainingTeams.length > 0 ? remainingTeams.shift() : null;
            const newQueue = [...remainingTeams, loserTeam];
            setAllTeams([winnerTeam, ...(nextChallenger ? [nextChallenger] : []), ...newQueue].filter(Boolean));
            setWinnerStreak({ teamId: winnerId, count: currentStreak });
        }
        setStep('post_game');
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
            const newTeams = JSON.parse(JSON.stringify(currentTeams.map(t => t || [])));
            const fromTeam = newTeams[fromTeamIndex];
            const toTeam = newTeams[toTeamIndex];
            if (!fromTeam) return currentTeams;
            const playerIndex = fromTeam.findIndex(p => p.id === playerToMove.id);
            if (playerIndex === -1) return currentTeams;
            const [player] = fromTeam.splice(playerIndex, 1);
            if (toTeam) toTeam.push(player);
            else newTeams[toTeamIndex] = [player];
            return newTeams.filter(team => team.length > 0);
        });
    };

    const handleRemovePlayer = (playerToRemove, fromTeamIndex) => {
        setAllTeams(currentTeams => {
            let newTeams = JSON.parse(JSON.stringify(currentTeams));
            const fromTeam = newTeams[fromTeamIndex];
            if (!fromTeam) return currentTeams;
            const updatedTeam = fromTeam.filter(p => p.id !== playerToRemove.id);
            newTeams[fromTeamIndex] = updatedTeam;
            return newTeams.filter(team => team.length > 0);
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
            const waitingTeams = currentTeams.slice(2);
            if (direction === 'up' && indexInWaitingQueue > 0) [waitingTeams[indexInWaitingQueue], waitingTeams[indexInWaitingQueue - 1]] = [waitingTeams[indexInWaitingQueue - 1], waitingTeams[indexInWaitingQueue]];
            else if (direction === 'down' && indexInWaitingQueue < waitingTeams.length - 1) [waitingTeams[indexInWaitingQueue], waitingTeams[indexInWaitingQueue + 1]] = [waitingTeams[indexInWaitingQueue + 1], waitingTeams[indexInWaitingQueue]];
            return [currentTeams[0], currentTeams[1], ...waitingTeams];
        });
    };
    
    const renderTeamCard = (team, teamIndex) => {
        const teamLetter = String.fromCharCode(65 + teamIndex);
        let teamLabel = `Time ${teamLetter}`;
        return (
            <div className="bg-gray-800 p-4 rounded-lg w-full min-w-[280px]">
                <h3 className="text-indigo-300 font-bold text-xl mb-3">{teamLabel}</h3>
                <ul className="space-y-2">
                    {team.filter(p => p).map(p => (
                        <li key={p.id} className="bg-gray-900 p-2 rounded flex justify-between items-center text-white">
                            <span>{p.name}</span>
                            {isEditModeActive && (
                                <div className="flex items-center gap-2">
                                    <select value={teamIndex} onChange={(e) => handleMovePlayer(p, teamIndex, parseInt(e.target.value))} className="bg-gray-700 text-white text-xs rounded p-1 border-0">
                                        {allTeams.map((_, i) => (<option key={i} value={i}>Time {String.fromCharCode(65 + i)}</option>))}
                                    </select>
                                    <button onClick={() => handleRemovePlayer(p, teamIndex)} className="text-red-500 hover:text-red-400 p-1"><LucideX size={14} /></button>
                                </div>
                            )}
                        </li>
                    ))}
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
            initialTeams={allTeams}
            onMatchEnd={handleSingleMatchEnd}
            onTeamsUpdate={(updated) => setAllTeams(updated)}
            groupId={groupId}
            initialDurationSec={Math.max(1, Number(matchDurationMin) || 10) * 60}
        />
    }

    if (step === 'pre_game' || step === 'post_game') {
        const teamA = allTeams[0] || [];
        const teamB = allTeams[1] || [];
        const waitingTeams = allTeams.slice(2);
        return (
            <div className="text-center bg-gray-900/50 rounded-2xl p-4 sm:p-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-indigo-300 mb-2">
                    {isEditModeActive ? 'Modo de Edição' : (step === 'post_game' ? 'Fim da Partida' : 'Próxima Partida')}
                </h2>
                <p className="text-gray-400 mb-6">{isEditModeActive ? 'Organize os jogadores e os próximos times.' : 'Visualize os times ou inicie a Próxima partida.'}</p>
                <div className="flex justify-center gap-4 mb-6">
                    {!isEditModeActive ? (<button onClick={() => setIsEditModeActive(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2"><LucideEdit className="w-4 h-4"/>Editar Partida</button>) : (<button onClick={() => setIsEditModeActive(false)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2"><LucideShieldCheck className="w-4 h-4"/>Salvar Alterações</button>)}
                </div>
                <div className="flex flex-col md:flex-row gap-4 mb-6 justify-center items-start">
                    {renderTeamCard(teamA, 0)}
                    <div className="flex items-center justify-center h-full text-2xl font-bold text-gray-500 p-4">VS</div>
                    {teamB.length > 0 ? renderTeamCard(teamB, 1) : <div className="bg-gray-800 p-4 rounded-lg w-full min-w-[280px] flex items-center justify-center"><h3 className="text-indigo-300 font-bold text-xl">Sem desafiantes</h3></div>}
                </div>
                {waitingTeams.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-gray-400 mb-4">Times na Fila</h3>
                        <div className="flex flex-wrap gap-4 justify-center">
                            {waitingTeams.map((team, index) => (
                                <div key={index} className="flex flex-col gap-2 items-center">
                                    {renderTeamCard(team, index + 2)}
                                    {isEditModeActive && ( // Alterado para isEditModeActive
                                        <div className="flex gap-2 mt-2">
                                            <button onClick={() => handleReorderQueue(index, 'up')} disabled={index === 0} className="bg-gray-700 p-2 rounded-full hover:bg-blue-600 disabled:opacity-50"><LucideUndo className="w-4 h-4 transform rotate-90"/></button>
                                            <button onClick={() => handleReorderQueue(index, 'down')} disabled={index === waitingTeams.length - 1} className="bg-gray-700 p-2 rounded-full hover:bg-blue-600 disabled:opacity-50"><LucideUndo className="w-4 h-4 transform -rotate-90"/></button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8 border-t border-indigo-800 pt-6">
                    <button onClick={handleStartNextMatch} disabled={!teamB || teamB.length === 0} className="bg-indigo-400 hover:bg-indigo-300 text-black font-bold py-3 px-8 rounded-lg text-lg disabled:bg-gray-600 disabled:cursor-not-allowed">Começar Próxima Partida</button>
                    <button onClick={handleForceEndSession} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-lg">Encerrar Pelada</button>
                </div>
            </div>
        );
    }

    if (step === 'manual_setup') {
        return (
            <div className="bg-gray-900/50 rounded-2xl p-4 sm:p-6 border border-indigo-800">
                <h2 className="text-2xl font-bold text-indigo-300 mb-4">Montagem Manual dos Times</h2>
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-1/3 border border-indigo-800 rounded-lg p-4 bg-gray-800/20">
                        <h3 className="font-semibold text-white mb-3">Jogadores Disponíveis ({availablePlayersForSetup.length})</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {availablePlayersForSetup.map(p => (
                                <div key={p.id} className="text-white p-2 bg-gray-800 rounded">{p.name}</div>
                            ))}
                        </div>
                    </div>
                    <div className="w-full md:w-2/3 space-y-4">
                        {allTeams.map((team, teamIndex) => (
                            <div key={teamIndex} className="border border-indigo-800 rounded-lg p-4 min-h-[150px]">
                                <h3 className="font-semibold text-indigo-300 mb-3">Time {String.fromCharCode(65 + teamIndex)}</h3>
                                <div className="space-y-2 mb-3">
                                    {team.map(p => (
                                        <button key={p.id} onClick={() => handleUnassignPlayer(p, teamIndex)} className="w-full text-left p-2 bg-blue-900/50 rounded text-white flex items-center gap-2 hover:bg-red-800" title="Remover do time">
                                            <LucideX size={14}/> {p.name}
                                        </button>
                                    ))}
                                </div>
                                <div className="border-t border-indigo-800 pt-3">
                                    <p className="text-xs text-gray-400 mb-2">Adicionar a este time:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {availablePlayersForSetup.map(p => (
                                            <button key={p.id} onClick={() => handleAssignPlayer(p, teamIndex)} className="text-xs p-1 px-2 bg-gray-700 rounded-full hover:bg-green-600 text-white">
                                                <LucidePlus size={12} className="inline-block"/> {p.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="text-center mt-6">
                    <button onClick={handleConfirmManualTeams} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg">Confirmar Times e Iniciar</button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-gray-900/50 rounded-2xl p-4 sm:p-6 border border-indigo-800">
            <h2 className="text-2xl font-bold text-indigo-300 mb-4">Configurar Noite de Futebol</h2>
            {/* Par�metros extras da partida */}
            <fieldset className="border border-indigo-800 p-4 rounded-lg mb-6">
                <legend className="px-2 text-indigo-300 font-semibold">Parâmetros da Partida</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block font-semibold mb-2 text-gray-200">Duração (minutos):</label>
                        <input type="number" min="1" value={matchDurationMin} onChange={e => setMatchDurationMin(Number(e.target.value))} className="w-full bg-gray-800 p-2 rounded text-white border border-gray-600" />
                    </div>
                    <div>
                        <label className="block font-semibold mb-2 text-gray-200">Jogadores por time (0 = livre):</label>
                        <input type="number" min="0" value={playersPerTeam} onChange={e => setPlayersPerTeam(Number(e.target.value))} className="w-full bg-gray-800 p-2 rounded text-white border border-gray-600" />
                    </div>
                </div>
            </fieldset>
            <fieldset className="border border-indigo-800 p-4 rounded-lg mb-6">
                <legend className="px-2 text-indigo-300 font-semibold">Modo de Montagem</legend>
                <div className="flex gap-4">
                    <button onClick={() => setSetupMode('auto')} className={`flex-1 p-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${setupMode === 'auto' ? 'bg-indigo-400 text-black' : 'bg-gray-800 text-white hover:bg-gray-700'}`}> <LucideShuffle/> Sorteio Automático </button>
                    <button onClick={() => setSetupMode('manual')} className={`flex-1 p-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${setupMode === 'manual' ? 'bg-indigo-400 text-black' : 'bg-gray-800 text-white hover:bg-gray-700'}`}> <LucideUsers/> Montagem Manual </button>
                </div>
            </fieldset>
            {setupMode === 'auto' && (
                <fieldset className="border border-indigo-800 p-4 rounded-lg mb-6">
                    <legend className="px-2 text-indigo-300 font-semibold">Configuração do Sorteio</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block font-semibold mb-2 text-white">Nº de times para sortear:</label>
                            <input type="number" min="2" value={numberOfTeams} onChange={e => setNumberOfTeams(Number(e.target.value))} className="w-full bg-gray-800 p-2 rounded text-white" />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2 text-white">Sorteio baseado em:</label>
                            <select value={drawType} onChange={(e) => setDrawType(e.target.value)} className="w-full bg-gray-800 p-2 rounded text-white">
                               <option value="self">Overall Próprio</option>
                               <option value="peer">Overall da Galera</option>
                               <option value="admin">Overall do Admin</option>
                            </select>
                        </div>
                    </div>
                </fieldset>
            )}
            {setupMode === 'manual' && (
                <fieldset className="border border-indigo-800 p-4 rounded-lg mb-6">
                    <legend className="px-2 text-indigo-300 font-semibold">Configuração Manual</legend>
                    <div>
                        <label className="block font-semibold mb-2 text-white">Nº de times para montar:</label>
                        <input type="number" min="2" value={numberOfTeams} onChange={e => setNumberOfTeams(Number(e.target.value))} className="w-full bg-gray-800 p-2 rounded text-white" />
                    </div>
                </fieldset>
            )}
            <fieldset className="border border-indigo-800 p-4 rounded-lg mb-6">
                <legend className="px-2 text-indigo-300 font-semibold">Regras da Partida</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block font-semibold mb-2 text-gray-200">Limite de vitórias seguidas:</label>
                        <input type="number" min="0" value={streakLimit} onChange={e => setStreakLimit(Number(e.target.value))} className="w-full bg-gray-800 p-2 rounded text-white border border-gray-600" title="Deixe 0 para desativar o limite." />
                        <p className="text-xs text-gray-500 mt-1">O time sai após X vitórias. (0 = desativado)</p>
                    </div>
                    <div>
                        <label className="block font-semibold mb-2 text-gray-200">Regra de empate:</label>
                        <select value={tieBreakerRule} onChange={e => setTieBreakerRule(e.target.value)} className="w-full bg-gray-800 p-2 rounded text-white border border-gray-600">
                            <option value="winnerStays">Vencedor anterior fica</option>
                            <option value="bothExit">Ambos os times saem</option>
                            <option value="challengerStaysOnDraw">Desafiante fica no empate</option>
                        </select>
                    </div>
                </div>
            </fieldset>
            <h3 className="text-xl font-bold text-indigo-300 mb-4">Selecione os Jogadores Presentes</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                {players.map(p => (<button key={p.id} onClick={() => handlePlayerToggle(p.id)} className={`p-3 rounded-lg text-center transition-all duration-200 font-semibold ${selectedPlayerIds.has(p.id) ? 'bg-indigo-400 text-black scale-105 shadow-lg shadow-yellow-500/20' : 'bg-gray-800 text-white hover:bg-gray-700'}`}>{p.name}</button>))}
            </div>
            <div className="text-center">
                <button onClick={handleProceedToSetup} disabled={selectedPlayerIds.size < 2} className="bg-indigo-400 hover:bg-indigo-300 text-black font-bold py-3 px-8 rounded-lg text-lg disabled:bg-gray-600 disabled:cursor-not-allowed">
                    Continuar
                </button>
            </div>
        </div>
    );
};

export default MatchFlow;