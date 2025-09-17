import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { calculateOverall } from './helpers';

const ROLE_MAP = {
  atacante: 'attacker',
  ponta: 'attacker',
  'meio-campo': 'midfielder',
  meiodocampo: 'midfielder',
  meiodo: 'midfielder',
  meio: 'midfielder',
  volante: 'midfielder',
  zagueiro: 'defender',
  lateral: 'defender',
};

const clamp = (value) => {
  if (!Number.isFinite(value)) return 1;
  const next = Math.round(value * 100) / 100;
  if (next < 1) return 1;
  if (next > 99) return 99;
  return next;
};

const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const ensureSkill = (target, key) => {
  if (typeof target[key] !== 'number') target[key] = 0;
};

const applyDelta = (skills, key, delta) => {
  if (!delta) return;
  ensureSkill(skills, key);
  skills[key] = clamp(skills[key] + delta);
};

const determineRole = (player) => {
  if (normalize(player?.position) === 'goleiro') return 'goalkeeper';
  const detailed = normalize(player?.detailedPosition);
  return ROLE_MAP[detailed] || 'midfielder';
};

const getMatchStats = (stats = {}) => ({
  goals: Number(stats.goals || 0),
  assists: Number(stats.assists || 0),
  tackles: Number(stats.tackles || 0),
  saves: Number(stats.saves || 0),
  failures: Number(stats.failures || 0),
});

const getRandomStatKey = (selfOverall) => {
  const candidates = Object.keys(selfOverall || {}).filter((key) => typeof selfOverall[key] === 'number');
  if (candidates.length === 0) return null;
  const index = Math.floor(Math.random() * candidates.length);
  return candidates[index];
};

const applyRoleGains = (role, matchStats, skills) => {
  if (role === 'goalkeeper') {
    if (matchStats.saves > 0) {
      applyDelta(skills, 'posicionamento', matchStats.saves * 1);
      applyDelta(skills, 'reflexo', matchStats.saves * 1);
    }
    if (matchStats.assists > 0) {
      applyDelta(skills, 'lancamento', matchStats.assists * 1);
    }
    if (matchStats.goals > 0) {
      applyDelta(skills, 'lancamento', matchStats.goals * 0.5);
    }
    return;
  }

  switch (role) {
    case 'attacker':
      if (matchStats.goals > 0) applyDelta(skills, 'finalizacao', matchStats.goals * 1);
      if (matchStats.assists > 0) applyDelta(skills, 'passe', matchStats.assists * 1);
      if (matchStats.tackles > 0) applyDelta(skills, 'desarme', matchStats.tackles * 0.5);
      break;
    case 'midfielder':
      if (matchStats.goals > 0) applyDelta(skills, 'finalizacao', matchStats.goals * 0.5);
      if (matchStats.assists > 0) applyDelta(skills, 'passe', matchStats.assists * 1);
      if (matchStats.tackles > 0) applyDelta(skills, 'desarme', matchStats.tackles * 1);
      break;
    case 'defender':
      if (matchStats.goals > 0) applyDelta(skills, 'finalizacao', matchStats.goals * 0.5);
      if (matchStats.assists > 0) applyDelta(skills, 'passe', matchStats.assists * 0.5);
      if (matchStats.tackles > 0) applyDelta(skills, 'desarme', matchStats.tackles * 2);
      break;
    default:
      break;
  }
};

const applyRoleFailures = (role, failures, skills) => {
  if (!failures) return;
  switch (role) {
    case 'attacker':
    case 'midfielder':
      applyDelta(skills, 'finalizacao', -1 * failures);
      applyDelta(skills, 'passe', -1 * failures);
      break;
    case 'defender':
      applyDelta(skills, 'desarme', -1 * failures);
      applyDelta(skills, 'passe', -0.5 * failures);
      break;
    case 'goalkeeper':
      applyDelta(skills, 'reflexo', -1 * failures);
      applyDelta(skills, 'posicionamento', -0.5 * failures);
      break;
    default:
      break;
  }
};

const applyLossPenalty = (skills) => {
  Object.keys(skills || {}).forEach((key) => {
    if (key === 'folego' || key === 'velocidade') return;
    if (typeof skills[key] === 'number') applyDelta(skills, key, -0.5);
  });
};

const applyTenMatchBonus = (skills, previousMatches, newMatches) => {
  const prevMilestone = Math.floor(previousMatches / 10);
  const newMilestone = Math.floor(newMatches / 10);
  if (newMilestone > prevMilestone) {
    applyDelta(skills, 'folego', newMilestone - prevMilestone);
    applyDelta(skills, 'velocidade', newMilestone - prevMilestone);
  }
};

const applyRandomPenalty = (skills, count) => {
  const appliedKeys = [];
  for (let i = 0; i < count; i += 1) {
    const key = getRandomStatKey(skills);
    if (!key) break;
    applyDelta(skills, key, -1);
    appliedKeys.push(key);
  }
  return appliedKeys;
};

const cloneSkills = (selfOverall = {}) => {
  const clone = {};
  Object.keys(selfOverall).forEach((key) => {
    const value = Number(selfOverall[key]);
    clone[key] = Number.isFinite(value) ? value : 0;
  });
  return clone;
};

const needsUpdate = (original, updated) => {
  const originalKeys = Object.keys(original || {});
  const updatedKeys = Object.keys(updated || {});
  if (originalKeys.length !== updatedKeys.length) return true;
  return updatedKeys.some((key) => clamp(original[key]) !== clamp(updated[key]));
};

export const applyMatchProgressionToPlayers = async ({ db, groupId, matchData }) => {
  if (!groupId || !matchData?.teams) return;
  const playerMap = new Map();
  const collectPlayers = (list = [], teamKey) => {
    list.forEach((player) => {
      if (player?.id) {
        playerMap.set(player.id, { teamKey, playerSnapshot: player });
      }
    });
  };
  collectPlayers(matchData.teams.teamA, 'teamA');
  collectPlayers(matchData.teams.teamB, 'teamB');
  if (playerMap.size === 0) return;

  const scoreA = Number(matchData.score?.teamA || 0);
  const scoreB = Number(matchData.score?.teamB || 0);

  const processPlayerRecord = ({ playerRecord, role, teamKey, matchStats }) => {
    if (!playerRecord) return null;
    const selfSkills = cloneSkills(playerRecord.selfOverall);
    const previousMatches = Number(playerRecord.progression?.matchesPlayed || 0);
    const newMatches = previousMatches + 1;

    applyRoleGains(role, matchStats, selfSkills);
    applyRoleFailures(role, matchStats.failures, selfSkills);

    const teamLost = (teamKey === 'teamA' && scoreA < scoreB) || (teamKey === 'teamB' && scoreB < scoreA);
    if (teamLost) applyLossPenalty(selfSkills);

    if (role !== 'goalkeeper') {
      applyTenMatchBonus(selfSkills, previousMatches, newMatches);
    }

    const progression = { ...(playerRecord.progression || {}), matchesPlayed: newMatches };
    const changed = needsUpdate(playerRecord.selfOverall || {}, selfSkills) || newMatches !== previousMatches;

    return { skills: selfSkills, progression, changed };
  };

  const batch = writeBatch(db);
  let hasUpdates = false;

  await Promise.all(
    Array.from(playerMap.entries()).map(async ([playerId, info]) => {
      const playerRef = doc(db, `groups/${groupId}/players`, playerId);
      const snap = await getDoc(playerRef);
      if (!snap.exists()) return;
      const playerData = snap.data();
      const role = determineRole(playerData);
      const matchStats = getMatchStats(matchData.playerStats?.[playerId]);

      const groupResult = processPlayerRecord({ playerRecord: playerData, role, teamKey: info.teamKey, matchStats });
      if (groupResult?.changed) {
        batch.update(playerRef, {
          selfOverall: groupResult.skills,
          progression: groupResult.progression,
        });
        hasUpdates = true;
      }

      // Atualiza também o perfil global (se existir) para evolução entre grupos
      const globalRef = doc(db, 'players', playerId);
      const globalSnap = await getDoc(globalRef);
      if (globalSnap.exists()) {
        const globalData = globalSnap.data();
        const globalRole = determineRole(globalData);
        const globalResult = processPlayerRecord({ playerRecord: globalData, role: globalRole, teamKey: info.teamKey, matchStats });
        if (globalResult?.changed) {
          batch.update(globalRef, {
            selfOverall: globalResult.skills,
            progression: globalResult.progression,
          });
          hasUpdates = true;
        }
      }
    })
  );

  if (hasUpdates) await batch.commit();
};

const getPenaltyCountFromRating = (overall, rating) => {
  let penalties = 0;
  if (rating < 2 && overall >= 50) penalties += 1;
  if (overall >= 60 && rating < 3) penalties += 1;
  if (overall >= 70 && rating < 4) penalties += 1;
  if (overall >= 80 && rating < 5) penalties += 1;
  return penalties;
};

export const applyRatingPenaltiesToPlayers = async ({ db, groupId, ratings }) => {
  if (!groupId || !ratings || typeof ratings !== 'object') return;
  const entries = Object.entries(ratings).filter(([_, value]) => Number.isFinite(Number(value)));
  if (entries.length === 0) return;

  const batch = writeBatch(db);
  let hasUpdates = false;

  await Promise.all(
    entries.map(async ([playerId, ratingValue]) => {
      const rating = Number(ratingValue);
      const playerRef = doc(db, `groups/${groupId}/players`, playerId);
      const snap = await getDoc(playerRef);
      if (!snap.exists()) return;
      const playerData = snap.data();
      const overall = calculateOverall(playerData.selfOverall || {});
      const penalties = getPenaltyCountFromRating(overall, rating);
      if (!penalties) return;

      const groupSkills = cloneSkills(playerData.selfOverall);
      const appliedKeys = applyRandomPenalty(groupSkills, penalties);
      if (appliedKeys.length > 0) {
        batch.update(playerRef, { selfOverall: groupSkills });
        hasUpdates = true;
      }

      const globalRef = doc(db, 'players', playerId);
      const globalSnap = await getDoc(globalRef);
      if (globalSnap.exists()) {
        const globalSkills = cloneSkills(globalSnap.data().selfOverall);
        appliedKeys.forEach((key) => applyDelta(globalSkills, key, -1));
        batch.update(globalRef, { selfOverall: globalSkills });
        hasUpdates = true;
      }
    })
  );

  if (hasUpdates) await batch.commit();
};

