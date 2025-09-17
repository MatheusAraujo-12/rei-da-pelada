import React, { useState, useEffect } from 'react';
import { LucideX } from 'lucide-react';

const EXCLUDED_SKILLS = new Set(['chute', 'cruzamento']);

const sanitizeSkills = (rawSkills = {}) => {
    const entries = Object.entries(rawSkills || {}).filter(([key]) => {
        const normalized = String(key || '').toLowerCase().trim();
        return !EXCLUDED_SKILLS.has(normalized);
    });
    return Object.fromEntries(entries);
};

const PeerReviewModal = ({ isOpen, player, onClose, onSave }) => {
    const [skills, setSkills] = useState({});

    useEffect(() => {
        if (player && isOpen) {
            setSkills(sanitizeSkills(player.selfOverall));
        }
    }, [player, isOpen]);

    if (!isOpen || !player) return null;

    const handleSkillChange = (skill, value) => {
        setSkills(prev => ({ ...prev, [skill]: Number(value) }));
    };

    const handleSave = () => {
        onSave(player, sanitizeSkills(skills));
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
             <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-full overflow-y-auto text-white border border-cyan-400/30">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-cyan-400">Avaliar {player.name}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors"><LucideX className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4">
                     {Object.entries(skills).map(([skill, value]) => (
                        <div key={skill}>
                            <label className="capitalize flex items-center text-sm font-medium text-gray-300 mb-1">{skill.replace('_', ' ')}</label>
                            <div className="flex items-center space-x-3">
                                <input type="range" min="1" max="99" value={value} onChange={e => handleSkillChange(skill, e.target.value)} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-slider" />
                                <span className="text-cyan-400 font-bold w-8 text-center">{value}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-8 flex justify-end">
                    <button onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-2 px-6 rounded-lg">Salvar Avaliacao</button>
                </div>
             </div>
        </div>
    );
};

export default PeerReviewModal;
