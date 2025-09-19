import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, doc, getDoc, getDocs, query, where, orderBy, updateDoc, deleteDoc, runTransaction, addDoc, arrayRemove, arrayUnion, writeBatch, serverTimestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Importações de Serviços e Componentes
import { auth, db, storage } from './services/firebase';
import AuthScreen from './features/auth/AuthScreen';
import ConfirmationModal from './components/ConfirmationModal';
import PlayerModal from './features/players/PlayerModal';
import PlayerCard from './features/players/PlayerCard';
import PeerReviewModal from './features/players/PeerReviewModal';
import CreatePlayerProfile from './features/players/CreatePlayerProfile';
import EditMatchModal from './features/history/EditMatchModal';
import HallOfFame from './features/history/HallOfFame';
import GroupDashboard from './features/group/GroupDashboard';
import GroupGate from './features/group/GroupGate';
import SessionReportDetail from './features/history/SessionReportDetail';
import SessionHistoryList from './features/history/SessionHistoryList';
import MatchHistory from './features/history/MatchHistory';
import MatchFlow from './features/match/MatchFlow';
import UserDashboard from './features/dashboard/UserDashboard';
import { applyMatchProgressionToPlayers } from './utils/playerProgression';
import { subscribeToGlobalPlayer, getCachedGlobalPlayer } from './utils/playerRealtimeStore';

// Importações de Ícones
import { LucideArrowLeft, LucideUserPlus, LucideUsers, LucideSwords, LucideHistory, LucideTrophy } from 'lucide-react';

export default function AppWrapper() {
    return (
        <div className="app-bg min-h-screen">
            <style>{`
                body { background-color: #0b1220; color: white; }
                .app-bg {
                  background:
                    radial-gradient(60% 40% at 50% -10%, rgba(79,70,229,0.25) 0%, rgba(11,18,32,0) 60%),
                    radial-gradient(50% 35% at 10% 10%, rgba(168,85,247,0.18) 0%, rgba(11,18,32,0) 60%),
                    radial-gradient(40% 35% at 90% 15%, rgba(6,182,212,0.15) 0%, rgba(11,18,32,0) 60%),
                    linear-gradient(180deg, #0b1220 0%, #0b1220 100%);
                  min-height: 100vh;
                }
                .range-slider::-webkit-slider-thumb { background: #6366f1; }
                .range-slider::-moz-range-thumb { background: #6366f1; }
            `}</style>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </div>
    );
}

function App() {
    // Estados Globais
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Estados de Navegação
    const [currentView, setCurrentView] = useState('dashboard');
    const [previousView, setPreviousView] = useState('dashboard');

    // Estados de Dados do Usuário
    const [playerProfile, setPlayerProfile] = useState(null);
    const [userGroups, setUserGroups] = useState([]);

    // Estados de Dados do Grupo Ativo
    const [activeGroupId, setActiveGroupId] = useState(null);
    const [isAdminOfActiveGroup, setIsAdminOfActiveGroup] = useState(false);
    const [players, setPlayers] = useState([]);
    const [matches, setMatches] = useState([]);
    const [savedSessions, setSavedSessions] = useState([]);
    
    // Estados para Modais e Interações de UI
    const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [playerToDelete, setPlayerToDelete] = useState(null);
    const [peerReviewPlayer, setPeerReviewPlayer] = useState(null);
    const [matchToDelete, setMatchToDelete] = useState(null);
    const [sessionToDelete, setSessionToDelete] = useState(null);
    const [editingMatch, setEditingMatch] = useState(null);
    const [viewingSession, setViewingSession] = useState(null);
    const [groupToLeave, setGroupToLeave] = useState(null);

    const globalPlayerSubsRef = useRef(new Map());

    const clearGlobalPlayerSubscriptions = () => {
        globalPlayerSubsRef.current.forEach((unsub) => {
            try { unsub(); } catch (error) { console.error('Falha ao cancelar assinatura global:', error); }
        });
        globalPlayerSubsRef.current.clear();
    };

    const syncGlobalPlayerSubscriptions = (playerList) => {
        const currentMap = globalPlayerSubsRef.current;
        const activeIds = new Set((playerList || []).map(p => p?.id).filter(Boolean));

        Array.from(currentMap.entries()).forEach(([playerId, unsubscribe]) => {
            if (!activeIds.has(playerId)) {
                try { unsubscribe(); } catch (error) { console.error('Falha ao cancelar assinatura global:', error); }
                currentMap.delete(playerId);
            }
        });

        (playerList || []).forEach((player) => {
            if (!player?.id || currentMap.has(player.id)) return;
            const unsubscribe = subscribeToGlobalPlayer({
                db,
                playerId: player.id,
                onChange: (globalData) => {
                    if (!globalData) return;
                    setPlayers(prev => prev.map(p => (p.id === player.id ? { ...p, ...globalData } : p)));
                },
            });
            currentMap.set(player.id, unsubscribe);
        });
    };

    
    const navigate = useNavigate();

    // Efeito para autenticação
    useEffect(() => {
        setIsLoading(true);
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            if (u) {
                setUser(u);
            } else {
                setUser(null);
                setPlayerProfile(null);
                setUserGroups([]);
                setActiveGroupId(null);
                setCurrentView('dashboard');
                setIsLoading(false);
                navigate('/login');
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    // Efeito para carregar dados do usuário logado
    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const playerDocRef = doc(db, 'players', user.uid);
        const unsubPlayer = onSnapshot(playerDocRef, (docSnap) => {
            setPlayerProfile(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null);
        });

        const userDocRef = doc(db, 'users', user.uid);
        const unsubUser = onSnapshot(userDocRef, async (userDocSnap) => {
            const groupIds = userDocSnap.exists() ? userDocSnap.data().groupIds || [] : [];
            if (groupIds.length > 0) {
                const groupPromises = groupIds.map(id => getDoc(doc(db, "groups", id)));
                const groupDocs = await Promise.all(groupPromises);
                const groupsData = groupDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() }));
                setUserGroups(groupsData);
                if (!activeGroupId || !groupIds.includes(activeGroupId)) {
                    setActiveGroupId(groupsData[0]?.id || null);
                }
            } else {
                setUserGroups([]);
                setActiveGroupId(null);
            }
            setIsLoading(false);
        });

        return () => {
            unsubPlayer();
            unsubUser();
        };
    }, [user, activeGroupId]);

    // Efeito para carregar dados do grupo ativo
    useEffect(() => {
        if (!user || !activeGroupId) {
            clearGlobalPlayerSubscriptions();
            setPlayers([]); setMatches([]); setSavedSessions([]); setIsAdminOfActiveGroup(false);
            return;
        }
        const groupDocRef = doc(db, 'groups', activeGroupId);
        const unsubGroup = onSnapshot(groupDocRef, (docSnap) => {
            if (!docSnap.exists()) { setIsAdminOfActiveGroup(false); return; }
            const g = docSnap.data();
            const isOwner = g.createdBy === user.uid;
            const isListed = Array.isArray(g.admins) && g.admins.includes(user.uid);
            setIsAdminOfActiveGroup(isOwner || isListed);
        });
        
        const playersColRef = collection(db, `groups/${activeGroupId}/players`);
        const unsubPlayers = onSnapshot(query(playersColRef), (snapshot) => {
            const groupPlayers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            syncGlobalPlayerSubscriptions(groupPlayers);
            const mergedPlayers = groupPlayers.map((player) => {
                const globalSnapshot = getCachedGlobalPlayer(player.id);
                if (!globalSnapshot) return player;
                const merged = { ...player, ...globalSnapshot };
                if (player.adminOverall !== undefined) {
                    merged.adminOverall = player.adminOverall;
                }
                return merged;
            });
            setPlayers(mergedPlayers);
        });

        const matchesColRef = collection(db, `groups/${activeGroupId}/matches`);
        const mSub = onSnapshot(query(matchesColRef, orderBy('date', 'desc')), s => setMatches(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        
        const sessionsColRef = collection(db, `groups/${activeGroupId}/sessions`);
        const qSessions = query(sessionsColRef, orderBy('date', 'desc'));
        const sSub = onSnapshot(qSessions, s => setSavedSessions(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => {
            unsubGroup();
            unsubPlayers();
            mSub();
            sSub();
            clearGlobalPlayerSubscriptions();
        };
    }, [user, activeGroupId]);
    
    // Funções de manipulação
    
    const syncPlayerProfileToAdminGroups = async (playerId, payload) => {
        try {
            const groupsCollection = collection(db, 'groups');
            const [createdBySnap, adminSnap] = await Promise.all([
                getDocs(query(groupsCollection, where('createdBy', '==', playerId))),
                getDocs(query(groupsCollection, where('admins', 'array-contains', playerId))).catch(() => null),
            ]);

            const groupIds = new Set();
            createdBySnap?.forEach((docSnap) => groupIds.add(docSnap.id));
            adminSnap?.forEach((docSnap) => groupIds.add(docSnap.id));

            await Promise.all(Array.from(groupIds).map(async (groupId) => {
                try {
                    const playersCollection = collection(db, `groups/${groupId}/players`);
                    const directRef = doc(playersCollection, playerId);
                    const directSnap = await getDoc(directRef);
                    const updateTargets = [];

                    if (directSnap.exists()) {
                        updateTargets.push(directRef);
                    } else {
                        const [createdByCandidates, idCandidates] = await Promise.all([
                            getDocs(query(playersCollection, where('createdBy', '==', playerId))).catch(() => null),
                            getDocs(query(playersCollection, where('id', '==', playerId))).catch(() => null),
                        ]);
                        createdByCandidates?.forEach((docSnap) => updateTargets.push(docSnap.ref));
                        idCandidates?.forEach((docSnap) => updateTargets.push(docSnap.ref));
                    }

                    if (updateTargets.length === 0) {
                        updateTargets.push(directRef);
                    }

                    await Promise.all(updateTargets.map((refToUpdate) => setDoc(refToUpdate, payload, { merge: true })));
                } catch (syncError) {
                    console.error('Falha ao sincronizar perfil de jogador no grupo:', groupId, syncError);
                }
            }));
        } catch (syncError) {
            console.error('Falha geral ao buscar grupos administrados:', syncError);
        }
    };

    const handleGroupAssociated = (newGroupIds) => {
        const newActiveId = newGroupIds[newGroupIds.length - 1];
        setActiveGroupId(newActiveId);
        navigateToView('dashboard');
    };

    const handleGroupCrestUpdated = (groupId, crestURL) => {
        if (!groupId) return;
        setUserGroups((prev) => prev.map((group) => (group.id === groupId ? { ...group, crestURL } : group)));
    };

    // eslint-disable-next-line no-unused-vars
   const handleSavePlayer = async (playerData, imageFile = null) => {
        // Cenário 1: Editando um jogador
        if (playerData.id) {
            // ✅ Lógica Inteligente: Verifica se o ID a ser editado é o do próprio usuário
            if (playerData.id === user.uid) {
                // É o perfil global do próprio usuário
                try {
                    let finalPlayerData = { ...playerData };
                    if (imageFile) {
                        const storageRef = ref(storage, `user_uploads/${user.uid}/profile_pictures/${user.uid}`);
                        const snapshot = await uploadBytes(storageRef, imageFile, { contentType: imageFile.type || 'image/jpeg' });
                        finalPlayerData.photoURL = await getDownloadURL(snapshot.ref);
                    }
                    const { id, ...dataToSave } = finalPlayerData;
                    await updateDoc(doc(db, 'players', id), dataToSave);

                    const syncPayload = { ...dataToSave };
                    await syncPlayerProfileToAdminGroups(id, syncPayload);
                    setPlayers(prev => prev.map(p => (p.id === id ? { ...p, ...syncPayload } : p)));
                } catch (e) { console.error("Erro ao ATUALIZAR perfil global:", e); }
                finally { setIsPlayerModalOpen(false); }
            } else {
                // É um jogador avulso dentro de um grupo
                if (!activeGroupId || !isAdminOfActiveGroup) return;
                try {
                    let finalPlayerData = { ...playerData };
                    if (imageFile) {
                        const storageRef = ref(storage, `user_uploads/${user.uid}/group_players/${activeGroupId}/${playerData.id}`);
                        const snapshot = await uploadBytes(storageRef, imageFile, { contentType: imageFile.type || 'image/jpeg' });
                        finalPlayerData.photoURL = await getDownloadURL(snapshot.ref);
                    }
                    const { id, ...dataToSave } = finalPlayerData;
                    await updateDoc(doc(db, `groups/${activeGroupId}/players`, id), dataToSave);
                } catch (e) { console.error("Erro ao ATUALIZAR jogador de grupo:", e); }
                finally { setIsPlayerModalOpen(false); }
            }
        } 
        // Cenário 2: Criando um novo jogador
        else {
            if (playerProfile && isAdminOfActiveGroup && activeGroupId) {
                // ... (lógica para adicionar jogador avulso, sem alterações)
            } else if (!playerProfile && user) {
                // ... (lógica para criar perfil global, sem alterações)
            }
        }
    };

    const handleSavePlayerFixed = async (playerData, imageFile = null) => {
        console.log("handleSavePlayerFixed called", { playerData, imageFile });
        console.log("Current state:", { playerProfile, user, activeGroupId, isAdminOfActiveGroup });

        // Edição de jogador existente
        if (playerData.id) {
            console.log("Editing existing player");
            if (playerData.id === user.uid) {
                console.log("Editing own global profile");
                try {
                    let finalPlayerData = { ...playerData };
                    if (imageFile) {
                        console.log("Uploading profile picture");
                        const storageRef = ref(storage, `user_uploads/${user.uid}/profile_pictures/${user.uid}`);
                        const snapshot = await uploadBytes(storageRef, imageFile, { contentType: imageFile.type || 'image/jpeg' });
                        finalPlayerData.photoURL = await getDownloadURL(snapshot.ref);
                        console.log("Profile picture uploaded:", finalPlayerData.photoURL);
                    }
                    const { id, ...dataToSave } = finalPlayerData;
                    await updateDoc(doc(db, 'players', id), dataToSave);
                    try { setPlayerProfile(prev => ({ ...(prev || {}), ...dataToSave, id })); } catch {}
                    console.log("Global profile updated successfully");
                } catch (e) {
                    console.error('Erro ao atualizar perfil global:', e);
                } finally {
                    setIsPlayerModalOpen(false);
                }
            } else {
                console.log("Editing group player");
                if (!activeGroupId || !isAdminOfActiveGroup) {
                    console.log("Not admin or no active group, returning");
                    return;
                }
                try {
                    let finalPlayerData = { ...playerData };
                    if (imageFile) {
                        console.log("Uploading group player picture");
                        const storageRef = ref(storage, `user_uploads/${user.uid}/group_players/${activeGroupId}/${playerData.id}`);
                        const snapshot = await uploadBytes(storageRef, imageFile, { contentType: imageFile.type || 'image/jpeg' });
                        finalPlayerData.photoURL = await getDownloadURL(snapshot.ref);
                        console.log("Group player picture uploaded:", finalPlayerData.photoURL);
                    }
                    const { id, ...dataToSave } = finalPlayerData;
                    await updateDoc(doc(db, `groups/${activeGroupId}/players`, id), dataToSave);
                    console.log("Group player updated successfully");
                } catch (e) {
                    console.error('Erro ao atualizar jogador de grupo:', e);
                } finally {
                    setIsPlayerModalOpen(false);
                }
            }
            return;
        }

        // Criação de novo jogador
        console.log("Creating new player");
        try {
            if (playerProfile && isAdminOfActiveGroup && activeGroupId) {
                console.log("Admin creating new group player");
                // Admin adicionando jogador ao grupo atual
                const playersColRef = collection(db, `groups/${activeGroupId}/players`);
                const newDocRef = doc(playersColRef);
                let photoURL = null;
                if (imageFile) {
                    console.log("Uploading group player picture");
                    const storageRef = ref(storage, `user_uploads/${user.uid}/group_players/${activeGroupId}/${newDocRef.id}`);
                    const snapshot = await uploadBytes(storageRef, imageFile, { contentType: imageFile.type || 'image/jpeg' });
                    photoURL = await getDownloadURL(snapshot.ref);
                    console.log("Group player picture uploaded:", photoURL);
                }
                const baseProgression = (playerData.progression && typeof playerData.progression === 'object') ? playerData.progression : { matchesPlayed: 0 };
                const dataToSave = { ...playerData, progression: baseProgression, photoURL: photoURL || null, createdBy: user.uid, createdAt: serverTimestamp() };
                await setDoc(newDocRef, dataToSave);
                console.log("Group player created successfully");
            } else if (!playerProfile && user) {
                console.log("User creating their own global profile");
                // Usuário criando o próprio perfil global
                let finalPlayerData = { ...playerData };
                if (imageFile) {
                    console.log("Uploading profile picture");
                    const storageRef = ref(storage, `user_uploads/${user.uid}/profile_pictures/${user.uid}`);
                    const snapshot = await uploadBytes(storageRef, imageFile, { contentType: imageFile.type || 'image/jpeg' });
                    finalPlayerData.photoURL = await getDownloadURL(snapshot.ref);
                    console.log("Profile picture uploaded:", finalPlayerData.photoURL);
                }
                const baseProgression = (finalPlayerData.progression && typeof finalPlayerData.progression === 'object') ? finalPlayerData.progression : { matchesPlayed: 0 };
                await setDoc(doc(db, 'players', user.uid), { ...finalPlayerData, progression: baseProgression, createdAt: serverTimestamp() });
                // Atualiza imediatamente o estado local para concluir o cadastro sem esperar o snapshot
                try { setPlayerProfile({ id: user.uid, ...finalPlayerData }); } catch {}
                console.log("Global profile created successfully");
            } else {
                console.log("No condition met for creating player");
            }
        } catch (e) {
            console.error('Erro ao criar jogador:', e);
            alert('Falha ao salvar o jogador. Verifique sua conexão e tente novamente.');
        } finally {
            setIsPlayerModalOpen(false);
        }
    };

    const openMyProfileModal = () => {
        setEditingPlayer(playerProfile); // Usa o perfil global para preencher o modal
        setIsPlayerModalOpen(true);
    };
    
    const confirmDeletePlayer = async () => {
        if (!activeGroupId || !playerToDelete || !isAdminOfActiveGroup) return;
        try { await deleteDoc(doc(db, `groups/${activeGroupId}/players`, playerToDelete.id)); } 
        catch (e) { console.error("Erro ao apagar jogador:", e); } 
        finally { setPlayerToDelete(null); }
    };

    const confirmDeleteMatch = async () => {
        if(!activeGroupId || !matchToDelete || !isAdminOfActiveGroup) return;
        try { await deleteDoc(doc(db, `groups/${activeGroupId}/matches`, matchToDelete.id)); } 
        catch(e) { console.error("Erro ao apagar partida:", e); } 
        finally { setMatchToDelete(null); }
    };

    const confirmDeleteSession = async () => {
        if (!sessionToDelete || !isAdminOfActiveGroup) return;
        try { await deleteDoc(doc(db, `groups/${activeGroupId}/sessions`, sessionToDelete.id)); } 
        catch (e) { console.error("Erro ao apagar sessão:", e); } 
        finally { setSessionToDelete(null); }
    };

    const handleLeaveGroup = async () => {
        if (!user || !groupToLeave) return;
        const batch = writeBatch(db);
        const userDocRef = doc(db, 'users', user.uid);
        const groupDocRef = doc(db, 'groups', groupToLeave.id);
        try {
            batch.update(userDocRef, { groupIds: arrayRemove(groupToLeave.id) });
            batch.update(groupDocRef, { members: arrayRemove(user.uid) });
            await batch.commit();
        } catch (error) { console.error("Erro ao sair do grupo:", error); alert("Não foi possível sair do grupo."); } 
        finally { setGroupToLeave(null); }
    };
    
    const handleUpdateMatch = async (matchId, newStats) => {
        if (!activeGroupId) return;
        try { await updateDoc(doc(db, `groups/${activeGroupId}/matches`, matchId), { playerStats: newStats }); setEditingMatch(null); } 
        catch (e) { console.error("Erro ao atualizar a partida: ", e); }
    };
    
    const handleSavePeerReview = async (playerToReview, newSkills) => {
        if (!activeGroupId || !user) return;
        const playerRef = doc(db, `groups/${activeGroupId}/players`, playerToReview.id);
        try {
            await runTransaction(db, async (transaction) => {
                const playerDoc = await transaction.get(playerRef);
                if (!playerDoc.exists()) { throw new Error("Documento não existe!"); }
                const currentData = playerDoc.data();
                const currentPeerOverall = currentData.peerOverall || { ratingsCount: 0, skillsSum: {} };
                const newRatingsCount = currentPeerOverall.ratingsCount + 1;
                const newSkillsSum = { ...currentPeerOverall.skillsSum };
                Object.keys(newSkills).forEach(skill => { newSkillsSum[skill] = (newSkillsSum[skill] || 0) + newSkills[skill]; });
                const newAvgSkills = {};
                Object.keys(newSkillsSum).forEach(skill => { newAvgSkills[skill] = Math.round(newSkillsSum[skill] / newRatingsCount); });
                transaction.update(playerRef, { peerOverall: { ratingsCount: newRatingsCount, skillsSum: newSkillsSum, avgSkills: newAvgSkills }});
            });
            alert("Avaliação salva com sucesso!");
        } catch (e) { console.error("Erro ao salvar avaliação:", e); alert("Falha ao salvar avaliação."); }
        finally { setPeerReviewPlayer(null); }
    };

    const handleMatchEnd = async (matchData) => {
        if (!activeGroupId) return null;

        let savedMatch = null;
        try {
            const matchDocRef = await addDoc(collection(db, `groups/${activeGroupId}/matches`), { ...matchData, date: serverTimestamp() });
            savedMatch = { id: matchDocRef.id, ...matchData };
        } catch (e) {
            console.error("Erro ao salvar a partida:", e);
        }

        try {
            await applyMatchProgressionToPlayers({ db, groupId: activeGroupId, matchData });
        } catch (progressionError) {
            console.error('Falha ao aplicar evolucao dos jogadores:', progressionError);
        }

        return savedMatch;
    };

    const handleSessionEnd = async (sessionData) => {
        if (!activeGroupId) { alert("Nenhum grupo ativo para salvar a sessão."); return; }
        try {
            const finalSessionData = { ...sessionData, date: serverTimestamp() };
            const sessionsColRef = collection(db, `groups/${activeGroupId}/sessions`);
            const newSessionRef = await addDoc(sessionsColRef, finalSessionData);
            const sessionForViewing = { id: newSessionRef.id, ...finalSessionData };
            setViewingSession(sessionForViewing);
            navigateToView('sessions');
        } catch (error) { console.error("ERRO DETALHADO AO SALVAR:", error); alert(`ERRO AO SALVAR NO FIRESTORE: ${error.message}`); }
    };
    
    // Botão de impressão: relatório completo das partidas do dia
    /* eslint-disable no-unused-vars, no-useless-escape */
    const handlePrintTodayReport = async () => {
        try {
            const today = new Date();
            const isSameDay = (d) => d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();

            const sessionsToday = savedSessions.filter((s) => {
                if (!s?.date) return false;
                const jsDate = s.date?.seconds ? new Date(s.date.seconds * 1000) : new Date(s.date);
                return isSameDay(jsDate);
            });

            if (sessionsToday.length === 0) { alert('Nenhuma sessão encontrada para hoje.'); return; }

            const sessionsWithMatches = [];
            for (const s of sessionsToday) {
                let matchesDetails = [];
                if (Array.isArray(s.matches) && s.matches.length > 0) {
                    matchesDetails = s.matches;
                } else if (Array.isArray(s.matchIds) && s.matchIds.length > 0 && activeGroupId) {
                    const docs = await Promise.all(
                        s.matchIds.map((id) => (id ? getDoc(doc(db, `groups/${activeGroupId}/matches`, id)) : null))
                    );
                    matchesDetails = docs
                        .filter((d) => d && d.exists())
                        .map((d) => ({ id: d.id, ...d.data() }));
                }
                sessionsWithMatches.push({ session: s, matches: matchesDetails });
            }

            const formatDate = (ts) => {
                const d = ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
                return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
            };

            const htmlParts = [];
            htmlParts.push(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" />
                <title>Relatório das Partidas do Dia</title>
                <style>
                    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; padding: 24px; }
                    h1 { margin: 0 0 12px; }
                    h2 { margin: 24px 0 8px; }
                    table { border-collapse: collapse; width: 100%; margin: 8px 0 16px; }
                    th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
                    th { background: #f4f4f4; text-align: left; }
                    .muted { color: #666; font-size: 12px; }
                    .section { page-break-inside: avoid; }
                    @media print { button { display: none; } }
                </style></head><body>`);

            htmlParts.push(`<h1>Relatório das partidas do dia ${today.toLocaleDateString('pt-BR')}</h1>`);

            for (const { session: s, matches } of sessionsWithMatches) {
                htmlParts.push(`<div class=\"section\">`);
                htmlParts.push(`<h2>Sessão de ${formatDate(s.date)}</h2>`);
                htmlParts.push(`<div class=\"muted\">Partidas: ${matches.length}</div>`);

                if (matches.length === 0) {
                    htmlParts.push(`<p class=\"muted\">Sem partidas registradas nesta sessão.</p>`);
                } else {
                    htmlParts.push(`<table><thead><tr>
                        <th>#</th><th>Time A</th><th>Placar</th><th>Time B</th>
                    </tr></thead><tbody>`);
                    matches.forEach((m, idx) => {
                        let scoreA = 0, scoreB = 0;
                        if (m?.playerStats && m?.teams) {
                            (m.teams.teamA || []).forEach((p) => { scoreA += (m.playerStats[p.id]?.goals || 0); });
                            (m.teams.teamB || []).forEach((p) => { scoreB += (m.playerStats[p.id]?.goals || 0); });
                        }
                        const teamAList = (m.teams?.teamA || []).map((p) => p?.name || '—').join(', ');
                        const teamBList = (m.teams?.teamB || []).map((p) => p?.name || '—').join(', ');
                        htmlParts.push(`<tr>
                            <td>${idx + 1}</td>
                            <td>${teamAList}</td>
                            <td style=\"text-align:center; font-weight:600;\">${scoreA} x ${scoreB}</td>
                            <td>${teamBList}</td>
                        </tr>`);
                    });
                    htmlParts.push(`</tbody></table>`);
                }
                htmlParts.push(`</div>`);
            }

            htmlParts.push(`<div style=\"margin-top:24px;\"><button onclick=\"window.print()\">Imprimir</button></div>`);
            htmlParts.push(`</body></html>`);

            const printWin = window.open('', '_blank');
            if (!printWin) { alert('Bloqueador de pop-up ativo. Permita pop-ups para imprimir.'); return; }
            printWin.document.open();
            printWin.document.write(htmlParts.join(''));
            printWin.document.close();
            printWin.focus();
            setTimeout(() => { try { printWin.print(); } catch {} }, 300);
        } catch (e) {
            console.error('Falha ao gerar relatório do dia:', e);
            alert('Não foi possível gerar o relatório das partidas do dia.');
        }
    };

    // Relatório do dia (somente resumo agregado, sem listar cada partida)
    const handlePrintTodaySummary = async () => {
        try {
            const today = new Date();
            const isSameDay = (d) => d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();

            const sessionsToday = savedSessions.filter((s) => {
                if (!s?.date) return false;
                const jsDate = s.date?.seconds ? new Date(s.date.seconds * 1000) : new Date(s.date);
                return isSameDay(jsDate);
            });

            if (sessionsToday.length === 0) { alert('Nenhuma sessão encontrada para hoje.'); return; }

            // Carrega detalhes das partidas por sessão
            const sessionsWithMatches = [];
            for (const s of sessionsToday) {
                let matchesDetails = [];
                if (Array.isArray(s.matches) && s.matches.length > 0) {
                    matchesDetails = s.matches;
                } else if (Array.isArray(s.matchIds) && s.matchIds.length > 0 && activeGroupId) {
                    const docs = await Promise.all(
                        s.matchIds.map((id) => (id ? getDoc(doc(db, `groups/${activeGroupId}/matches`, id)) : null))
                    );
                    matchesDetails = docs
                        .filter((d) => d && d.exists())
                        .map((d) => ({ id: d.id, ...d.data() }));
                }
                sessionsWithMatches.push({ session: s, matches: matchesDetails });
            }

            // Agrega estatísticas do dia
            const stats = {};
            const ensurePlayer = (id, name) => {
                if (!stats[id]) stats[id] = { name: name || 'Desconhecido', wins: 0, draws: 0, losses: 0, goals: 0, assists: 0, dribbles: 0, tackles: 0 };
                if (name && (!stats[id].name || stats[id].name === 'Desconhecido')) stats[id].name = name;
            };
            for (const { matches } of sessionsWithMatches) {
                for (const m of matches) {
                    const teamA = m?.teams?.teamA || [];
                    const teamB = m?.teams?.teamB || [];
                    const teamAIds = teamA.map(p => p?.id);
                    const teamBIds = teamB.map(p => p?.id);
                    let scoreA = 0, scoreB = 0;
                    if (m?.playerStats) {
                        for (const pid of Object.keys(m.playerStats)) {
                            const st = m.playerStats[pid] || {};
                            if (typeof st.goals === 'number') {
                                if (teamAIds.includes(pid)) scoreA += st.goals; else if (teamBIds.includes(pid)) scoreB += st.goals;
                            }
                        }
                    }
                    if (scoreA > scoreB) {
                        teamA.forEach(p => { ensurePlayer(p.id, p.name); stats[p.id].wins++; });
                        teamB.forEach(p => { ensurePlayer(p.id, p.name); stats[p.id].losses++; });
                    } else if (scoreB > scoreA) {
                        teamB.forEach(p => { ensurePlayer(p.id, p.name); stats[p.id].wins++; });
                        teamA.forEach(p => { ensurePlayer(p.id, p.name); stats[p.id].losses++; });
                    } else {
                        teamA.forEach(p => { ensurePlayer(p.id, p.name); stats[p.id].draws++; });
                        teamB.forEach(p => { ensurePlayer(p.id, p.name); stats[p.id].draws++; });
                    }
                    if (m?.playerStats) {
                        for (const pid of Object.keys(m.playerStats)) {
                            const st = m.playerStats[pid] || {};
                            const pInfo = [...teamA, ...teamB].find(pp => pp?.id === pid);
                            ensurePlayer(pid, pInfo?.name);
                            stats[pid].goals += Number(st.goals || 0);
                            stats[pid].assists += Number(st.assists || 0);
                            stats[pid].dribbles += Number(st.dribbles || 0);
                            stats[pid].tackles += Number(st.tackles || 0);
                        }
                    }
                }
            }
            const ranking = Object.values(stats).sort((a,b) => (b.wins - a.wins) || (b.goals - a.goals) || (b.assists - a.assists));

            // HTML simples para imprimir
            const htmlParts = [];
            htmlParts.push(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" />
                <title>Relatório do Dia</title>
                <style>
                    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; padding: 24px; }
                    h1 { margin: 0 0 16px; }
                    table { border-collapse: collapse; width: 100%; margin: 8px 0 16px; }
                    th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
                    th { background: #f4f4f4; text-align: left; }
                    @media print { button { display: none; } }
                </style></head><body>`);
            htmlParts.push(`<h1>Resumo do dia ${today.toLocaleDateString('pt-BR')}</h1>`);
            if (ranking.length === 0) {
                htmlParts.push('<p>Sem partidas registradas hoje.</p>');
            } else {
                htmlParts.push(`<table><thead><tr>
                    <th>Jogador</th><th>V</th><th>E</th><th>D</th><th>Gols</th><th>Assist.</th><th>Dribles</th><th>Desarmes</th>
                </tr></thead><tbody>`);
                ranking.forEach(p => {
                    htmlParts.push(`<tr>
                        <td>${p.name}</td>
                        <td style="text-align:center;">${p.wins}</td>
                        <td style="text-align:center;">${p.draws}</td>
                        <td style="text-align:center;">${p.losses}</td>
                        <td style="text-align:center;">${p.goals}</td>
                        <td style="text-align:center;">${p.assists}</td>
                        <td style="text-align:center;">${p.dribbles}</td>
                        <td style="text-align:center;">${p.tackles}</td>
                    </tr>`);
                });
                htmlParts.push(`</tbody></table>`);
            }
            htmlParts.push(`<div style="margin-top:24px;"><button onclick="window.print()">Imprimir</button></div>`);
            htmlParts.push(`</body></html>`);

            const printWin = window.open('', '_blank');
            if (!printWin) { alert('Bloqueador de pop-up ativo. Permita pop-ups para imprimir.'); return; }
            printWin.document.open();
            printWin.document.write(htmlParts.join(''));
            printWin.document.close();
            printWin.focus();
            setTimeout(() => { try { printWin.print(); } catch {} }, 300);
        } catch (e) {
            console.error('Falha ao gerar relatório do dia:', e);
            alert('Não foi possível gerar o relatório do dia.');
        }
    };
    /* eslint-enable */

    const openEditModal = (p) => { setEditingPlayer(p); setIsPlayerModalOpen(true); };
    const openAddModal = () => { setEditingPlayer(null); setIsPlayerModalOpen(true); };
    const handleLogout = () => signOut(auth);
    
    const navigateToView = (view) => {
        if (view !== currentView) {
            setPreviousView(currentView);
            setCurrentView(view);
        }
    };
    
    const handleEnterGroup = (groupId) => {
        setActiveGroupId(groupId);
        navigateToView('players'); 
    };

    const renderContent = () => {
        if (isLoading) return <div className="text-center p-10 text-white">A carregar...</div>;
        if (!user) return <AuthScreen />;
        if (!playerProfile) return <CreatePlayerProfile user={user} onSave={handleSavePlayerFixed} />;
        
        const showNavBar = currentView !== 'dashboard' && currentView !== 'groupGate';
        let mainComponent;

        if (userGroups.length === 0) {
            return <GroupGate user={user} playerProfile={playerProfile} onGroupAssociated={handleGroupAssociated} />;
        }
        
        switch(currentView) {
            case 'groupGate':
                mainComponent = <GroupGate user={user} playerProfile={playerProfile} onGroupAssociated={handleGroupAssociated} onBackToDashboard={() => navigateToView('dashboard')} />;
                break;
            case 'players':
                mainComponent = <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">{isAdminOfActiveGroup && <button onClick={openAddModal} className="w-full max-w-[280px] mx-auto h-[400px] bg-gray-800/20 border-4 border-dashed border-gray-700 rounded-2xl flex flex-col items-center justify-center text-gray-500 hover:border-yellow-400 hover:text-indigo-300 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"><LucideUserPlus className="w-20 h-20" /><span className="mt-4 text-lg font-semibold">Adicionar Jogador</span></button>}{players.map(p => <PlayerCard key={p.id} player={p} onEdit={openEditModal} onDelete={setPlayerToDelete} onOpenPeerReview={setPeerReviewPlayer} isAdmin={isAdminOfActiveGroup}/>)}</div>;
                break;
            case 'match':
                mainComponent = isAdminOfActiveGroup ? <MatchFlow players={players} groupId={activeGroupId} onMatchEnd={handleMatchEnd} onSessionEnd={handleSessionEnd} /> : <div>Apenas administradores podem iniciar uma partida.</div>;
                break;
            case 'sessions':
                mainComponent = viewingSession ? (
                    <SessionReportDetail session={{...viewingSession, groupId: activeGroupId}} onBack={() => setViewingSession(null)} />
                ) : (
                    <SessionHistoryList
                        sessions={savedSessions}
                        onSelectSession={setViewingSession}
                        onDeleteSession={setSessionToDelete}
                        isAdmin={isAdminOfActiveGroup}
                    />
                );
                break;
            case 'history':
                mainComponent = isAdminOfActiveGroup ? <MatchHistory matches={matches} onEditMatch={setEditingMatch} onDeleteMatch={setMatchToDelete}/> : null;
                break;
            case 'hall_of_fame':
                mainComponent = <HallOfFame players={players} matches={matches} />;
                break;
            case 'group':
                mainComponent = (
                    <GroupDashboard
                        user={user}
                        groupId={activeGroupId}
                        isAdmin={isAdminOfActiveGroup}
                        onCrestUpdated={handleGroupCrestUpdated}
                        onSetAdminStatus={async (targetUserId, makeAdmin) => {
                            try {
                                const groupDocRef = doc(db, 'groups', activeGroupId);
                                const snap = await getDoc(groupDocRef);
                                if (!snap.exists()) return;
                                const data = snap.data();
                                if (data.createdBy !== user.uid) { alert('Apenas o dono do grupo pode gerenciar administradores.'); return; }
                                await updateDoc(groupDocRef, makeAdmin ? { admins: arrayUnion(targetUserId) } : { admins: arrayRemove(targetUserId) });
                            } catch (e) { console.error('Erro ao atualizar admins:', e); alert('Falha ao atualizar administradores.'); }
                        }}
                    />
                );
                break;
            case 'dashboard':
            default:
                return <UserDashboard 
                    playerProfile={playerProfile} 
                    groups={userGroups} 
                    activeGroupId={activeGroupId} // ✅ Garante que esta prop seja passada
                    onEnterGroup={handleEnterGroup}
                    onNavigate={navigateToView}
                    onGoToGroupGate={() => navigateToView('groupGate')}
                    onLogout={handleLogout}
                    onLeaveGroup={setGroupToLeave}
                    onEditProfile={openMyProfileModal}
                />;
        }

        return (
            <>
                {showNavBar && (
                    <div className="sticky top-4 z-40 mb-8 px-4">
                        <nav className="max-w-4xl mx-auto bg-gray-900/80 backdrop-blur-sm border border-indigo-800 rounded-2xl shadow-lg flex justify-between items-center px-2 nav-scroll">
                            <button onClick={() => setCurrentView(previousView)} className="py-2 px-3 sm:px-4 font-bold text-sm text-gray-300 hover:text-indigo-400 flex items-center gap-2">
                                <LucideArrowLeft size={16} /> Voltar
                            </button>
                            <div className="flex items-center justify-center gap-1 sm:gap-2 px-1 flex-nowrap">
                                <button onClick={() => navigateToView('players')} className={`py-3 px-2 sm:px-4 font-bold text-xs sm:text-sm transition-colors duration-200 ${currentView === 'players' ? 'text-indigo-300' : 'text-gray-300 hover:text-indigo-400'}`}><LucideUsers className="inline-block sm:mr-1" /> <span className="hidden sm:inline">Jogadores</span></button>
                                {isAdminOfActiveGroup && <button onClick={() => navigateToView('match')} className={`py-3 px-2 sm:px-4 font-bold text-xs sm:text-sm transition-colors duration-200 ${currentView === 'match' ? 'text-indigo-300' : 'text-gray-300 hover:text-indigo-400'}`}><LucideSwords className="inline-block sm:mr-1" /> <span className="hidden sm:inline">Partida</span></button>}
                                <button onClick={() => { navigateToView('sessions'); setViewingSession(null); }} className={`py-3 px-2 sm:px-4 font-bold text-xs sm:text-sm transition-colors duration-200 ${currentView === 'sessions' ? 'text-indigo-300' : 'text-gray-300 hover:text-indigo-400'}`}><LucideHistory className="inline-block sm:mr-1" /> <span className="hidden sm:inline">Sessões</span></button>
                                {isAdminOfActiveGroup && <button onClick={() => navigateToView('history')} className={`py-3 px-2 sm:px-4 font-bold text-xs sm:text-sm transition-colors duration-200 ${currentView === 'history' ? 'text-indigo-300' : 'text-gray-300 hover:text-indigo-400'}`}><LucideHistory className="inline-block sm:mr-1" /> <span className="hidden sm:inline">Partidas</span></button>}
                                <button onClick={() => navigateToView('hall_of_fame')} className={`py-3 px-2 sm:px-4 font-bold text-xs sm:text-sm transition-colors duration-200 ${currentView === 'hall_of_fame' ? 'text-indigo-300' : 'text-gray-300 hover:text-indigo-400'}`}><LucideTrophy className="inline-block sm:mr-1" /> <span className="hidden sm:inline">Hall da Fama</span></button>
                                <button onClick={() => navigateToView('group')} className={`py-3 px-2 sm:px-4 font-bold text-xs sm:text-sm transition-colors duration-200 ${currentView === 'group' ? 'text-indigo-300' : 'text-gray-300 hover:text-indigo-400'}`}><LucideUsers className="inline-block sm:mr-1" /> <span className="hidden sm:inline">Meu Grupo</span></button>
                            </div>
                            <button onClick={() => navigateToView('dashboard')} className="py-2 px-3 sm:px-4 font-bold text-sm text-gray-300 hover:text-indigo-400">Lobby</button>
                        </nav>
                    </div>
                )}
                <main>{mainComponent}</main>
            </>
        );
    };

    return (
        <div className="app-bg min-h-screen">
            <header className="mb-8 flex flex-col items-center justify-center text-center pt-4 sm:pt-6 lg:pt-8">
                <h1 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-widest" style={{ textShadow: '0 0 18px rgba(99,102,241,0.45)' }}>REI DA PELADA</h1>
            </header>
            <div className="p-4 sm:p-6 lg:p-8">
                {renderContent()}
                <PlayerModal isOpen={isPlayerModalOpen} onClose={() => setIsPlayerModalOpen(false)} onSave={handleSavePlayerFixed} player={editingPlayer} isAdmin={isAdminOfActiveGroup} />
                <ConfirmationModal isOpen={!!playerToDelete} title="Confirmar Exclusão" message={`Tem certeza que deseja apagar o jogador ${playerToDelete?.name}?`} onConfirm={confirmDeletePlayer} onClose={() => setPlayerToDelete(null)} />
                <ConfirmationModal isOpen={!!matchToDelete} title="Confirmar Exclusão" message="Tem certeza que deseja apagar esta partida?" onConfirm={confirmDeleteMatch} onClose={() => setMatchToDelete(null)} />
                <ConfirmationModal isOpen={!!sessionToDelete} title="Confirmar Exclusão" message="Tem certeza que deseja apagar esta sessão?" onConfirm={confirmDeleteSession} onClose={() => setSessionToDelete(null)} />
                <ConfirmationModal isOpen={!!groupToLeave} title="Sair do Grupo" message={`Tem certeza que deseja sair do grupo "${groupToLeave?.name}"?`} onConfirm={handleLeaveGroup} onClose={() => setGroupToLeave(null)} />
                <PeerReviewModal isOpen={!!peerReviewPlayer} player={peerReviewPlayer} onClose={() => setPeerReviewPlayer(null)} onSave={handleSavePeerReview}/>
                <EditMatchModal isOpen={!!editingMatch} match={editingMatch} players={players} onClose={() => setEditingMatch(null)} onSave={handleUpdateMatch} />
            </div>
        </div>
    );
}
