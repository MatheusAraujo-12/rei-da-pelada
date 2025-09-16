import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query } from 'firebase/firestore';
import { LucideUser, LucideClipboard, LucideShield, LucideAward } from 'lucide-react';
import { db } from '../../services/firebase';

const GroupDashboard = ({ user, groupId, isAdmin, onSetAdminStatus }) => {
    const [groupData, setGroupData] = useState(null);
    const [groupPlayers, setGroupPlayers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!groupId) {
            setLoading(false);
            return;
        }
        setLoading(true);

        const groupDocRef = doc(db, 'groups', groupId);
        const unsubGroup = onSnapshot(groupDocRef, (doc) => {
            setGroupData(doc.exists() ? { id: doc.id, ...doc.data() } : null);
        });

        const playersColRef = collection(db, `groups/${groupId}/players`);
        const unsubPlayers = onSnapshot(query(playersColRef), (snapshot) => {
            setGroupPlayers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, (error) => {
            console.error("Erro ao buscar jogadores do grupo:", error);
            setLoading(false);
        });

        return () => {
            unsubGroup();
            unsubPlayers();
        };
    }, [groupId]);

    const handleCopyId = () => {
        navigator.clipboard.writeText(groupId).then(() => {
            alert('ID do Grupo copiado!');
        }).catch(err => {
            console.error('Falha ao copiar ID: ', err);
        });
    };

    if (loading) {
        return <div className="text-center p-10 text-white">A carregar dados do grupo...</div>;
    }
    if (!groupData) {
        return <div className="text-center p-10 text-red-500">Grupo não encontrado.</div>;
    }
    
    // Verifica se o jogador listado é o criador original do grupo
    const isOwner = (playerId) => groupData.createdBy === playerId;
    // Verifica se o jogador listado está na lista de administradores
    const isPlayerAdmin = (playerId) => groupData.admins?.includes(playerId);

    return (
        <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-700">
            <h2 className="text-3xl font-bold text-yellow-400 mb-6">{groupData.name}</h2>
            
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400">ID de Convite do Grupo</label>
                <div className="flex items-center gap-2 mt-1">
                    <input type="text" readOnly value={groupId} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-white" />
                    <button onClick={handleCopyId} className="bg-yellow-500 hover:bg-yellow-600 text-black p-2 rounded-lg" title="Copiar ID">
                        <LucideClipboard />
                    </button>
                </div>
            </div>

            <div>
                <h3 className="text-2xl font-bold text-yellow-400 mb-4">Membros do Grupo</h3>
                <div className="space-y-3">
                    {groupPlayers.length > 0 ? (
                        groupPlayers.map(p => (
                            <div key={p.id} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    {isPlayerAdmin(p.id) ? (
                                        isOwner(p.id) ? 
                                        <LucideAward className="text-yellow-400 w-6 h-6" title="Dono do Grupo"/> : 
                                        <LucideShield className="text-cyan-400 w-6 h-6" title="Administrador"/>
                                    ) : (
                                        <LucideUser className="text-gray-400 w-6 h-6" />
                                    )}
                                    <span className="text-white font-semibold">{p.name}</span>
                                </div>
                                
                                {/* Botões de gestão só aparecem para o admin que está a ver */}
                                {isAdmin && !isOwner(p.id) && ( // O dono não pode rebaixar a si mesmo
                                    <div>
                                        {isPlayerAdmin(p.id) ? (
                                            <button onClick={() => onSetAdminStatus(p.id, false)} className="text-xs bg-red-800 text-white font-bold py-1 px-3 rounded-lg hover:bg-red-700">
                                                Rebaixar
                                            </button>
                                        ) : (
                                            <button onClick={() => onSetAdminStatus(p.id, true)} className="text-xs bg-green-600 text-white font-bold py-1 px-3 rounded-lg hover:bg-green-700">
                                                Promover a Admin
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500">Ainda não há jogadores neste grupo.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GroupDashboard;