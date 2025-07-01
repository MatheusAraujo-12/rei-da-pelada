import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query } from 'firebase/firestore';
import { LucideUser, LucideClipboard } from 'lucide-react';
import { db, appId } from '../../services/firebase';

const GroupDashboard = ({ user, groupId }) => {
    const [groupData, setGroupData] = useState(null);
    const [groupPlayers, setGroupPlayers] = useState([]);

    useEffect(() => {
        if (!groupId) return;
        
        const groupDocRef = doc(db, `artifacts/${appId}/public/data/groups/${groupId}`);
        const unsubGroup = onSnapshot(groupDocRef, (doc) => {
            setGroupData({ id: doc.id, ...doc.data() });
        });
        
        const playersColRef = collection(db, `artifacts/${appId}/public/data/groups/${groupId}/players`);
        const unsubPlayers = onSnapshot(query(playersColRef), (snapshot) => {
            setGroupPlayers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }, error => console.error("Group players snapshot error:", error));

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

    if (!groupData) {
        return <div className="text-center"><p>Carregando dados do grupo...</p></div>;
    }

    return (
        <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-700">
            <h2 className="text-3xl font-bold text-yellow-400 mb-4">{groupData.name}</h2>
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400">ID de Convite</label>
                <div className="flex items-center gap-2 mt-1">
                    <input type="text" readOnly value={groupId} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-white" />
                    <button onClick={handleCopyId} className="bg-yellow-500 hover:bg-yellow-600 text-black p-2 rounded-lg"><LucideClipboard /></button>
                </div>
            </div>
            <div>
                <h3 className="text-2xl font-bold text-yellow-400 mb-4">Membros</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {groupPlayers.map(p => (
                        <div key={p.id} className="bg-gray-800 p-3 rounded-lg text-center">
                            <LucideUser className="mx-auto mb-2 text-gray-400" />
                            <p className="text-white">{p.name}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GroupDashboard;