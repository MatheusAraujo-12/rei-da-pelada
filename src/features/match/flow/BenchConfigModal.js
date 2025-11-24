import React, { useState, useEffect } from 'react';

const BenchConfigModal = ({
    isOpen,
    onClose = () => {},
    players = [],
    benchIds = new Set(),
    onSave = () => {},
    t = (s) => s,
}) => {
    const [localSelection, setLocalSelection] = useState(new Set());

    useEffect(() => {
        setLocalSelection(new Set(benchIds));
    }, [benchIds, isOpen]);

    if (!isOpen) return null;

    const toggle = (id) => {
        setLocalSelection(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSave = () => {
        onSave(new Set(localSelection));
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-3xl rounded-2xl border border-indigo-500/40 bg-[#0b1220]/95 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-indigo-200">{t('Configurar Banco de Reservas')}</h3>
                    <button onClick={onClose} className="text-slate-300 hover:text-white">X</button>
                </div>
                <p className="text-sm text-slate-300 mb-4">
                    {t('Selecione quem ficará sempre no banco de reservas antes de iniciar a partida.')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                    {players.map(p => (
                        <label key={p.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer ${localSelection.has(p.id) ? 'border-indigo-400 bg-indigo-900/40 text-white' : 'border-slate-600 bg-slate-800/40 text-slate-200'}`}>
                            <input
                                type="checkbox"
                                className="accent-indigo-500"
                                checked={localSelection.has(p.id)}
                                onChange={() => toggle(p.id)}
                            />
                            <span className="font-semibold truncate">{p.name}</span>
                        </label>
                    ))}
                    {players.length === 0 && (
                        <div className="text-slate-400 text-sm col-span-full">{t('Nenhum jogador selecionado para a sessão.')}</div>
                    )}
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600">{t('Cancelar')}</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-indigo-500 text-black font-bold hover:bg-indigo-400">{t('Salvar')}</button>
                </div>
            </div>
        </div>
    );
};

export default BenchConfigModal;
