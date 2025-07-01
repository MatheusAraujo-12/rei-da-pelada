import React, { useState, useEffect, useMemo } from 'react';

const CreatePlayerProfile = ({ onSave, user }) => {
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [position, setPosition] = useState('Linha');
    const [detailedPosition, setDetailedPosition] = useState('Meio-Campo');
    const [preferredFoot, setPreferredFoot] = useState('Direita');
    const [preferredSide, setPreferredSide] = useState('Qualquer');

    const initialLineSkills = useMemo(() => ({ finalizacao: 50, drible: 50, velocidade: 50, folego: 50, passe: 50, desarme: 50 }), []);
    const initialGkSkills = useMemo(() => ({ reflexo: 50, posicionamento: 50, lancamento: 50 }), []);
    const [skills, setSkills] = useState(initialLineSkills);

    useEffect(() => {
        setSkills(position === 'Goleiro' ? initialGkSkills : initialLineSkills);
    }, [position, initialGkSkills, initialLineSkills]);

    const handleSave = () => {
       if (name && age && position) {
            const playerData = {
                name,
                age: Number(age),
                position,
                selfOverall: skills,
                createdBy: user.uid,
                detailedPosition: position === 'Linha' ? detailedPosition : null,
                preferredFoot,
                preferredSide,
            };
            onSave(playerData);
        } else {
            alert("Por favor, preencha todos os campos obrigatórios.");
        }
    };
    
    const handleSkillChange = (skill, value) => setSkills(prev => ({ ...prev, [skill]: Number(value) }));

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-md text-center bg-gray-900/50 rounded-2xl p-8 border border-gray-700">
                <h2 className="text-3xl font-bold text-yellow-400 mb-6">Crie seu Perfil de Jogador</h2>
                <p className="text-gray-400 mb-8">Preencha seus dados para entrar na pelada.</p>
                <div className="space-y-4 text-left">
                    <input type="text" placeholder="Seu Nome ou Apelido" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white" />
                    <input type="number" placeholder="Sua Idade" value={age} onChange={e => setAge(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white" />
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Posição Geral</label>
                        <select value={position} onChange={e => setPosition(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white">
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
                    
                    <div className="pt-4 text-left">
                        <h3 className="text-lg font-semibold text-yellow-400 mb-3">Autoavaliação de Habilidades</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {Object.entries(skills).map(([skill, value]) => (
                                <div key={skill}>
                                    <label className="capitalize flex items-center text-sm font-medium text-gray-300 mb-1">{skill.replace('_', ' ')}</label>
                                    <div className="flex items-center space-x-3">
                                        <input type="range" min="1" max="99" value={value} onChange={e => handleSkillChange(skill, e.target.value)} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-slider" />
                                        <span className="text-yellow-400 font-bold w-8 text-center">{value}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="mt-8">
                    <button onClick={handleSave} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg">Criar Perfil</button>
                </div>
            </div>
        </div>
    );
};

export default CreatePlayerProfile;