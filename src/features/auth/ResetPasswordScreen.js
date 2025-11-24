import React, { useEffect, useState } from 'react';
import { auth } from '../../services/firebase';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';

const ResetPasswordScreen = ({ t }) => {
    const params = new URLSearchParams(window.location.search);
    const oobCode = params.get('oobCode');

    const [status, setStatus] = useState('loading'); // loading | ready | error | success
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const checkCode = async () => {
            if (!oobCode) {
                setStatus('error');
                setError(t('Link inválido ou expirado.'));
                return;
            }
            try {
                const mail = await verifyPasswordResetCode(auth, oobCode);
                setEmail(mail);
                setStatus('ready');
            } catch (e) {
                console.error('Erro ao validar código de reset:', e);
                setError(t('Link inválido ou expirado.'));
                setStatus('error');
            }
        };
        checkCode();
    }, [oobCode, t]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (status !== 'ready') return;
        if (!password || password.length < 6) {
            setError(t('A senha deve ter pelo menos 6 caracteres.'));
            return;
        }
        if (password !== confirm) {
            setError(t('As senhas não coincidem.'));
            return;
        }
        setError('');
        try {
            await confirmPasswordReset(auth, oobCode, password);
            setStatus('success');
        } catch (e) {
            console.error('Erro ao redefinir senha:', e);
            setError(t('Não foi possível redefinir a senha. Tente novamente.'));
        }
    };

    const renderContent = () => {
        if (status === 'loading') return <p className="text-center text-slate-300">{t('Validando link...')}</p>;
        if (status === 'error') return <p className="text-center text-red-300">{error || t('Link inválido ou expirado.')}</p>;
        if (status === 'success') return <p className="text-center text-green-300">{t('Senha redefinida com sucesso. Já pode voltar e fazer login.')}</p>;
        return (
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm text-slate-300 mb-1">{t('E-mail')}</label>
                    <input type="email" value={email} disabled className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-slate-200 opacity-80" />
                </div>
                <div>
                    <label className="block text-sm text-slate-300 mb-1">{t('Nova senha')}</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
                        placeholder={t('Digite a nova senha')}
                    />
                </div>
                <div>
                    <label className="block text-sm text-slate-300 mb-1">{t('Confirmar senha')}</label>
                    <input
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
                        placeholder={t('Repita a nova senha')}
                    />
                </div>
                {error && <p className="text-red-300 text-sm">{error}</p>}
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg">
                    {t('Redefinir senha')}
                </button>
            </form>
        );
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-full max-w-md bg-gray-900/60 rounded-2xl p-8 border border-gray-700 text-white shadow-xl">
                <h1 className="text-2xl font-bold text-indigo-300 mb-4 text-center">{t('Redefinir senha')}</h1>
                {renderContent()}
            </div>
        </div>
    );
};

export default ResetPasswordScreen;
