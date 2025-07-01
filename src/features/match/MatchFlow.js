import React, { useState, useEffect } from 'react';
import { LucideEdit, LucideShieldCheck, LucideUndo, LucideX } from 'lucide-react';
import { calculateOverall } from '../../utils/helpers';
import LiveMatchTracker from './LiveMatchTracker';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../../services/firebase';


const MatchFlow = ({ players, groupId, onMatchEnd, onSessionEnd }) => {
    const localStorageKey = `reiDaPeladaConfig-${groupId}`;
    // --- Estados ---
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
            }
        } catch (error) {
            console.error("Erro ao carregar configuração do localStorage:", error);
        }
    }, [localStorageKey]);

    useEffect(() => {
        if (step === 'config') {
            try {
                const configToSave = {
                    selectedPlayerIds: Array.from(selectedPlayerIds),
                    numberOfTeams,
                    drawType,
                    streakLimit,
                    tieBreakerRule
                };
                localStorage.setItem(localStorageKey, JSON.stringify(configToSave));
            } catch (error) {
                console.error("Erro ao salvar configuração no localStorage:", error);
            }
        }
    }, [selectedPlayerIds, numberOfTeams, drawType, streakLimit, tieBreakerRule, localStorageKey, step]);


    const handlePlayerToggle = (playerId) => {
        setSelectedPlayerIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(playerId)) newSet.delete(playerId);
            else newSet.add(playerId);
            return newSet;
        });
    };

    const handleStartSession = () => {
        setIsEditModeActive(false);
        setWinnerStreak({ teamId: null, count: 0 });
        localStorage.removeItem(localStorageKey);

        const availablePlayers = players.filter(p => selectedPlayerIds.has(p.id)).map(p => {
            let overall;
            if (drawType === 'admin' && p.adminOverall) overall = calculateOverall(p.adminOverall);
            else if (drawType === 'peer' && p.peerOverall) overall = calculateOverall(p.peerOverall.avgSkills);
            else overall = calculateOverall(p.selfOverall);
            return { ...p, overall };
        });
        const playersPerTeamDynamic = Math.floor(availablePlayers.length / numberOfTeams);
        if (availablePlayers.length < 2 || playersPerTeamDynamic === 0) {
            alert("Jogadores insuficientes para formar pelo menos 2 times.");
            return;
        }
        const posOrder = { 'Goleiro': 1, 'Defensor': 2, 'Volante': 3, 'Meio-Campo': 4, 'Ponta': 5, 'Atacante': 6 };
        availablePlayers.sort((a, b) => (posOrder[a.detailedPosition] || 99) - (posOrder[b.detailedPosition] || 99) || b.overall - a.overall);
        
        let teams = Array.from({ length: numberOfTeams }, () => ({ players: [], totalOverall: 0 }));
        
        availablePlayers.forEach(player => {
            teams.sort((a, b) => a.totalOverall - b.totalOverall);
            const targetTeam = teams[0];
            if (targetTeam) {
                targetTeam.players.push(player);
                targetTeam.totalOverall += player.overall;
            }
        });

        const finalTeams = teams.filter(t => t.players.length > 0);
        if (finalTeams.length < 2) {
            alert("Não foi possível formar pelo menos 2 times completos.");
            return;
        }
        const initialStats = {};
        availablePlayers.forEach(p => {
            initialStats[p.id] = { name: p.name, wins: 0, draws: 0, losses: 0, goals: 0, assists: 0, tackles: 0, saves: 0, failures: 0 };
        });
        setSessionPlayerStats(initialStats);
        setAllTeams(finalTeams.map(t => t.players));
        setMatchHistory([]);
        setStep('pre_game');
    };
    
    const handleSingleMatchEnd = async (matchResult) => {
        setIsEditModeActive(false);
        const savedMatch = await onMatchEnd(matchResult);
        setMatchHistory(prev => [...prev, { ...matchResult, id: savedMatch?.id }]);

        setSessionPlayerStats(prevStats => {
            const newStats = JSON.parse(JSON.stringify(prevStats));
            for (const playerId in matchResult.playerStats) {
                if (newStats[playerId]) {
                    for (const stat in matchResult.playerStats[playerId]) {
                        newStats[playerId][stat] = (newStats[playerId][stat] || 0) + matchResult.playerStats[playerId][stat];
                    }
                }
            }
            return newStats;
        });
        
        const { teamA, teamB } = matchResult.teams;
        const remainingTeams = allTeams.slice(2);
        
        const updatePlayerRecords = (team, result) => {
            setSessionPlayerStats(prevStats => {
                const newStats = JSON.parse(JSON.stringify(prevStats));
                team.forEach(player => {
                    if (newStats[player.id]) {
                        newStats[player.id][result]++;
                    }
                });
                return newStats;
            });
        };

        if (matchResult.score.teamA === matchResult.score.teamB) {
            updatePlayerRecords(teamA, 'draws');
            updatePlayerRecords(teamB, 'draws');
            if (tieBreakerRule === 'bothExit') {
                const nextTeams = remainingTeams.splice(0, 2);
                const newQueue = [...remainingTeams, teamA, teamB];
                setAllTeams([...nextTeams, ...newQueue].filter(Boolean));
                setWinnerStreak({ teamId: null, count: 0 });
                setStep('post_game');
                return;
            }
        }
        
        const winnerTeam = matchResult.score.teamA >= matchResult.score.teamB ? teamA : teamB;
        const loserTeam = winnerTeam === teamA ? teamB : teamA;
        updatePlayerRecords(winnerTeam, 'wins');
        updatePlayerRecords(loserTeam, 'losses');

        const getTeamId = (team) => team.map(p => p.id).sort().join('-');
        const winnerId = getTeamId(winnerTeam);
        let currentStreak = (winnerId === winnerStreak.teamId) ? winnerStreak.count + 1 : 1;
        
        if (streakLimit > 0 && currentStreak >= streakLimit) {
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

    const handleMovePlayer = (playerToMove, fromTeamIndex, toTeamIndex) => {
        setAllTeams(currentTeams => {
            const newTeams = JSON.parse(JSON.stringify(currentTeams.map(t => t || [])));
            const fromTeam = newTeams[fromTeamIndex];
            const toTeam = newTeams[toTeamIndex];
            if (!fromTeam) return currentTeams;
            const playerIndex = fromTeam.findIndex(p => p.id === playerToMove.id);
            if (playerIndex === -1) return currentTeams;
            const [player] = fromTeam.splice(playerIndex, 1);
            if (toTeam) {
                toTeam.push(player);
            } else {
                newTeams[toTeamIndex] = [player];
            }
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
            const actualIndex = indexInWaitingQueue;
            if (direction === 'up' && actualIndex > 0) {
                [waitingTeams[actualIndex], waitingTeams[actualIndex - 1]] = [waitingTeams[actualIndex - 1], waitingTeams[actualIndex]];
            } else if (direction === 'down' && actualIndex < waitingTeams.length - 1) {
                [waitingTeams[actualIndex], waitingTeams[actualIndex + 1]] = [waitingTeams[actualIndex + 1], waitingTeams[actualIndex]];
            }
            return [currentTeams[0], currentTeams[1], ...waitingTeams];
        });
    };

    const handleForceEndSession = async () => {
        if (!groupId) {
            alert("Erro: ID do grupo não encontrado para salvar a sessão.");
            return;
        }
        try {
            const sessionData = {
                date: serverTimestamp(),
                players: Object.keys(sessionPlayerStats),
                finalStats: sessionPlayerStats,
            };
            const sessionsColRef = collection(db, `artifacts/${appId}/public/data/groups/${groupId}/sessions`);
            await addDoc(sessionsColRef, sessionData);
            onSessionEnd();
            setStep('session_report');
        } catch (error) {
            console.error("Erro ao salvar a sessão:", error);
            alert("Ocorreu um erro ao salvar a sessão. Verifique o console.");
        }
    };
    
    const renderTeamCard = (team, teamIndex) => {
        const teamLetter = String.fromCharCode(65 + teamIndex);
        let teamLabel = `Time ${teamLetter}`;
        if (step !== 'pre_game') {
             if (teamIndex === 0) teamLabel = `Time ${teamLetter} (Em quadra)`;
             if (teamIndex === 1) teamLabel = `Time ${teamLetter} (Desafiante)`;
        } else {
             if (teamIndex === 0) teamLabel = `Time A`;
             if (teamIndex === 1) teamLabel = `Time B`;
        }

        return (
            <div className="bg-gray-800 p-4 rounded-lg w-full min-w-[280px]">
                <h3 className="text-yellow-400 font-bold text-xl mb-3">{teamLabel}</h3>
                <ul className="space-y-2">
                    {team.map(p => (
                        <li key={p.id} className="bg-gray-900 p-2 rounded flex justify-between items-center text-white">
                            <span>{p.name}</span>
                            {isEditModeActive && (
                                <div className="flex items-center gap-2">
                                    <select 
                                        value={teamIndex}
                                        onChange={(e) => handleMovePlayer(p, teamIndex, parseInt(e.target.value))}
                                        className="bg-gray-700 text-white text-xs rounded p-1 border-0"
                                    >
                                        {allTeams.map((_, i) => (
                                            <option key={i} value={i}>
                                                Time {String.fromCharCode(65 + i)}
                                            </option>
                                        ))}
                                    </select>
                                    <button onClick={() => handleRemovePlayer(p, teamIndex)} className="text-red-500 hover:text-red-400 p-1">
                                        <LucideX className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
                {isEditModeActive && teamIndex > 1 && (
                    <div className="flex justify-center gap-2 mt-3">
                        <button onClick={() => handleSetPlayingTeam('A', teamIndex)} className="text-xs bg-gray-700 hover:bg-yellow-500 hover:text-black py-1 px-2 rounded">Definir como Time A</button>
                        <button onClick={() => handleSetPlayingTeam('B', teamIndex)} className="text-xs bg-gray-700 hover:bg-yellow-500 hover:text-black py-1 px-2 rounded">Definir como Time B</button>
                    </div>
                )}
            </div>
        );
    };

    if (step === 'in_game') {
        return <LiveMatchTracker teams={{ teamA: allTeams[0], teamB: allTeams[1] }} onEndMatch={handleSingleMatchEnd} durationInMinutes={10} />;
    }

    if (step === 'session_report') {
        const sortedStats = Object.values(sessionPlayerStats).sort((a, b) => b.wins - a.wins || b.goals - a.goals);
        return (
            <div className="bg-gray-900/50 rounded-2xl p-4 sm:p-8 text-white">
                <h2 className="text-3xl font-bold text-yellow-400 mb-6 text-center">Relatório Final da Pelada</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-gray-800">
                            <tr>
                                <th className="p-3">Jogador</th>
                                <th className="p-3 text-center">V</th>
                                <th className="p-3 text-center">E</th>
                                <th className="p-3 text-center">D</th>
                                <th className="p-3 text-center">Gols</th>
                                <th className="p-3 text-center">Assist.</th>
                                <th className="p-3 text-center">Desarmes</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800/50">
                            {sortedStats.map(player => (
                                <tr key={player.name} className="border-b border-gray-700">
                                    <td className="p-3 font-semibold">{player.name}</td>
                                    <td className="p-3 text-center text-green-400 font-bold">{player.wins}</td>
                                    <td className="p-3 text-center text-gray-400 font-bold">{player.draws}</td>
                                    <td className="p-3 text-center text-red-400 font-bold">{player.losses}</td>
                                    <td className="p-3 text-center">{player.goals}</td>
                                    <td className="p-3 text-center">{player.assists}</td>
                                    <td className="p-3 text-center">{player.tackles}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="text-center mt-8">
                    <button onClick={() => { setStep('config'); setAllTeams([]); }} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg">
                        Nova Sessão de Jogos
                    </button>
                </div>
            </div>
        );
    }
    
    if (step === 'pre_game' || step === 'post_game') {
        const teamA = allTeams[0];
        const teamB = allTeams[1];
        const waitingTeams = allTeams.slice(2);
        return (
            <div className="text-center bg-gray-900/50 rounded-2xl p-4 sm:p-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-yellow-400 mb-2">
                    {isEditModeActive ? 'Modo de Edição' : step === 'post_game' ? `Fim da Partida ${matchHistory.length}` : `Prontos para Começar!`}
                </h2>
                <p className="text-gray-400 mb-6">{isEditModeActive ? 'Organize os jogadores e os próximos times. Clique em Salvar ao terminar.' : 'Visualize os times ou inicie a próxima partida.'}</p>
                
                <div className="flex justify-center gap-4 mb-6">
                    {!isEditModeActive ? (
                        <button onClick={() => setIsEditModeActive(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2">
                            <LucideEdit className="w-4 h-4"/>Editar Partida
                        </button>
                    ) : (
                        <button onClick={() => setIsEditModeActive(false)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2">
                            <LucideShieldCheck className="w-4 h-4"/>Salvar Alterações
                        </button>
                    )}
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-6 justify-center items-start">
                    {teamA && renderTeamCard(teamA, 0)}
                    <div className="flex items-center justify-center h-full text-2xl font-bold text-gray-500 p-4">VS</div>
                    {teamB ? renderTeamCard(teamB, 1) : <div className="bg-gray-800 p-4 rounded-lg w-full min-w-[280px] flex items-center justify-center"><h3 className="text-yellow-400 font-bold text-xl">Sem desafiantes</h3></div>}
                </div>
                
                {waitingTeams.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-gray-400 mb-4">Times na Fila</h3>
                        <div className="flex flex-wrap gap-4 justify-center">
                            {waitingTeams.map((team, index) => (
                                <div key={index} className="flex flex-col gap-2 items-center">
                                    {renderTeamCard(team, index + 2)}
                                    {!isEditModeActive && (
                                        <div className="flex gap-2 mt-2">
                                            <button 
                                                onClick={() => handleReorderQueue(index, 'up')} 
                                                disabled={index === 0} 
                                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 text-sm rounded-lg disabled:opacity-50 flex items-center justify-center"
                                                title="Subir na Fila"
                                            >
                                                <LucideUndo className="w-4 h-4 transform rotate-90"/>
                                            </button>
                                            <button 
                                                onClick={() => handleReorderQueue(index, 'down')} 
                                                disabled={index === waitingTeams.length - 1} 
                                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 text-sm rounded-lg disabled:opacity-50 flex items-center justify-center"
                                                title="Descer na Fila"
                                            >
                                                <LucideUndo className="w-4 h-4 transform -rotate-90"/>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!isEditModeActive && (
                    <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8 border-t border-gray-700 pt-6">
                        <button onClick={() => setStep('in_game')} disabled={!teamB} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-8 rounded-lg text-lg disabled:bg-gray-500 disabled:cursor-not-allowed">
                            Começar Próxima Partida
                        </button>
                        <button onClick={handleForceEndSession} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-lg">
                            Encerrar Pelada
                        </button>
                    </div>
                )}
            </div>
        );
    }
    
    return (
        <div className="bg-gray-900/50 rounded-2xl p-4 sm:p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">Configurar Noite de Futebol</h2>
            <fieldset className="border border-gray-700 p-4 rounded-lg mb-6">
                <legend className="px-2 text-yellow-400 font-semibold">Regras da Partida</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block font-semibold mb-2 text-white">Limite de vitórias seguidas:</label>
                        <input 
                            type="number" 
                            min="0"
                            value={streakLimit} 
                            onChange={e => setStreakLimit(Number(e.target.value))} 
                            className="w-full bg-gray-800 p-2 rounded text-white" 
                            title="Deixe 0 para desativar o limite."
                        />
                        <p className="text-xs text-gray-500 mt-1">O time sai após X vitórias. (0 = desativado)</p>
                    </div>
                    <div>
                        <label className="block font-semibold mb-2 text-white">Regra de empate:</label>
                        <select 
                            value={tieBreakerRule} 
                            onChange={e => setTieBreakerRule(e.target.value)} 
                            className="w-full bg-gray-800 p-2 rounded text-white"
                        >
                            <option value="winnerStays">Vencedor anterior fica</option>
                            <option value="bothExit">Ambos os times saem</option>
                        </select>
                    </div>
                </div>
            </fieldset>

            <fieldset className="border border-gray-700 p-4 rounded-lg mb-6">
                 <legend className="px-2 text-yellow-400 font-semibold">Configuração dos Times</legend>
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

            <h3 className="text-xl font-bold text-yellow-400 mb-4">Selecione os Jogadores Presentes</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                {players.map(p => (<button key={p.id} onClick={() => handlePlayerToggle(p.id)} className={`p-3 rounded-lg text-center transition ${selectedPlayerIds.has(p.id) ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-white hover:bg-gray-700'}`}>{p.name}</button>))}
            </div>
            <div className="text-center">
                <button onClick={handleStartSession} disabled={selectedPlayerIds.size < numberOfTeams} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-8 rounded-lg text-lg disabled:bg-gray-500 disabled:cursor-not-allowed">Sortear Times e Iniciar</button>
                {selectedPlayerIds.size < numberOfTeams && <p className="text-red-500 text-sm mt-2">Selecione pelo menos {numberOfTeams} jogadores.</p>}
            </div>
        </div>
    );
};

export default MatchFlow;