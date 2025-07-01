import React from 'react';
import { LucideUser, LucideEdit, LucideTrash2, LucideUsers } from 'lucide-react';
import { calculateOverall } from '../../utils/helpers';

const PlayerCard = ({ player, onEdit, onDelete, onOpenPeerReview, isAdmin }) => {
    const selfOverall = calculateOverall(player.selfOverall);
    const peerOverall = player.peerOverall ? calculateOverall(player.peerOverall.avgSkills) : 0;
    const adminOverall = player.adminOverall ? calculateOverall(player.adminOverall) : 0;
    
    const skillAcronyms = {
        finalizacao: "FIN", drible: "DRI", velocidade: "VEL", folego: "FOL", passe: "PAS", desarme: "DES",
        reflexo: "REF", posicionamento: "POS", lancamento: "LAN"
    };

    return (
        <div className="bg-gradient-to-b from-gray-800 via-gray-900 to-black rounded-2xl p-1 shadow-lg border border-yellow-400/20 transition-all duration-300 transform hover:scale-105 hover:shadow-yellow-400/20 relative overflow-hidden group">
            <div className="bg-gradient-to-b from-transparent to-black/50 p-4">
                <div className="flex justify-between items-start">
                    <div className="text-left">
                        <p className="text-5xl font-black text-yellow-400">{selfOverall}</p>
                        <p className="font-bold text-white -mt-1">{player.detailedPosition || player.position}</p>
                    </div>
                    <div className="text-right space-y-1">
                        {peerOverall > 0 && (
                            <>
                                <p className="text-3xl font-bold text-cyan-400">{peerOverall}</p>
                                <p className="text-xs text-cyan-500">OVR Galera</p>
                            </>
                        )}
                        {isAdmin && adminOverall > 0 && (
                            <>
                                <p className="text-3xl font-bold text-green-400 mt-2">{adminOverall}</p>
                                <p className="text-xs text-green-500">OVR Admin</p>
                            </>
                        )}
                    </div>
                </div>
                
                <div className="w-24 h-24 bg-gray-700/50 rounded-full flex items-center justify-center border-2 border-yellow-400/30 mx-auto mt-[-1rem]"><LucideUser className="w-16 h-16 text-gray-500" /></div>
                <div className="text-center mt-2"><h3 className="text-2xl font-extrabold text-white tracking-wider uppercase">{player.name}</h3></div>
                
                <div className="text-center text-xs text-gray-400 my-2">
                    <span>{player.preferredSide || 'Qualquer Lado'} • </span>
                    <span>Perna {player.preferredFoot || 'Direita'}</span>
                </div>

                <hr className="border-yellow-400/30 my-3" />
                
                <div className="grid grid-cols-3 gap-x-2 gap-y-3 text-center">
                    {Object.entries(player.selfOverall).map(([skill, value]) => (
                        <div key={skill} className="flex items-center justify-center gap-2"><p className="text-2xl font-bold text-white">{value}</p><p className="text-sm font-semibold text-yellow-400">{skillAcronyms[skill]}</p></div>
                    ))}
                </div>
                
                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {isAdmin && (
                        <>
                            <button onClick={() => onEdit(player)} className="p-2 bg-gray-700/50 hover:bg-yellow-400/80 rounded-full text-white hover:text-black" title="Editar"><LucideEdit className="w-4 h-4" /></button>
                            <button onClick={() => onDelete(player)} className="p-2 bg-gray-700/50 hover:bg-red-600/80 rounded-full text-white" title="Apagar"><LucideTrash2 className="w-4 h-4" /></button>
                        </>
                    )}
                    <button onClick={() => onOpenPeerReview(player)} className="p-2 bg-gray-700/50 hover:bg-cyan-500/80 rounded-full text-white" title="Avaliar Jogador"><LucideUsers className="w-4 h-4" /></button>
                </div>
            </div>
        </div>
    );
};

export default PlayerCard;