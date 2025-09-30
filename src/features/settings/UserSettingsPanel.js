import React, { useEffect, useState, useContext } from 'react';
import { LucideX, LucidePalette, LucideLanguages, LucideBellRing, LucideFileText, LucideShieldCheck } from 'lucide-react';
import { useTranslation } from '../../utils/useTranslation';
import { SettingsContext } from '../../context/SettingsContext';

const THEME_OPTIONS = [
    { id: 'champions', label: 'Champions (padrão)' },
    { id: 'classic-dark', label: 'Clássico Escuro' },
    { id: 'aurora', label: 'Aurora Neon' },
];

const LANGUAGE_OPTIONS = [
    { id: 'pt-BR', label: 'Português (Brasil)' },
    { id: 'en-US', label: 'English (US)' },
    { id: 'es-ES', label: 'Espanhol' },
];

const DEFAULT_PREFERENCES = {
    theme: 'champions',
    language: 'pt-BR',
    notifications: true,
    autoSync: true,
};

const UserSettingsPanel = ({ isOpen, onClose }) => {
    const { preferences, setPreferences } = useContext(SettingsContext);
    const [formState, setFormState] = useState(preferences || DEFAULT_PREFERENCES);
    const { t } = useTranslation();

    useEffect(() => {
        if (isOpen) {
            setFormState({ ...DEFAULT_PREFERENCES, ...(preferences || {}) });
        }
    }, [isOpen, preferences]);

    if (!isOpen) return null;

    const handleSelect = (key, value) => {
        setFormState((prev) => ({ ...prev, [key]: value }));
    };

    const handleToggle = (key) => {
        setFormState((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = () => {
        setPreferences(formState);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-8">
            <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-[#28324d] bg-gradient-to-br from-[#0b1220] via-[#10172f] to-[#060b1a] shadow-[0_30px_80px_rgba(4,10,35,0.45)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#4338ca33,transparent_60%)]" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,#06b6d422,transparent_65%)]" />
                <div className="relative p-6 sm:p-8 text-white space-y-8 max-h-[85vh] overflow-y-auto">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white">{t('Configurações')}</h2>
                            <p className="mt-1 text-sm text-[#9aa7d7]">{t('Personalize sua experiência: tema, idioma e preferências gerais.')}</p>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label="Fechar painel de configurações"
                            className="rounded-full border border-[#28324d] bg-[#111a32]/80 p-2 text-[#f0f4ff] transition hover:border-[#a855f7] hover:text-[#a855f7]"
                        >
                            <LucideX className="w-5 h-5" />
                        </button>
                    </div>

                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-100">
                            <LucidePalette className="w-5 h-5 text-[#a855f7]" />
                            <h3 className="text-lg font-semibold">{t('Tema')}</h3>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                            {THEME_OPTIONS.map((option) => {
                                const isActive = formState.theme === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => handleSelect('theme', option.id)}
                                        className={`rounded-2xl border px-4 py-3 text-left transition shadow-sm ${
                                            isActive
                                                ? 'border-[#a855f7] bg-[#1b1f3d]/80 shadow-[#a855f733]'
                                                : 'border-[#28324d] bg-[#111a32]/70 hover:border-[#4338ca] hover:bg-[#111a32]/85'
                                        }`}
                                    >
                                        <p className="text-sm font-semibold text-white">{t(option.label)}</p>
                                        <p className="text-xs text-[#9aa7d7] mt-1">
                                            {t(option.id === 'champions' && 'Tons inspirados nos grandes jogos europeus.')}
                                            {t(option.id === 'classic-dark' && 'Layout escuro discreto para baixa luminosidade.')}
                                            {t(option.id === 'aurora' && 'Gradientes vibrantes com contraste elevado.')}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-100">
                            <LucideLanguages className="w-5 h-5 text-[#06b6d4]" />
                            <h3 className="text-lg font-semibold">{t('Idioma')}</h3>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {LANGUAGE_OPTIONS.map((option) => {
                                const isActive = formState.language === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => handleSelect('language', option.id)}
                                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                                            isActive
                                                ? 'border-[#06b6d4] bg-[#0d253a]/80 text-[#e0f7ff]'
                                                : 'border-[#28324d] bg-[#111a32]/70 text-[#9aa7d7] hover:border-[#06b6d4] hover:text-[#e0f7ff]'
                                        }`}
                                    >
                                        {t(option.label)}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-xs text-[#6f7dab]">
                            {t('O idioma selecionado será aplicado gradualmente conforme novos conteúdos forem traduzidos.')}
                        </p>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-100">
                            <LucideBellRing className="w-5 h-5 text-[#22d3ee]" />
                            <h3 className="text-lg font-semibold">{t('Preferências')}</h3>
                        </div>
                        <div className="space-y-3">
                            <label className="flex items-start gap-3 rounded-2xl border border-[#28324d] bg-[#111a32]/70 p-4 text-sm text-[#cbd5f5] transition hover:border-[#4338ca]">
                                <input
                                    type="checkbox"
                                    checked={Boolean(formState.notifications)}
                                    onChange={() => handleToggle('notifications')}
                                    className="mt-1 h-4 w-4 rounded border-[#28324d] bg-transparent text-[#a855f7] focus:ring-[#a855f7]"
                                />
                                <span>
                                    <span className="font-semibold text-white block">{t('Notificações futuras')}</span>
                                    <span className="text-xs text-[#9aa7d7]">{t('Seja avisado quando novos recursos forem lançados.')}</span>
                                </span>
                            </label>
                            <label className="flex items-start gap-3 rounded-2xl border border-[#28324d] bg-[#111a32]/70 p-4 text-sm text-[#cbd5f5] transition hover:border-[#4338ca]">
                                <input
                                    type="checkbox"
                                    checked={Boolean(formState.autoSync)}
                                    onChange={() => handleToggle('autoSync')}
                                    className="mt-1 h-4 w-4 rounded border-[#28324d] bg-transparent text-[#a855f7] focus:ring-[#a855f7]"
                                />
                                <span>
                                    <span className="font-semibold text-white block">{t('Sincronizar dados automaticamente')}</span>
                                    <span className="text-xs text-[#9aa7d7]">{t('Recomendada para manter estatísticas e histórico sempre atualizados.')}</span>
                                </span>
                            </label>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-100">
                            <LucideFileText className="w-5 h-5 text-[#fbbf24]" />
                            <h3 className="text-lg font-semibold">{t('Documentação')}</h3>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <button
                                type="button"
                                className="flex items-center justify-between rounded-2xl border border-[#28324d] bg-[#111a32]/70 px-4 py-3 text-left text-sm text-[#cbd5f5] transition hover:border-[#f59e0b]"
                            >
                                <span className="flex items-center gap-3">
                                    <LucideShieldCheck className="w-5 h-5 text-[#fbbf24]" />
                                    {t('Política de dados (breve)')}
                                </span>
                                <span className="text-xs text-[#6f7dab]">Em breve</span>
                            </button>
                            <button
                                type="button"
                                className="flex items-center justify-between rounded-2xl border border-[#28324d] bg-[#111a32]/70 px-4 py-3 text-left text-sm text-[#cbd5f5] transition hover:border-[#f59e0b]"
                            >
                                <span className="flex items-center gap-3">
                                    <LucideFileText className="w-5 h-5 text-[#fbbf24]" />
                                    {t('Termos de uso e regras (breve)')}
                                </span>
                                <span className="text-xs text-[#6f7dab]">Em breve</span>
                            </button>
                        </div>
                        <p className="text-xs text-[#6f7dab]">
                            {t('Estes documentos aparecerão aqui assim que forem publicados. Fique atento as atualizações!')}
                        </p>
                    </section>

                    <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-[#28324d] bg-[#111a32]/70 px-4 py-2 text-sm font-semibold text-[#cbd5f5] transition hover:border-[#a855f7] hover:text-white"
                        >
                            {t('Cancelar')}
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="rounded-lg bg-gradient-to-r from-[#4338ca] via-[#a855f7] to-[#06b6d4] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#4338ca33] transition-transform hover:-translate-y-0.5"
                        >
                            {t('Salvar preferências')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserSettingsPanel;