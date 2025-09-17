import React from 'react';
import { LucideUser, LucideArrowRight, LucidePlusCircle, LucideLogOut, LucideDoorOpen, LucideEdit, LucideCheckCircle } from 'lucide-react';

const STARFIELD_PARTICLES = Array.from({ length: 48 }, () => {
    const size = 2 + Math.random() * 2.4;
    return {
        left: Math.random() * 100,
        top: Math.random() * 100,
        size,
        speed: 20 + Math.random() * 16,
        delay: Math.random() * -24,
        opacity: 0.55 + Math.random() * 0.35,
        blur: 0.3 + Math.random() * 1.2,
    };
});

const UserDashboard = ({ playerProfile, groups = [], activeGroupId, onEnterGroup, onGoToGroupGate, onLogout, onLeaveGroup, onEditProfile }) => {
    return (
        <div className="relative">
            <div className="starfield" aria-hidden="true">
                {STARFIELD_PARTICLES.map((particle, index) => (
                    <span
                        key={index}
                        style={{
                            '--star-left': `${particle.left.toFixed(2)}%`,
                            '--star-top': `${particle.top.toFixed(2)}%`,
                            '--star-size': `${particle.size.toFixed(2)}px`,
                            '--star-speed': `${particle.speed.toFixed(2)}s`,
                            '--star-delay': `${particle.delay.toFixed(2)}s`,
                            '--star-opacity': `${particle.opacity.toFixed(2)}`,
                            '--star-blur': `${particle.blur.toFixed(2)}px`,
                        }}
                    />
                ))}
            </div>

            <div className="relative z-10 space-y-8">
                <div className="relative overflow-hidden rounded-3xl border border-[#28324d] bg-gradient-to-br from-[#0e162c] via-[#10172f] to-[#060b1a] p-6 sm:p-8 text-white shadow-[0_20px_60px_rgba(4,10,35,0.35)]">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#4338ca33,transparent_55%)]" />
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,#06b6d455,transparent_60%)]" />
                    <div className="relative flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="w-20 h-20 rounded-full border border-[#28324d] bg-[#111a32]/80 flex items-center justify-center text-[#9aa7d7] shadow-[0_10px_30px_rgba(4,10,35,0.35)] overflow-hidden">
                                {playerProfile.photoURL ? (
                                    <img src={playerProfile.photoURL} alt={playerProfile.name} className="w-full h-full object-cover" />
                                ) : (
                                    <LucideUser className="w-12 h-12" />
                                )}
                            </div>
                            <div>
                                <h1 className="text-3xl font-extrabold text-white">{playerProfile?.name}</h1>
                                <p className="mt-1 text-sm text-[#9aa7d7]">Perfil do jogador</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={onEditProfile} className="rounded-lg bg-gradient-to-r from-[#4338ca] via-[#a855f7] to-[#06b6d4] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#4338ca33] transition-transform hover:-translate-y-0.5 flex items-center gap-2">
                                <LucideEdit size={16}/> Meu Perfil
                            </button>
                            <button onClick={onLogout} title="Sair do Aplicativo" className="rounded-full border border-[#28324d] bg-[#111a32]/80 p-3 text-[#f0f4ff] hover:border-[#f87171] hover:text-[#f87171] transition-colors">
                                <LucideLogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-3xl border border-[#28324d] bg-gradient-to-br from-[#0e162c] via-[#10172f] to-[#060b1a] p-6 sm:p-8 text-white shadow-[0_20px_60px_rgba(4,10,35,0.35)]">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#4338ca22,transparent_55%)]" />
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,#06b6d455,transparent_60%)]" />
                    <div className="relative space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <h2 className="text-2xl font-semibold text-indigo-100">Meus grupos</h2>
                            <button onClick={onGoToGroupGate} className="rounded-lg bg-gradient-to-r from-[#4338ca] via-[#a855f7] to-[#06b6d4] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#4338ca33] transition-transform hover:-translate-y-0.5 flex items-center gap-2">
                                <LucidePlusCircle className="w-4 h-4"/> Entrar/Criar Grupo
                            </button>
                        </div>
                        <div className="space-y-3">
                            {groups.length > 0 ? groups.map(group => (
                                <div key={group.id} className={`rounded-2xl border border-[#28324d] bg-[#111a32]/70 p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-center gap-4 transition shadow-[0_10px_30px_rgba(4,10,35,0.35)] ${group.id === activeGroupId ? 'ring-2 ring-[#a855f7]' : ''}`}>
                                    <div className="flex items-center gap-3 sm:gap-4 text-center sm:text-left">
                                        <div className="flex-shrink-0">
                                            {group.crestURL ? (
                                                <img
                                                    src={group.crestURL}
                                                    alt={`Escudo do grupo ${group.name}`}
                                                    className="h-12 w-12 rounded-xl border border-[#28324d] bg-[#111a32]/90 object-cover"
                                                />
                                            ) : (
                                                <div className="h-12 w-12 rounded-xl border border-dashed border-[#28324d] bg-[#111a32]/70 flex items-center justify-center text-[#9aa7d7]">
                                                    <LucidePlusCircle className="h-5 w-5" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-center sm:items-start">
                                            <p className="font-semibold text-lg text-white">{group.name}</p>
                                            <p className="text-sm text-[#9aa7d7]">{group.members?.length || 0} membros</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {group.id === activeGroupId && (
                                            <span className="rounded-lg border border-[#28324d] bg-[#111a32]/80 px-3 py-2 text-xs font-semibold text-[#cbd5f5] flex items-center gap-2">
                                                <LucideCheckCircle className="w-4 h-4 text-[#a855f7]"/> Ativo
                                            </span>
                                        )}
                                        <button onClick={() => onEnterGroup(group.id)} className="rounded-lg border border-[#28324d] bg-[#111a32]/80 px-4 py-2 text-sm font-semibold text-[#f0f4ff] hover:border-[#06b6d4] hover:text-[#06b6d4] transition-colors flex items-center gap-2">
                                            Ver Grupo <LucideArrowRight className="w-4 h-4"/>
                                        </button>
                                        <button onClick={() => onLeaveGroup(group)} className="rounded-lg border border-[#28324d] bg-[#111a32]/80 p-2 text-[#f87171] hover:border-[#f87171] transition-colors" title="Sair do Grupo">
                                            <LucideDoorOpen className="w-5 h-5"/>
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="rounded-2xl border border-dashed border-[#28324d] bg-[#111a32]/40 p-8 text-center text-[#9aa7d7]">
                                    <p>Voce ainda nao faz parte de nenhum grupo.</p>
                                    <button onClick={onGoToGroupGate} className="mt-4 rounded-lg bg-gradient-to-r from-[#4338ca] via-[#a855f7] to-[#06b6d4] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#4338ca33] transition-transform hover:-translate-y-0.5">
                                        Criar ou Entrar no seu primeiro grupo
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;
