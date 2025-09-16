import React, { useState, useEffect, useMemo } from 'react';
import { LucideX, LucideCamera } from 'lucide-react';

const PlayerModal = ({ isOpen, onClose, onSave, player, isAdmin }) => {
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [position, setPosition] = useState('Linha');
    const [detailedPosition, setDetailedPosition] = useState('Meio-Campo');
    const [preferredFoot, setPreferredFoot] = useState('Direita');
    const [preferredSide, setPreferredSide] = useState('Qualquer');
    
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    
    const initialLineSkills = useMemo(() => ({ finalizacao: 50, drible: 50, velocidade: 50, folego: 50, passe: 50, desarme: 50 }), []);
    const initialGkSkills = useMemo(() => ({ reflexo: 50, posicionamento: 50, lancamento: 50 }), []);

    const [skills, setSkills] = useState(initialLineSkills);
    const [adminSkills, setAdminSkills] = useState(null);

    useEffect(() => {
        if (isOpen) {
            const isGk = player?.position === 'Goleiro';
            const baseSkills = isGk ? initialGkSkills : initialLineSkills;
            
            if (player) { // Modo Edição
                setName(player.name || '');
                setAge(player.age || '');
                setPosition(player.position || 'Linha');
                setSkills(player.selfOverall || baseSkills);
                setDetailedPosition(player.detailedPosition || 'Meio-Campo');
                setPreferredFoot(player.preferredFoot || 'Direita');
                setPreferredSide(player.preferredSide || 'Qualquer');
                setImagePreview(player.photoURL || null);
                if (isAdmin) {
                    setAdminSkills(player.adminOverall || player.selfOverall || baseSkills);
                }
            } else { // Modo Criação
                setName(''); setAge(''); setPosition('Linha'); setDetailedPosition('Meio-Campo');
                setPreferredFoot('Direita'); setPreferredSide('Qualquer');
                setImagePreview(null);
                setSkills(initialLineSkills);
                if(isAdmin) setAdminSkills(initialLineSkills);
            }
            setImageFile(null);
        }
    }, [player, isOpen, isAdmin, initialLineSkills, initialGkSkills]);
    
    useEffect(() => {
        if (!isOpen) return;
        const newSkills = position === 'Goleiro' ? initialGkSkills : initialLineSkills;
        if (!player || player.position !== position) {
            setSkills(newSkills);
            if (isAdmin) setAdminSkills(newSkills);
        }
    }, [position, isOpen, player, isAdmin, initialGkSkills, initialLineSkills]);

    if (!isOpen) return null;

    const handleImageChange = (e) => {
        if (e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        if (!name || !age) {
            alert("Por favor, preencha pelo menos o nome e a idade.");
            return;
        }
        const playerData = {
            name, 
            age: Number(age), 
            position,
            detailedPosition: position === 'Linha' ? detailedPosition : null,
            preferredFoot,
            preferredSide,
            selfOverall: skills,
            adminOverall: isAdmin ? adminSkills : player?.adminOverall || null,
        };
        if (player && player.id) {
            playerData.id = player.id;
        }
        try {
            await onSave(playerData, imageFile);
        } finally {
            onClose();
        }
    };

    const handleAdminSkillChange = (skill, value) => {
        setAdminSkills(prev => ({ ...prev, [skill]: Number(value) }));
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-full overflow-y-auto text-white border border-yellow-400/30">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-yellow-400">{player ? 'Editar Jogador' : 'Adicionar Novo Jogador'}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors"><LucideX className="w-6 h-6" /></button>
                </div>

                {position === 'Linha' && (
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Posição Detalhada</label>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                            {['Atacante','Ponta','Meio-Campo','Volante','Lateral','Zagueiro'].map(opt => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setDetailedPosition(opt)}
                                    className={`whitespace-nowrap px-3 py-2 rounded-lg text-sm border ${detailedPosition === opt ? 'bg-indigo-500 text-black border-indigo-400' : 'bg-gray-800 text-gray-200 border-gray-600 hover:border-indigo-400'}`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="flex justify-center mb-6">
                    <label className="relative cursor-pointer">
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                        <div className="w-32 h-32 rounded-full bg-gray-800 border-2 border-dashed border-gray-600 flex items-center justify-center text-gray-500 hover:bg-gray-700 hover:border-yellow-400">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Pré-visualização" className="w-full h-full rounded-full object-cover" />
                            ) : ( <LucideCamera size={48} /> )}
                        </div>
                    </label>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-yellow-400">Dados Básicos</h3>
                    <div><label className="block text-sm font-medium text-gray-300 mb-1">Nome</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white" /></div>
                    <div><label className="block text-sm font-medium text-gray-300 mb-1">Idade</label><input type="number" value={age} onChange={e => setAge(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white" /></div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Posição Geral</label>
                        <select value={position} onChange={e => setPosition(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white">
                            <option>Linha</option>
                            <option>Goleiro</option>
                        </select>
                    </div>
                </div>

                {/* ✅ SECÇÃO DO OVERALL DO ADMIN RESTAURADA */}
                {isAdmin && player && adminSkills && (
                    <div className="pt-4 mt-4 border-t border-gray-700">
                        <h3 className="text-lg font-semibold text-cyan-400 mb-3">Overall do Administrador</h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             {Object.entries(adminSkills).map(([skill, value]) => (
                                <div key={`admin-${skill}`}>
                                    <label className="capitalize flex items-center text-sm font-medium text-gray-300 mb-1">{skill}</label>
                                    <div className="flex items-center space-x-3">
                                        <input 
                                            type="range" 
                                            min="1" max="99" 
                                            value={value} 
                                            onChange={e => handleAdminSkillChange(skill, e.target.value)} 
                                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-slider" 
                                        />
                                        <span className="text-cyan-400 font-bold w-8 text-center">{value}</span>
                                    </div>
                                </div>
                            ))}
                         </div>
                    </div>
                )}

                <div className="mt-8 flex justify-end">
                    <button onClick={handleSave} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-6 rounded-lg">Salvar</button>
                </div>
            </div>
        </div>
    );
};

export default PlayerModal;
