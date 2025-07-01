import React from 'react';
import { LucideEdit, LucideTrash2 } from 'lucide-react';

const MatchHistory = ({ matches, onEditMatch, onDeleteMatch }) => {
    if (!matches || matches.length === 0) {
        return (
            <div className="text-center py-16 px-6 bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-700">
                <h3 className="text-xl font-semibold text-gray-300">Nenhuma partida encontrada</h3>
                <p className="text-gray-500 mt-2">Jogue algumas partidas para que elas apareçam aqui.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h2 className="text-3xl font-bold text-yellow-400 mb-6 text-center">Histórico de Partidas Individuais</h2>
            {matches.map(match => (
                <div key={match.id} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center flex-wrap gap-2">
                    <div>
                        <p className="text-sm text-gray-400">{new Date(match.date).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-lg font-bold text-white">
                            {match.teams.teamA.map(p => p.name).join(', ')} 
                            <span className="text-yellow-400 mx-2">{match.score.teamA}</span> 
                            vs 
                            <span className="text-yellow-400 mx-2">{match.score.teamB}</span> 
                            {match.teams.teamB.map(p => p.name).join(', ')}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => onEditMatch(match)} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg flex items-center gap-2 text-sm"><LucideEdit className="w-5 h-5" /></button>
                        <button onClick={() => onDeleteMatch(match)} className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-lg flex items-center gap-2 text-sm"><LucideTrash2 className="w-5 h-5" /></button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default MatchHistory;