import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc } from "firebase/firestore"; 
import { auth, db } from '../../services/firebase';

const AuthScreen = ({ t }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuthAction = async () => {
        if (!email || !password) {
            setError(t("Por favor, preencha o e-mail e a senha."));
            return;
        }
        setLoading(true);
        setError('');
        setInfo('');

        if (isLogin) {
            // Lógica de Login
            try {
                await signInWithEmailAndPassword(auth, email, password);
                // O onAuthStateChanged no App.js cuidará do redirecionamento
            } catch (err) {
                setError(t("Falha no login. Verifique suas credenciais."));
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
                setError(t("Falha no registo. O e-mail pode já estar em uso."));
                console.error("Erro de registo:", err);
            }
        }
        setLoading(false);
    };

    const handleResetPassword = async () => {
        if (!email) {
            setError(t('Informe seu e-mail para recuperar a senha.'));
            return;
        }
        setError('');
        setInfo('');
        try {
            await sendPasswordResetEmail(auth, email);
            setInfo(t('Enviamos um e-mail com instruções para redefinir sua senha.'));
        } catch (err) {
            console.error('Erro ao enviar reset de senha:', err);
            setError(t('NA�o foi possA-vel enviar o e-mail de redefiniA�o. Verifique o e-mail informado.'));
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-full max-w-md bg-gray-900/50 rounded-2xl p-8 border border-gray-700 text-white">
                <h2 className="text-3xl font-bold text-indigo-300 mb-6 text-center">
                    {isLogin ? t('Entrar') : t('Criar Conta')}
                </h2>
                
                {error && <p className="bg-red-800/50 text-red-300 p-3 rounded-lg text-center mb-4">{error}</p>}
                {info && <p className="bg-green-800/40 text-green-200 p-3 rounded-lg text-center mb-4">{info}</p>}

                <div className="space-y-4">
                    <input
                        type="email"
                        placeholder={t("E-mail")}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <input
                        type="password"
                        placeholder={t("Senha")}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                </div>
                
                <div className="mt-6">
                    <button 
                        onClick={handleAuthAction} 
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50"
                    >
                        {loading ? t('A processar...') : (isLogin ? t('Entrar') : t('Registar'))}
                    </button>
                </div>

                {isLogin && (
                    <div className="mt-4 text-center">
                        <button
                            onClick={handleResetPassword}
                            className="text-sm text-gray-300 hover:text-indigo-300"
                            disabled={loading}
                        >
                            {t('Esqueci minha senha')}
                        </button>
                    </div>
                )}

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                        }}
                        className="text-gray-400 hover:text-indigo-400"
                    >
                        {isLogin ? t('Ainda não tem uma conta? Registe-se') : t('Já tem uma conta? Entre')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthScreen;
