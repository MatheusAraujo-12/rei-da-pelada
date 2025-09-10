import React from 'react';
import { LucideUser, LucideArrowRight, LucidePlusCircle, LucideLogOut, LucideDoorOpen, LucideEdit, LucideCheckCircle } from 'lucide-react';

const UserDashboard = ({ playerProfile, groups = [], activeGroupId, onEnterGroup, onGoToGroupGate, onLogout, onLeaveGroup, onEditProfile }) => {
    return (
        <div className="space-y-8">
            <div className="bg-gray-800/50 p-6 rounded-2xl border border-indigo-400/30 flex justify-between items-start flex-wrap gap-4">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center border-2 border-indigo-400 overflow-hidden">
                        {playerProfile.photoURL ? (
                            <img src={playerProfile.photoURL} alt={playerProfile.name} className="w-full h-full object-cover" />
                        ) : (
                            <LucideUser className="w-12 h-12 text-yellow-400" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">{playerProfile?.name}</h1>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <button onClick={onEditProfile} className="text-sm bg-indigo-500 hover:bg-indigo-400 text-black font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1 shadow">
                                <LucideEdit size={14}/> Meu Perfil
                            </button>
                        </div>
                    </div>
                </div>
                <button onClick={onLogout} title="Sair do Aplicativo" className="bg-red-800/80 text-white p-3 rounded-full hover:bg-red-700">
                    <LucideLogOut className="w-6 h-6" />
                </button>
            </div>

            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold text-indigo-300">Meus Grupos</h2>
                    <button onClick={onGoToGroupGate} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-green-700 text-sm">
                        <LucidePlusCircle className="w-4 h-4"/> Entrar/Criar Grupo
                    </button>
                </div>
                <div className="space-y-3">
                    {groups.length > 0 ? groups.map(group => (
                        <div key={group.id} className={`bg-gray-800 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4 border-2 ${group.id === activeGroupId ? 'border-indigo-400' : 'border-transparent'}`}>
                            <div className="text-center sm:text-left">
                                <p className="font-bold text-lg text-white">{group.name}</p>
                                <p className="text-sm text-gray-500">{group.members?.length || 0} membros</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {group.id === activeGroupId && (
                                     <span className="bg-indigo-400 text-black font-bold py-2 px-4 rounded-lg flex items-center gap-2 text-sm cursor-default">
                                        <LucideCheckCircle className="w-4 h-4"/> Ativo
                                    </span>
                                )}
                                <button onClick={() => onEnterGroup(group.id)} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-blue-700 text-sm">
                                    Ver Grupo <LucideArrowRight className="w-4 h-4"/>
                                </button>
                                <button onClick={() => onLeaveGroup(group)} className="bg-red-800/80 text-white p-2 rounded-lg hover:bg-red-700" title="Sair do Grupo">
                                    <LucideDoorOpen className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center text-gray-400 p-8 bg-gray-800/30 rounded-lg">
                            <p>Você ainda não faz parte de nenhum grupo.</p>
                            <button onClick={onGoToGroupGate} className="mt-4 bg-yellow-500 text-black font-bold py-2 px-6 rounded-lg hover:bg-yellow-600">
                                Criar ou Entrar no seu primeiro Grupo
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;
