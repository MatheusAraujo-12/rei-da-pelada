import React from 'react';

const SessionReportDetail = ({ session, onBack }) => {
    if (!session || !session.date || !session.finalStats) {
        return (
            <div className="text-center text-gray-400 p-8">
                <p>Nenhuma sessão selecionada ou dados inválidos.</p>
                <div className="mt-4">
                    <button onClick={onBack} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg">
                        Voltar
                    </button>
                </div>
            </div>
        );
    }

    const sortedStats = Object.values(session.finalStats).sort((a, b) => b.wins - a.wins || b.goals - a.goals);
    const sessionDate = new Date(session.date.seconds * 1000).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric'
    });

    return (
        <div className="bg-gray-900/50 rounded-2xl p-4 sm:p-8 text-white space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-yellow-400 mb-2 text-center">Relatório da Pelada</h2>
                <p className="text-center text-gray-400 mb-6">{sessionDate}</p>
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
            </div>

            {/* ✅ MELHORIA: Mostra o histórico de partidas da sessão */}
            {session.matchHistory && session.matchHistory.length > 0 && (
                 <div>
                    <h3 className="text-2xl font-bold text-yellow-400 mb-4 text-center">Resultados das Partidas</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto p-1">
                       {session.matchHistory.map((match, index) => (
                           <div key={index} className="bg-gray-800 p-3 rounded-lg text-center">
                               <p className="text-sm text-gray-400">Partida {index + 1}</p>
                               <p className="font-bold text-lg text-white">
                                   Time A <span className="text-xl text-yellow-400 mx-2">{match.score.teamA}</span> 
                                   vs 
                                   <span className="text-xl text-yellow-400 mx-2">{match.score.teamB}</span> Time B
                               </p>
                           </div>
                       ))}
                    </div>
                </div>
            )}

            <div className="text-center mt-4">
                <button onClick={onBack} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg">
                    Voltar para o Histórico
                </button>
            </div>
        </div>
    );
};

export default SessionReportDetail;