import React from 'react';
import { LucideUser, LucideEdit, LucideTrash2, LucideStar } from 'lucide-react';
import { calculateOverall } from '../../utils/helpers';

const PlayerCard = ({ player, onEdit, onDelete, onOpenPeerReview, isAdmin }) => {
    
    const overall = calculateOverall(player.selfOverall);
    const peerOverall = player.peerOverall ? calculateOverall(player.peerOverall.avgSkills) : null;

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl overflow-hidden shadow-lg w-full max-w-[280px] mx-auto h-[400px] flex flex-col">
            <div className="relative w-full h-48 bg-gray-700 flex items-center justify-center">
                {/* ✅ Lógica para exibir a foto do perfil ou o ícone padrão */}
                {player.photoURL ? (
                    <img src={player.photoURL} alt={player.name} className="w-full h-full object-cover" />
                ) : (
                    <LucideUser className="w-24 h-24 text-gray-500" />
                )}
                
                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full p-2 font-bold text-white text-xl">
                    {overall}
                </div>
                {peerOverall && (
                    <div className="absolute top-2 left-2 bg-cyan-600/80 backdrop-blur-sm rounded-full p-2 font-bold text-white text-xl flex items-center gap-1" title={`Overall da Galera (${player.peerOverall.ratingsCount} votos)`}>
                        <LucideStar className="w-5 h-5 text-yellow-300" />
                        {peerOverall}
                    </div>
                )}
            </div>
            <div className="p-4 flex flex-col flex-grow justify-between">
                <div>
                    <h3 className="text-xl font-bold text-white truncate" title={player.name}>{player.name}</h3>
                    <p className="text-gray-400">{player.detailedPosition || player.position}</p>
                </div>
                <div className="flex justify-between items-center mt-4">
                    <button onClick={() => onOpenPeerReview(player)} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-3 rounded-lg text-sm">Avaliar</button>
                    {isAdmin && (
                        <div className="flex gap-2">
                            <button onClick={() => onEdit(player)} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg" title="Editar Jogador"><LucideEdit size={16}/></button>
                            <button onClick={() => onDelete(player)} className="p-2 bg-red-600 hover:bg-red-500 rounded-lg" title="Apagar Jogador"><LucideTrash2 size={16}/></button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlayerCard;
