import React from 'react';
import Times from '../Times';

const ManualSetupView = ({
    availablePlayersForSetup = [],
    numberOfTeams,
    playersPerTeam,
    teams = [],
    onChangeTeams = () => {},
    onConfirm = () => {},
    t = (s) => s,
}) => {
    return (
        <div className="bg-gray-900/50 rounded-2xl p-4 sm:p-6 border border-indigo-800">
            <h2 className="text-2xl font-bold text-indigo-300 mb-4">Montagem Manual dos Times</h2>
            <Times
                players={availablePlayersForSetup}
                numberOfTeams={numberOfTeams}
                playersPerTeam={playersPerTeam}
                mode="manual"
                teams={teams}
                onChange={onChangeTeams}
                t={t}
            />
            <div className="text-center mt-6">
                <button
                    onClick={onConfirm}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg"
                >
                    Confirmar Times e Iniciar
                </button>
            </div>
        </div>
    );
};

export default ManualSetupView;
