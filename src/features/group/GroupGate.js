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
                members: [user.uid],
                crestURL: null,
                crestUpdatedAt: null
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
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#4338ca] via-[#a855f7] to-[#06b6d4]">
            Criar Novo Grupo
          </h2>
          <p className="text-sm text-[#9aa7d7] mb-6">
            De um nome para o grupo e convide a galera com o ID gerado automaticamente.
          </p>
          <div className="space-y-3 text-left">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#7c8fbf]">Nome do grupo</label>
            <input
              type="text"
              placeholder="Nome do Grupo"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full rounded-lg border border-[#28324d] bg-[#111a32]/80 px-4 py-3 text-[#f8fafc] placeholder-[#7c8fbf] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#a855f7] transition"
            />
          </div>
          <div className="mt-6 space-y-3">
            <button
              onClick={handleCreateGroup}
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-[#4338ca] via-[#a855f7] to-[#06b6d4] py-3 font-semibold text-white shadow-lg shadow-[#4338ca33] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              {loading ? 'Criando...' : 'Confirmar'}
            </button>
            <button
              onClick={() => setMode('select')}
              className="w-full rounded-lg border border-transparent bg-transparent py-3 text-sm font-semibold text-[#9aa7d7] transition-colors hover:text-[#f8fafc]"
            >
              Voltar
            </button>
          </div>
        </>
      );
    case 'join':
      return (
        <>
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#4338ca] via-[#a855f7] to-[#06b6d4]">
            Entrar em um Grupo
          </h2>
          <p className="text-sm text-[#9aa7d7] mb-6">
            Cole o ID compartilhado pelo administrador para fazer parte da turma.
          </p>
          <div className="space-y-3 text-left">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#7c8fbf]">ID do grupo</label>
            <input
              type="text"
              placeholder="Cole o ID do Grupo"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              className="w-full rounded-lg border border-[#28324d] bg-[#111a32]/80 px-4 py-3 text-[#f8fafc] placeholder-[#7c8fbf] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#a855f7] transition"
            />
          </div>
          <div className="mt-6 space-y-3">
            <button
              onClick={handleJoinGroup}
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-[#4338ca] via-[#a855f7] to-[#06b6d4] py-3 font-semibold text-white shadow-lg shadow-[#4338ca33] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <button
              onClick={() => setMode('select')}
              className="w-full rounded-lg border border-transparent bg-transparent py-3 text-sm font-semibold text-[#9aa7d7] transition-colors hover:text-[#f8fafc]"
            >
              Voltar
            </button>
          </div>
        </>
      );
    default:
      return (
        <>
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#4338ca] via-[#a855f7] to-[#06b6d4]">
            Junte-se a uma pelada!
          </h2>
          <p className="text-[#9aa7d7] mb-8">
            Crie um grupo para organizar suas partidas ou entre com um ID de convite ja existente.
          </p>
          <div className="grid gap-3">
            <button
              onClick={() => setMode('create')}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#4338ca] via-[#a855f7] to-[#06b6d4] py-3 font-semibold text-white shadow-lg shadow-[#4338ca33] transition-transform hover:-translate-y-0.5"
            >
              <LucidePlusCircle className="h-5 w-5" />
              Criar grupo
            </button>
            <button
              onClick={() => setMode('join')}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#28324d] bg-[#111a32]/80 py-3 font-semibold text-[#f0f4ff] transition duration-150 hover:border-[#a855f7] hover:shadow-[0_12px_32px_rgba(6,182,212,0.2)]"
            >
              <LucideLogIn className="h-5 w-5" />
              Entrar com ID
            </button>
          </div>
        </>
      );
  }
};

    return (
      <div className="relative flex min-h-[60vh] items-center justify-center px-4">
        <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-[#28324d] bg-gradient-to-br from-[#0e162c] via-[#10172f] to-[#060b1a] p-8 text-white shadow-[0_30px_80px_rgba(4,10,35,0.45)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#4338ca33,transparent_55%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,#06b6d455,transparent_65%)]" />
          <div className="relative space-y-6 text-center">
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-[#28324d] bg-[#111a32]/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#9aa7d7] transition-colors hover:border-[#a855f7] hover:text-[#f8fafc]"
              >
                <LucideArrowLeft className="h-4 w-4" />
                Voltar
              </button>
            )}
            {error && (
              <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
            )}
            {renderMode()}
          </div>
        </div>
      </div>
    );
};

export default GroupGate;
