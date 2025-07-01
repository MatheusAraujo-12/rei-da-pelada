import React, { useState, useEffect, useMemo } from 'react';
import { LucideX } from 'lucide-react';

const PlayerModal = ({ isOpen, onClose, onSave, player, isAdmin }) => {
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [position, setPosition] = useState('Linha');
    const [detailedPosition, setDetailedPosition] = useState('Meio-Campo');
    const [preferredFoot, setPreferredFoot] = useState('Direita');
    const [preferredSide, setPreferredSide] = useState('Qualquer');

    const initialLineSkills = useMemo(() => ({ finalizacao: 50, drible: 50, velocidade: 50, folego: 50, passe: 50, desarme: 50 }), []);
    const initialGkSkills = useMemo(() => ({ reflexo: 50, posicionamento: 50, lancamento: 50 }), []);
    
    const [skills, setSkills] = useState(initialLineSkills);
    const [adminSkills, setAdminSkills] = useState(null);

    useEffect(() => {
        if (player) {
            setName(player.name);
            setAge(player.age);
            setPosition(player.position);
            setSkills(player.selfOverall);
            setDetailedPosition(player.detailedPosition || 'Meio-Campo');
            setPreferredFoot(player.preferredFoot || 'Direita');
            setPreferredSide(player.preferredSide || 'Qualquer');
            if (isAdmin) {
                setAdminSkills(player.adminOverall || player.selfOverall);
            }
        } else {
            setName('');
            setAge('');
            setPosition('Linha');
            setSkills(initialLineSkills);
            setDetailedPosition('Meio-Campo');
            setPreferredFoot('Direita');
            setPreferredSide('Qualquer');
            if(isAdmin) setAdminSkills(initialLineSkills);
        }
    }, [player, isOpen, isAdmin, initialLineSkills, initialGkSkills]);

    useEffect(() => {
        if (!isOpen) return;
        const newSkills = position === 'Goleiro' ? initialGkSkills : initialLineSkills;
        if (player && player.position === position) {
            setSkills(player.selfOverall);
            if(isAdmin) setAdminSkills(player.adminOverall || player.selfOverall);
        } else if (!player) {
            setSkills(newSkills);
            if(isAdmin) setAdminSkills(newSkills);
        }
    }, [position, player, isOpen, isAdmin, initialGkSkills, initialLineSkills]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (name && age && position) {
            onSave({ 
                id: player?.id, 
                name, 
                age: Number(age), 
                position, 
                selfOverall: skills, 
                adminOverall: isAdmin ? adminSkills : player?.adminOverall,
                detailedPosition: position === 'Linha' ? detailedPosition : null,
                preferredFoot,
                preferredSide
            });
            onClose();
        } else {
            alert("Por favor, preencha todos os campos.");
        }
    };

    const handleAdminSkillChange = (skill, value) => setAdminSkills(prev => ({ ...prev, [skill]: Number(value) }));
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-full overflow-y-auto text-white border border-yellow-400/30">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-yellow-400">{player ? 'Editar Jogador' : 'Novo Craque'}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors"><LucideX className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-yellow-400 mb-3">Dados Básicos</h3>
                    <div><label className="block text-sm font-medium text-gray-300 mb-1">Nome</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none transition" /></div>
                    <div><label className="block text-sm font-medium text-gray-300 mb-1">Idade</label><input type="number" value={age} onChange={e => setAge(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none transition" /></div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Posição Geral</label>
                        <select value={position} onChange={e => setPosition(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none transition">
                            <option>Linha</option>
                            <option>Goleiro</option>
                        </select>
                    </div>
                     {position === 'Linha' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Posição Específica</label>
                            <select value={detailedPosition} onChange={e => setDetailedPosition(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white">
                                <option>Defensor</option>
                                <option>Volante</option>
                                <option>Meio-Campo</option>
                                <option>Ponta</option>
                                <option>Atacante</option>
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Perna de Preferência</label>
                        <select value={preferredFoot} onChange={e => setPreferredFoot(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white">
                            <option>Direita</option>
                            <option>Esquerda</option>
                            <option>Ambidestro</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Lado Preferido do Campo</label>
                        <select value={preferredSide} onChange={e => setPreferredSide(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white">
                            <option>Direito</option>
                            <option>Esquerdo</option>
                            <option>Central</option>
                            <option>Qualquer</option>
                        </select>
                    </div>
                </div>
                {isAdmin && adminSkills && (
                    <div className="pt-4 mt-4 border-t border-gray-700">
                        <h3 className="text-lg font-semibold text-cyan-400 mb-3">Overall do Administrador</h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             {Object.entries(adminSkills).map(([skill, value]) => (<div key={`admin-${skill}`}><label className="capitalize flex items-center text-sm font-medium text-gray-300 mb-1">{skill.replace('_', ' ')}</label><div className="flex items-center space-x-3"><input type="range" min="1" max="99" value={value} onChange={e => handleAdminSkillChange(skill, e.target.value)} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-slider" /><span className="text-cyan-400 font-bold w-8 text-center">{value}</span></div></div>))}
                         </div>
                    </div>
                )}
                <div className="mt-8 flex justify-end"><button onClick={handleSave} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-6 rounded-lg transition-all transform hover:scale-105">Salvar</button></div>
            </div>
        </div>
    );
};

export default PlayerModal;