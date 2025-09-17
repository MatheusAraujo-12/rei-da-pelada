import React, { useMemo, useState } from 'react';
import { LucideStar } from 'lucide-react';

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

  const StarRating = ({ value = 3, onChange }) => {
    const stars = [1,2,3,4,5];
    return (
      <div className="flex items-center gap-1">
        {stars.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange?.(s)}
            className={`p-1 rounded ${s <= value ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-400'}`}
            title={`${s} estrela(s)`}
          >
            <LucideStar className="w-5 h-5" />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 text-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto border border-indigo-700 shadow-xl">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-xl font-bold text-indigo-300">Feedback da Sessão</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">Fechar</button>
        </div>
        <div className="p-4 space-y-6">
          <div>
            <h4 className="text-lg font-semibold mb-3 text-cyan-300">MVP da Sessão</h4>
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {playersSorted.map(p => (
                <button key={p.id} onClick={() => setMvpId(p.id)} className={`px-3 py-2 rounded-lg text-sm border ${mvpId === p.id ? 'bg-yellow-400 text-black border-yellow-300' : 'bg-gray-800 text-gray-200 border-gray-600 hover:border-indigo-400'}`}>{p.name}</button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-3 text-fuchsia-300">Notas (1–5)</h4>
            <div className="space-y-3">
              {playersSorted.map(p => (
                <div key={p.id} className="bg-gray-800/60 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{p.name}</span>
                    <StarRating value={ratings[p.id] ?? 3} onChange={(v) => handleRate(p.id, v)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700">Cancelar</button>
          <button onClick={handleSubmit} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold">Enviar</button>
        </div>
      </div>
    </div>
  );
};

export default PostSessionVotingModal;
