import React, { useState, useEffect } from 'react';
import { LucideEdit, LucideShieldCheck, LucideUndo, LucideX, LucideUsers, LucideShuffle, LucidePlus } from 'lucide-react';
import { calculateOverall } from '../../utils/helpers';
import LiveMatchTracker from './LiveMatchTracker';
import SubstitutionModal from './SubstitutionModal';

const MatchFlow = ({ players, groupId, onMatchEnd, onSessionEnd }) => {
    const localStorageKey = `reiDaPeladaConfig-${groupId}`;

    const [step, setStep] = useState('config');
    const [selectedPlayerIds, setSelectedPlayerIds] = useState(new Set());
    const [allTeams, setAllTeams] = useState([]);
    const [matchHistory, setMatchHistory] = useState([]);
    const [numberOfTeams, setNumberOfTeams] = useState(2);
    const [drawType, setDrawType] = useState('self');
    const [isEditModeActive, setIsEditModeActive] = useState(false);
    const [streakLimit, setStreakLimit] = useState(2);
    const [tieBreakerRule, setTieBreakerRule] = useState('winnerStays');
    const [winnerStreak, setWinnerStreak] = useState({ teamId: null, count: 0 });
    const [setupMode, setSetupMode] = useState('auto');
    const [availablePlayersForSetup, setAvailablePlayersForSetup] = useState([]);
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [playerToSubstitute, setPlayerToSubstitute] = useState(null);

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
            }
        } catch (error) { console.error("Erro ao carregar configuração:", error); }
    }, [localStorageKey]);

    useEffect(() => {
        if (step === 'config') {
            try {
                const configToSave = {
                    selectedPlayerIds: Array.from(selectedPlayerIds),
                    numberOfTeams, drawType, streakLimit, tieBreakerRule, setupMode
                };
                localStorage.setItem(localStorageKey, JSON.stringify(configToSave));
            } catch (error) { console.error("Erro ao salvar configuração:", error); }
        }
    }, [selectedPlayerIds, numberOfTeams, drawType, streakLimit, tieBreakerRule, setupMode, localStorageKey, step]);

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
        let teams = Array.from({ length: numberOfTeams }, () => ({ players: [], totalOverall: 0 }));
        playersWithOverall.forEach(player => {
            teams.sort((a, b) => a.totalOverall - b.totalOverall);
            teams[0].players.push(player);
            teams[0].totalOverall += player.overall;
        });
        const finalTeams = teams.filter(t => t.players.length > 0).map(t => t.players);
        finishSessionSetup(finalTeams, availablePlayers);
    };

    const handleAssignPlayer = (playerToAssign, toTeamIndex) => {
        setAvailablePlayersForSetup(prev => prev.filter(p => p.id !== playerToAssign.id));
        setAllTeams(prevTeams => {
            const newTeams = prevTeams.map(team => team.filter(p => p.id !== playerToAssign.id));
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
        setAllTeams(finalTeams);
        setMatchHistory([]);
        setStep('pre_game');
    };
    
    const handleSingleMatchEnd = async (matchResult) => {
        setIsEditModeActive(false);
        const savedMatch = await onMatchEnd(matchResult);
        if(savedMatch) {
            setMatchHistory(prev => [...prev, savedMatch]);
        }
        const { teamA, teamB } = matchResult.teams;
        const remainingTeams = allTeams.slice(2);
        if (matchResult.score.teamA === matchResult.score.teamB) {
            if (tieBreakerRule === 'bothExit') {
                const nextTeams = remainingTeams.splice(0, 2);
                const newQueue = [...remainingTeams, teamA, teamB];
                setAllTeams([...nextTeams, ...newQueue].filter(Boolean));
                setWinnerStreak({ teamId: null, count: 0 });
                setStep('post_game');
                return;
            }
            if (tieBreakerRule === 'challengerStaysOnDraw') {
                const challenger = teamB;
                const previousWinner = teamA;
                const nextChallenger = remainingTeams.shift();
                const newQueue = [...remainingTeams, previousWinner];
                setAllTeams([challenger, ...(nextChallenger ? [nextChallenger] : []), ...newQueue].filter(Boolean));
                setWinnerStreak({ teamId: null, count: 0 });
                setStep('post_game');
                return;
            }
        }
        const winnerTeam = matchResult.score.teamA >= matchResult.score.teamB ? teamA : teamB;
        const loserTeam = winnerTeam === teamA ? teamB : teamA;
        const getTeamId = (team) => team.map(p => p?.id).sort().join('-');
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

    const handleForceEndSession = () => {
        const sessionData = {
            players: Array.from(selectedPlayerIds), // Salva a lista de todos os participantes da sessão
            matchIds: matchHistory.map(match => match.id)
        };
        onSessionEnd(sessionData);
    };
    
    const handleInitiateSubstitution = (player) => {
        setPlayerToSubstitute(player);
        setIsSubModalOpen(true);
    };

    const handleConfirmSubstitution = (playerOut, playerIn) => {
        setAllTeams(currentTeams => {
            const newTeams = JSON.parse(JSON.stringify(currentTeams));
            let posOut, posIn;
            newTeams.forEach((team, tIndex) => {
                if (Array.isArray(team)) {
                    team.forEach((player, pIndex) => {
                        if (player?.id === playerOut.id) posOut = { tIndex, pIndex };
                        if (player?.id === playerIn.id) posIn = { tIndex, pIndex };
                    });
                }
            });
            if (posOut && posIn) {
                const temp = newTeams[posOut.tIndex][posOut.pIndex];
                newTeams[posOut.tIndex][posOut.pIndex] = newTeams[posIn.tIndex][posIn.pIndex];
                newTeams[posIn.tIndex][posIn.pIndex] = temp;
            }
            return newTeams;
        });
        setIsSubModalOpen(false);
        setPlayerToSubstitute(null);
    };
    
    const renderTeamCard = (team, teamIndex) => {
        const teamLetter = String.fromCharCode(65 + teamIndex);
        let teamLabel = `Time ${teamLetter}`;
        if (step === 'pre_game' || step === 'post_game') {
             if (teamIndex === 0) teamLabel = `Time A`;
             if (teamIndex === 1) teamLabel = `Time B`;
        } else if (step === 'in_game') {
             if (teamIndex === 0) teamLabel = `Time A (Em quadra)`;
             if (teamIndex === 1) teamLabel = `Time B (Desafiante)`;
        }
        return (
            <div className="bg-gray-800 p-4 rounded-lg w-full min-w-[280px]">
                <h3 className="text-yellow-400 font-bold text-xl mb-3">{teamLabel}</h3>
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
                        <button onClick={() => handleSetPlayingTeam('A', teamIndex)} className="text-xs bg-gray-700 hover:bg-yellow-500 hover:text-black py-1 px-2 rounded">Definir como Time A</button>
                        <button onClick={() => handleSetPlayingTeam('B', teamIndex)} className="text-xs bg-gray-700 hover:bg-yellow-500 hover:text-black py-1 px-2 rounded">Definir como Time B</button>
                    </div>
                )}
            </div>
        );
    };

    if (step === 'in_game') {
        const waitingPlayers = allTeams.slice(2).flat().filter(p => p);
        return (
            <>
                <SubstitutionModal isOpen={isSubModalOpen} onClose={() => setIsSubModalOpen(false)} playerOut={playerToSubstitute} availableSubs={waitingPlayers} onConfirm={handleConfirmSubstitution} />
                <LiveMatchTracker 
                    teams={{ teamA: allTeams[0], teamB: allTeams[1] }} 
                    onEndMatch={handleSingleMatchEnd} 
                    durationInMinutes={10}
                    onInitiateSubstitution={handleInitiateSubstitution}
                />
            </>
        );
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
                                <th className="p-3">Jogador</th><th className="p-3 text-center">V</th><th className="p-3 text-center">E</th><th className="p-3 text-center">D</th><th className="p-3 text-center">Gols</th><th className="p-3 text-center">Assist.</th><th className="p-3 text-center">Desarmes</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800/50">
                            {Object.values(sortedStats).map((player, index) => (
                                <tr key={player?.id || index} className="border-b border-gray-700">
                                    <td className="p-3 font-semibold">{player?.name}</td>
                                    <td className="p-3 text-center text-green-400 font-bold">{player?.wins}</td>
                                    <td className="p-3 text-center text-gray-400 font-bold">{player?.draws}</td>
                                    <td className="p-3 text-center text-red-400 font-bold">{player?.losses}</td>
                                    <td className="p-3 text-center">{player?.goals}</td>
                                    <td className="p-3 text-center">{player?.assists}</td>
                                    <td className="p-3 text-center">{player?.tackles}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="text-center mt-8">
                    <button onClick={() => { setStep('config'); setAllTeams([]); }} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg">Nova Sessão de Jogos</button>
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
                <p className="text-gray-400 mb-6">{isEditModeActive ? 'Organize os jogadores e os próximos times.' : 'Visualize os times ou inicie a próxima partida.'}</p>
                <div className="flex justify-center gap-4 mb-6">
                    {!isEditModeActive ? (<button onClick={() => setIsEditModeActive(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2"><LucideEdit className="w-4 h-4"/>Editar Partida</button>) : (<button onClick={() => setIsEditModeActive(false)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2"><LucideShieldCheck className="w-4 h-4"/>Salvar Alterações</button>)}
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
                                            <button onClick={() => handleReorderQueue(index, 'up')} disabled={index === 0} className="bg-gray-700 p-2 rounded-full hover:bg-blue-600 disabled:opacity-50"><LucideUndo className="w-4 h-4 transform rotate-90"/></button>
                                            <button onClick={() => handleReorderQueue(index, 'down')} disabled={index === waitingTeams.length - 1} className="bg-gray-700 p-2 rounded-full hover:bg-blue-600 disabled:opacity-50"><LucideUndo className="w-4 h-4 transform -rotate-90"/></button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {!isEditModeActive && (
                    <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8 border-t border-gray-700 pt-6">
                        <button onClick={() => setStep('in_game')} disabled={!teamB} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-8 rounded-lg text-lg disabled:bg-gray-600 disabled:cursor-not-allowed">Começar Próxima Partida</button>
                        <button onClick={handleForceEndSession} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-lg">Encerrar Pelada</button>
                    </div>
                )}
            </div>
        );
    }

    if (step === 'manual_setup') {
        return (
            <div className="bg-gray-900/50 rounded-2xl p-4 sm:p-6 border border-gray-700">
                <h2 className="text-2xl font-bold text-yellow-400 mb-4">Montagem Manual dos Times</h2>
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-1/3 border border-gray-700 rounded-lg p-4 bg-gray-800/20">
                        <h3 className="font-semibold text-white mb-3">Jogadores Disponíveis ({availablePlayersForSetup.length})</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {availablePlayersForSetup.map(p => (
                                <div key={p.id} className="text-white p-2 bg-gray-800 rounded">{p.name}</div>
                            ))}
                        </div>
                    </div>
                    <div className="w-full md:w-2/3 space-y-4">
                        {allTeams.map((team, teamIndex) => (
                            <div key={teamIndex} className="border border-gray-700 rounded-lg p-4 min-h-[150px]">
                                <h3 className="font-semibold text-yellow-400 mb-3">Time {String.fromCharCode(65 + teamIndex)}</h3>
                                <div className="space-y-2 mb-3">
                                    {team.map(p => (
                                        <button key={p.id} onClick={() => handleUnassignPlayer(p, teamIndex)} className="w-full text-left p-2 bg-blue-900/50 rounded text-white flex items-center gap-2 hover:bg-red-800" title="Remover do time">
                                            <LucideX size={14}/> {p.name}
                                        </button>
                                    ))}
                                </div>
                                <div className="border-t border-gray-700 pt-3">
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
        <div className="bg-gray-900/50 rounded-2xl p-4 sm:p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">Configurar Noite de Futebol</h2>
            <fieldset className="border border-gray-700 p-4 rounded-lg mb-6">
                <legend className="px-2 text-yellow-400 font-semibold">Modo de Montagem</legend>
                <div className="flex gap-4">
                    <button onClick={() => setSetupMode('auto')} className={`flex-1 p-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${setupMode === 'auto' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-white hover:bg-gray-700'}`}> <LucideShuffle/> Sorteio Automático </button>
                    <button onClick={() => setSetupMode('manual')} className={`flex-1 p-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${setupMode === 'manual' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-white hover:bg-gray-700'}`}> <LucideUsers/> Montagem Manual </button>
                </div>
            </fieldset>
            {setupMode === 'auto' && (
                <fieldset className="border border-gray-700 p-4 rounded-lg mb-6">
                    <legend className="px-2 text-yellow-400 font-semibold">Configuração do Sorteio</legend>
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
                <fieldset className="border border-gray-700 p-4 rounded-lg mb-6">
                    <legend className="px-2 text-yellow-400 font-semibold">Configuração Manual</legend>
                    <div>
                        <label className="block font-semibold mb-2 text-white">Nº de times a montar:</label>
                        <input type="number" min="2" value={numberOfTeams} onChange={e => setNumberOfTeams(Number(e.target.value))} className="w-full bg-gray-800 p-2 rounded text-white" />
                    </div>
                </fieldset>
            )}
            <fieldset className="border border-gray-700 p-4 rounded-lg mb-6">
                <legend className="px-2 text-yellow-400 font-semibold">Regras da Partida</legend>
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
            <h3 className="text-xl font-bold text-yellow-400 mb-4">Selecione os Jogadores Presentes</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                {players.map(p => (<button key={p.id} onClick={() => handlePlayerToggle(p.id)} className={`p-3 rounded-lg text-center transition-all duration-200 font-semibold ${selectedPlayerIds.has(p.id) ? 'bg-yellow-500 text-black scale-105 shadow-lg shadow-yellow-500/20' : 'bg-gray-800 text-white hover:bg-gray-700'}`}>{p.name}</button>))}
            </div>
            <div className="text-center">
                <button onClick={handleProceedToSetup} disabled={selectedPlayerIds.size < 2} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-8 rounded-lg text-lg disabled:bg-gray-600 disabled:cursor-not-allowed">
                    Continuar
                </button>
            </div>
        </div>
    );
};

export default MatchFlow;