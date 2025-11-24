import React from 'react';
import { LucideShuffle, LucideUsers } from 'lucide-react';

const MatchConfigView = ({
    players = [],
    selectedPlayerIds = new Set(),
    setupMode,
    onSetupModeChange,
    numberOfTeams,
    onChangeNumberOfTeams,
    drawType,
    onChangeDrawType,
    matchDurationMin,
    onChangeMatchDuration,
    playersPerTeam,
    onChangePlayersPerTeam,
    onTogglePlayer,
    onProceed,
    t = (s) => s,
}) => {
    return (
        <div className="bg-gray-900/50 rounded-2xl p-4 sm:p-6 border border-indigo-800">
            <h2 className="text-2xl font-bold text-indigo-300 mb-4">Configurar Noite de Futebol</h2>
            {/* Parâmetros extras da partida */}
            <fieldset className="border border-indigo-800 p-4 rounded-lg mb-6">
                <legend className="px-2 text-indigo-300 font-semibold">Parâmetros da Partida</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block font-semibold mb-2 text-gray-200">Duração (minutos):</label>
                        <input
                            type="number"
                            min="1"
                            value={matchDurationMin}
                            onChange={e => onChangeMatchDuration(Number(e.target.value))}
                            className="w-full bg-gray-800 p-2 rounded text-white border border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block font-semibold mb-2 text-gray-200">Jogadores por time (0 = livre):</label>
                        <input
                            type="number"
                            min="0"
                            value={playersPerTeam}
                            onChange={e => onChangePlayersPerTeam(Number(e.target.value))}
                            className="w-full bg-gray-800 p-2 rounded text-white border border-gray-600"
                        />
                    </div>
                </div>
            </fieldset>
            <fieldset className="border border-indigo-800 p-4 rounded-lg mb-6">
                <legend className="px-2 text-indigo-300 font-semibold">Modo de Montagem</legend>
                <div className="flex gap-4">
                    <button
                        onClick={() => onSetupModeChange('auto')}
                        className={`flex-1 p-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${setupMode === 'auto' ? 'bg-indigo-400 text-black' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                    >
                        <LucideShuffle /> Sorteio Automático
                    </button>
                    <button
                        onClick={() => onSetupModeChange('manual')}
                        className={`flex-1 p-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${setupMode === 'manual' ? 'bg-indigo-400 text-black' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                    >
                        <LucideUsers /> Montagem Manual
                    </button>
                </div>
            </fieldset>
            {setupMode === 'auto' && (
                <fieldset className="border border-indigo-800 p-4 rounded-lg mb-6">
                    <legend className="px-2 text-indigo-300 font-semibold">Configuração do Sorteio</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block font-semibold mb-2 text-white">Nº de times para sortear:</label>
                            <input
                                type="number"
                                min="2"
                                value={numberOfTeams}
                                onChange={e => onChangeNumberOfTeams(Number(e.target.value))}
                                className="w-full bg-gray-800 p-2 rounded text-white"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2 text-white">Sorteio baseado em:</label>
                            <select
                                value={drawType}
                                onChange={(e) => onChangeDrawType(e.target.value)}
                                className="w-full bg-gray-800 p-2 rounded text-white"
                            >
                                <option value="self">Overall Próprio</option>
                                <option value="peer">Overall da Galera</option>
                                <option value="admin">Overall do Admin</option>
                            </select>
                        </div>
                    </div>
                </fieldset>
            )}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xl font-semibold text-indigo-300">Selecione os Jogadores</h3>
                    <span className="text-sm text-indigo-300">Selecionados: {selectedPlayerIds.size}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {players.map(p => {
                        const avatar = p.photoURL || p.avatarURL || null;
                        const initials = p.name ? p.name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase() : '?';
                        const isSelected = selectedPlayerIds.has(p.id);
                        return (
                            <button
                                key={p.id}
                                onClick={() => onTogglePlayer(p.id)}
                                className={`p-3 rounded-lg text-left transition-all duration-200 font-semibold flex items-center gap-3 ${isSelected ? 'bg-indigo-400 text-black scale-105 shadow-lg shadow-indigo-500/20' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                            >
                                <span className="flex h-10 w-10 items-center justify-center rounded-full overflow-hidden bg-gray-700 text-xs font-bold">
                                    {avatar ? (
                                        <img src={avatar} alt={p.name} className="h-full w-full object-cover" />
                                    ) : initials}
                                </span>
                                <span className="truncate">{p.name}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="text-center mt-6">
                    <button
                        onClick={onProceed}
                        disabled={selectedPlayerIds.size < 2}
                        className="bg-indigo-400 hover:bg-indigo-300 text-black font-bold py-3 px-8 rounded-lg text-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        {t('Iniciar Noite de Futebol')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MatchConfigView;
