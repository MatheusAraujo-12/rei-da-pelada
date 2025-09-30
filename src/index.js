import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // ou o nome do seu arquivo de CSS principal
import { SettingsProvider } from './context/SettingsContext';

// A importação correta, pedindo por AppWrapper
import AppWrapper from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <SettingsProvider>
      {/* O uso correto do componente importado */}
      <AppWrapper />
    </SettingsProvider>
  </React.StrictMode>
);