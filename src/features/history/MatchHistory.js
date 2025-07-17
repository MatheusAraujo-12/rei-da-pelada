import React from 'react';
import { LucideEdit, LucideTrash2 } from 'lucide-react';

const MatchHistory = ({ matches, onEditMatch, onDeleteMatch }) => {
    return (
        <div className="bg-gray-900/50 rounded-2xl p-4 sm:p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-yellow-400 mb-6 text-center">Histórico de Partidas Individuais</h2>
            <div className="space-y-4">
                {matches.map(match => {
                    // ✅ Lógica para calcular o placar e determinar o vencedor em tempo real
                    let scoreA = 0;
                    let scoreB = 0;
                    if(match.playerStats) {
                        match.teams.teamA.forEach(p => {
                            scoreA += match.playerStats[p.id]?.goals || 0;
                        });
                        match.teams.teamB.forEach(p => {
                            scoreB += match.playerStats[p.id]?.goals || 0;
                        });
                    }
                    
                    const winner = scoreA > scoreB ? 'Time A' : (scoreB > scoreA ? 'Time B' : 'Empate');

                    return (
                        <div key={match.id} className="bg-gray-800 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="text-center sm:text-left">
                                <p className="text-sm text-gray-400">{new Date(match.date?.seconds * 1000).toLocaleString('pt-BR')}</p>
                                <p className="text-xl font-bold text-white">
                                    Time A <span className="text-yellow-400">{scoreA}</span> vs <span className="text-yellow-400">{scoreB}</span> Time B
                                </p>
                                <p className="text-xs font-semibold text-green-400">{`Vencedor: ${winner}`}</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => onEditMatch(match)} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg" title="Editar Partida"><LucideEdit/></button>
                                <button onClick={() => onDeleteMatch(match)} className="p-2 bg-red-600 hover:bg-red-500 rounded-lg" title="Apagar Partida"><LucideTrash2/></button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MatchHistory;