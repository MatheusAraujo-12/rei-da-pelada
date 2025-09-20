import React, { useState, useEffect, useMemo } from 'react';
import { LucideX, LucideCamera } from 'lucide-react';

const ADMIN_EXCLUDED_SKILLS = new Set(['chute', 'cruzamento']);

const clampSkillValue = (value, fallback = 50) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(99, Math.max(1, Math.round(numeric)));
};

const sanitizeAdminSkills = (rawSkills = {}, fallback = {}) => {
    const entries = Object.entries(rawSkills || {})
        .filter(([key]) => {
            const normalized = String(key || '').toLowerCase().trim();
            return !ADMIN_EXCLUDED_SKILLS.has(normalized);
        })
        .map(([key, value]) => [key, clampSkillValue(value, typeof fallback === 'object' && fallback !== null ? (fallback[key] ?? 50) : 50)]);
    const sanitized = Object.fromEntries(entries);
    if (Object.keys(fallback || {}).length > 0) {
        return { ...fallback, ...sanitized };
    }
    return sanitized;
};

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
    const initialGkSkills = useMemo(() => ({ reflexo: 50, posicionamento: 50, lancamento: 50, folego: 50, reposicao: 50, habilidade: 50, impulsao: 50 }), []);

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
                setSkills(player.selfOverall ? { ...baseSkills, ...player.selfOverall } : baseSkills);
                setDetailedPosition(player.detailedPosition || 'Meio-Campo');
                setPreferredFoot(player.preferredFoot || 'Direita');
                setPreferredSide(player.preferredSide || 'Qualquer');
                setImagePreview(player.photoURL || null);
                if (isAdmin) {
                    setAdminSkills(sanitizeAdminSkills(player.adminOverall || player.selfOverall, baseSkills));
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
            progression: player?.progression || { matchesPlayed: 0 },
            adminOverall: isAdmin ? sanitizeAdminSkills(adminSkills || {}, position === 'Goleiro' ? initialGkSkills : initialLineSkills) : player?.adminOverall || null,
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
        setAdminSkills(prev => ({ ...prev, [skill]: clampSkillValue(value, prev?.[skill] ?? 50) }));
    };
    
    return (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4">
            <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-[#28324d] bg-gradient-to-br from-[#0e162c] via-[#10172f] to-[#060b1a] p-6 sm:p-8 text-white shadow-[0_30px_80px_rgba(4,10,35,0.45)] max-h-full overflow-y-auto">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#4338ca33,transparent_55%)]" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,#06b6d455,transparent_60%)]" />
                <div className="relative space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#4338ca] via-[#a855f7] to-[#06b6d4]">{player ? 'Editar Jogador' : 'Adicionar Novo Jogador'}</h2>
                        <button onClick={onClose} className="p-2 rounded-full border border-[#28324d] bg-[#111a32]/80 hover:border-[#a855f7] hover:text-[#f8fafc] transition-colors"><LucideX className="w-5 h-5" /></button>
                    </div>

                <div className="flex justify-center">
                    <label className="relative cursor-pointer">
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                        <div className="w-32 h-32 rounded-full border border-[#28324d] bg-[#111a32]/80 flex items-center justify-center text-[#9aa7d7] shadow-[0_10px_30px_rgba(4,10,35,0.35)] hover:border-[#a855f7] transition">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Pré-visualização" className="w-full h-full rounded-full object-cover" />
                            ) : ( <LucideCamera size={48} /> )}
                        </div>
                    </label>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-indigo-200">Dados do Jogador</h3>
                    <div>
                        <label className="block text-sm font-medium text-[#9aa7d7] mb-1">Nome</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-[#28324d] bg-[#111a32]/80 p-3 text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#a855f7]" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#9aa7d7] mb-1">Idade</label>
                        <input type="number" value={age} onChange={e => setAge(e.target.value)} className="w-full rounded-lg border border-[#28324d] bg-[#111a32]/80 p-3 text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#a855f7]" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#9aa7d7] mb-1">Posição geral</label>
                        <select value={position} onChange={e => setPosition(e.target.value)} className="w-full rounded-lg border border-[#28324d] bg-[#111a32]/80 p-3 text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#a855f7]">
                            <option>Linha</option>
                            <option>Goleiro</option>
                        </select>
                    </div>
                    {position === 'Linha' && (
                        <div>
                            <label className="block text-sm font-medium text-[#9aa7d7] mb-1">Posição detalhada</label>
                            <select
                                value={detailedPosition}
                                onChange={e => setDetailedPosition(e.target.value)}
                                className="w-full rounded-lg border border-[#28324d] bg-[#111a32]/80 p-3 text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#a855f7]"
                            >
                                {['Atacante','Ponta','Meio-Campo','Volante','Lateral','Zagueiro'].map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                {/* ✅ SECÇÃO DO OVERALL DO ADMIN RESTAURADA */}
                {isAdmin && player && adminSkills && (
                    <div className="pt-6 mt-6 border-t border-[#28324d]">
                        <h3 className="text-lg font-semibold text-[#cbd5f5] mb-4">Overall do administrador</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {Object.entries(adminSkills).map(([skill, value]) => (
                                <div key={`admin-${skill}`} className="rounded-xl border border-[#28324d] bg-[#111a32]/60 p-3">
                                    <label className="capitalize flex items-center text-sm font-semibold text-[#9aa7d7] mb-2">{skill}</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min="1" max="99"
                                            value={clampSkillValue(value, adminSkills?.[skill] ?? 50)}
                                            onChange={e => handleAdminSkillChange(skill, e.target.value)}
                                            className="w-full h-2 rounded-lg bg-[#182036] appearance-none cursor-pointer range-slider"
                                        />
                                        <span className="text-[#a855f7] font-bold w-10 text-center">{clampSkillValue(value, adminSkills?.[skill] ?? 50)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="pt-4 flex justify-end">
                    <button onClick={handleSave} className="rounded-lg bg-gradient-to-r from-[#4338ca] via-[#a855f7] to-[#06b6d4] px-6 py-2 font-semibold text-white shadow-lg shadow-[#4338ca33] transition-transform hover:-translate-y-0.5">Salvar</button>
                </div>
            </div>
        </div>
    </div>
    );
};

export default PlayerModal;

