import React, { useState, useEffect } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';

// Importações de Serviços e Utilitários
import { auth, db, appId } from './services/firebase';

// Importações de Componentes de Features e UI
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

// Importações de Funções do Firebase
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, getDoc, runTransaction, orderBy } from 'firebase/firestore';

// Importações de Ícones
import { 
    LucideUserPlus, LucideUsers, LucideSwords, 
    LucideHistory, LucideTrophy, LucideLogOut 
} from 'lucide-react';

// --- COMPONENTE PRINCIPAL ---

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
    const [userData, setUserData] = useState({ groupId: null, isAdmin: false });
    const [players, setPlayers] = useState([]);
    const [matches, setMatches] = useState([]);
    const [playerProfile, setPlayerProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentView, setCurrentView] = useState('players');
    const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [playerToDelete, setPlayerToDelete] = useState(null);
    const [peerReviewPlayer, setPeerReviewPlayer] = useState(null);
    const [matchToDelete, setMatchToDelete] = useState(null);
    const [savedSessions, setSavedSessions] = useState([]);
    const [viewingSession, setViewingSession] = useState(null);
    const [editingMatch, setEditingMatch] = useState(null);
    const [sessionToDelete, setSessionToDelete] = useState(null);
    
    const navigate = useNavigate();
    const { groupId, isAdmin } = userData;

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            if (u) {
                setUser(u);
                const userDocRef = doc(db, `artifacts/${appId}/users/${u.uid}`);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists() && userDocSnap.data().groupId) {
                    setUserData(prev => ({ ...prev, groupId: userDocSnap.data().groupId }));
                } else {
                    setUserData({ groupId: null, isAdmin: false });
                    setIsLoading(false);
                }
            } else {
                setUser(null); setUserData({ groupId: null, isAdmin: false }); setIsLoading(false);
                navigate('/login');
            }
        });
       return () => unsubscribe();
    }, [navigate]);

    useEffect(() => {
        if (!user || !groupId) {
            setPlayers([]);
            setMatches([]);
            setSavedSessions([]);
            if (user) setIsLoading(false);
            return;
        }

        setIsLoading(true);
        let unsubGroup, unsubPlayers, mSub, sessionsSub;

        const groupDocRef = doc(db, `artifacts/${appId}/public/data/groups/${groupId}`);
        unsubGroup = onSnapshot(groupDocRef, (docSnap) => {
            setUserData(prev => ({ ...prev, isAdmin: docSnap.exists() && docSnap.data().createdBy === user.uid }));
        });

        const playersColRef = collection(db, `artifacts/${appId}/public/data/groups/${groupId}/players`);
        unsubPlayers = onSnapshot(query(playersColRef), (snapshot) => {
            const allPlayers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setPlayers(allPlayers);
            setPlayerProfile(allPlayers.find(p => p.createdBy === user.uid) || null);
            setIsLoading(false);
        });
        
        const matchesColRef = collection(db, `artifacts/${appId}/public/data/groups/${groupId}/matches`);
        mSub = onSnapshot(query(matchesColRef, orderBy('date', 'desc')), (s) => setMatches(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        
        const sessionsColRef = collection(db, `artifacts/${appId}/public/data/groups/${groupId}/sessions`);
        const qSessions = query(sessionsColRef, orderBy('date', 'desc'));
        sessionsSub = onSnapshot(qSessions, (snapshot) => {
            setSavedSessions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { 
            if(unsubGroup) unsubGroup(); 
            if(unsubPlayers) unsubPlayers();
            if(mSub) mSub(); 
            if(sessionsSub) sessionsSub();
        };
    }, [user, groupId]);
    
    const handleSavePlayer = async (playerData) => {
        if (!groupId || !user) return;
        const { id, ...data } = playerData;
        try {
            if (id) {
                if (isAdmin) {
                    await updateDoc(doc(db, `artifacts/${appId}/public/data/groups/${groupId}/players`, id), data);
                }
            } else {
                await addDoc(collection(db, `artifacts/${appId}/public/data/groups/${groupId}/players`), { ...data, createdBy: user.uid });
            }
        } catch (e) { console.error("Erro ao salvar jogador:", e); }
        finally {
            setIsPlayerModalOpen(false);
        }
    };

    const confirmDeletePlayer = async () => {
        if (!groupId || !playerToDelete || !isAdmin) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/groups/${groupId}/players`, playerToDelete.id));
        } catch (e) { console.error("Erro ao apagar jogador:", e); } finally { setPlayerToDelete(null); }
    };

    const confirmDeleteMatch = async () => {
        if(!groupId || !matchToDelete || !isAdmin) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/groups/${groupId}/matches`, matchToDelete.id));
        } catch(e) {
            console.error("Erro ao apagar partida:", e);
        } finally {
            setMatchToDelete(null);
        }
    };

    const confirmDeleteSession = async () => {
        if (!groupId || !sessionToDelete || !isAdmin) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/groups/${groupId}/sessions`, sessionToDelete.id));
        } catch (e) {
            console.error("Erro ao apagar sessão:", e);
        } finally {
            setSessionToDelete(null);
        }
    };

    const handleUpdateMatch = async (matchId, newStats) => {
        if (!groupId) return;
        try {
            await updateDoc(doc(db, `artifacts/${appId}/public/data/groups/${groupId}/matches`, matchId), { playerStats: newStats });
            setEditingMatch(null);
        } catch (e) { console.error("Erro ao atualizar a partida: ", e); }
    };
    
    const handleSavePeerReview = async (playerToReview, newSkills) => {
        if (!groupId || !user) return;
        const playerRef = doc(db, `artifacts/${appId}/public/data/groups/${groupId}/players`, playerToReview.id);
        
        try {
            await runTransaction(db, async (transaction) => {
                const playerDoc = await transaction.get(playerRef);
                if (!playerDoc.exists()) { throw new Error("Documento não existe!"); }
                
                const currentData = playerDoc.data();
                const currentPeerOverall = currentData.peerOverall || { ratingsCount: 0, skillsSum: {} };
                
                const newRatingsCount = currentPeerOverall.ratingsCount + 1;
                const newSkillsSum = { ...currentPeerOverall.skillsSum };

                Object.keys(newSkills).forEach(skill => {
                    newSkillsSum[skill] = (newSkillsSum[skill] || 0) + newSkills[skill];
                });

                const newAvgSkills = {};
                Object.keys(newSkillsSum).forEach(skill => {
                    newAvgSkills[skill] = Math.round(newSkillsSum[skill] / newRatingsCount);
                });
                
                transaction.update(playerRef, { 
                    peerOverall: {
                        ratingsCount: newRatingsCount,
                        skillsSum: newSkillsSum,
                        avgSkills: newAvgSkills
                    }
                });
            });
            alert("Avaliação salva com sucesso!");
        } catch (e) {
            console.error("Erro ao salvar avaliação:", e);
            alert("Falha ao salvar avaliação.");
        }
        finally {
            setPeerReviewPlayer(null);
        }
    };

    const handleMatchEnd = async (matchData) => {
        if (!groupId) return null;
        try {
            const matchDocRef = await addDoc(collection(db, `artifacts/${appId}/public/data/groups/${groupId}/matches`), matchData);
            return { id: matchDocRef.id, ...matchData };
        } catch (e) { 
            console.error("Erro ao salvar a partida:", e);
            return null;
        }
    };

    const handleSessionEnd = () => {
        setCurrentView('sessions');
        setViewingSession(null);
    };
    
    const openEditModal = (p) => { setEditingPlayer(p); setIsPlayerModalOpen(true); };
    const openAddModal = () => { setEditingPlayer(null); setIsPlayerModalOpen(true); };
    const handleLogout = () => signOut(auth);

    const renderContent = () => {
        if (isLoading) return <div className="text-center p-10 text-white">Carregando...</div>;
        if (!user) return <AuthScreen />;
        if (!groupId) return <GroupGate user={user} onGroupAssociated={(id) => setUserData(prev => ({ ...prev, groupId: id }))} />;
        if (!playerProfile) return <CreatePlayerProfile user={user} onSave={handleSavePlayer} />;

        if (currentView === 'sessions' && viewingSession) {
            return <SessionReportDetail session={viewingSession} onBack={() => setViewingSession(null)} />;
        }

        return (
            <>
                <nav className="flex justify-center border-b border-gray-700 mb-8 flex-wrap">
                    <button onClick={() => setCurrentView('players')} className={`py-2 px-3 sm:py-4 sm:px-6 font-bold text-sm sm:text-lg transition-colors duration-200 ${currentView === 'players' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-yellow-500'}`}><LucideUsers className="inline-block mr-1 sm:mr-2" /> Jogadores</button>
                    {isAdmin && <button onClick={() => setCurrentView('match')} className={`py-2 px-3 sm:py-4 sm:px-6 font-bold text-sm sm:text-lg transition-colors duration-200 ${currentView === 'match' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-yellow-500'}`}><LucideSwords className="inline-block mr-1 sm:mr-2" /> Partida</button>}
                    <button onClick={() => { setCurrentView('sessions'); setViewingSession(null); }} className={`py-2 px-3 sm:py-4 sm:px-6 font-bold text-sm sm:text-lg transition-colors duration-200 ${currentView === 'sessions' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-yellow-500'}`}><LucideHistory className="inline-block mr-1 sm:mr-2" /> Sessões</button>
                    {isAdmin && <button onClick={() => setCurrentView('history')} className={`py-2 px-3 sm:py-4 sm:px-6 font-bold text-sm sm:text-lg transition-colors duration-200 ${currentView === 'history' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-yellow-500'}`}><LucideHistory className="inline-block mr-1 sm:mr-2" /> Partidas</button>}
                    <button onClick={() => setCurrentView('hall_of_fame')} className={`py-2 px-3 sm:py-4 sm:px-6 font-bold text-sm sm:text-lg transition-colors duration-200 ${currentView === 'hall_of_fame' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-yellow-500'}`}><LucideTrophy className="inline-block mr-1 sm:mr-2" /> Hall da Fama</button>
                    <button onClick={() => setCurrentView('group')} className={`py-2 px-3 sm:py-4 sm:px-6 font-bold text-sm sm:text-lg transition-colors duration-200 ${currentView === 'group' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-yellow-500'}`}><LucideUsers className="inline-block mr-1 sm:mr-2" /> Meu Grupo</button>
                    <button onClick={handleLogout} className="py-2 px-3 sm:py-4 sm:px-6 font-bold text-sm sm:text-lg text-red-500 hover:text-red-400 transition-colors duration-200"><LucideLogOut className="inline-block mr-1 sm:mr-2" /> Sair</button>
                </nav>

                <main>
                    {currentView === 'players' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                            {isAdmin && <div onClick={openAddModal} className="cursor-pointer w-full max-w-[280px] mx-auto h-[400px] border-4 border-dashed border-gray-700 rounded-2xl flex items-center justify-center text-gray-500 hover:border-yellow-400 hover:text-yellow-400 transition-colors duration-300"><LucideUserPlus className="w-20 h-20" /></div>}
                            {players.map(p => <PlayerCard key={p.id} player={p} onEdit={openEditModal} onDelete={setPlayerToDelete} onOpenPeerReview={setPeerReviewPlayer} isAdmin={isAdmin}/>)}
                        </div>
                    )}
                    
                    {currentView === 'match' && isAdmin && <MatchFlow players={players} groupId={groupId} onMatchEnd={handleMatchEnd} onSessionEnd={handleSessionEnd} />}
                    
                    {currentView === 'sessions' && !viewingSession && (
                        <SessionHistoryList sessions={savedSessions} onSelectSession={setViewingSession} onDeleteSession={setSessionToDelete} isAdmin={isAdmin} />
                    )}

                    {currentView === 'history' && isAdmin && (
                       <MatchHistory matches={matches} onEditMatch={setEditingMatch} onDeleteMatch={setMatchToDelete}/>
                    )}
                    
                    {currentView === 'hall_of_fame' && <HallOfFame players={players} matches={matches} />}
                    {currentView === 'group' && <GroupDashboard user={user} groupId={groupId} />}

                </main>

                <PlayerModal isOpen={isPlayerModalOpen} onClose={() => setIsPlayerModalOpen(false)} onSave={handleSavePlayer} player={editingPlayer} isAdmin={isAdmin} />
                <ConfirmationModal isOpen={!!playerToDelete} title="Confirmar Exclusão" message={`Tem certeza que deseja apagar o jogador ${playerToDelete?.name}?`} onConfirm={confirmDeletePlayer} onClose={() => setPlayerToDelete(null)} />
                <ConfirmationModal isOpen={!!matchToDelete} title="Confirmar Exclusão" message={`Tem certeza que deseja apagar esta partida? Esta ação não pode ser desfeita.`} onConfirm={confirmDeleteMatch} onClose={() => setMatchToDelete(null)} />
                <ConfirmationModal isOpen={!!sessionToDelete} title="Confirmar Exclusão" message={`Tem certeza que deseja apagar esta sessão permanentemente? Todas as estatísticas dela serão perdidas.`} onConfirm={confirmDeleteSession} onClose={() => setSessionToDelete(null)} />
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