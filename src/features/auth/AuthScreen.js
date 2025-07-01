import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// ✅ CORREÇÃO: Adicionado 'db' e 'appId' na importação
import { auth, db, appId } from '../../services/firebase';

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

export default AuthScreen;