import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // ou o nome do seu arquivo de CSS principal

// A importação correta, pedindo por AppWrapper
import AppWrapper from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* O uso correto do componente importado */}
    <AppWrapper />
  </React.StrictMode>
);