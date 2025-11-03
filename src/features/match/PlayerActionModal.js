import React from 'react';
import { LucideX, LucideGoal, LucideHandshake, LucideMove, LucideShield, LucideReplace, LucideFrown, LucideHand } from 'lucide-react';

const PlayerActionModal = ({ isOpen, onClose, player, onStat, onSubstitute, onGoal, t }) => {
    if (!isOpen || !player) return null;

    const actions = [
        { label: t('Gol'), icon: LucideGoal, action: onGoal, color: 'bg-green-600 hover:bg-green-500' },
        { label: t('Gol Contra'), icon: LucideGoal, action: () => onStat('ownGoals'), color: 'bg-red-700 hover:bg-red-600' },
        { label: t('Assistencia'), icon: LucideHandshake, action: () => onStat('assists'), color: 'bg-blue-600 hover:bg-blue-500' },
        { label: t('Drible'), icon: LucideMove, action: () => onStat('dribbles'), color: 'bg-amber-500 hover:bg-amber-400' },
        { label: t('Desarme'), icon: LucideShield, action: () => onStat('tackles'), color: 'bg-orange-600 hover:bg-orange-500' },
        { label: t('Falha'), icon: LucideFrown, action: () => onStat('failures'), color: 'bg-red-800 hover:bg-red-700' },
        { label: t('Substituir'), icon: LucideReplace, action: onSubstitute, color: 'bg-gray-600 hover:bg-gray-500' }
    ];

    if (player.position === 'Goleiro') {
        actions.unshift({ label: t('Defesa'), icon: LucideHand, action: () => onStat('saves'), color: 'bg-purple-600 hover:bg-purple-500' });
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm text-white border border-yellow-400/30">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-yellow-400">{player.name}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors"><LucideX className="w-6 h-6" /></button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {actions.map(action => (
                        <button 
                            key={action.label}
                            onClick={() => {
                                action.action();
                                // Fechamento do modal eh tratado pelo componente pai (para fluxo de multi-modais)
                            }}
                            className={`flex flex-col items-center justify-center p-4 rounded-lg text-white font-semibold ${action.color} transition-transform transform hover:scale-105`}
                        >
                            <action.icon className="w-8 h-8 mb-2" />
                            {action.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PlayerActionModal;
