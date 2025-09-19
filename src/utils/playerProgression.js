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
  dribbles: Number(stats.dribbles || 0),
  failures: Number(stats.failures || 0),
});

const getRandomStatKey = (selfOverall) => {
  const candidates = Object.keys(selfOverall || {}).filter((key) => typeof selfOverall[key] === 'number');
  if (candidates.length === 0) return null;
  const index = Math.floor(Math.random() * candidates.length);
  return candidates[index];
};

const applyRoleGains = (role, matchStats, skills) => {
  const { goals = 0, assists = 0, tackles = 0, saves = 0, dribbles = 0 } = matchStats || {};

  if (role === 'goalkeeper') {
    if (saves > 0) {
      applyDelta(skills, 'impulsao', saves * 1);
      applyDelta(skills, 'reflexo', saves * 1);
    }
    if (assists > 0) {
      applyDelta(skills, 'lancamento', assists * 1);
      applyDelta(skills, 'reposicao', assists * 1);
    }
    if (goals > 0) {
      applyDelta(skills, 'habilidade', goals * 1);
    }
    if (tackles > 0) {
      applyDelta(skills, 'posicionamento', tackles * 1);
    }
    return;
  }

  if (goals > 0) applyDelta(skills, 'finalizacao', goals * 2);
  if (assists > 0) applyDelta(skills, 'passe', assists * 2);
  if (tackles > 0) applyDelta(skills, 'desarme', tackles * 2);
  if (dribbles > 0) {
    applyDelta(skills, 'drible', dribbles * 1);
    applyDelta(skills, 'velocidade', dribbles * 1);
  }
};

const applyRoleFailures = (role, failures, skills) => {
  if (!failures) return;
  if (role === 'goalkeeper') {
    applyDelta(skills, 'folego', -1 * failures);
    return;
  }
  applyDelta(skills, 'passe', -1 * failures);
};

const applyLossPenalty = (role, skills) => {
  if (role === 'goalkeeper') {
    applyDelta(skills, 'posicionamento', -1);
    applyDelta(skills, 'reflexo', -1);
    applyDelta(skills, 'impulsao', -1);
    return;
  }
  applyDelta(skills, 'finalizacao', -1);
  applyDelta(skills, 'passe', -1);
  applyDelta(skills, 'desarme', -1);
};

const applyMilestoneBonuses = (role, skills, winEarned, drawEarned) => {
  if (winEarned) {
    if (role === 'goalkeeper') {
      applyDelta(skills, 'posicionamento', 1);
      applyDelta(skills, 'reflexo', 1);
    } else {
      applyDelta(skills, 'folego', 1);
      applyDelta(skills, 'velocidade', 1);
    }
  }
  if (drawEarned) {
    applyDelta(skills, 'folego', 1);
  }
};

const applyRandomPenalty = (skills, count, amount = 1) => {
  const applied = [];
  for (let i = 0; i < count; i += 1) {
    const key = getRandomStatKey(skills);
    if (!key) break;
    applyDelta(skills, key, -amount);
    applied.push({ key, amount });
  }
  return applied;
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

    const teamWon = (teamKey === 'teamA' && scoreA > scoreB) || (teamKey === 'teamB' && scoreB > scoreA);
    const teamLost = (teamKey === 'teamA' && scoreA < scoreB) || (teamKey === 'teamB' && scoreB < scoreA);
    const teamDraw = !teamLost && !teamWon;

    applyMilestoneBonuses(role, selfSkills, teamWon, teamDraw);

    if (teamLost) applyLossPenalty(role, selfSkills);

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

const getRandomPenaltyInstructions = (overall, rating) => {
  const instructions = [];
  if (overall >= 60 && rating < 3) instructions.push({ count: 1, amount: 2 });
  if (overall >= 70 && rating < 4) instructions.push({ count: 1, amount: 2 });
  if (overall >= 80 && rating < 5) instructions.push({ count: 1, amount: 2 });
  return instructions;
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
      const role = determineRole(playerData);
      const overall = calculateOverall(playerData.selfOverall || {});
      const randomInstructions = getRandomPenaltyInstructions(overall, rating);
      const applyLowRatingPenalty = rating < 2 && overall >= 50;
      if (!applyLowRatingPenalty && randomInstructions.length === 0) return;

      const groupSkills = cloneSkills(playerData.selfOverall);
      const deterministicAdjustments = [];
      const applyDeterministicPenalty = (key, amount) => {
        applyDelta(groupSkills, key, -amount);
        deterministicAdjustments.push({ key, amount });
      };

      if (applyLowRatingPenalty) {
        if (role === 'goalkeeper') {
          applyDeterministicPenalty('reposicao', 1);
          applyDeterministicPenalty('habilidade', 1);
          applyDeterministicPenalty('folego', 1);
        } else {
          applyDeterministicPenalty('drible', 1);
          applyDeterministicPenalty('velocidade', 1);
          applyDeterministicPenalty('folego', 1);
        }
      }

      const randomAdjustments = [];
      randomInstructions.forEach(({ count, amount }) => {
        const applied = applyRandomPenalty(groupSkills, count, amount);
        randomAdjustments.push(...applied);
      });

      if (deterministicAdjustments.length === 0 && randomAdjustments.length === 0) return;

      batch.update(playerRef, { selfOverall: groupSkills });
      hasUpdates = true;

      const globalRef = doc(db, 'players', playerId);
      const globalSnap = await getDoc(globalRef);
      if (globalSnap.exists()) {
        const globalSkills = cloneSkills(globalSnap.data().selfOverall);
        deterministicAdjustments.forEach(({ key, amount }) => applyDelta(globalSkills, key, -amount));
        randomAdjustments.forEach(({ key, amount }) => applyDelta(globalSkills, key, -amount));
        batch.update(globalRef, { selfOverall: globalSkills });
        hasUpdates = true;
      }
    })
  );

  if (hasUpdates) await batch.commit();
};

