import React, { useState, useEffect } from 'react';
import { LucideX, LucidePlus, LucideMinus } from 'lucide-react';

const EditMatchModal = ({ isOpen, onClose, match, players, onSave }) => {
    const [localStats, setLocalStats] = useState({});

    useEffect(() => {
        if (match?.playerStats) {
            // Usamos uma cópia profunda para garantir que o estado local é totalmente independente
            setLocalStats(JSON.parse(JSON.stringify(match.playerStats)));
        }
    }, [match]);

    if (!isOpen || !match) {
        return null;
    }

    const handleStatChange = (playerId, stat, delta) => {
        // Atualizamos o estado de forma imutável para garantir previsibilidade
        setLocalStats(currentStats => {
            // Criamos uma nova cópia do objeto principal
            const newStats = { ...currentStats };
            
            // Criamos uma nova cópia do objeto do jogador específico
            const playerStats = { ...(newStats[playerId] || { goals: 0, assists: 0, dribbles: 0, tackles: 0, saves: 0, failures: 0 }) };
            
            const currentValue = playerStats[stat] || 0;
            playerStats[stat] = Math.max(0, currentValue + delta);

            newStats[playerId] = playerStats;
            
            return newStats;
        });
    };

    const handleSave = () => {
        onSave(match.id, localStats);
    };

    const allPlayerIdsInMatch = [...(match.teams.teamA.map(p=>p.id)), ...(match.teams.teamB.map(p=>p.id))];
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col text-white border border-yellow-400/30">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-yellow-400">Editar Estatísticas da Partida</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors"><LucideX className="w-6 h-6" /></button>
                </div>
                
                <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                    {allPlayerIdsInMatch.map(playerId => {
                        const player = players.find(p => p.id === playerId);
                        if (!player) return null;

                        return (
                            <div key={playerId} className="bg-gray-800 p-4 rounded-lg">
                                <h3 className="font-bold text-lg text-white mb-3">{player.name}</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {Object.keys(localStats[playerId] || { goals: 0, assists: 0, dribbles: 0, tackles: 0, saves: 0, failures: 0 }).map(statName => (
                                         <div key={statName}>
                                            <label className="capitalize text-sm text-gray-400">{statName}</label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <button onClick={() => handleStatChange(playerId, statName, -1)} className="bg-red-600 p-1 rounded-md"><LucideMinus size={16}/></button>
                                                <span className="font-bold text-lg text-yellow-400 w-6 text-center">{localStats[playerId]?.[statName] || 0}</span>
                                                <button onClick={() => handleStatChange(playerId, statName, 1)} className="bg-green-600 p-1 rounded-md"><LucidePlus size={16}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                <div className="mt-8 flex justify-end">
                    <button onClick={onClose} className="py-2 px-6 rounded-lg bg-gray-600 hover:bg-gray-500 transition-colors mr-4">Cancelar</button>
                    <button onClick={handleSave} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-6 rounded-lg">Salvar Alterações</button>
                </div>
            </div>
        </div>
    );
};

export default EditMatchModal;