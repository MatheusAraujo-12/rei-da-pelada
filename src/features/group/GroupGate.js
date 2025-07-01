import React, { useState } from 'react';
import { collection, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { LucidePlusCircle, LucideLogIn } from 'lucide-react';
import { db, appId } from '../../services/firebase';

const GroupGate = ({ user, onGroupAssociated }) => {
    const [mode, setMode] = useState('select');
    const [groupName, setGroupName] = useState('');
    const [joinId, setJoinId] = useState('');

    const handleCreateGroup = async () => {
        if (!groupName.trim() || !user) return;
        const groupRef = collection(db, `artifacts/${appId}/public/data/groups`);
        const newGroupDoc = await addDoc(groupRef, {
            name: groupName,
            createdBy: user.uid,
            createdAt: new Date(),
        });
        const userDocRef = doc(db, `artifacts/${appId}/users/${user.uid}`);
        await setDoc(userDocRef, { groupId: newGroupDoc.id });
        onGroupAssociated(newGroupDoc.id);
    };

    const handleJoinGroup = async () => {
        if (!joinId.trim() || !user) return;
        const groupDocRef = doc(db, `artifacts/${appId}/public/data/groups/${joinId}`);
        const groupSnap = await getDoc(groupDocRef);
        if (groupSnap.exists()) {
            const userDocRef = doc(db, `artifacts/${appId}/users/${user.uid}`);
            await setDoc(userDocRef, { groupId: joinId });
            onGroupAssociated(joinId);
        } else {
            alert("Grupo não encontrado. Verifique o ID.");
        }
    };

    const renderMode = () => {
        switch (mode) {
            case 'create':
                return (
                    <>
                        <h2 className="text-3xl font-bold text-yellow-400 mb-6">Criar Novo Grupo</h2>
                        <input type="text" placeholder="Nome do Grupo" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 mb-4 text-white" />
                        <button onClick={handleCreateGroup} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg">Confirmar</button>
                        <button onClick={() => setMode('select')} className="text-gray-400 mt-4">Voltar</button>
                    </>
                );
            case 'join':
                return (
                    <>
                        <h2 className="text-3xl font-bold text-yellow-400 mb-6">Entrar em um Grupo</h2>
                        <input type="text" placeholder="Cole o ID do Grupo" value={joinId} onChange={(e) => setJoinId(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 mb-4 text-white" />
                        <button onClick={handleJoinGroup} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg">Entrar</button>
                        <button onClick={() => setMode('select')} className="text-gray-400 mt-4">Voltar</button>
                    </>
                );
            default:
                return (
                    <>
                        <h2 className="text-3xl font-bold text-yellow-400 mb-6">Bem-vindo ao Rei da Pelada!</h2>
                        <p className="text-gray-400 mb-8">Para começar, crie um novo grupo para sua pelada ou junte-se a um grupo existente.</p>
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
            <div className="w-full max-w-md text-center bg-gray-900/50 rounded-2xl p-8 border border-gray-700">
                {renderMode()}
            </div>
        </div>
    );
};

export default GroupGate;