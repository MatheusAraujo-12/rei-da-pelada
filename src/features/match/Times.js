import React, { useEffect, useMemo } from 'react';
import { LucidePlus, LucideX } from 'lucide-react';
import { calculateOverall } from '../../utils/helpers';

export function autoBuildTeams({ players = [], numberOfTeams = 2, playersPerTeam = 0, drawType = 'self' }) {
  const list = Array.isArray(players) ? players : [];
  const n = Math.max(2, Number(numberOfTeams) || 2);

  const playersWithOverall = list.map(p => {
    let overall;
    if (drawType === 'admin' && p.adminOverall) overall = calculateOverall(p.adminOverall);
    else if (drawType === 'peer' && p.peerOverall) overall = calculateOverall(p.peerOverall?.avgSkills);
    else overall = calculateOverall(p.selfOverall);
    return { ...p, overall };
  });

  const posOrder = { 'Goleiro': 1, 'Defensor': 2, 'Volante': 3, 'Meio-Campo': 4, 'Ponta': 5, 'Atacante': 6 };
  playersWithOverall.sort((a, b) => (posOrder[a.detailedPosition] || 99) - (posOrder[b.detailedPosition] || 99) || b.overall - a.overall);

  const teams = Array.from({ length: n }, () => []);
  if (playersPerTeam && playersPerTeam > 0) {
    for (const player of playersWithOverall) {
      const spot = teams.find(t => t.length < playersPerTeam);
      if (spot) spot.push(player);
      // overflow remains unassigned (bench)
    }
  } else {
    playersWithOverall.forEach((player, idx) => {
      teams[idx % n].push(player);
    });
  }
  return teams;
}

export default function Times({
  players = [],
  numberOfTeams = 2,
  playersPerTeam = 0,
  mode = 'manual', // 'manual' | 'auto'
  drawType = 'self',
  teams = [],
  onChange = () => {},
  t = (s) => s,
}) {
  const n = Math.max(2, Number(numberOfTeams) || 2);
  const safeTeams = useMemo(() => {
    const base = Array.from({ length: n }, (_, i) => Array.isArray(teams[i]) ? teams[i] : []);
    return base;
  }, [teams, n]);

  useEffect(() => {
    if (mode === 'auto') {
      const hasAny = (teams || []).some(arr => Array.isArray(arr) && arr.length > 0);
      if (!hasAny || (teams || []).length !== n) {
        const built = autoBuildTeams({ players, numberOfTeams: n, playersPerTeam, drawType });
        onChange(built);
      }
    } else {
      // Ensure exactly n slots when in manual mode
      if (!Array.isArray(teams) || teams.length !== n) {
        onChange(Array.from({ length: n }, () => []));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, n]);

  const assignedIds = new Set((safeTeams || []).flat().map(p => p?.id).filter(Boolean));
  const availablePlayers = (players || []).filter(p => p && !assignedIds.has(p.id)).sort((a, b) => a.name.localeCompare(b.name));

  const handleAssign = (player, toIndex) => {
    if (!player || typeof toIndex !== 'number') return;
    const next = safeTeams.map(t => [...t]);
    // Remove from any team
    next.forEach((team, i) => {
      const idx = team.findIndex(p => p?.id === player.id);
      if (idx >= 0) next[i].splice(idx, 1);
    });
    if (playersPerTeam > 0 && next[toIndex].length >= playersPerTeam) return;
    next[toIndex].push(player);
    onChange(next);
  };

  const handleUnassign = (player, fromIndex) => {
    const next = safeTeams.map((team, i) => i === fromIndex ? team.filter(p => p.id !== player.id) : [...team]);
    onChange(next);
  };

  if (mode !== 'manual') return null;

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-1/3 border border-indigo-800 rounded-lg p-4 bg-gray-800/20">
        <h3 className="font-semibold text-white mb-3">{t('Jogadores Disponíveis')} ({availablePlayers.length})</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {availablePlayers.map(p => (
            <div key={p.id} className="text-white p-2 bg-gray-800 rounded">{p.name}</div>
          ))}
        </div>
      </div>
      <div className="w-full md:w-2/3 space-y-4">
        {safeTeams.map((team, teamIndex) => (
          <div key={teamIndex} className="border border-indigo-800 rounded-lg p-4 min-h-[150px]">
            <h3 className="font-semibold text-indigo-300 mb-3">{t('Time')} {String.fromCharCode(65 + teamIndex)}</h3>
            <div className="space-y-2 mb-3">
              {team.map(p => (
                <button key={p.id} onClick={() => handleUnassign(p, teamIndex)} className="w-full text-left p-2 bg-blue-900/50 rounded text-white flex items-center gap-2 hover:bg-red-800" title={t('Remover do time')}>
                  <LucideX size={14}/> {p.name}
                </button>
              ))}
            </div>
            <div className="border-t border-indigo-800 pt-3">
              <p className="text-xs text-gray-400 mb-2">{t('Adicionar a este time')}:</p>
              <div className="flex flex-wrap gap-2">
                {availablePlayers.map(p => (
                  <button key={p.id} onClick={() => handleAssign(p, teamIndex)} className="text-xs p-1 px-2 bg-gray-700 rounded-full hover:bg-green-600 text-white">
                    <LucidePlus size={12} className="inline-block"/> {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

