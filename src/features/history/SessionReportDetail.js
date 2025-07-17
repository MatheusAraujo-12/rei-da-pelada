import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const SessionReportDetail = ({ session, onBack }) => {
    const [matchesDetails, setMatchesDetails] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMatches = async () => {
            if (!session?.matchIds || session.matchIds.length === 0 || !session.groupId) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const matchPromises = session.matchIds.map(id => {
                    if (!id) return null;
                    const matchDocRef = doc(db, `groups/${session.groupId}/matches`, id);
                    return getDoc(matchDocRef);
                }).filter(Boolean);
                const matchDocs = await Promise.all(matchPromises);
                const matchesData = matchDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() }));
                setMatchesDetails(matchesData);
            } catch (error) {
                console.error("Erro ao buscar detalhes das partidas:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchMatches();
    }, [session]);

    // ✅ LÓGICA DE CÁLCULO EM TEMPO REAL
    const calculatedStats = useMemo(() => {
        const stats = {};
        const allPlayerIds = new Set();
        
        // Coleta todos os jogadores de todas as partidas
        matchesDetails.forEach(match => {
            match.teams.teamA.forEach(p => allPlayerIds.add(p.id));
            match.teams.teamB.forEach(p => allPlayerIds.add(p.id));
        });

        // Inicializa as estatísticas para todos
        allPlayerIds.forEach(playerId => {
            stats[playerId] = { name: 'Desconhecido', wins: 0, draws: 0, losses: 0, goals: 0, assists: 0, tackles: 0, saves: 0, failures: 0 };
        });

        // Itera sobre as partidas para calcular as estatísticas
        matchesDetails.forEach(match => {
            const teamAPlayerIds = match.teams.teamA.map(p => p.id);
            const teamBPlayerIds = match.teams.teamB.map(p => p.id);
            
            // Recalcula o placar a partir das estatísticas salvas na partida
            let scoreA = 0;
            let scoreB = 0;
            teamAPlayerIds.forEach(id => { scoreA += match.playerStats[id]?.goals || 0 });
            teamBPlayerIds.forEach(id => { scoreB += match.playerStats[id]?.goals || 0 });

            // Calcula V/D/E com base no placar recalculado
            if (scoreA > scoreB) {
                teamAPlayerIds.forEach(id => { if(stats[id]) stats[id].wins++; });
                teamBPlayerIds.forEach(id => { if(stats[id]) stats[id].losses++; });
            } else if (scoreB > scoreA) {
                teamBPlayerIds.forEach(id => { if(stats[id]) stats[id].wins++; });
                teamAPlayerIds.forEach(id => { if(stats[id]) stats[id].losses++; });
            } else {
                teamAPlayerIds.forEach(id => { if(stats[id]) stats[id].draws++; });
                teamBPlayerIds.forEach(id => { if(stats[id]) stats[id].draws++; });
            }

            // Agrega as estatísticas individuais
            for (const playerId in match.playerStats) {
                if (stats[playerId]) {
                    const playerInMatch = [...match.teams.teamA, ...match.teams.teamB].find(p => p.id === playerId);
                    if (playerInMatch) stats[playerId].name = playerInMatch.name;
                    for (const stat in match.playerStats[playerId]) {
                        stats[playerId][stat] = (stats[playerId][stat] || 0) + match.playerStats[playerId][stat];
                    }
                }
            }
        });
        return Object.values(stats).sort((a, b) => b.wins - a.wins || b.goals - a.goals);
    }, [matchesDetails]);

    if (!session || !session.date) {
        return ( <div className="text-center text-gray-400 p-8"><p>Nenhuma sessão selecionada.</p><button onClick={onBack} className="...">Voltar</button></div> );
    }
    
    const sessionDate = new Date(session.date.seconds * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    return (
        <div className="bg-gray-900/50 rounded-2xl p-4 sm:p-8 text-white space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-yellow-400 mb-2 text-center">Relatório da Sessão</h2>
                <p className="text-center text-gray-400 mb-6">{sessionDate}</p>
                {loading ? <div className="text-center">A carregar estatísticas...</div> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="bg-gray-800">
                                <tr>
                                    <th className="p-3">Jogador</th><th className="p-3 text-center">V</th><th className="p-3 text-center">E</th><th className="p-3 text-center">D</th><th className="p-3 text-center">Gols</th><th className="p-3 text-center">Assist.</th><th className="p-3 text-center">Desarmes</th>
                                </tr>
                            </thead>
                            <tbody className="bg-gray-800/50">
                                {calculatedStats.map(player => (
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
                )}
            </div>
            {session.matchIds && session.matchIds.length > 0 && (
                 <div>
                    <h3 className="text-2xl font-bold text-yellow-400 mb-4 text-center">Resultados das Partidas</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto p-1">
                       {loading ? <p className="text-center">A carregar partidas...</p> : matchesDetails.map((match, index) => {
                            let scoreA = 0, scoreB = 0;
                            if (match.playerStats) {
                                match.teams.teamA.forEach(p => { scoreA += match.playerStats[p.id]?.goals || 0; });
                                match.teams.teamB.forEach(p => { scoreB += match.playerStats[p.id]?.goals || 0; });
                            }
                            return (
                               <div key={match.id} className="bg-gray-800 p-3 rounded-lg text-center">
                                   <p className="text-sm text-gray-400">Partida {index + 1}</p>
                                   <p className="font-bold text-lg text-white">Time A <span className="text-xl text-yellow-400 mx-2">{scoreA}</span> vs <span className="text-xl text-yellow-400 mx-2">{scoreB}</span> Time B</p>
                               </div>
                            );
                        })}
                    </div>
                </div>
            )}
            <div className="text-center mt-4">
                <button onClick={onBack} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg">Voltar para o Histórico de Sessões</button>
            </div>
        </div>
    );
};

export default SessionReportDetail;