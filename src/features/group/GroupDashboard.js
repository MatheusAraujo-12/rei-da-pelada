import React, { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, collection, query, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { LucideUser, LucideClipboard, LucideShield, LucideAward, LucideImagePlus, LucideLoader2 } from 'lucide-react';
import { db, storage } from '../../services/firebase';

const GroupDashboard = ({ user, groupId, isAdmin, onSetAdminStatus, onCrestUpdated }) => {
    const [groupData, setGroupData] = useState(null);
    const [groupPlayers, setGroupPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploadingCrest, setUploadingCrest] = useState(false);
    const [crestError, setCrestError] = useState('');

    useEffect(() => {
        if (!groupId) {
            setLoading(false);
            return;
        }
        setLoading(true);

        const groupDocRef = doc(db, 'groups', groupId);
        const unsubGroup = onSnapshot(groupDocRef, (docSnap) => {
            setGroupData(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null);
        });

        const playersColRef = collection(db, `groups/${groupId}/players`);
        const unsubPlayers = onSnapshot(query(playersColRef), (snapshot) => {
            setGroupPlayers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, (error) => {
            console.error('Falha ao buscar jogadores do grupo:', error);
            setLoading(false);
        });

        return () => {
            unsubGroup();
            unsubPlayers();
        };
    }, [groupId]);

    const crestInputId = useMemo(() => `group-crest-${groupId || 'unknown'}`, [groupId]);

    const handleCopyId = () => {
        if (!groupId) return;
        navigator.clipboard.writeText(groupId).then(() => {
            alert('ID do grupo copiado!');
        }).catch((err) => {
            console.error('Falha ao copiar ID:', err);
        });
    };

    const handleCrestUpload = async (event) => {
        if (!isAdmin || !groupId) {
            event.target.value = '';
            return;
        }
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setCrestError('Escolha um arquivo de imagem (png, jpg, jpeg).');
            event.target.value = '';
            return;
        }
        const maxBytes = 2.5 * 1024 * 1024;
        if (file.size > maxBytes) {
            setCrestError('Escolha uma imagem de ate 2.5MB.');
            event.target.value = '';
            return;
        }

        setCrestError('');
        setUploadingCrest(true);
        try {
            // Upload do escudo segue a mesma hierarquia dos uploads de usu?rio para refletir as regras de Storage existentes
            const storageRef = ref(storage, `user_uploads/${user.uid}/group_crests/${groupId}`);
            const snapshot = await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
            const downloadURL = await getDownloadURL(snapshot.ref);
            await updateDoc(doc(db, 'groups', groupId), {
                crestURL: downloadURL,
                crestUpdatedAt: serverTimestamp(),
            });
            if (onCrestUpdated) {
                onCrestUpdated(groupId, downloadURL);
            }
        } catch (error) {
            console.error('Falha ao enviar escudo:', error);
            setCrestError('Falha ao enviar o escudo. Tente novamente.');
        } finally {
            setUploadingCrest(false);
            event.target.value = '';
        }
    };

    const handleRemoveCrest = async () => {
        if (!isAdmin || !groupId) return;
        setCrestError('');
        setUploadingCrest(true);
        try {
            await updateDoc(doc(db, 'groups', groupId), {
                crestURL: null,
                crestUpdatedAt: serverTimestamp(),
            });
            if (onCrestUpdated) {
                onCrestUpdated(groupId, null);
            }
        } catch (error) {
            console.error('Falha ao remover escudo:', error);
            setCrestError('Falha ao remover o escudo. Tente novamente.');
        } finally {
            setUploadingCrest(false);
        }
    };

    if (loading) {
        return <div className="text-center p-10 text-white">Carregando dados do grupo...</div>;
    }
    if (!groupData) {
        return <div className="text-center p-10 text-red-500">Grupo nao encontrado.</div>;
    }

    const isOwner = (playerId) => groupData.createdBy === playerId;
    const isPlayerAdmin = (playerId) => groupData.admins?.includes(playerId);
    const crestUrl = groupData.crestURL || '';

    return (
        <div className="relative overflow-hidden rounded-3xl border border-[#28324d] bg-gradient-to-br from-[#0e162c] via-[#10172f] to-[#060b1a] p-6 sm:p-8 text-white shadow-[0_20px_60px_rgba(4,10,35,0.35)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#4338ca22,transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,#06b6d455,transparent_60%)]" />
            <div className="relative space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className="relative w-28 h-28 rounded-3xl border border-[#28324d] bg-[#111a32]/80 flex items-center justify-center overflow-hidden shadow-[0_12px_32px_rgba(4,10,35,0.45)]">
                        {crestUrl ? (
                            <img src={crestUrl} alt={`Escudo do grupo ${groupData.name}`} className="w-full h-full object-cover" />
                        ) : (
                            <LucideShield className="w-14 h-14 text-[#9aa7d7]" />
                        )}
                    </div>
                    <div className="flex-1 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div>
                                <h2 className="text-3xl font-extrabold text-white">{groupData.name}</h2>
                                <p className="mt-2 text-sm text-[#9aa7d7]">Compartilhe o ID para trazer novos jogadores.</p>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-[#cbd5f5]">
                                <span className="rounded-full border border-[#28324d] bg-[#111a32]/80 px-3 py-1 font-semibold">{groupPlayers.length} membros</span>
                            </div>
                        </div>
                        {crestError && (
                            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">{crestError}</div>
                        )}
                        {isAdmin && (
                            <div className="flex flex-wrap items-center gap-3">
                                <input id={crestInputId} type="file" accept="image/*" className="hidden" onChange={handleCrestUpload} />
                                <label
                                    htmlFor={crestInputId}
                                    className={`inline-flex items-center gap-2 rounded-lg border border-[#28324d] bg-[#111a32]/80 px-4 py-2 text-sm font-semibold text-[#f0f4ff] transition-colors ${uploadingCrest ? 'cursor-wait opacity-70' : 'cursor-pointer hover:border-[#06b6d4] hover:text-[#06b6d4]'}`}
                                >
                                    {uploadingCrest ? (
                                        <>
                                            <LucideLoader2 className="h-4 w-4 animate-spin" />
                                            Enviando escudo...
                                        </>
                                    ) : (
                                        <>
                                            <LucideImagePlus className="h-4 w-4" />
                                            Atualizar escudo
                                        </>
                                    )}
                                </label>
                                {crestUrl && !uploadingCrest && (
                                    <button
                                        onClick={handleRemoveCrest}
                                        className="rounded-lg border border-transparent bg-rose-600/80 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-500"
                                        type="button"
                                    >
                                        Remover escudo
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[#7c8fbf]">ID de convite do grupo</label>
                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-3">
                        <input type="text" readOnly value={groupId} className="w-full rounded-lg border border-[#28324d] bg-[#111a32]/80 px-4 py-3 text-[#f0f4ff]" />
                        <button onClick={handleCopyId} className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#4338ca] via-[#a855f7] to-[#06b6d4] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#4338ca33] transition-transform hover:-translate-y-0.5" title="Copiar ID">
                            <LucideClipboard className="h-4 w-4" /> Copiar ID
                        </button>
                    </div>
                </div>

                <div>
                    <h3 className="text-2xl font-semibold text-indigo-100 mb-4">Membros do grupo</h3>
                    <div className="space-y-3">
                        {groupPlayers.length > 0 ? (
                            groupPlayers.map((player) => (
                                <div key={player.id} className="rounded-2xl border border-[#28324d] bg-[#111a32]/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        {isPlayerAdmin(player.id) ? (
                                            isOwner(player.id) ? (
                                                <LucideAward className="text-yellow-300 w-6 h-6" title="Dono do grupo" />
                                            ) : (
                                                <LucideShield className="text-cyan-300 w-6 h-6" title="Administrador" />
                                            )
                                        ) : (
                                            <LucideUser className="text-[#7c8fbf] w-6 h-6" />
                                        )}
                                        <span className="text-white font-semibold">{player.name}</span>
                                    </div>
                                    {isAdmin && !isOwner(player.id) && (
                                        <div>
                                            {isPlayerAdmin(player.id) ? (
                                                <button onClick={() => onSetAdminStatus(player.id, false)} className="text-xs rounded-lg bg-rose-600/80 px-3 py-1.5 font-semibold text-white hover:bg-rose-500">
                                                    Rebaixar
                                                </button>
                                            ) : (
                                                <button onClick={() => onSetAdminStatus(player.id, true)} className="text-xs rounded-lg bg-emerald-600/80 px-3 py-1.5 font-semibold text-white hover:bg-emerald-500">
                                                    Promover a admin
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-[#7c8fbf]">Ainda nao ha jogadores neste grupo.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupDashboard;
