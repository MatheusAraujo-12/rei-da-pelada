import React, { useState, useMemo, useEffect } from 'react';
import { calculateOverall } from '../../utils/helpers';

const CreatePlayerProfile = ({ user, onSave }) => {
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [position, setPosition] = useState('Meio-Campo');
    const [preferredFoot, setPreferredFoot] = useState('Direita');
    
    const [remainingPoints, setRemainingPoints] = useState(100);
    
    const initialLineSkills = useMemo(() => ({
        velocidade: 50, chute: 50, passe: 50, drible: 50, desarme: 50, finalizacao: 50, cruzamento: 50, folego: 50,
    }), []);
    
    const initialGkSkills = useMemo(() => ({
        reflexo: 50, posicionamento: 50, lancamento: 50,
    }), []);
    
    const [skills, setSkills] = useState(initialLineSkills);

    const skillCosts = useMemo(() => ({
        'Atacante':    { chute: 1, finalizacao: 1, drible: 2, velocidade: 2, passe: 3, cruzamento: 3, desarme: 4, folego: 2 },
        'Ponta':       { velocidade: 1, cruzamento: 1, drible: 2, chute: 2, finalizacao: 2, passe: 3, desarme: 4, folego: 2 },
        'Meio-Campo':  { passe: 1, drible: 2, chute: 2, desarme: 2, folego: 2, cruzamento: 2, finalizacao: 3, velocidade: 3 },
        'Volante':     { desarme: 1, passe: 1, folego: 2, chute: 3, drible: 3, cruzamento: 3, velocidade: 3, finalizacao: 4 },
        'Lateral':     { velocidade: 1, cruzamento: 1, desarme: 2, passe: 2, folego: 2, drible: 3, chute: 4, finalizacao: 4 },
        'Zagueiro':    { desarme: 1, folego: 2, passe: 3, chute: 4, velocidade: 4, drible: 4, cruzamento: 4, finalizacao: 4 },
        'Goleiro':     { reflexo: 1, posicionamento: 1, lancamento: 1 }
    }), []);

    useEffect(() => {
        setSkills(position === 'Goleiro' ? initialGkSkills : initialLineSkills);
        setRemainingPoints(100); // Reseta os pontos ao mudar de posição
    }, [position, initialGkSkills, initialLineSkills]);


    const handleSkillChange = (skill, delta) => {
        const cost = skillCosts[position][skill] || 3;
        const currentSkillValue = skills[skill];

        if (delta === 1) { // Aumentar
            if (remainingPoints >= cost && currentSkillValue < 99) {
                setRemainingPoints(prev => prev - cost);
                setSkills(prev => ({ ...prev, [skill]: prev[skill] + 1 }));
            }
        } else if (delta === -1) { // Diminuir
            if (currentSkillValue > 50) {
                setRemainingPoints(prev => prev + cost);
                setSkills(prev => ({ ...prev, [skill]: prev[skill] - 1 }));
            }
        }
    };
    
    const overall = useMemo(() => calculateOverall(skills), [skills]);

    const handleSave = async () => {
       if (name && age && position) {
            if (overall > 60) {
                alert("O Overall máximo na criação é 60. Por favor, ajuste seus atributos.");
                return;
            }
            const isGoalkeeper = position === 'Goleiro';
            const playerData = {
                name,
                age: Number(age),
                position: isGoalkeeper ? 'Goleiro' : 'Linha',
                detailedPosition: isGoalkeeper ? null : position,
                preferredFoot,
                selfOverall: skills,
                createdBy: user.uid,
            };
            onSave(playerData);
        } else {
            alert("Por favor, preencha nome, idade e posição.");
        }
    };
    
    const renderSkillEditor = () => {
        return Object.entries(skills).map(([skill, value]) => (
            <div key={skill} className="bg-gray-800 p-3 rounded-lg flex justify-between items-center">
                <label className="capitalize text-white font-semibold">{skill}</label>
                <div className="flex items-center gap-3">
                    <button onClick={() => handleSkillChange(skill, -1)} className="bg-red-600 w-8 h-8 rounded-full font-bold text-lg">-</button>
                    <span className="text-yellow-400 font-bold text-2xl w-10 text-center">{value}</span>
                    <button onClick={() => handleSkillChange(skill, 1)} className="bg-green-600 w-8 h-8 rounded-full font-bold text-lg">+</button>
                </div>
            </div>
        ));
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-full max-w-2xl bg-gray-900/50 rounded-2xl p-8 border border-gray-700 space-y-6">
                <h2 className="text-3xl font-bold text-yellow-400 text-center">Crie seu Perfil de Craque</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input type="text" placeholder="Seu Nome ou Apelido" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white" />
                    <input type="number" placeholder="Sua Idade" value={age} onChange={e => setAge(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white" />
                    <select value={position} onChange={e => setPosition(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white">
                        <option disabled>-- Posição --</option>
                        <option>Atacante</option>
                        <option>Ponta</option>
                        <option>Meio-Campo</option>
                        <option>Volante</option>
                        <option>Lateral</option>
                        <option>Zagueiro</option>
                        <option>Goleiro</option>
                    </select>
                    <select value={preferredFoot} onChange={e => setPreferredFoot(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white">
                        <option>Direita</option>
                        <option>Esquerda</option>
                        <option>Ambidestro</option>
                    </select>
                </div>

                <div className="bg-gray-800/50 p-4 rounded-lg text-center">
                    <p className="text-gray-400 text-sm">Pontos para distribuir</p>
                    <p className="text-yellow-400 font-bold text-4xl">{remainingPoints}</p>
                    <p className="text-gray-400 text-sm mt-2">Overall Atual</p>
                    <p className="text-white font-bold text-5xl">{overall}</p>
                </div>

                <div>
                    <h3 className="text-xl font-semibold text-yellow-400 mb-4">Distribua seus Pontos de Habilidade</h3>
                    <div className="space-y-3">
                        {renderSkillEditor()}
                    </div>
                </div>

                <div className="mt-8">
                    <button onClick={handleSave} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg text-lg">
                        Finalizar e Criar Perfil
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreatePlayerProfile;