import React from 'react';
import { LucideUser, LucideEdit, LucideTrash2, LucideStar } from 'lucide-react';
import { calculateOverall } from '../../utils/helpers';

const GK_DEFAULT_SKILLS = { reflexo: 50, posicionamento: 50, lancamento: 50, folego: 50, reposicao: 50, habilidade: 50, impulsao: 50 };
const LINE_DEFAULT_SKILLS = { finalizacao: 50, drible: 50, velocidade: 50, folego: 50, passe: 50, desarme: 50 };

const fallbackSkillLabels = ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'];

const skillAliasMap = {
  chute: 'finalizacao',
  chutes: 'finalizacao',
  finalizacao: 'finalizacao',
  cruzamento: 'passe',
  cruzamentos: 'passe'
};

const normalizeSkillKey = (rawKey) =>
  String(rawKey || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const formatSkillLabel = (rawKey) => {
  const key = String(rawKey || '').trim();
  if (!key) return '-';
  const normalized = key.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return '-';
  if (normalized.length <= 4) return normalized.toUpperCase();
  return normalized
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const buildSkillList = (selfOverall) => {
  const aggregated = new Map();

  Object.entries(selfOverall || {}).forEach(([key, value]) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;

    const normalizedKey = normalizeSkillKey(key);
    if (!normalizedKey) return;

    const canonical = skillAliasMap[normalizedKey] || normalizedKey;
    const rounded = Math.round(numeric);
    const current = aggregated.get(canonical);

    if (current) {
      current.value = Math.max(current.value, rounded);
    } else {
      aggregated.set(canonical, { rawLabel: canonical, value: rounded });
    }
  });

  if (aggregated.size > 0) {
    return Array.from(aggregated.values())
      .map(({ rawLabel, value }) => ({
        label: formatSkillLabel(rawLabel),
        value,
      }))
      .sort((a, b) => (b.value - a.value) || a.label.localeCompare(b.label))
      .slice(0, 6);
  }

  return fallbackSkillLabels.map(label => ({ label, value: 0 }));
};
const PlayerCard = ({ player, onEdit, onDelete, onOpenPeerReview, isAdmin, t }) => {
  const isGoalkeeper = (player.position || '').trim() === 'Goleiro';
  const baseSkills = isGoalkeeper ? GK_DEFAULT_SKILLS : LINE_DEFAULT_SKILLS;
  const mergedSkills = React.useMemo(() => ({ ...baseSkills, ...(player.selfOverall || {}) }), [baseSkills, player.selfOverall]);
  const overall = calculateOverall(mergedSkills);
  const peerOverall = player.peerOverall ? calculateOverall(player.peerOverall.avgSkills) : null;
  const adminOverall = isAdmin && player.adminOverall ? calculateOverall(player.adminOverall) : null;
  const position = player.detailedPosition || player.position || '-';
  const skillEntries = React.useMemo(() => buildSkillList(mergedSkills), [mergedSkills]);
  // Variação de brilho/velocidade por jogador
  const seed = String(player?.id || player?.name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const variants = [
    { color: '99,102,241', alpha: 0.9, speed: '2.2s', opacity: 0.9 },   // indigo
    { color: '168,85,247', alpha: 0.85, speed: '3.4s', opacity: 0.85 }, // fúcsia
    { color: '6,182,212', alpha: 0.8, speed: '4.2s', opacity: 0.8 },    // ciano
  ];
  const __unused = variants.length + seed; void __unused;

  return (
    <div className="relative w-full max-w-[280px] min-h-[420px] mx-auto">
      {/* Conteúdo com bordas arredondadas (sem animação) */}
      <div className="relative flex h-full w-full flex-col rounded-3xl overflow-hidden bg-gradient-to-b from-[#0b1220] via-[#0b1220]/95 to-black border border-[#152238]">
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
          {false && (
            <div className="absolute top-9 right-4 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-fuchsia-700 bg-fuchsia-900/60 text-fuchsia-100">
              {player.detailedPosition}
            </div>
          )}

          {/* OVR grande */}
          <div className="absolute top-3 left-4 text-white/95">
            <div className="text-[11px] tracking-widest text-indigo-300 font-semibold">OVR</div>
            <div className="text-4xl leading-none font-black drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">{overall}</div>
          </div>

          {/* Posição */}
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-semibold border border-indigo-700 bg-indigo-900/60 text-indigo-100">
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

        {/* Atributos (resumo) */}
        <div className="px-4 mt-4 flex-1">
          <div className="grid grid-cols-3 gap-2">
            {skillEntries.map(skill => (
              <div
                key={skill.label}
                className="flex min-h-[64px] flex-col items-center justify-center rounded-lg border border-[#1c2a47] bg-[#0f1a2e]/70 px-2 py-2 text-center"
              >
                <span className="text-[10px] font-semibold tracking-wider text-indigo-200">{skill.label}</span>
                <span className="text-lg font-extrabold text-white">{skill.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ações */}
        <div className="px-4 mt-4 mb-5">
          <div className={`flex items-center gap-3 ${isAdmin ? 'justify-between' : 'justify-center'}`}>
            <button
              onClick={() => onOpenPeerReview(player)}
              className={`flex-1 rounded-lg bg-gradient-to-r from-[#4338ca] via-[#a855f7] to-[#06b6d4] py-2 px-3 text-sm font-semibold text-white shadow-lg shadow-[#4338ca33] transition-transform hover:-translate-y-0.5 ${isAdmin ? '' : 'max-w-full'}`}
            >
              {t('Avaliar')}
            </button>
            {isAdmin && (
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => onEdit(player)}
                  className="rounded-lg bg-blue-600 p-2 text-white shadow transition hover:bg-blue-500"
                  title={t("Editar Jogador")}
                >
                  <LucideEdit size={16} />
                </button>
                <button
                  onClick={() => onDelete(player)}
                  className="rounded-lg bg-rose-600 p-2 text-white shadow transition hover:bg-rose-500"
                  title={t("Apagar Jogador")}
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
            title={`${t('Overall da Galera')} (${player.peerOverall.ratingsCount} ${t('votos')})`}
          >
            <LucideStar className="w-4 h-4 text-yellow-300" />
            <span className="text-sm font-bold">{peerOverall}</span>
          </div>
        )}

        {/* Badge de overall admin (somente para admins) */}
        {adminOverall && (
          <div
            className="absolute top-[110px] right-3 bg-cyan-700/60 border border-cyan-300/50 text-white rounded-xl px-2 py-1 flex items-center gap-1 shadow"
            title={t("Overall do administrador")}
          >
            <LucideStar className="w-4 h-4 text-cyan-200" />
            <span className="text-sm font-bold">{adminOverall}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerCard;