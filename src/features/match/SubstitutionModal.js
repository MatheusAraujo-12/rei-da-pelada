import React from 'react';
import { LucideX, LucideUser } from 'lucide-react';

const SubstitutionModal = ({ isOpen, onClose, playerOut, availableSubs, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm text-white border border-gray-500/30">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-300">Substituir {playerOut?.name}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors"><LucideX className="w-6 h-6" /></button>
                </div>
                <h3 className="text-lg font-semibold text-gray-400 mb-4">Escolha quem vai entrar:</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                    {availableSubs.length > 0 ? availableSubs.map(playerIn => (
                        <button 
                            key={playerIn.id}
                            onClick={() => onConfirm(playerOut, playerIn)}
                            className="w-full text-left bg-gray-800 p-3 rounded-lg flex items-center gap-3 hover:bg-gray-700 transition-colors"
                        >
                            <LucideUser className="w-5 h-5 text-gray-400" />
                            <span className="font-semibold">{playerIn.name}</span>
                        </button>
                    )) : (
                        <p className="text-center text-gray-500 py-4">Não há jogadores disponíveis para substituição.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SubstitutionModal;