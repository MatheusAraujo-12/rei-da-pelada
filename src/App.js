import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
// ✅ 'where' e 'writeBatch' removidos, pois não são mais usados
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, getDoc, setDoc, runTransaction, serverTimestamp, orderBy } from 'firebase/firestore';
import { 
    LucideUser, LucideUserPlus, LucideX, LucideShield, LucideGoal, LucideHand, 
    LucideEdit, LucideTrash2, LucideUsers, LucideSwords, LucideUndo, LucideTrophy, 
    LucideAward, LucideHandshake, LucideShieldCheck, LucideFrown, LucidePlay, 
    LucidePause, LucidePlus, LucideClipboard, LucideLogIn, LucidePlusCircle, 
    LucideHistory, LucideLogOut
    // ✅ 'LucideStar' removido, pois não é mais usado
} from 'lucide-react';
import * as Tone from 'tone';

// --- Configurações Iniciais ---
const firebaseConfig = {
    apiKey: "AIzaSyAoqy2Tnwmp_sfU903bvG_EcyJ9QXXu9a4",
    authDomain: "sample-firebase-ai-app-198c0.firebaseapp.com",
    projectId: "sample-firebase-ai-app-198c0",
    storageBucket: "sample-firebase-ai-app-198c0.firebasestorage.app",
    messagingSenderId: "838973313914",
    appId: "1:838973313914:web:c4a1c229ebaefdeb023cc3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'default-fut-app';

// --- Funções Utilitárias ---
const calculateOverall = (skills) => {
    if (!skills) return 0;
    const skillValues = Object.values(skills).map(Number).filter(v => !isNaN(v));
    if (skillValues.length === 0) return 0;
    return Math.round(skillValues.reduce((acc, val) => acc + val, 0) / skillValues.length);
};

// --- Componentes ---

const AuthScreen = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [joinId, setJoinId] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                if (joinId.trim()) {
                    const groupDocRef = doc(db, `artifacts/${appId}/public/data/groups/${joinId.trim()}`);
                    const groupSnap = await getDoc(groupDocRef);
                    if (groupSnap.exists()) {
                        const userDocRef = doc(db, `artifacts/${appId}/users/${userCredential.user.uid}`);
                        await setDoc(userDocRef, { groupId: joinId.trim() });
                    } else {
                        setError("ID do Grupo inválido. Verifique e tente novamente.");
                        await userCredential.user.delete();
                        return;
                    }
                }
            }
            navigate('/');
        } catch (err) {
            let friendlyError = err.message.replace('Firebase: ', '').replace('Error ','');
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
                friendlyError = "Email ou senha incorretos. Verifique e tente novamente.";
            }
            setError(friendlyError);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900">
            <div className="w-full max-w-md text-center bg-gray-800 rounded-2xl p-8 border border-gray-700">
                <h2 className="text-3xl font-bold text-yellow-400 mb-6">{isLogin ? 'Login' : 'Cadastre-se'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white" required />
                    <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white" required />
                    {!isLogin && (<input type="text" placeholder="ID de Convite do Grupo (Opcional)" value={joinId} onChange={(e) => setJoinId(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white" />)}
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg">{isLogin ? 'Entrar' : 'Criar Conta'}</button>
                </form>
                <button onClick={() => setIsLogin(!isLogin)} className="text-gray-400 mt-4 text-sm hover:text-white">{isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça o login'}</button>
            </div>
        </div>
    );
};

const ConfirmationModal = ({ isOpen, title, message, onConfirm, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm border border-yellow-500/30">
                <h3 className="text-xl font-bold text-yellow-400 mb-4">{title}</h3>
                <p className="text-gray-300 mb-6">{message}</p>
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 transition-colors">Cancelar</button>
                    <button onClick={onConfirm} className="py-2 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors">Confirmar</button>
                </div>
            </div>
        </div>
    );
};

const PlayerModal = ({ isOpen, onClose, onSave, player, isAdmin }) => {
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [position, setPosition] = useState('Linha');
    const [detailedPosition, setDetailedPosition] = useState('Meio-Campo');
    const [preferredFoot, setPreferredFoot] = useState('Direita');
    const [preferredSide, setPreferredSide] = useState('Qualquer');
    const initialLineSkills = useMemo(() => ({ finalizacao: 50, drible: 50, velocidade: 50, folego: 50, passe: 50, desarme: 50 }), []);
    const initialGkSkills = useMemo(() => ({ reflexo: 50, posicionamento: 50, lancamento: 50 }), []);
    const [skills, setSkills] = useState(initialLineSkills);
    const [adminSkills, setAdminSkills] = useState(null);

    useEffect(() => {
        if (player) {
            setName(player.name);
            setAge(player.age);
            setPosition(player.position);
            setSkills(player.selfOverall);
            setDetailedPosition(player.detailedPosition || 'Meio-Campo');
            setPreferredFoot(player.preferredFoot || 'Direita');
            setPreferredSide(player.preferredSide || 'Qualquer');
            if (isAdmin) {
                setAdminSkills(player.adminOverall || player.selfOverall);
            }
        } else {
            setName('');
            setAge('');
            setPosition('Linha');
            setSkills(initialLineSkills);
            setDetailedPosition('Meio-Campo');
            setPreferredFoot('Direita');
            setPreferredSide('Qualquer');
            if(isAdmin) setAdminSkills(initialLineSkills);
        }
    }, [player, isOpen, isAdmin, initialLineSkills, initialGkSkills]);

    useEffect(() => {
        if (!isOpen) return;
        const newSkills = position === 'Goleiro' ? initialGkSkills : initialLineSkills;
        if (player && player.position === position) {
            setSkills(player.selfOverall);
            if(isAdmin) setAdminSkills(player.adminOverall || player.selfOverall);
        } else if (!player) {
            setSkills(newSkills);
            if(isAdmin) setAdminSkills(newSkills);
        }
    }, [position, player, isOpen, isAdmin, initialGkSkills, initialLineSkills]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (name && age && position) {
            onSave({ 
                id: player?.id, 
                name, 
                age: Number(age), 
                position, 
                selfOverall: skills, 
                adminOverall: isAdmin ? adminSkills : player?.adminOverall,
                detailedPosition: position === 'Linha' ? detailedPosition : null,
                preferredFoot,
                preferredSide
            });
            onClose();
        } else {
            alert("Por favor, preencha todos os campos.");
        }
    };

    const handleAdminSkillChange = (skill, value) => setAdminSkills(prev => ({ ...prev, [skill]: Number(value) }));
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-full overflow-y-auto text-white border border-yellow-400/30">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-yellow-400">{player ? 'Editar Jogador' : 'Novo Craque'}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors"><LucideX className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-yellow-400 mb-3">Dados Básicos</h3>
                    <div><label className="block text-sm font-medium text-gray-300 mb-1">Nome</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none transition" /></div>
                    <div><label className="block text-sm font-medium text-gray-300 mb-1">Idade</label><input type="number" value={age} onChange={e => setAge(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none transition" /></div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Posição Geral</label>
                        <select value={position} onChange={e => setPosition(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none transition">
                            <option>Linha</option>
                            <option>Goleiro</option>
                        </select>
                    </div>
                     {position === 'Linha' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Posição Específica</label>
                            <select value={detailedPosition} onChange={e => setDetailedPosition(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white">
                                <option>Defensor</option>
                                <option>Volante</option>
                                <option>Meio-Campo</option>
                                <option>Ponta</option>
                                <option>Atacante</option>
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Perna de Preferência</label>
                        <select value={preferredFoot} onChange={e => setPreferredFoot(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white">
                            <option>Direita</option>
                            <option>Esquerda</option>
                            <option>Ambidestro</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Lado Preferido do Campo</label>
                        <select value={preferredSide} onChange={e => setPreferredSide(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white">
                            <option>Direito</option>
                            <option>Esquerdo</option>
                            <option>Central</option>
                            <option>Qualquer</option>
                        </select>
                    </div>
                </div>
                {isAdmin && adminSkills && (
                    <div className="pt-4 mt-4 border-t border-gray-700">
                        <h3 className="text-lg font-semibold text-cyan-400 mb-3">Overall do Administrador</h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             {Object.entries(adminSkills).map(([skill, value]) => (<div key={`admin-${skill}`}><label className="capitalize flex items-center text-sm font-medium text-gray-300 mb-1">{skill.replace('_', ' ')}</label><div className="flex items-center space-x-3"><input type="range" min="1" max="99" value={value} onChange={e => handleAdminSkillChange(skill, e.target.value)} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-slider" /><span className="text-cyan-400 font-bold w-8 text-center">{value}</span></div></div>))}
                         </div>
                    </div>
                )}
                <div className="mt-8 flex justify-end"><button onClick={handleSave} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-6 rounded-lg transition-all transform hover:scale-105">Salvar</button></div>
            </div>
        </div>
    );
};

const PlayerCard = ({ player, onEdit, onDelete, onOpenPeerReview, isAdmin }) => {
    const selfOverall = calculateOverall(player.selfOverall);
    const peerOverall = player.peerOverall ? calculateOverall(player.peerOverall.avgSkills) : 0;
    const adminOverall = player.adminOverall ? calculateOverall(player.adminOverall) : 0;
    
    const skillAcronyms = {
        finalizacao: "FIN", drible: "DRI", velocidade: "VEL", folego: "FOL", passe: "PAS", desarme: "DES",
        reflexo: "REF", posicionamento: "POS", lancamento: "LAN"
    };

    return (
        <div className="bg-gradient-to-b from-gray-800 via-gray-900 to-black rounded-2xl p-1 shadow-lg border border-yellow-400/20 transition-all duration-300 transform hover:scale-105 hover:shadow-yellow-400/20 relative overflow-hidden group">
            <div className="bg-gradient-to-b from-transparent to-black/50 p-4">
                <div className="flex justify-between items-start">
                    <div className="text-left">
                        <p className="text-5xl font-black text-yellow-400">{selfOverall}</p>
                        <p className="font-bold text-white -mt-1">{player.detailedPosition || player.position}</p>
                    </div>
                    <div className="text-right space-y-1">
                        {peerOverall > 0 && (
                            <>
                                <p className="text-3xl font-bold text-cyan-400">{peerOverall}</p>
                                <p className="text-xs text-cyan-500">OVR Galera</p>
                            </>
                        )}
                        {isAdmin && adminOverall > 0 && (
                            <>
                                <p className="text-3xl font-bold text-green-400 mt-2">{adminOverall}</p>
                                <p className="text-xs text-green-500">OVR Admin</p>
                            </>
                        )}
                    </div>
                </div>
                
                <div className="w-24 h-24 bg-gray-700/50 rounded-full flex items-center justify-center border-2 border-yellow-400/30 mx-auto mt-[-1rem]"><LucideUser className="w-16 h-16 text-gray-500" /></div>
                <div className="text-center mt-2"><h3 className="text-2xl font-extrabold text-white tracking-wider uppercase">{player.name}</h3></div>
                
                <div className="text-center text-xs text-gray-400 my-2">
                    <span>{player.preferredSide || 'Qualquer Lado'} • </span>
                    <span>Perna {player.preferredFoot || 'Direita'}</span>
                </div>

                <hr className="border-yellow-400/30 my-3" />
                
                <div className="grid grid-cols-3 gap-x-2 gap-y-3 text-center">
                    {Object.entries(player.selfOverall).map(([skill, value]) => (
                        <div key={skill} className="flex items-center justify-center gap-2"><p className="text-2xl font-bold text-white">{value}</p><p className="text-sm font-semibold text-yellow-400">{skillAcronyms[skill]}</p></div>
                    ))}
                </div>
                
                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {isAdmin && (
                        <>
                            <button onClick={() => onEdit(player)} className="p-2 bg-gray-700/50 hover:bg-yellow-400/80 rounded-full text-white hover:text-black" title="Editar"><LucideEdit className="w-4 h-4" /></button>
                            <button onClick={() => onDelete(player)} className="p-2 bg-gray-700/50 hover:bg-red-600/80 rounded-full text-white" title="Apagar"><LucideTrash2 className="w-4 h-4" /></button>
                        </>
                    )}
                    <button onClick={() => onOpenPeerReview(player)} className="p-2 bg-gray-700/50 hover:bg-cyan-500/80 rounded-full text-white" title="Avaliar Jogador"><LucideUsers className="w-4 h-4" /></button>
                </div>
            </div>
        </div>
    );
};

const PeerReviewModal = ({ isOpen, player, onClose, onSave }) => {
    const [skills, setSkills] = useState({});

    useEffect(() => {
        if (player && isOpen) {
             setSkills(player.selfOverall);
        }
    }, [player, isOpen]);

    if (!isOpen || !player) return null;

    const handleSkillChange = (skill, value) => {
        setSkills(prev => ({ ...prev, [skill]: Number(value) }));
    };

    const handleSave = () => {
        onSave(player, skills);
        onClose();
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
             <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-full overflow-y-auto text-white border border-cyan-400/30">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-cyan-400">Avaliar {player.name}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors"><LucideX className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4">
                     {Object.entries(skills).map(([skill, value]) => (
                        <div key={skill}>
                            <label className="capitalize flex items-center text-sm font-medium text-gray-300 mb-1">{skill.replace('_', ' ')}</label>
                            <div className="flex items-center space-x-3">
                                <input type="range" min="1" max="99" value={value} onChange={e => handleSkillChange(skill, e.target.value)} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-slider" />
                                <span className="text-cyan-400 font-bold w-8 text-center">{value}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-8 flex justify-end">
                    <button onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-2 px-6 rounded-lg">Salvar Avaliação</button>
                </div>
             </div>
        </div>
    );
};

const CreatePlayerProfile = ({ onSave, user }) => {
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [position, setPosition] = useState('Linha');
    const [detailedPosition, setDetailedPosition] = useState('Meio-Campo');
    const [preferredFoot, setPreferredFoot] = useState('Direita');
    const [preferredSide, setPreferredSide] = useState('Qualquer');

    const initialLineSkills = useMemo(() => ({ finalizacao: 50, drible: 50, velocidade: 50, folego: 50, passe: 50, desarme: 50 }), []);
    const initialGkSkills = useMemo(() => ({ reflexo: 50, posicionamento: 50, lancamento: 50 }), []);
    const [skills, setSkills] = useState(initialLineSkills);

    useEffect(() => {
        setSkills(position === 'Goleiro' ? initialGkSkills : initialLineSkills);
    }, [position, initialGkSkills, initialLineSkills]);

    const handleSave = () => {
       if (name && age && position) {
            const playerData = {
                name,
                age: Number(age),
                position,
                selfOverall: skills,
                createdBy: user.uid,
                detailedPosition: position === 'Linha' ? detailedPosition : null,
                preferredFoot,
                preferredSide,
            };
            onSave(playerData);
        } else {
            alert("Por favor, preencha todos os campos obrigatórios.");
        }
    };
    
    const handleSkillChange = (skill, value) => setSkills(prev => ({ ...prev, [skill]: Number(value) }));

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-md text-center bg-gray-900/50 rounded-2xl p-8 border border-gray-700">
                <h2 className="text-3xl font-bold text-yellow-400 mb-6">Crie seu Perfil de Jogador</h2>
                <p className="text-gray-400 mb-8">Preencha seus dados para entrar na pelada.</p>
                <div className="space-y-4 text-left">
                    <input type="text" placeholder="Seu Nome ou Apelido" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white" />
                    <input type="number" placeholder="Sua Idade" value={age} onChange={e => setAge(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white" />
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Posição Geral</label>
                        <select value={position} onChange={e => setPosition(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white">
                            <option>Linha</option>
                            <option>Goleiro</option>
                        </select>
                    </div>

                    {position === 'Linha' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Posição Específica</label>
                            <select value={detailedPosition} onChange={e => setDetailedPosition(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white">
                                <option>Defensor</option>
                                <option>Volante</option>
                                <option>Meio-Campo</option>
                                <option>Ponta</option>
                                <option>Atacante</option>
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Perna de Preferência</label>
                        <select value={preferredFoot} onChange={e => setPreferredFoot(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white">
                            <option>Direita</option>
                            <option>Esquerda</option>
                            <option>Ambidestro</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Lado Preferido do Campo</label>
                        <select value={preferredSide} onChange={e => setPreferredSide(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white">
                            <option>Direito</option>
                            <option>Esquerdo</option>
                            <option>Central</option>
                            <option>Qualquer</option>
                        </select>
                    </div>
                    
                    <div className="pt-4 text-left">
                        <h3 className="text-lg font-semibold text-yellow-400 mb-3">Autoavaliação de Habilidades</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {Object.entries(skills).map(([skill, value]) => (
                                <div key={skill}>
                                    <label className="capitalize flex items-center text-sm font-medium text-gray-300 mb-1">{skill.replace('_', ' ')}</label>
                                    <div className="flex items-center space-x-3">
                                        <input type="range" min="1" max="99" value={value} onChange={e => handleSkillChange(skill, e.target.value)} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-slider" />
                                        <span className="text-yellow-400 font-bold w-8 text-center">{value}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="mt-8">
                    <button onClick={handleSave} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg">Criar Perfil</button>
                </div>
            </div>
        </div>
    );
};

const StatButton = ({ Icon, count, onClick, colorClass, label }) => (
    <button title={label} onClick={onClick} className={`relative w-10 h-10 flex items-center justify-center rounded-lg ${colorClass} transition-transform transform active:scale-90`}>
        <Icon className="w-5 h-5" />
        <div className="absolute -top-2 -right-2 bg-white text-black text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-gray-800">
            {count}
        </div>
    </button>
);

const LiveMatchTracker = ({ teams, onEndMatch, durationInMinutes }) => {
    const [timeLeft, setTimeLeft] = useState(durationInMinutes * 60);
    const [isPaused, setIsPaused] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [history, setHistory] = useState([]);
    const intervalRef = useRef(null);
    const synth = useRef(null);

    useEffect(() => { synth.current = new Tone.Synth().toDestination(); }, []);
    useEffect(() => {
        if (!isPaused && timeLeft > 0) {
            intervalRef.current = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (timeLeft === 0) {
            clearInterval(intervalRef.current);
            synth.current.triggerAttackRelease("C5", "0.5");
            setTimeout(() => synth.current.triggerAttackRelease("C5", "1"), 600);
        }
        return () => clearInterval(intervalRef.current);
    }, [isPaused, timeLeft]);

    const togglePause = () => setIsPaused(prev => !prev);
    const confirmAddMinute = () => { setTimeLeft(prev => prev + 60); setShowConfirm(false); };
    const formatTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const initialStats = useMemo(() => {
        const s = {};
        [...teams.teamA, ...teams.teamB].forEach(p => { s[p.id] = { goals: 0, assists: 0, tackles: 0, saves: 0, failures: 0 }; });
        return s;
    }, [teams]);
    const [score, setScore] = useState({ teamA: 0, teamB: 0 });
    const [playerStats, setPlayerStats] = useState(initialStats);

    const handleStat = (playerId, stat, team) => {
        setHistory(prev => [...prev, { score: { ...score }, playerStats: JSON.parse(JSON.stringify(playerStats)) }]);
        setPlayerStats(prev => ({ ...prev, [playerId]: { ...prev[playerId], [stat]: prev[playerId][stat] + 1 } }));
        if (stat === 'goals') { setScore(prev => ({ ...prev, [team]: prev[team] + 1 })); }
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const lastState = history[history.length - 1];
        setScore(lastState.score);
        setPlayerStats(lastState.playerStats);
        setHistory(prev => prev.slice(0, -1));
    };

    const handleEndMatchClick = () => onEndMatch({ teams, score, playerStats, date: new Date().toISOString() });

    const renderTeam = (team, teamName, scoreKey) => (
        <div className="w-full bg-gray-800/50 rounded-xl p-4 space-y-4">
            <h3 className="text-2xl font-bold text-yellow-400 mb-2 text-center">{teamName}</h3>
            {team.map(p => (
                <div key={p.id} className="bg-gray-900/70 p-4 rounded-lg">
                    <p className="font-bold text-lg text-center mb-3">{p.name}</p>
                    <div className="flex justify-center gap-2 flex-wrap">
                        <StatButton Icon={LucideGoal} label="Gol" count={playerStats[p.id].goals} onClick={() => handleStat(p.id, 'goals', scoreKey)} colorClass="bg-green-600/80 hover:bg-green-500" />
                        <StatButton Icon={LucideHandshake} label="Assistência" count={playerStats[p.id].assists} onClick={() => handleStat(p.id, 'assists')} colorClass="bg-blue-600/80 hover:bg-blue-500" />
                        <StatButton Icon={LucideShield} label="Desarme" count={playerStats[p.id].tackles} onClick={() => handleStat(p.id, 'tackles')} colorClass="bg-orange-600/80 hover:bg-orange-500" />
                        {p.position === 'Goleiro' && <StatButton Icon={LucideHand} label="Defesa Difícil" count={playerStats[p.id].saves} onClick={() => handleStat(p.id, 'saves')} colorClass="bg-purple-600/80 hover:bg-purple-500" />}
                        <StatButton Icon={LucideFrown} label="Falha" count={playerStats[p.id].failures} onClick={() => handleStat(p.id, 'failures')} colorClass="bg-red-800/80 hover:bg-red-700" />
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <>
            <ConfirmationModal isOpen={showConfirm} title="Confirmar Acréscimo" message="Deseja adicionar 1 minuto ao cronômetro?" onConfirm={confirmAddMinute} onClose={() => setShowConfirm(false)} />
            <div className="space-y-6">
                <div className="text-center bg-black/30 p-4 rounded-xl space-y-4">
                    <div>
                        <h2 className="text-4xl sm:text-6xl font-mono tracking-tighter text-white">{formatTime(timeLeft)}</h2>
                        <div className="flex justify-center items-center gap-2 sm:gap-4 mt-2">
                            <button onClick={togglePause} className="p-2 sm:p-3 bg-gray-700/80 rounded-full hover:bg-yellow-500 transition-colors">{isPaused ? <LucidePlay className="w-5 h-5 sm:w-6 sm:h-6" /> : <LucidePause className="w-5 h-5 sm:w-6 sm:h-6" />}</button>
                            <button onClick={() => setShowConfirm(true)} className="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs sm:text-sm font-semibold flex items-center gap-2"><LucidePlus className="w-4 h-4 sm:w-5 sm:h-5" /> Acréscimo</button>
                            <button onClick={handleUndo} disabled={history.length === 0} className="py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 text-xs sm:text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><LucideUndo className="w-4 h-4 sm:w-5 sm:h-5" /> Desfazer</button>
                        </div>
                    </div>
                    <h2 className="text-4xl sm:text-5xl font-black tracking-tighter"><span className="text-white">{score.teamA}</span><span className="text-yellow-400 mx-2 sm:mx-4">VS</span><span className="text-white">{score.teamB}</span></h2>
                </div>
                <div className="flex flex-col md:flex-row gap-6">{renderTeam(teams.teamA, 'Time A', 'teamA')}{renderTeam(teams.teamB, 'Time B', 'teamB')}</div>
                <div className="text-center mt-6"><button onClick={handleEndMatchClick} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-lg">Encerrar Partida</button></div>
            </div>
        </>
    );
};

const HallOfFame = ({ players, matches }) => {
    const [filter, setFilter] = useState('all');

    const filteredMatches = useMemo(() => {
        if (filter === 'all') return matches;
        const now = new Date();
        let startDate;
        switch (filter) {
            case 'month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'quarter': startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); break;
            case 'semester': startDate = new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1); break;
            case 'year': startDate = new Date(now.getFullYear(), 0, 1); break;
            default: return matches;
        }
        return matches.filter(match => new Date(match.date) >= startDate);
    }, [matches, filter]);

    const rankings = useMemo(() => {
        const aggregatedStats = {};
        players.forEach(p => { aggregatedStats[p.id] = { name: p.name, position: p.position, goals: 0, assists: 0, tackles: 0, saves: 0, failures: 0 }; });
        filteredMatches.forEach(match => {
            for (const playerId in match.playerStats) {
                if (aggregatedStats[playerId]) {
                    Object.keys(match.playerStats[playerId]).forEach(stat => {
                        aggregatedStats[playerId][stat] += match.playerStats[playerId][stat] || 0;
                    });
                }
            }
        });
        const allPlayersStats = Object.values(aggregatedStats);
        return {
            topScorers: [...allPlayersStats].sort((a, b) => b.goals - a.goals).filter(p => p.goals > 0).slice(0, 5),
            topAssisters: [...allPlayersStats].sort((a, b) => b.assists - a.assists).filter(p => p.assists > 0).slice(0, 5),
            topTacklers: [...allPlayersStats].sort((a, b) => b.tackles - a.tackles).filter(p => p.tackles > 0).slice(0, 5),
            topGoalkeepers: allPlayersStats.filter(p => p.position === 'Goleiro').sort((a, b) => b.saves - a.saves).filter(p => p.saves > 0).slice(0, 5),
            bolaMurcha: [...allPlayersStats].sort((a, b) => b.failures - a.failures).filter(p => p.failures > 0).slice(0, 5)
        };
    }, [players, filteredMatches]);

    const RankingCard = ({ title, data, statKey, icon }) => (
        <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-700">
            <h3 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center gap-3">{icon}{title}</h3>
            {data.length > 0 ? (
                <ol className="space-y-3">
                    {data.map((player, index) => (
                        <li key={player.name} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                            <div className="flex items-center">
                                <span className={`text-xl font-bold w-8 ${index < 3 ? 'text-yellow-400' : 'text-gray-400'}`}>{index + 1}.</span>
                                <span className="font-semibold text-white">{player.name}</span>
                            </div>
                            <span className="text-xl font-bold text-white">{player[statKey]}</span>
                        </li>
                    ))}
                </ol>
            ) : <p className="text-gray-500">Ainda não há dados para este ranking.</p>}
        </div>
    );

    return (
        <div>
            <div className="flex justify-center mb-6">
                 <select onChange={(e) => setFilter(e.target.value)} value={filter} className="bg-gray-800 border border-gray-600 rounded-lg p-2 text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none">
                    <option value="all">Geral</option>
                    <option value="month">Este Mês</option>
                    <option value="quarter">Este Trimestre</option>
                    <option value="semester">Este Semestre</option>
                    <option value="year">Este Ano</option>
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <RankingCard title="Artilheiros" data={rankings.topScorers} statKey="goals" icon={<LucideTrophy />} />
                <RankingCard title="Garçons" data={rankings.topAssisters} statKey="assists" icon={<LucideHandshake />} />
                <RankingCard title="Xerifes" data={rankings.topTacklers} statKey="tackles" icon={<LucideShieldCheck />} />
                <RankingCard title="Paredões" data={rankings.topGoalkeepers} statKey="saves" icon={<LucideAward />} />
                <RankingCard title="Bola Murcha" data={rankings.bolaMurcha} statKey="failures" icon={<LucideFrown />} />
            </div>
        </div>
    );
};

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
        return () => { unsubGroup(); unsubPlayers(); };
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

const SessionReportDetail = ({ session, onBack }) => {
    if (!session || !session.date || !session.finalStats) {
        return (
            <div className="text-center text-gray-400 p-8">
                Nenhuma sessão selecionada ou dados inválidos.
                <div className="mt-4">
                    <button onClick={onBack} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg">
                        Voltar
                    </button>
                </div>
            </div>
        );
    }
    const sortedStats = Object.values(session.finalStats).sort((a, b) => b.wins - a.wins || b.goals - a.goals);
    const sessionDate = new Date(session.date.seconds * 1000).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric'
    });

    return (
        <div className="bg-gray-900/50 rounded-2xl p-4 sm:p-8 text-white">
            <h2 className="text-3xl font-bold text-yellow-400 mb-2 text-center">Relatório da Pelada</h2>
            <p className="text-center text-gray-400 mb-6">{sessionDate}</p>
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-gray-800">
                        <tr>
                            <th className="p-3">Jogador</th>
                            <th className="p-3 text-center">V</th>
                            <th className="p-3 text-center">E</th>
                            <th className="p-3 text-center">D</th>
                            <th className="p-3 text-center">Gols</th>
                            <th className="p-3 text-center">Assist.</th>
                            <th className="p-3 text-center">Desarmes</th>
                        </tr>
                    </thead>
                    <tbody className="bg-gray-800/50">
                        {sortedStats.map(player => (
                            <tr key={player.name} className="border-b border-gray-700">
                                <td className="p-3 font-semibold">{player.name}</td>
                                <td className="p-3 text-center text-green-400 font-bold">{player.wins}</td>
                                <td className="p-3 text-center text-gray-400 font-bold">{player.draws}</td>
                                <td className="p-3 text-center text-red-400 font-bold">{player.losses}</td>
                                <td className="p-3 text-center">{player.goals}</td>
                                <td className="p-3 text-center">{player.assists}</td>
                                <td className="p-3 text-center">{player.tackles}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="text-center mt-8">
                <button onClick={onBack} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg">
                    Voltar para o Histórico
                </button>
            </div>
        </div>
    );
};

const SessionHistoryList = ({ sessions, onSelectSession }) => {
    if (sessions.length === 0) {
        return <div className="text-center text-gray-400 p-8">Nenhuma sessão anterior encontrada.</div>;
    }

    return (
        <div className="space-y-4">
            <h2 className="text-3xl font-bold text-yellow-400 mb-6 text-center">Histórico de Sessões</h2>
            {sessions.map(session => (
                <button 
                    key={session.id}
                    onClick={() => onSelectSession(session)}
                    className="w-full text-left bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-yellow-500 transition-all"
                >
                    <p className="font-bold text-xl text-white">
                        Pelada de {session.date ? new Date(session.date.seconds * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Data indefinida'}
                    </p>
                    <p className="text-sm text-gray-400">{session.players ? Object.keys(session.players).length : 0} participantes</p>
                </button>
            ))}
        </div>
    );
};

const MatchFlow = ({ players, groupId, onSessionEnd }) => {
    const [step, setStep] = useState('config');
    const [selectedPlayerIds, setSelectedPlayerIds] = useState(new Set());
    const [allTeams, setAllTeams] = useState([]);
    const [matchHistory, setMatchHistory] = useState([]);
    const [sessionPlayerStats, setSessionPlayerStats] = useState({});
    const [numberOfTeams, setNumberOfTeams] = useState(2);
    const [drawType, setDrawType] = useState('self');
    const [isEditModeActive, setIsEditModeActive] = useState(false);
    const [streakLimit, setStreakLimit] = useState(2);
    const [tieBreakerRule, setTieBreakerRule] = useState('winnerStays');
    const [winnerStreak, setWinnerStreak] = useState({ teamId: null, count: 0 });

    const handlePlayerToggle = (playerId) => {
        setSelectedPlayerIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(playerId)) newSet.delete(playerId);
            else newSet.add(playerId);
            return newSet;
        });
    };

    const handleStartSession = () => {
        setIsEditModeActive(false);
        setWinnerStreak({ teamId: null, count: 0 });
        const availablePlayers = players.filter(p => selectedPlayerIds.has(p.id)).map(p => {
            let overall;
            if (drawType === 'admin' && p.adminOverall) overall = calculateOverall(p.adminOverall);
            else if (drawType === 'peer' && p.peerOverall) overall = calculateOverall(p.peerOverall.avgSkills);
            else overall = calculateOverall(p.selfOverall);
            return { ...p, overall };
        });
        const playersPerTeamDynamic = Math.floor(availablePlayers.length / numberOfTeams);
        if (availablePlayers.length < 2 || playersPerTeamDynamic === 0) {
            alert("Jogadores insuficientes para formar pelo menos 2 times.");
            return;
        }
        const posOrder = { 'Goleiro': 1, 'Defensor': 2, 'Volante': 3, 'Meio-Campo': 4, 'Ponta': 5, 'Atacante': 6 };
        availablePlayers.sort((a, b) => (posOrder[a.detailedPosition] || 99) - (posOrder[b.detailedPosition] || 99) || b.overall - a.overall);
        let teams = Array.from({ length: numberOfTeams }, () => ({ players: [] }));
        availablePlayers.forEach(player => {
            const targetTeam = teams.find(t => t.players.length < playersPerTeamDynamic) || teams.sort((a, b) => a.players.length - b.players.length)[0];
            if (targetTeam) {
                targetTeam.players.push(player);
            }
        });
        const finalTeams = teams.filter(t => t.players.length > 0);
        if (finalTeams.length < 2) {
            alert("Não foi possível formar pelo menos 2 times completos.");
            return;
        }
        const initialStats = {};
        availablePlayers.forEach(p => {
            initialStats[p.id] = { name: p.name, wins: 0, draws: 0, losses: 0, goals: 0, assists: 0, tackles: 0, saves: 0, failures: 0 };
        });
        setSessionPlayerStats(initialStats);
        setAllTeams(finalTeams.map(t => t.players));
        setMatchHistory([]);
        setStep('pre_game');
    };
    
    const handleSingleMatchEnd = async (matchResult) => {
        setIsEditModeActive(false);
        setMatchHistory(prev => [...prev, matchResult]);

        setSessionPlayerStats(prevStats => {
            const newStats = JSON.parse(JSON.stringify(prevStats));
            for (const playerId in matchResult.playerStats) {
                if (newStats[playerId]) {
                    for (const stat in matchResult.playerStats[playerId]) {
                        newStats[playerId][stat] = (newStats[playerId][stat] || 0) + matchResult.playerStats[playerId][stat];
                    }
                }
            }
            return newStats;
        });
        
        const { teamA, teamB } = matchResult.teams;
        const remainingTeams = allTeams.slice(2);
        
        const updatePlayerRecords = (team, result) => {
            setSessionPlayerStats(prevStats => {
                const newStats = JSON.parse(JSON.stringify(prevStats));
                team.forEach(player => {
                    if (newStats[player.id]) {
                        newStats[player.id][result]++;
                    }
                });
                return newStats;
            });
        };

        if (matchResult.score.teamA === matchResult.score.teamB) {
            updatePlayerRecords(teamA, 'draws');
            updatePlayerRecords(teamB, 'draws');
            if (tieBreakerRule === 'bothExit') {
                const nextTeams = remainingTeams.splice(0, 2);
                const newQueue = [...remainingTeams, teamA, teamB];
                setAllTeams([...nextTeams, ...newQueue].filter(Boolean));
                setWinnerStreak({ teamId: null, count: 0 });
                setStep('post_game');
                return;
            }
        }
        
        const winnerTeam = matchResult.score.teamA >= matchResult.score.teamB ? teamA : teamB;
        const loserTeam = winnerTeam === teamA ? teamB : teamA;
        updatePlayerRecords(winnerTeam, 'wins');
        updatePlayerRecords(loserTeam, 'losses');

        const getTeamId = (team) => team.map(p => p.id).sort().join('-');
        const winnerId = getTeamId(winnerTeam);
        let currentStreak = (winnerId === winnerStreak.teamId) ? winnerStreak.count + 1 : 1;
        
        if (streakLimit > 0 && currentStreak >= streakLimit) {
            const nextTeams = remainingTeams.splice(0, 2);
            const newQueue = [...remainingTeams, winnerTeam, loserTeam];
            setAllTeams([...nextTeams, ...newQueue].filter(Boolean));
            setWinnerStreak({ teamId: null, count: 0 });
        } else {
            const nextChallenger = remainingTeams.length > 0 ? remainingTeams.shift() : null;
            const newQueue = [...remainingTeams, loserTeam];
            setAllTeams([winnerTeam, ...(nextChallenger ? [nextChallenger] : []), ...newQueue].filter(Boolean));
            setWinnerStreak({ teamId: winnerId, count: currentStreak });
        }
        setStep('post_game');
    };

    const handleMovePlayer = (playerToMove, fromTeamIndex, toTeamIndex) => {
        setAllTeams(currentTeams => {
            const newTeams = JSON.parse(JSON.stringify(currentTeams.map(t => t || [])));
            const fromTeam = newTeams[fromTeamIndex];
            const toTeam = newTeams[toTeamIndex];
            if (!fromTeam) return currentTeams;
            const playerIndex = fromTeam.findIndex(p => p.id === playerToMove.id);
            if (playerIndex === -1) return currentTeams;
            const [player] = fromTeam.splice(playerIndex, 1);
            if (toTeam) {
                toTeam.push(player);
            } else {
                newTeams[toTeamIndex] = [player];
            }
            return newTeams.filter(team => team.length > 0);
        });
    };

    const handleRemovePlayer = (playerToRemove, fromTeamIndex) => {
        setAllTeams(currentTeams => {
            let newTeams = JSON.parse(JSON.stringify(currentTeams));
            const fromTeam = newTeams[fromTeamIndex];
            if (!fromTeam) return currentTeams;
            const updatedTeam = fromTeam.filter(p => p.id !== playerToRemove.id);
            newTeams[fromTeamIndex] = updatedTeam;
            return newTeams.filter(team => team.length > 0);
        });
    };

    const handleSetPlayingTeam = (teamRole, indexToSet) => {
        setAllTeams(currentTeams => {
            const newTeams = [...currentTeams];
            const targetIndex = teamRole === 'A' ? 0 : 1;
            [newTeams[targetIndex], newTeams[indexToSet]] = [newTeams[indexToSet], newTeams[targetIndex]];
            return newTeams;
        });
    };

    const handleReorderQueue = (indexInWaitingQueue, direction) => {
        setAllTeams(currentTeams => {
            const waitingTeams = currentTeams.slice(2);
            const actualIndex = indexInWaitingQueue;
            if (direction === 'up' && actualIndex > 0) {
                [waitingTeams[actualIndex], waitingTeams[actualIndex - 1]] = [waitingTeams[actualIndex - 1], waitingTeams[actualIndex]];
            } else if (direction === 'down' && actualIndex < waitingTeams.length - 1) {
                [waitingTeams[actualIndex], waitingTeams[actualIndex + 1]] = [waitingTeams[actualIndex + 1], waitingTeams[actualIndex]];
            }
            return [currentTeams[0], currentTeams[1], ...waitingTeams];
        });
    };

    const handleForceEndSession = async () => {
        if (!groupId) {
            alert("Erro: ID do grupo não encontrado para salvar a sessão.");
            return;
        }
        try {
            const sessionData = {
                date: serverTimestamp(),
                players: Object.keys(sessionPlayerStats),
                finalStats: sessionPlayerStats,
            };
            const sessionsColRef = collection(db, `artifacts/${appId}/public/data/groups/${groupId}/sessions`);
            await addDoc(sessionsColRef, sessionData);
            onSessionEnd();
            setStep('session_report');
        } catch (error) {
            console.error("Erro ao salvar a sessão:", error);
            alert("Ocorreu um erro ao salvar a sessão. Verifique o console.");
        }
    };
    
    const renderTeamCard = (team, teamIndex) => {
        const teamLetter = String.fromCharCode(65 + teamIndex);
        let teamLabel = `Time ${teamLetter}`;
        if (step !== 'pre_game') {
             if (teamIndex === 0) teamLabel = `Time ${teamLetter} (Em quadra)`;
             if (teamIndex === 1) teamLabel = `Time ${teamLetter} (Desafiante)`;
        } else {
             if (teamIndex === 0) teamLabel = `Time A`;
             if (teamIndex === 1) teamLabel = `Time B`;
        }

        return (
            <div className="bg-gray-800 p-4 rounded-lg w-full min-w-[280px]">
                <h3 className="text-yellow-400 font-bold text-xl mb-3">{teamLabel}</h3>
                <ul className="space-y-2">
                    {team.map(p => (
                        <li key={p.id} className="bg-gray-900 p-2 rounded flex justify-between items-center text-white">
                            <span>{p.name}</span>
                            {isEditModeActive && (
                                <div className="flex items-center gap-2">
                                    <select 
                                        value={teamIndex}
                                        onChange={(e) => handleMovePlayer(p, teamIndex, parseInt(e.target.value))}
                                        className="bg-gray-700 text-white text-xs rounded p-1 border-0"
                                    >
                                        {allTeams.map((_, i) => (
                                            <option key={i} value={i}>
                                                Time {String.fromCharCode(65 + i)}
                                            </option>
                                        ))}
                                    </select>
                                    <button onClick={() => handleRemovePlayer(p, teamIndex)} className="text-red-500 hover:text-red-400 p-1">
                                        <LucideX className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
                {isEditModeActive && teamIndex > 1 && (
                    <div className="flex justify-center gap-2 mt-3">
                        <button onClick={() => handleSetPlayingTeam('A', teamIndex)} className="text-xs bg-gray-700 hover:bg-yellow-500 hover:text-black py-1 px-2 rounded">Definir como Time A</button>
                        <button onClick={() => handleSetPlayingTeam('B', teamIndex)} className="text-xs bg-gray-700 hover:bg-yellow-500 hover:text-black py-1 px-2 rounded">Definir como Time B</button>
                    </div>
                )}
            </div>
        );
    };

    if (step === 'in_game') {
        return <LiveMatchTracker teams={{ teamA: allTeams[0], teamB: allTeams[1] }} onEndMatch={handleSingleMatchEnd} durationInMinutes={10} />;
    }

    if (step === 'session_report') {
        const sortedStats = Object.values(sessionPlayerStats).sort((a, b) => b.wins - a.wins || b.goals - a.goals);
        return (
            <div className="bg-gray-900/50 rounded-2xl p-4 sm:p-8 text-white">
                <h2 className="text-3xl font-bold text-yellow-400 mb-6 text-center">Relatório Final da Pelada</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-gray-800">
                            <tr>
                                <th className="p-3">Jogador</th>
                                <th className="p-3 text-center">V</th>
                                <th className="p-3 text-center">E</th>
                                <th className="p-3 text-center">D</th>
                                <th className="p-3 text-center">Gols</th>
                                <th className="p-3 text-center">Assist.</th>
                                <th className="p-3 text-center">Desarmes</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800/50">
                            {sortedStats.map(player => (
                                <tr key={player.name} className="border-b border-gray-700">
                                    <td className="p-3 font-semibold">{player.name}</td>
                                    <td className="p-3 text-center text-green-400 font-bold">{player.wins}</td>
                                    <td className="p-3 text-center text-gray-400 font-bold">{player.draws}</td>
                                    <td className="p-3 text-center text-red-400 font-bold">{player.losses}</td>
                                    <td className="p-3 text-center">{player.goals}</td>
                                    <td className="p-3 text-center">{player.assists}</td>
                                    <td className="p-3 text-center">{player.tackles}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="text-center mt-8">
                    <button onClick={() => { setStep('config'); setAllTeams([]); }} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg">
                        Nova Sessão de Jogos
                    </button>
                </div>
            </div>
        );
    }
    
    if (step === 'pre_game' || step === 'post_game') {
        const teamA = allTeams[0];
        const teamB = allTeams[1];
        const waitingTeams = allTeams.slice(2);
        return (
            <div className="text-center bg-gray-900/50 rounded-2xl p-4 sm:p-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-yellow-400 mb-2">
                    {isEditModeActive ? 'Modo de Edição' : step === 'post_game' ? `Fim da Partida ${matchHistory.length}` : `Prontos para Começar!`}
                </h2>
                <p className="text-gray-400 mb-6">{isEditModeActive ? 'Organize os jogadores e os próximos times. Clique em Salvar ao terminar.' : 'Visualize os times ou inicie a próxima partida.'}</p>
                
                <div className="flex justify-center gap-4 mb-6">
                    {!isEditModeActive ? (
                        <button onClick={() => setIsEditModeActive(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2">
                            <LucideEdit className="w-4 h-4"/>Editar Partida
                        </button>
                    ) : (
                        <button onClick={() => setIsEditModeActive(false)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2">
                            <LucideShieldCheck className="w-4 h-4"/>Salvar Alterações
                        </button>
                    )}
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-6 justify-center items-start">
                    {teamA && renderTeamCard(teamA, 0)}
                    <div className="flex items-center justify-center h-full text-2xl font-bold text-gray-500 p-4">VS</div>
                    {teamB ? renderTeamCard(teamB, 1) : <div className="bg-gray-800 p-4 rounded-lg w-full min-w-[280px] flex items-center justify-center"><h3 className="text-yellow-400 font-bold text-xl">Sem desafiantes</h3></div>}
                </div>
                
                {waitingTeams.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-gray-400 mb-4">Times na Fila</h3>
                        <div className="flex flex-wrap gap-4 justify-center">
                            {waitingTeams.map((team, index) => (
                                <div key={index} className="flex flex-col gap-2 items-center">
                                    {renderTeamCard(team, index + 2)}
                                    {!isEditModeActive && (
                                        <div className="flex gap-2 mt-2">
                                            <button 
                                                onClick={() => handleReorderQueue(index, 'up')} 
                                                disabled={index === 0} 
                                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 text-sm rounded-lg disabled:opacity-50 flex items-center justify-center"
                                                title="Subir na Fila"
                                            >
                                                <LucideUndo className="w-4 h-4 transform rotate-90"/>
                                            </button>
                                            <button 
                                                onClick={() => handleReorderQueue(index, 'down')} 
                                                disabled={index === waitingTeams.length - 1} 
                                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 text-sm rounded-lg disabled:opacity-50 flex items-center justify-center"
                                                title="Descer na Fila"
                                            >
                                                <LucideUndo className="w-4 h-4 transform -rotate-90"/>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!isEditModeActive && (
                    <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8 border-t border-gray-700 pt-6">
                        <button onClick={() => setStep('in_game')} disabled={!teamB} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-8 rounded-lg text-lg disabled:bg-gray-500 disabled:cursor-not-allowed">
                            Começar Próxima Partida
                        </button>
                        <button onClick={handleForceEndSession} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-lg">
                            Encerrar Pelada
                        </button>
                    </div>
                )}
            </div>
        );
    }
    
    return (
        <div className="bg-gray-900/50 rounded-2xl p-4 sm:p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">Configurar Noite de Futebol</h2>
            <fieldset className="border border-gray-700 p-4 rounded-lg mb-6">
                <legend className="px-2 text-yellow-400 font-semibold">Regras da Partida</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block font-semibold mb-2 text-white">Limite de vitórias seguidas:</label>
                        <input 
                            type="number" 
                            min="0"
                            value={streakLimit} 
                            onChange={e => setStreakLimit(Number(e.target.value))} 
                            className="w-full bg-gray-800 p-2 rounded text-white" 
                            title="Deixe 0 para desativar o limite."
                        />
                        <p className="text-xs text-gray-500 mt-1">O time sai após X vitórias. (0 = desativado)</p>
                    </div>
                    <div>
                        <label className="block font-semibold mb-2 text-white">Regra de empate:</label>
                        <select 
                            value={tieBreakerRule} 
                            onChange={e => setTieBreakerRule(e.target.value)} 
                            className="w-full bg-gray-800 p-2 rounded text-white"
                        >
                            <option value="winnerStays">Vencedor anterior fica</option>
                            <option value="bothExit">Ambos os times saem</option>
                        </select>
                    </div>
                </div>
            </fieldset>

            <fieldset className="border border-gray-700 p-4 rounded-lg mb-6">
                 <legend className="px-2 text-yellow-400 font-semibold">Configuração dos Times</legend>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block font-semibold mb-2 text-white">Nº de times para sortear:</label>
                        <input type="number" min="2" value={numberOfTeams} onChange={e => setNumberOfTeams(Number(e.target.value))} className="w-full bg-gray-800 p-2 rounded text-white" />
                    </div>
                    <div>
                        <label className="block font-semibold mb-2 text-white">Sorteio baseado em:</label>
                        <select value={drawType} onChange={(e) => setDrawType(e.target.value)} className="w-full bg-gray-800 p-2 rounded text-white">
                           <option value="self">Overall Próprio</option>
                           <option value="peer">Overall da Galera</option>
                           <option value="admin">Overall do Admin</option>
                        </select>
                    </div>
                </div>
            </fieldset>

            <h3 className="text-xl font-bold text-yellow-400 mb-4">Selecione os Jogadores Presentes</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                {players.map(p => (<button key={p.id} onClick={() => handlePlayerToggle(p.id)} className={`p-3 rounded-lg text-center transition ${selectedPlayerIds.has(p.id) ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-white hover:bg-gray-700'}`}>{p.name}</button>))}
            </div>
            <div className="text-center">
                <button onClick={handleStartSession} disabled={selectedPlayerIds.size < numberOfTeams * 2} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-8 rounded-lg text-lg disabled:bg-gray-500 disabled:cursor-not-allowed">Sortear Times e Iniciar</button>
                {selectedPlayerIds.size < numberOfTeams * 2 && <p className="text-red-500 text-sm mt-2">Selecione pelo menos {numberOfTeams * 2} jogadores para formar {numberOfTeams} times.</p>}
            </div>
        </div>
    );
};

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
                    
                    {currentView === 'match' && isAdmin && <MatchFlow players={players} groupId={groupId} onSessionEnd={handleSessionEnd} />}
                    
                    {currentView === 'sessions' && !viewingSession && (
                        <SessionHistoryList sessions={savedSessions} onSelectSession={setViewingSession} />
                    )}
                    
                    {currentView === 'hall_of_fame' && <HallOfFame players={players} matches={matches} />}
                    {currentView === 'group' && <GroupDashboard user={user} groupId={groupId} />}

                </main>

                <PlayerModal isOpen={isPlayerModalOpen} onClose={() => setIsPlayerModalOpen(false)} onSave={handleSavePlayer} player={editingPlayer} isAdmin={isAdmin} />
                <ConfirmationModal isOpen={!!playerToDelete} title="Confirmar Exclusão" message={`Tem certeza que deseja apagar o jogador ${playerToDelete?.name}?`} onConfirm={confirmDeletePlayer} onClose={() => setPlayerToDelete(null)} />
                <ConfirmationModal isOpen={!!matchToDelete} title="Confirmar Exclusão" message={`Tem certeza que deseja apagar esta partida? Esta ação não pode ser desfeita.`} onConfirm={confirmDeleteMatch} onClose={() => setMatchToDelete(null)} />
                <PeerReviewModal isOpen={!!peerReviewPlayer} player={peerReviewPlayer} onClose={() => setPeerReviewPlayer(null)} onSave={handleSavePeerReview}/>
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