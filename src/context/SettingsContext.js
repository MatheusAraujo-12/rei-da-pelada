import React, { createContext, useState, useEffect, useMemo } from 'react';

const SETTINGS_STORAGE_KEY = 'rei-da-pelada:user-preferences';

const DEFAULT_USER_PREFERENCES = {
    theme: 'champions',
    language: 'pt-BR',
    notifications: true,
    autoSync: true,
};

export const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
    const [preferences, setPreferences] = useState(() => {
        try {
            const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (stored) {
                return { ...DEFAULT_USER_PREFERENCES, ...JSON.parse(stored) };
            }
        } catch (error) {
            console.error('Falha ao carregar as preferências do usuário:', error);
        }
        return DEFAULT_USER_PREFERENCES;
    });

    useEffect(() => {
        try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(preferences));
        } catch (error) {
            console.error('Falha ao salvar as preferências do usuário:', error);
        }

        // Apply theme to body
        document.body.className = '';
        document.body.classList.add(`theme-${preferences.theme}`);

    }, [preferences]);

    const value = useMemo(() => ({ preferences, setPreferences }), [preferences]);

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};
