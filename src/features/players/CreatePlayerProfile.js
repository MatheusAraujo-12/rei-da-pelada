import React, { useState } from 'react';
import { LucideCamera } from 'lucide-react';

const CreatePlayerProfile = ({ user, onSave }) => {
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [position, setPosition] = useState('Meio-Campo');
    const [preferredFoot, setPreferredFoot] = useState('Direita');
    
    // ✅ Novos estados para a imagem
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const handleImageChange = (e) => {
        if (e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
       if (name && age && position) {
            const isGoalkeeper = position === 'Goleiro';
            const baseSkills = isGoalkeeper 
                ? { reflexo: 50, posicionamento: 50, lancamento: 50 } 
                : { finalizacao: 50, drible: 50, velocidade: 50, folego: 50, passe: 50, desarme: 50, chute: 50, cruzamento: 50 };
            
            const playerData = {
                name,
                age: Number(age),
                position: isGoalkeeper ? 'Goleiro' : 'Linha',
                detailedPosition: isGoalkeeper ? null : position,
                preferredFoot,
                selfOverall: baseSkills, // Começa com skills base
                createdBy: user.uid,
            };

            // Passa tanto os dados do jogador quanto o ficheiro da imagem
            onSave(playerData, imageFile);
        } else {
            alert("Por favor, preencha nome, idade e posição.");
        }
    };
    
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-full max-w-md bg-gray-900/50 rounded-2xl p-8 border border-gray-700 space-y-6">
                <h2 className="text-3xl font-bold text-yellow-400 text-center">Crie seu Perfil de Jogador</h2>
                
                {/* ✅ Componente de Upload de Foto */}
                <div className="flex justify-center">
                    <label className="relative cursor-pointer">
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                        <div className="w-32 h-32 rounded-full bg-gray-800 border-2 border-dashed border-gray-600 flex items-center justify-center text-gray-500 hover:bg-gray-700 hover:border-yellow-400">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Pré-visualização" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <LucideCamera size={48} />
                            )}
                        </div>
                    </label>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                    <input type="text" placeholder="Seu Nome ou Apelido" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white" />
                    <input type="number" placeholder="Sua Idade" value={age} onChange={e => setAge(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white" />
                    <select value={position} onChange={e => setPosition(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white">
                        <option>Atacante</option> <option>Ponta</option> <option>Meio-Campo</option> <option>Volante</option> <option>Lateral</option> <option>Zagueiro</option> <option>Goleiro</option>
                    </select>
                    <select value={preferredFoot} onChange={e => setPreferredFoot(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white">
                        <option>Direita</option> <option>Esquerda</option> <option>Ambidestro</option>
                    </select>
                </div>
                <div className="mt-6">
                    <button onClick={handleSave} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg text-lg">
                        Finalizar e Criar Perfil
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreatePlayerProfile;
