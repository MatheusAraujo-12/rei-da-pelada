import React from 'react';
import { LucideUser, LucideEdit, LucideTrash2, LucideStar } from 'lucide-react';
import { calculateOverall } from '../../utils/helpers';

// Mapeia chaves comuns para os 6 atributos clássicos (PAC, SHO, PAS, DRI, DEF, PHY)
const sixKeys = [
  { key: 'PAC', synonyms: ['pace', 'velocidade', 'speed'] },
  { key: 'SHO', synonyms: ['shooting', 'chute', 'finalizacao', 'finalização'] },
  { key: 'PAS', synonyms: ['passing', 'passe'] },
  { key: 'DRI', synonyms: ['dribbling', 'drible', 'driblando'] },
  { key: 'DEF', synonyms: ['defending', 'defesa', 'marcacao', 'marcação'] },
  { key: 'PHY', synonyms: ['physical', 'fisico', 'físico', 'forca', 'força', 'stamina', 'resistencia', 'resistência'] }
];

const toLowerNum = (obj) => Object.fromEntries(
  Object.entries(obj || {}).map(([k, v]) => [String(k).toLowerCase(), Number(v)])
);

function computeSix(selfOverall) {
  const low = toLowerNum(selfOverall);
  const out = [];
  for (const spec of sixKeys) {
    const found = spec.synonyms.find(s => low[s] !== undefined && !isNaN(low[s]));
    out.push({ label: spec.key, value: found ? Math.round(low[found]) : 0 });
  }
  return out;
}

const PlayerCard = ({ player, onEdit, onDelete, onOpenPeerReview, isAdmin }) => {
  const overall = calculateOverall(player.selfOverall);
  const peerOverall = player.peerOverall ? calculateOverall(player.peerOverall.avgSkills) : null;
  const position = player.detailedPosition || player.position || '—';
  const six = computeSix(player.selfOverall);

  // Variação de brilho/velocidade por jogador
  const seed = String(player?.id || player?.name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const variants = [
    { color: '99,102,241', alpha: 0.9, speed: '2.2s', opacity: 0.9 },   // indigo
    { color: '168,85,247', alpha: 0.85, speed: '3.4s', opacity: 0.85 }, // fúcsia
    { color: '6,182,212', alpha: 0.8, speed: '4.2s', opacity: 0.8 },    // ciano
  ];
  const __unused = variants.length + seed; void __unused;

  return (
    <div className="relative w-full max-w-[280px] h-[400px] mx-auto">
      {/* Conteúdo com bordas arredondadas (sem animação) */}
      <div className="relative h-full w-full rounded-3xl overflow-hidden bg-gradient-to-b from-[#0b1220] via-[#0b1220]/95 to-black border border-[#152238]">
        {/* Overlays decorativos */}
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{
          background: 'radial-gradient(80% 50% at 50% 0%, rgba(99,102,241,0.25) 0%, rgba(0,0,0,0) 70%)'
        }} />
        <div className="pointer-events-none absolute inset-0 opacity-15" style={{
          backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0 8px, rgba(255,255,255,0) 8px 16px)'
        }} />

        {/* Topo: retrato + badges */}
        <div className="relative h-48 flex items-center justify-center">
          <div className="relative w-28 h-28 rounded-full overflow-hidden ring-4 ring-indigo-400/70 ring-offset-4 ring-offset-[#0b1220] shadow-xl">
            {player.photoURL ? (
              <img
                src={player.photoURL + (player.photoURL.includes('?') ? '&' : '?') + 'v=' + (player.updatedAt?.seconds || player.updatedAt || 0)}
                alt={player.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#0f1a2e] flex items-center justify-center">
                <LucideUser className="w-14 h-14 text-indigo-300/70" />
              </div>
            )}
          </div>

          {/* OVR grande */}
          <div className="absolute top-3 left-4 text-white/95">
            <div className="text-[11px] tracking-widest text-indigo-300 font-semibold">OVR</div>
            <div className="text-4xl leading-none font-black drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">{overall}</div>
          </div>

          {/* Posição */}
          <div className="absolute top-3 right-4 px-3 py-1 rounded-full text-xs font-semibold border border-indigo-700 bg-indigo-900/50 text-indigo-100">
            {position}
          </div>

          {/* Nome */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[88%]">
            <div className="bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-indigo-400 text-black rounded-md px-3 py-1.5 text-center shadow">
              <p className="text-base font-extrabold uppercase tracking-wide truncate" title={player.name}>
                {player.name}
              </p>
            </div>
          </div>
        </div>

        {/* Atributos (6 em 2 linhas) */}
        <div className="px-4 mt-2 grid grid-cols-3 gap-2">
          {six.map(s => (
            <div key={s.label} className="flex flex-col items-center justify-center bg-[#0f1a2e]/70 border border-[#1c2a47] rounded-lg py-2">
              <span className="text-[10px] tracking-wider text-indigo-200">{s.label}</span>
              <span className="text-lg font-extrabold text-white">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Ações */}
        <div className="px-4 mt-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onOpenPeerReview(player)}
              className="bg-indigo-400 hover:bg-indigo-300 text-black font-bold py-2 px-3 rounded-lg text-sm shadow"
            >
              Avaliar
            </button>
            {isAdmin && (
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(player)}
                  className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg shadow"
                  title="Editar Jogador"
                >
                  <LucideEdit size={16} />
                </button>
                <button
                  onClick={() => onDelete(player)}
                  className="p-2 bg-rose-600 hover:bg-rose-500 rounded-lg shadow"
                  title="Apagar Jogador"
                >
                  <LucideTrash2 size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Badge de peer overall */}
        {peerOverall && (
          <div
            className="absolute top-[52px] right-3 bg-fuchsia-700/60 border border-fuchsia-300/50 text-white rounded-xl px-2 py-1 flex items-center gap-1 shadow"
            title={`Overall da Galera (${player.peerOverall.ratingsCount} votos)`}
          >
            <LucideStar className="w-4 h-4 text-yellow-300" />
            <span className="text-sm font-bold">{peerOverall}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerCard;
