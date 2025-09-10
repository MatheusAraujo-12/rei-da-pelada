import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from "firebase/firestore"; 
import { auth, db } from '../../services/firebase'; // ✅ 'appId' foi removido desta linha

const AuthScreen = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuthAction = async () => {
        if (!email || !password) {
            setError("Por favor, preencha o e-mail e a senha.");
            return;
        }
        setLoading(true);
        setError('');

        if (isLogin) {
            // Lógica de Login
            try {
                await signInWithEmailAndPassword(auth, email, password);
                // O onAuthStateChanged no App.js cuidará do redirecionamento
            } catch (err) {
                setError("Falha no login. Verifique suas credenciais.");
                console.error("Erro de login:", err);
            }
        } else {
            // Lógica de Registo
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                // Cria um documento na coleção 'users' com o mesmo UID
                await setDoc(doc(db, "users", user.uid), {
                    email: user.email,
                    groupIds: []
                });
                // O onAuthStateChanged no App.js cuidará do resto
            } catch (err) {
                setError("Falha no registo. O e-mail pode já estar em uso.");
                console.error("Erro de registo:", err);
            }
        }
        setLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-full max-w-md bg-gray-900/50 rounded-2xl p-8 border border-gray-700 text-white">
                <h2 className="text-3xl font-bold text-yellow-400 mb-6 text-center">
                    {isLogin ? 'Entrar' : 'Criar Conta'}
                </h2>
                
                {error && <p className="bg-red-800/50 text-red-300 p-3 rounded-lg text-center mb-4">{error}</p>}

                <div className="space-y-4">
                    <input
                        type="email"
                        placeholder="E-mail"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                    />
                    <input
                        type="password"
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                    />
                </div>
                
                <div className="mt-6">
                    <button 
                        onClick={handleAuthAction} 
                        disabled={loading}
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg disabled:opacity-50"
                    >
                        {loading ? 'A processar...' : (isLogin ? 'Entrar' : 'Registar')}
                    </button>
                </div>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                        }}
                        className="text-gray-400 hover:text-yellow-400"
                    >
                        {isLogin ? 'Ainda não tem uma conta? Registe-se' : 'Já tem uma conta? Entre'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthScreen;