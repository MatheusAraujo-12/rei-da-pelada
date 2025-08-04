import React, { useState } from 'react';
import { collection, addDoc, doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { LucidePlusCircle, LucideLogIn, LucideArrowLeft } from 'lucide-react';
import { db } from '../../services/firebase';

const GroupGate = ({ user, playerProfile, onGroupAssociated, onBackToDashboard }) => {
    const [mode, setMode] = useState('select');
    const [groupName, setGroupName] = useState('');
    const [joinId, setJoinId] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreateGroup = async () => {
        if (!groupName.trim() || !user || loading || !playerProfile) return;
        setLoading(true);
        setError('');
        
        try {
            const groupCollectionRef = collection(db, 'groups');
            const newGroupDoc = await addDoc(groupCollectionRef, {
                name: groupName,
                createdBy: user.uid,
                createdAt: new Date(),
                members: [user.uid]
            });

            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, {
                groupIds: arrayUnion(newGroupDoc.id)
            }, { merge: true });

            const playerInGroupRef = doc(db, `groups/${newGroupDoc.id}/players`, user.uid);
            await setDoc(playerInGroupRef, playerProfile);

            const userDocSnap = await getDoc(userDocRef);
            onGroupAssociated(userDocSnap.data().groupIds || [newGroupDoc.id]);

        } catch (e) {
            console.error("Erro ao criar grupo:", e);
            setError("Não foi possível criar o grupo. Verifique o console para mais detalhes.");
        } finally {
            setLoading(false);
        }
    };

    const handleJoinGroup = async () => {
        if (!joinId.trim() || !user || loading || !playerProfile) return;
        setLoading(true);
        setError('');

        try {
            const groupId = joinId.trim();
            const groupDocRef = doc(db, 'groups', groupId);
            const groupSnap = await getDoc(groupDocRef);

            if (groupSnap.exists()) {
                await updateDoc(groupDocRef, {
                    members: arrayUnion(user.uid)
                });

                const userDocRef = doc(db, 'users', user.uid);
                await setDoc(userDocRef, {
                    groupIds: arrayUnion(groupId)
                }, { merge: true });

                const playerInGroupRef = doc(db, `groups/${groupId}/players`, user.uid);
                await setDoc(playerInGroupRef, playerProfile);

                const userDocSnap = await getDoc(userDocRef);
                onGroupAssociated(userDocSnap.data().groupIds || [groupId]);
            } else {
                setError("Grupo não encontrado. Verifique o ID.");
            }
        } catch(e) {
            console.error("Erro ao entrar no grupo:", e);
            setError("Ocorreu um erro ao tentar entrar no grupo. Verifique o console.");
        } finally {
            setLoading(false);
        }
    };

    const renderMode = () => {
        switch (mode) {
            case 'create':
                return (
                    <>
                        <h2 className="text-3xl font-bold text-yellow-400 mb-6">Criar Novo Grupo</h2>
                        <input type="text" placeholder="Nome do Grupo" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 mb-4 text-white" />
                        <button onClick={handleCreateGroup} disabled={loading} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg disabled:opacity-50">
                            {loading ? 'A criar...' : 'Confirmar'}
                        </button>
                        <button onClick={() => setMode('select')} className="text-gray-400 mt-4">Voltar</button>
                    </>
                );
            case 'join':
                return (
                    <>
                        <h2 className="text-3xl font-bold text-yellow-400 mb-6">Entrar num Grupo</h2>
                        <input type="text" placeholder="Cole o ID do Grupo" value={joinId} onChange={(e) => setJoinId(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 mb-4 text-white" />
                        <button onClick={handleJoinGroup} disabled={loading} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg disabled:opacity-50">
                            {loading ? 'A entrar...' : 'Entrar'}
                        </button>
                        <button onClick={() => setMode('select')} className="text-gray-400 mt-4">Voltar</button>
                    </>
                );
            default:
                return (
                    <>
                        <h2 className="text-3xl font-bold text-yellow-400 mb-6">Junte-se a uma Pelada!</h2>
                        <p className="text-gray-400 mb-8">Crie um novo grupo para a sua pelada ou entre num grupo existente usando um ID de convite.</p>
                        <div className="flex flex-col gap-4">
                            <button onClick={() => setMode('create')} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2"><LucidePlusCircle />Criar Grupo</button>
                            <button onClick={() => setMode('join')} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2"><LucideLogIn />Entrar com ID</button>
                        </div>
                    </>
                );
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-md text-center bg-gray-900/50 rounded-2xl p-8 border border-gray-700 relative">
                {onBackToDashboard && (
                    <button onClick={onBackToDashboard} className="absolute top-4 left-4 text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700">
                        <LucideArrowLeft />
                    </button>
                )}
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                {renderMode()}
            </div>
        </div>
    );
};

export default GroupGate;