import React, { useState, useEffect } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, doc, getDoc, query, orderBy, setDoc, updateDoc, deleteDoc, runTransaction, addDoc, arrayRemove, writeBatch, serverTimestamp } from 'firebase/firestore';
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
            setPlayers([]); setMatches([]); setSavedSessions([]); setIsAdminOfActiveGroup(false);
            return;
        }
        const groupDocRef = doc(db, 'groups', activeGroupId);
        const unsubGroup = onSnapshot(groupDocRef, (docSnap) => setIsAdminOfActiveGroup(docSnap.exists() && docSnap.data().createdBy === user.uid));
        
        const playersColRef = collection(db, `groups/${activeGroupId}/players`);
        const unsubPlayers = onSnapshot(query(playersColRef), s => setPlayers(s.docs.map(d => ({ id: d.id, ...d.data() }))));

        const matchesColRef = collection(db, `groups/${activeGroupId}/matches`);
        const mSub = onSnapshot(query(matchesColRef, orderBy('date', 'desc')), s => setMatches(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        
        const sessionsColRef = collection(db, `groups/${activeGroupId}/sessions`);
        const qSessions = query(sessionsColRef, orderBy('date', 'desc'));
        const sSub = onSnapshot(qSessions, s => setSavedSessions(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => { unsubGroup(); unsubPlayers(); mSub(); sSub(); };
    }, [user, activeGroupId]);
    
    // Funções de manipulação
    const handleProfileCreated = (newProfile) => { setPlayerProfile({ id: user.uid, ...newProfile }); };
    
    const handleGroupAssociated = (newGroupIds) => {
        const newActiveId = newGroupIds[newGroupIds.length - 1];
        setActiveGroupId(newActiveId);
        navigateToView('dashboard');
    };

   const handleSavePlayer = async (playerData, imageFile = null) => {
        // Cenário 1: Editando um jogador
        if (playerData.id) {
            // ✅ Lógica Inteligente: Verifica se o ID a ser editado é o do próprio usuário
            if (playerData.id === user.uid) {
                // É o perfil global do próprio usuário
                try {
                    let finalPlayerData = { ...playerData };
                    if (imageFile) {
                        const storageRef = ref(storage, `profile_pictures/${user.uid}`);
                        const snapshot = await uploadBytes(storageRef, imageFile);
                        finalPlayerData.photoURL = await getDownloadURL(snapshot.ref);
                    }
                    const { id, ...dataToSave } = finalPlayerData;
                    await updateDoc(doc(db, 'players', id), dataToSave);
                } catch (e) { console.error("Erro ao ATUALIZAR perfil global:", e); }
                finally { setIsPlayerModalOpen(false); }
            } else {
                // É um jogador avulso dentro de um grupo
                if (!activeGroupId || !isAdminOfActiveGroup) return;
                try {
                    let finalPlayerData = { ...playerData };
                    if (imageFile) {
                        const storageRef = ref(storage, `group_players/${activeGroupId}/${playerData.id}`);
                        const snapshot = await uploadBytes(storageRef, imageFile);
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
        try {
            const matchDocRef = await addDoc(collection(db, `groups/${activeGroupId}/matches`), { ...matchData, date: serverTimestamp() });
            return { id: matchDocRef.id, ...matchData };
        } catch (e) { console.error("Erro ao salvar a partida:", e); return null; }
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
        if (!playerProfile) return <CreatePlayerProfile user={user} onSave={handleSavePlayer} />;
        
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
                mainComponent = viewingSession ? <SessionReportDetail session={{...viewingSession, groupId: activeGroupId}} onBack={() => setViewingSession(null)} /> : <SessionHistoryList sessions={savedSessions} onSelectSession={setViewingSession} onDeleteSession={setSessionToDelete} isAdmin={isAdminOfActiveGroup} />;
                break;
            case 'history':
                mainComponent = isAdminOfActiveGroup ? <MatchHistory matches={matches} onEditMatch={setEditingMatch} onDeleteMatch={setMatchToDelete}/> : null;
                break;
            case 'hall_of_fame':
                mainComponent = <HallOfFame players={players} matches={matches} />;
                break;
            case 'group':
                mainComponent = <GroupDashboard groupId={activeGroupId} />;
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
                <PlayerModal isOpen={isPlayerModalOpen} onClose={() => setIsPlayerModalOpen(false)} onSave={handleSavePlayer} player={editingPlayer} isAdmin={isAdminOfActiveGroup} />
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

