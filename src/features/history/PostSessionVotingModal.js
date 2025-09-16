import React, { useMemo, useState } from 'react';

const PostSessionVotingModal = ({ isOpen, onClose, players = [], onSubmit }) => {
  const playersSorted = useMemo(() => [...players].sort((a,b) => a.name.localeCompare(b.name)), [players]);
  const [ratings, setRatings] = useState({});
  const [mvpId, setMvpId] = useState(null);

  if (!isOpen) return null;

  const handleRate = (pid, val) => {
    setRatings(prev => ({ ...prev, [pid]: Number(val) }));
  };

  const handleSubmit = () => {
    onSubmit?.({ ratings, mvpId });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 text-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto border border-indigo-700">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-xl font-bold text-indigo-300">Feedback da Sessão</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">Fechar</button>
        </div>
        <div className="p-4 space-y-6">
          <div>
            <h4 className="text-lg font-semibold mb-3">MVP da Sessão</h4>
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {playersSorted.map(p => (
                <button key={p.id} onClick={() => setMvpId(p.id)} className={`px-3 py-2 rounded-lg text-sm border ${mvpId === p.id ? 'bg-yellow-400 text-black border-yellow-300' : 'bg-gray-800 text-gray-200 border-gray-600 hover:border-indigo-400'}`}>{p.name}</button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-3">Notas (1–10)</h4>
            <div className="space-y-3">
              {playersSorted.map(p => (
                <div key={p.id} className="bg-gray-800/60 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-indigo-300 font-bold w-8 text-right">{ratings[p.id] ?? 5}</span>
                  </div>
                  <input type="range" min="1" max="10" value={ratings[p.id] ?? 5} onChange={e => handleRate(p.id, e.target.value)} className="w-full range-slider" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-700 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600">Cancelar</button>
          <button onClick={handleSubmit} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold">Enviar</button>
        </div>
      </div>
    </div>
  );
};

export default PostSessionVotingModal;

