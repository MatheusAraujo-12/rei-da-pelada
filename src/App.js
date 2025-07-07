import React, { useState, useEffect } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, doc, getDoc, query, orderBy, setDoc, updateDoc, deleteDoc, runTransaction, addDoc, arrayRemove, writeBatch, serverTimestamp } from 'firebase/firestore';

// Importações de todos os componentes e serviços
import { auth, db } from './services/firebase';
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

// CORRIGIDO
import { LucideArrowLeft, LucideUserPlus, LucideUsers, LucideSwords, LucideHistory, LucideTrophy } from 'lucide-react';

export default function AppWrapper() {
    return (
        <div className="app-bg min-h-screen">
            <style>{`body { background-color: #0c1116; color: white; } .app-bg { background-image: radial-gradient(circle at 50% 50%, rgba(12, 17, 22, 0.8) 0%, rgba(12, 17, 22, 1) 70%), url('https://www.transparenttextures.com/patterns/dark-grass.png'); min-height: 100vh; } .range-slider::-webkit-slider-thumb { background: #f59e0b; } .range-slider::-moz-range-thumb { background: #f59e0b; }`}</style>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </div>
    );
}

function App() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentView, setCurrentView] = useState('dashboard');
    const [previousView, setPreviousView] = useState('dashboard');
    const [playerProfile, setPlayerProfile] = useState(null);
    const [userGroups, setUserGroups] = useState([]);
    const [activeGroupId, setActiveGroupId] = useState(null);
    const [isAdminOfActiveGroup, setIsAdminOfActiveGroup] = useState(false);
    const [players, setPlayers] = useState([]);
    const [matches, setMatches] = useState([]);
    const [savedSessions, setSavedSessions] = useState([]);
    const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [playerToDelete, setPlayerToDelete] = useState(null);
    const [peerReviewPlayer, setPeerReviewPlayer] = useState(null);
    const [matchToDelete, setMatchToDelete] = useState(null);
    const [editingMatch, setEditingMatch] = useState(null);
    const [viewingSession, setViewingSession] = useState(null);
    const [groupToLeave, setGroupToLeave] = useState(null);
    const [sessionToDelete, setSessionToDelete] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            if (u) {
                if (!user) setUser(u);
            } else {
                setUser(null); setPlayerProfile(null); setUserGroups([]); setActiveGroupId(null);
                navigate('/login');
            }
        });
        return () => unsubscribe();
    },  [navigate, user]);

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
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
    }, [user]);

    useEffect(() => {
        if (!user || !activeGroupId) {
            setPlayers([]); setMatches([]); setSavedSessions([]); setIsAdminOfActiveGroup(false);
            return;
        }
        const groupDocRef = doc(db, 'groups', activeGroupId);
        const unsubGroup = onSnapshot(groupDocRef, (docSnap) => {
            setIsAdminOfActiveGroup(docSnap.exists() && docSnap.data().createdBy === user.uid);
        });
        const playersColRef = collection(db, `groups/${activeGroupId}/players`);
        const unsubPlayers = onSnapshot(query(playersColRef), s => setPlayers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        const matchesColRef = collection(db, `groups/${activeGroupId}/matches`);
        const mSub = onSnapshot(query(matchesColRef, orderBy('date', 'desc')), s => setMatches(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        const sessionsColRef = collection(db, `groups/${activeGroupId}/sessions`);
        const qSessions = query(sessionsColRef, orderBy('date', 'desc'));
        const sSub = onSnapshot(qSessions, s => setSavedSessions(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => { unsubGroup(); unsubPlayers(); mSub(); sSub(); };
    }, [user, activeGroupId]);
    
    const handleProfileCreated = (newProfile) => {
        setPlayerProfile({ id: user.uid, ...newProfile });
    };
    
    const handleGroupAssociated = async (newGroupIds) => {
        const newActiveId = newGroupIds[newGroupIds.length - 1];
        setActiveGroupId(newActiveId);
        navigateToView('dashboard');
    };

    const handleSavePlayer = async (playerData) => {
        if (playerData.id) {
            if (!activeGroupId || !isAdminOfActiveGroup) return;
            const { id, ...data } = playerData;
            try {
                await updateDoc(doc(db, `groups/${activeGroupId}/players`, id), data);
            } catch (e) { console.error("Erro ao ATUALIZAR jogador:", e); }
            finally { setIsPlayerModalOpen(false); }
        } else {
            if (playerProfile && isAdminOfActiveGroup && activeGroupId) {
                try {
                    await addDoc(collection(db, `groups/${activeGroupId}/players`), playerData);
                } catch (e) { console.error("Erro ao ADICIONAR novo jogador ao grupo:", e); }
                finally { setIsPlayerModalOpen(false); }
            } else if (!playerProfile && user) {
                try {
                    await setDoc(doc(db, 'players', user.uid), playerData);
                    handleProfileCreated(playerData);
                } catch (e) { console.error("Erro ao CRIAR perfil global:", e); }
            }
        }
    };
    
    const confirmDeletePlayer = async () => {
        if (!activeGroupId || !playerToDelete || !isAdminOfActiveGroup) return;
        try {
            await deleteDoc(doc(db, `groups/${activeGroupId}/players`, playerToDelete.id));
        } catch (e) { console.error("Erro ao apagar jogador:", e); } finally { setPlayerToDelete(null); }
    };

    const confirmDeleteMatch = async () => {
        if(!activeGroupId || !matchToDelete || !isAdminOfActiveGroup) return;
        try {
            await deleteDoc(doc(db, `groups/${activeGroupId}/matches`, matchToDelete.id));
        } catch(e) {
            console.error("Erro ao apagar partida:", e);
        } finally {
            setMatchToDelete(null);
        }
    };

    const confirmDeleteSession = async () => {
        if (!sessionToDelete || !isAdminOfActiveGroup) return;
        try {
            await deleteDoc(doc(db, `groups/${activeGroupId}/sessions`, sessionToDelete.id));
        } catch (e) { console.error("Erro ao apagar sessão:", e); } 
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
        } catch (error) {
            console.error("Erro ao sair do grupo:", error);
            alert("Não foi possível sair do grupo.");
        } finally {
            setGroupToLeave(null);
        }
    };
    
    const handleUpdateMatch = async (matchId, newStats) => {
        if (!activeGroupId) return;
        try {
            await updateDoc(doc(db, `groups/${activeGroupId}/matches`, matchId), { playerStats: newStats });
            setEditingMatch(null);
        } catch (e) { console.error("Erro ao atualizar a partida: ", e); }
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
        } catch (e) {
            console.error("Erro ao salvar avaliação:", e);
            alert("Falha ao salvar avaliação.");
        }
        finally { setPeerReviewPlayer(null); }
    };

    const handleMatchEnd = async (matchData) => {
        if (!activeGroupId) return null;
        try {
            const matchDocRef = await addDoc(collection(db, `groups/${activeGroupId}/matches`), { ...matchData, date: serverTimestamp() });
            return { id: matchDocRef.id, ...matchData };
        } catch (e) { 
            console.error("Erro ao salvar a partida:", e);
            return null;
        }
    };

    const handleSessionEnd = async (sessionData) => {
        if (!activeGroupId) {
            alert("Nenhum grupo ativo para salvar a sessão.");
            return;
        }
        try {
            const finalSessionData = {
                ...sessionData,
                date: serverTimestamp(),
            };
            const sessionsColRef = collection(db, `groups/${activeGroupId}/sessions`);
            await addDoc(sessionsColRef, finalSessionData);
            navigateToView('sessions');
        } catch (error) {
            console.error("ERRO DETALHADO AO SALVAR:", error);
            alert(`ERRO AO SALVAR NO FIRESTORE: ${error.message}`);
        }
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
        
        let mainComponent;
        const showNavBar = currentView !== 'dashboard' && currentView !== 'groupGate';

        switch(currentView) {
            case 'groupGate':
                mainComponent = <GroupGate 
                    user={user} 
                    onGroupAssociated={handleGroupAssociated} 
                    onBackToDashboard={userGroups.length > 0 ? () => navigateToView('dashboard') : null}
                />;
                break;
            case 'players':
                mainComponent = <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">{isAdminOfActiveGroup && <div onClick={openAddModal} className="cursor-pointer w-full max-w-[280px] mx-auto h-[400px] border-4 border-dashed border-gray-700 rounded-2xl flex items-center justify-center text-gray-500 hover:border-yellow-400 hover:text-yellow-400 transition-colors duration-300"><LucideUserPlus className="w-20 h-20" /></div>}{players.map(p => <PlayerCard key={p.id} player={p} onEdit={openEditModal} onDelete={setPlayerToDelete} onOpenPeerReview={setPeerReviewPlayer} isAdmin={isAdminOfActiveGroup}/>)}</div>;
                break;
            case 'match':
                mainComponent = isAdminOfActiveGroup ? <MatchFlow players={players} groupId={activeGroupId} onMatchEnd={handleMatchEnd} onSessionEnd={handleSessionEnd} /> : <div>Apenas administradores podem iniciar uma partida.</div>;
                break;
            case 'sessions':
                mainComponent = viewingSession 
                    ? <SessionReportDetail session={viewingSession} onBack={() => setViewingSession(null)} />
                    : <SessionHistoryList sessions={savedSessions} onSelectSession={setViewingSession} onDeleteSession={setSessionToDelete} isAdmin={isAdminOfActiveGroup} />;
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
                mainComponent = <UserDashboard 
                    playerProfile={playerProfile} 
                    groups={userGroups} 
                    activeGroupId={activeGroupId}
                    onEnterGroup={handleEnterGroup}
                    onNavigate={navigateToView}
                    onGoToGroupGate={() => navigateToView('groupGate')}
                    onLogout={handleLogout}
                    onLeaveGroup={setGroupToLeave}
                />;
                break;
        }

        return (
            <>
                {showNavBar && (
                    <nav className="flex justify-between items-center border-b border-gray-700 mb-8 flex-wrap">
                        <div>
                            <button onClick={() => setCurrentView(previousView)} className="py-2 px-3 sm:py-4 sm:px-6 font-bold text-sm sm:text-lg text-gray-400 hover:text-yellow-500 flex items-center gap-2">
                                <LucideArrowLeft /> Voltar
                            </button>
                        </div>
                        <div className="flex items-center justify-center flex-grow">
                            <button onClick={() => navigateToView('players')} className={`py-2 px-3 sm:py-4 sm:px-6 font-bold text-sm sm:text-lg transition-colors duration-200 ${currentView === 'players' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-yellow-500'}`}><LucideUsers className="inline-block mr-1 sm:mr-2" /> Jogadores</button>
                            {isAdminOfActiveGroup && <button onClick={() => navigateToView('match')} className={`py-2 px-3 sm:py-4 sm:px-6 font-bold text-sm sm:text-lg transition-colors duration-200 ${currentView === 'match' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-yellow-500'}`}><LucideSwords className="inline-block mr-1 sm:mr-2" /> Partida</button>}
                            <button onClick={() => { navigateToView('sessions'); setViewingSession(null); }} className={`py-2 px-3 sm:py-4 sm:px-6 font-bold text-sm sm:text-lg transition-colors duration-200 ${currentView === 'sessions' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-yellow-500'}`}><LucideHistory className="inline-block mr-1 sm:mr-2" /> Sessões</button>
                            
                            {/* ✅ BOTÃO 'PARTIDAS' RESTAURADO AQUI */}
                            {isAdminOfActiveGroup && <button onClick={() => navigateToView('history')} className={`py-2 px-3 sm:py-4 sm:px-6 font-bold text-sm sm:text-lg transition-colors duration-200 ${currentView === 'history' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-yellow-500'}`}><LucideHistory className="inline-block mr-1 sm:mr-2" /> Partidas</button>}
                            
                            <button onClick={() => navigateToView('hall_of_fame')} className={`py-2 px-3 sm:py-4 sm:px-6 font-bold text-sm sm:text-lg transition-colors duration-200 ${currentView === 'hall_of_fame' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-yellow-500'}`}><LucideTrophy className="inline-block mr-1 sm:mr-2" /> Hall da Fama</button>
                            <button onClick={() => navigateToView('group')} className={`py-2 px-3 sm:py-4 sm:px-6 font-bold text-sm sm:text-lg transition-colors duration-200 ${currentView === 'group' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-yellow-500'}`}><LucideUsers className="inline-block mr-1 sm:mr-2" /> Meu Grupo</button>
                        </div>
                        <div>
                             <button onClick={() => navigateToView('dashboard')} className="py-2 px-3 sm:py-4 sm:px-6 font-bold text-sm sm:text-lg text-gray-400 hover:text-yellow-500">Lobby</button>
                        </div>
                    </nav>
                )}
                <main>{mainComponent}</main>
                
                <PlayerModal isOpen={isPlayerModalOpen} onClose={() => setIsPlayerModalOpen(false)} onSave={handleSavePlayer} player={editingPlayer} isAdmin={isAdminOfActiveGroup} />
                <ConfirmationModal isOpen={!!playerToDelete} title="Confirmar Exclusão" message={`Tem certeza que deseja apagar o jogador ${playerToDelete?.name}?`} onConfirm={confirmDeletePlayer} onClose={() => setPlayerToDelete(null)} />
                <ConfirmationModal isOpen={!!matchToDelete} title="Confirmar Exclusão" message="Tem certeza que deseja apagar esta partida?" onConfirm={confirmDeleteMatch} onClose={() => setMatchToDelete(null)} />
                <ConfirmationModal isOpen={!!sessionToDelete} title="Confirmar Exclusão" message="Tem certeza que deseja apagar esta sessão?" onConfirm={confirmDeleteSession} onClose={() => setSessionToDelete(null)} />
                <ConfirmationModal isOpen={!!groupToLeave} title="Sair do Grupo" message={`Tem certeza que deseja sair do grupo "${groupToLeave?.name}"?`} onConfirm={handleLeaveGroup} onClose={() => setGroupToLeave(null)} />
                <PeerReviewModal isOpen={!!peerReviewPlayer} player={peerReviewPlayer} onClose={() => setPeerReviewPlayer(null)} onSave={handleSavePeerReview}/>
                <EditMatchModal isOpen={!!editingMatch} match={editingMatch} players={players} onClose={() => setEditingMatch(null)} onSave={handleUpdateMatch} />
            </>
        );
    };

    return (
        <div className="app-bg">
            <header className="mb-8 flex flex-col items-center justify-center text-center pt-4 sm:pt-6 lg:pt-8">
                <h1 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-widest" style={{ textShadow: '0 0 15px rgba(250, 204, 21, 0.5)' }}>Rei da <span className="text-yellow-400">Pelada</span></h1>
                <p className="text-center text-gray-400 mt-2">Gerencie, compita e domine o campo.</p>
            </header>
            <div className="p-4 sm:p-6 lg:p-8">
                {renderContent()}
            </div>
        </div>
    );
}