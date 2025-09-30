import { useContext } from 'react';
import { SettingsContext } from '../context/SettingsContext';
import { translations } from './translations';

export const useTranslation = () => {
    const { preferences } = useContext(SettingsContext);
    const { language } = preferences;

    const t = (key) => {
        return translations[language]?.[key] || key;
    };

    return { t, language };
};