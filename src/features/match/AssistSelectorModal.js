import React from 'react';
import { LucideX, LucideUser, LucideUsers } from 'lucide-react';

const AssistSelectorModal = ({ isOpen, onClose, teammates, onSelectAssister, t }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm text-white border border-cyan-400/30">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-cyan-400">{t('Quem deu a assistência?')}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors"><LucideX className="w-6 h-6" /></button>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                    {teammates.map(player => (
                        <button 
                            key={player.id}
                            onClick={() => onSelectAssister(player.id)}
                            className="w-full text-left bg-gray-800 p-3 rounded-lg flex items-center gap-3 hover:bg-gray-700 transition-colors"
                        >
                            <LucideUser className="w-5 h-5 text-gray-400" />
                            <span className="font-semibold">{player.name}</span>
                        </button>
                    ))}
                     <button 
                        onClick={() => onSelectAssister(null)} // null para indicar que não houve assistência
                        className="w-full text-left bg-gray-700 p-3 rounded-lg flex items-center gap-3 hover:bg-gray-600 transition-colors mt-4"
                    >
                        <LucideUsers className="w-5 h-5 text-gray-400" />
                        <span className="font-semibold">{t('Sem Assistência / Golo Individual')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssistSelectorModal;