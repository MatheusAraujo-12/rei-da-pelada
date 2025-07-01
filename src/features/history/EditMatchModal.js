import React, { useState, useEffect } from 'react';
import { LucideX } from 'lucide-react';

const EditMatchModal = ({ isOpen, match, players, onClose, onSave }) => {
    const [editableStats, setEditableStats] = useState({});

    useEffect(() => {
        if (match) {
            // Usamos JSON.parse e stringify para criar uma cópia profunda e evitar mutações no estado original
            setEditableStats(JSON.parse(JSON.stringify(match.playerStats)));
        }
    }, [match]);

    if (!isOpen || !match) return null;

    const handleStatChange = (playerId, stat, delta) => {
        setEditableStats(prev => {
            const newPlayerStats = { ...prev[playerId] };
            newPlayerStats[stat] = Math.max(0, (newPlayerStats[stat] || 0) + delta);
            return { ...prev, [playerId]: newPlayerStats };
        });
    };

    const allPlayerIdsInMatch = match ? [...match.teams.teamA.map(p => p.id), ...match.teams.teamB.map(p => p.id)] : [];
    const playerDetails = allPlayerIdsInMatch.map(id => players.find(p => p.id === id)).filter(Boolean);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-full overflow-y-auto text-white border border-yellow-400/30">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-yellow-400">Editar Partida</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors"><LucideX className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4">
                    {playerDetails.map(player => (
                        <div key={player.id} className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="font-bold text-lg mb-2">{player.name}</h3>
                            <div className="flex items-center gap-4 flex-wrap">
                                {editableStats[player.id] && Object.keys(editableStats[player.id]).map(stat => (
                                    <div key={stat} className="flex items-center gap-2">
                                        <span className="font-semibold capitalize text-sm">{stat}:</span>
                                        <button onClick={() => handleStatChange(player.id, stat, -1)} className="bg-red-600 rounded-full w-6 h-6">-</button>
                                        <span className="font-bold text-lg w-6 text-center">{editableStats[player.id][stat]}</span>
                                        <button onClick={() => handleStatChange(player.id, stat, 1)} className="bg-green-600 rounded-full w-6 h-6">+</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-8 flex justify-end gap-4">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg">Cancelar</button>
                    <button onClick={() => onSave(match.id, editableStats)} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-6 rounded-lg">Salvar Alterações</button>
                </div>
            </div>
        </div>
    );
};

export default EditMatchModal;