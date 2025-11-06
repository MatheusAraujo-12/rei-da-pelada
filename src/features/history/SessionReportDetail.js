import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, collection, onSnapshot } from 'firebase/firestore';
import { applyRatingPenaltiesToPlayers } from '../../utils/playerProgression';
import { db, auth } from '../../services/firebase';
import PostSessionVotingModal from './PostSessionVotingModal';

const championsTheme = {
  primary: '#4338ca',
  accent: '#a855f7',
  cyan: '#06b6d4',
  surface: '#10152a',
  surfaceSoft: '#16203a',
  border: '#28324d',
  textPrimary: '#f8fafc',
  textSecondary: '#cbd5f5',
  textMuted: '#94a3b8',
};

const SessionReportDetail = ({ session, onBack, t = (s) => s }) => {
  const [matchesDetails, setMatchesDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isVotingOpen, setIsVotingOpen] = useState(false);
  const [feedback, setFeedback] = useState([]);
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());

  useEffect(() => {
    const fetchMatches = async () => {
      if (Array.isArray(session?.matches) && session.matches.length > 0) {
        setMatchesDetails(session.matches);
        setLoading(false);
        return;
      }
      if (!session?.matchIds || session.matchIds.length === 0 || !session.groupId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const matchPromises = (session.matchIds || [])
          .map(id => {
            if (!id) return null;
            const matchDocRef = doc(db, `groups/${session.groupId}/matches`, id);
            return getDoc(matchDocRef);
          })
          .filter(Boolean);
        const matchDocs = await Promise.all(matchPromises);
        const matchesData = matchDocs
          .filter(d => d && d.exists())
          .map(d => ({ id: d.id, ...d.data() }));
        setMatchesDetails(matchesData);
      } catch (error) {
        console.error('Erro ao buscar detalhes das partidas:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, [session]);

  // Carrega feedback (notas e MVP) dos membros
  useEffect(() => {
    if (!session?.groupId || !session?.id) return;
    try {
      const feedbackCol = collection(db, `groups/${session.groupId}/sessions/${session.id}/feedback`);
      const unsub = onSnapshot(feedbackCol, (snap) => {
        setFeedback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
    } catch (e) { console.error('Erro ao carregar feedback da sessão:', e); }
  }, [session?.groupId, session?.id]);
  useEffect(() => {
    const tick = () => setNowTimestamp(Date.now());
    const intervalId = setInterval(tick, 60000);
    return () => clearInterval(intervalId);
  }, []);

  const currentUserUid = auth.currentUser?.uid || null;

  const hasCurrentUserVoted = useMemo(() => {
    if (!currentUserUid) return false;
    return feedback.some(entry => entry?.id === currentUserUid);
  }, [feedback, currentUserUid]);

  const calculatedStats = useMemo(() => {
    const stats = {};
    if (!session?.players || matchesDetails.length === 0) return [];

    (session.players || []).forEach(playerId => {
      stats[playerId] = {
        name: 'Desconhecido', wins: 0, draws: 0, losses: 0,
        goals: 0, assists: 0, dribbles: 0, tackles: 0, saves: 0, failures: 0,
      };
    });

    matchesDetails.forEach(match => {
      const teamAPlayers = match?.teams?.teamA || [];
      const teamBPlayers = match?.teams?.teamB || [];
      const teamAIds = teamAPlayers.map(p => p?.id);
      const teamBIds = teamBPlayers.map(p => p?.id);
      const playerStats = match?.playerStats || {};

      let scoreA = Number(match?.score?.teamA);
      let scoreB = Number(match?.score?.teamB);
      if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) {
        scoreA = 0; scoreB = 0;
        for (const pId in playerStats) {
          const ps = playerStats[pId] || {};
          if (teamAIds.includes(pId)) scoreA += ps.goals || 0;
          else if (teamBIds.includes(pId)) scoreB += ps.goals || 0;
        }
      }

      if (scoreA > scoreB) {
        teamAIds.forEach(id => { if (stats[id]) stats[id].wins++; });
        teamBIds.forEach(id => { if (stats[id]) stats[id].losses++; });
      } else if (scoreB > scoreA) {
        teamBIds.forEach(id => { if (stats[id]) stats[id].wins++; });
        teamAIds.forEach(id => { if (stats[id]) stats[id].losses++; });
      } else {
        teamAIds.forEach(id => { if (stats[id]) stats[id].draws++; });
        teamBIds.forEach(id => { if (stats[id]) stats[id].draws++; });
      }

      for (const pId in playerStats) {
        if (!stats[pId]) continue;
        const inMatch = [...teamAPlayers, ...teamBPlayers].find(p => p?.id === pId);
        if (inMatch) stats[pId].name = inMatch.name;
        const ps = playerStats[pId] || {};
        stats[pId].goals += ps.goals || 0;
        stats[pId].assists += ps.assists || 0;
        stats[pId].dribbles += ps.dribbles || 0;
        stats[pId].tackles += ps.tackles || 0;
        stats[pId].saves += ps.saves || 0;
        stats[pId].failures += ps.failures || 0;
      }
    });

    return Object.values(stats).sort((a, b) => (b.wins - a.wins) || (b.goals - a.goals));
  }, [matchesDetails, session?.players]);

  const sessionDate = session?.date?.seconds
    ? new Date(session.date.seconds * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  const participants = useMemo(() => {
    const map = new Map();
    matchesDetails.forEach(m => {
      (m?.teams?.teamA || []).forEach(p => { if (p?.id) map.set(p.id, p); });
      (m?.teams?.teamB || []).forEach(p => { if (p?.id) map.set(p.id, p); });
    });
    return Array.from(map.values());
  }, [matchesDetails]);

  // Agrega médias das notas e MVP consolidado
  const votingSummary = useMemo(() => {
    const sum = {}; const cnt = {}; const mvpCounts = {};
    (feedback || []).forEach(fb => {
      const ratings = fb.ratings || {};
      Object.keys(ratings).forEach(pid => {
        const v = Number(ratings[pid]);
        if (Number.isFinite(v)) { sum[pid] = (sum[pid] || 0) + v; cnt[pid] = (cnt[pid] || 0) + 1; }
      });
      if (fb.mvp) mvpCounts[fb.mvp] = (mvpCounts[fb.mvp] || 0) + 1;
    });
    const avgList = Object.keys(sum).map(pid => {
      const pInfo = participants.find(p => p.id === pid);
      return { id: pid, name: pInfo?.name || pid, avg: sum[pid] / (cnt[pid] || 1), votes: cnt[pid] || 0 };
    }).sort((a,b) => (b.avg - a.avg) || (b.votes - a.votes));
    let topMvpIds = [];
    let topCount = 0;
    Object.entries(mvpCounts).forEach(([pid, c]) => {
      if (c > topCount) { topCount = c; topMvpIds = [pid]; }
      else if (c === topCount && c > 0) topMvpIds.push(pid);
    });
    const mvpNames = topMvpIds.map(id => participants.find(p => p.id === id)?.name || id);
    const mvpDetails = topMvpIds.map(id => participants.find(p => p.id === id)).filter(Boolean);
    const totalMvpVotes = Object.values(mvpCounts).reduce((a,b)=>a+b,0);
    return { avgList, mvpNames, mvpCounts, totalMvpVotes, mvpDetails };
  }, [feedback, participants]);

  const sessionReferenceDate = useMemo(() => {
    if (!session) return null;
    const parseDate = (value) => {
      if (!value) return null;
      const dateValue = new Date(value);
      if (Number.isNaN(dateValue.getTime())) return null;
      return dateValue;
    };

    if (session?.endedAt) {
      const parsed = parseDate(session.endedAt);
      if (parsed) return parsed;
    }
    if (session?.date?.seconds) {
      return new Date(session.date.seconds * 1000);
    }
    if (session?.date instanceof Date && !Number.isNaN(session.date.getTime())) {
      return session.date;
    }
    if (typeof session?.date === 'string') {
      const parsed = parseDate(session.date);
      if (parsed) return parsed;
    }

    if (Array.isArray(matchesDetails) && matchesDetails.length > 0) {
      const endedValues = matchesDetails
        .map((match) => parseDate(match?.endedAt))
        .filter(Boolean)
        .map((date) => date.getTime());
      if (endedValues.length > 0) {
        return new Date(Math.max(...endedValues));
      }
    }
    return null;
  }, [session, matchesDetails]);

  const votingDeadline = useMemo(() => {
    if (!sessionReferenceDate) return null;
    return new Date(sessionReferenceDate.getTime() + 24 * 60 * 60 * 1000);
  }, [sessionReferenceDate]);

  const isVotingDeadlinePassed = useMemo(() => {
    if (!votingDeadline) return false;
    return nowTimestamp > votingDeadline.getTime();
  }, [votingDeadline, nowTimestamp]);

  const handlePrintSessionReport = async () => {
    try {
      const htmlParts = [];
      htmlParts.push(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" />
        <title>Relatório da Sessão</title>
        <style>
          body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; padding: 24px; }
          h1 { margin: 0 0 12px; }
          h2 { margin: 24px 0 8px; }
          table { border-collapse: collapse; width: 100%; margin: 8px 0 16px; }
          th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
          th { background: #f4f4f4; text-align: left; }
          .muted { color: #666; font-size: 12px; }
          .section { page-break-inside: avoid; margin-bottom: 18px; }
          @media print { button { display: none; } }
        </style></head><body>`);

      const titleDate = sessionDate || new Date().toLocaleDateString('pt-BR');
      htmlParts.push(`<h1>Relatório da sessão de ${titleDate}</h1>`);

      const matches = Array.isArray(matchesDetails) ? matchesDetails : [];
      htmlParts.push(`<div class="muted">Partidas: ${matches.length}</div>`);
      if (matches.length === 0) {
        htmlParts.push(`<p class="muted">Sem partidas registradas nesta sessão.</p>`);
      } else {
        // Tabela dos placares
        htmlParts.push(`<div class="section">`);
        htmlParts.push(`<table><thead><tr><th>#</th><th>Time A</th><th>Placar</th><th>Time B</th></tr></thead><tbody>`);
        matches.forEach((m, idx) => {
          let scoreA = Number(m?.score?.teamA);
          let scoreB = Number(m?.score?.teamB);
          if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) {
            scoreA = 0; scoreB = 0;
            const ps = m?.playerStats || {};
            (m?.teams?.teamA || []).forEach(p => { scoreA += ps[p.id]?.goals || 0; });
            (m?.teams?.teamB || []).forEach(p => { scoreB += ps[p.id]?.goals || 0; });
          }
          const teamAList = (m?.teams?.teamA || []).map(p => p?.name || '').join(', ');
          const teamBList = (m?.teams?.teamB || []).map(p => p?.name || '').join(', ');
          htmlParts.push(`<tr>
            <td>${idx + 1}</td>
            <td>${teamAList}</td>
            <td style="text-align:center; font-weight:600;">${scoreA} x ${scoreB}</td>
            <td>${teamBList}</td>
          </tr>`);
        });
        htmlParts.push(`</tbody></table>`);
        htmlParts.push(`</div>`);

        // Eventos por partida
        matches.forEach((m, idx) => {
          const events = Array.isArray(m?.events) ? m.events : [];
          if (events.length === 0) return;
          const rows = events.map(ev => {
            const minute = Math.max(Number(ev.minute || 0), 0);
            const teamLabel = ev.teamKey === 'teamA' ? 'Time A' : (ev.teamKey === 'teamB' ? 'Time B' : '');
            let desc = '';
            switch (ev.type) {
              case 'goal': desc = ev.assistName ? `${ev.playerName} marcou (assistencia de ${ev.assistName})` : `${ev.playerName} marcou`; break;
              case 'ownGoal': desc = `${ev.playerName} marcou contra`; break;
              case 'assist': desc = `${ev.playerName} registrou uma assistencia`; break;
              case 'dribble': desc = `${ev.playerName} realizou um drible`; break;
              case 'tackle': desc = `${ev.playerName} fez um desarme`; break;
              case 'failure': desc = `${ev.playerName} cometeu uma falha`; break;
              case 'save': desc = `${ev.playerName} fez uma defesa`; break;
              case 'substitution': desc = `${ev.playerOutName} saiu para ${ev.playerInName}`; break;
              default: desc = `${ev.playerName || ''} registrou ${ev.type}`; break;
            }
            return `<tr><td style="width:40px;text-align:center;">${minute}'</td><td style="width:80px;">${teamLabel}</td><td>${desc}</td></tr>`;
          }).join('');
          htmlParts.push(`<div class="section">`);
          htmlParts.push(`<h2>Eventos da partida #${idx + 1}</h2>`);
          htmlParts.push(`<table><thead><tr><th style="width:40px;">Min</th><th style="width:80px;">Time</th><th>Evento</th></tr></thead><tbody>${rows}</tbody></table>`);
          htmlParts.push(`</div>`);
        });
      }

      htmlParts.push(`<div style="margin-top:24px;"><button onclick="window.print()">Imprimir</button></div>`);
      htmlParts.push(`</body></html>`);

      const printWin = window.open('', '_blank');
      if (!printWin) { alert('Bloqueador de pop-up ativo. Permita pop-ups para imprimir.'); return; }
      printWin.document.open();
      printWin.document.write(htmlParts.join(''));
      printWin.document.close();
      printWin.focus();
      setTimeout(() => { try { printWin.print(); } catch {} }, 300);
    } catch (e) {
      console.error('Falha ao imprimir relatório da sessão:', e);
      alert('Não foi possível gerar o relatório da sessão.');
    }
  };

  const votingRemainingMs = useMemo(() => {
    if (!votingDeadline) return null;
    return Math.max(0, votingDeadline.getTime() - nowTimestamp);
  }, [votingDeadline, nowTimestamp]);

  const votingCountdownText = useMemo(() => {
    if (!votingDeadline) return null;
    if (isVotingDeadlinePassed) return 'Votacao encerrada';
    const totalMinutes = Math.ceil(votingRemainingMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
      return `Prazo para votar: ${hours}h ${minutes.toString().padStart(2, '0')}min`;
    }
    return `Prazo para votar: ${minutes}min`;
  }, [votingDeadline, isVotingDeadlinePassed, votingRemainingMs]);

  const handleSubmitVoting = async ({ ratings, mvpId }) => {
    try {
      if (isVotingDeadlinePassed) {
        alert('O prazo de 24 horas para votar foi encerrado.');
        setIsVotingOpen(false);
        return;
      }
      const uid = auth.currentUser?.uid;
      if (!uid) { alert('É necessário estar autenticado para votar.'); return; }
      if (!session?.groupId || !session?.id) { alert('Sessão inválida para votação.'); return; }
      if (hasCurrentUserVoted) {
        alert('Voce ja votou nesta sessao.');
        setIsVotingOpen(false);
        return;
      }
      const ref = doc(db, `groups/${session.groupId}/sessions/${session.id}/feedback`, uid);
      const existingFeedback = await getDoc(ref);
      if (existingFeedback.exists()) {
        alert('Voce ja votou nesta sessao.');
        setIsVotingOpen(false);
        return;
      }
      await setDoc(ref, { ratings: ratings || {}, mvp: mvpId || null, createdAt: serverTimestamp() }, { merge: true });
      if (session?.groupId) {
        try {
          await applyRatingPenaltiesToPlayers({ db, groupId: session.groupId, ratings });
        } catch (penaltyError) {
          console.error('Falha ao aplicar penalidades de avaliacao:', penaltyError);
        }
      }

      setIsVotingOpen(false);
      alert('Voto enviado!');
    } catch (e) {
      console.error('Erro ao salvar voto:', e);
      alert('Falha ao salvar seu voto.');
    }
  };
  
  const handleOpenVoting = () => {
    if (isVotingDeadlinePassed) {
      alert('O prazo de 24 horas para votar foi encerrado.');
      return;
    }
    if (!currentUserUid) {
      alert('A% necessA?rio estar autenticado para votar.');
      return;
    }
    if (hasCurrentUserVoted) {
      alert('Voce ja votou nesta sessao.');
      return;
    }
    setIsVotingOpen(true);
  };

  const shareReport = async () => {
    try {
      const images = await generateReportImages({ returnDataUrl: true });
      const orderedKeys = ['stats', 'ratings'];
      const entries = orderedKeys
        .map(key => [key, images?.[key]])
        .filter(([, url]) => typeof url === 'string' && url.length > 0);

      if (entries.length === 0) {
        alert('Nao ha dados para compartilhar.');
        return;
      }

      const files = [];
      for (const [key, url] of entries) {
        const response = await fetch(url);
        const blob = await response.blob();
        const filename = key === 'stats' ? 'relatorio_estatisticas.png' : 'relatorio_notas.png';
        files.push(new File([blob], filename, { type: 'image/png' }));
      }

      const shareData = {
        title: 'Relatorio da Sessao',
        text: `Relatorio da sessao ${sessionDate || ''}`,
        files,
      };

      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return;
      }

      if (navigator.share) {
        await navigator.share({ title: shareData.title, text: shareData.text });
      }

      entries.forEach(([key, url]) => {
        const link = document.createElement('a');
        const filename = key === 'stats' ? 'relatorio_estatisticas.png' : 'relatorio_notas.png';
        link.href = url;
        link.download = filename;
        link.click();
      });

      const summary = [
        `Relatorio da sessao ${sessionDate || ''}`,
        `MVP(s): ${(votingSummary?.mvpNames || []).join(', ') || 'Sem votos'}`,
      ].join('\n');
      window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`, '_blank');
    } catch (e) {
      console.error('Falha ao compartilhar:', e);
      alert('Nao foi possivel compartilhar.');
    }
  };

  const generateReportImages = async ({ returnDataUrl = false } = {}) => {
    try {
      const width = 1280;
      const pad = 48;
      const ratio = Math.min(2, window.devicePixelRatio || 1);

      const createContext = (height) => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        const ctx = canvas.getContext('2d');
        ctx.scale(ratio, ratio);
        ctx.fillStyle = championsTheme.surface;
        ctx.fillRect(0, 0, width, height);
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, 'rgba(67,56,202,0.55)');
        gradient.addColorStop(0.45, 'rgba(168,85,247,0.32)');
        gradient.addColorStop(1, 'rgba(6,182,212,0.28)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        return { canvas, ctx };
      };

      const drawHeader = (ctx, subtitle) => {
        ctx.fillStyle = championsTheme.textPrimary;
        ctx.font = 'bold 48px system-ui,Segoe UI,Arial';
        ctx.fillText('Relatorio da Sessao', pad, pad + 48);
        ctx.fillStyle = championsTheme.textMuted;
        ctx.font = '22px system-ui,Segoe UI,Arial';
        if (sessionDate) ctx.fillText(sessionDate, pad, pad + 82);
        ctx.fillStyle = championsTheme.accent;
        ctx.font = 'bold 32px system-ui,Segoe UI,Arial';
        ctx.fillText(subtitle, pad, pad + 128);
      };

      const statsRows = Math.max(calculatedStats.length, 1);
      const statsRowHeight = 56;
      const statsHeight = pad + 190 + statsRowHeight * (statsRows + 1);
      const { canvas: statsCanvas, ctx: statsCtx } = createContext(statsHeight);
      drawHeader(statsCtx, 'Desempenho dos jogadores');

      if (calculatedStats.length === 0) {
        statsCtx.fillStyle = championsTheme.textSecondary;
        statsCtx.font = '20px system-ui,Segoe UI,Arial';
        statsCtx.fillText('Sem estatisticas registradas.', pad, pad + 232);
      } else {
        const columns = [
          { key: 'name', label: 'Jogador', width: 360, align: 'left' },
          { key: 'wins', label: 'V', width: 80, align: 'center' },
          { key: 'draws', label: 'E', width: 80, align: 'center' },
          { key: 'losses', label: 'D', width: 80, align: 'center' },
          { key: 'goals', label: 'G', width: 80, align: 'center' },
          { key: 'assists', label: 'A', width: 80, align: 'center' },
          { key: 'dribbles', label: 'Dr', width: 80, align: 'center' },
          { key: 'tackles', label: 'Ds', width: 80, align: 'center' },
          { key: 'saves', label: 'Df', width: 80, align: 'center' },
          { key: 'failures', label: 'F', width: 80, align: 'center' },
        ];

        const tableX = pad;
        const tableYStart = pad + 170;
        const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);

        statsCtx.textBaseline = 'middle';
        const headerGradient = statsCtx.createLinearGradient(tableX, tableYStart, tableX + tableWidth, tableYStart);
        headerGradient.addColorStop(0, 'rgba(67,56,202,0.9)');
        headerGradient.addColorStop(0.5, 'rgba(168,85,247,0.85)');
        headerGradient.addColorStop(1, 'rgba(6,182,212,0.8)');
        statsCtx.fillStyle = headerGradient;
        statsCtx.fillRect(tableX, tableYStart, tableWidth, statsRowHeight);
        let currentX = tableX;
        statsCtx.font = 'bold 20px system-ui,Segoe UI,Arial';
        columns.forEach((col) => {
          if (col.align === 'left') {
            statsCtx.textAlign = 'left';
            statsCtx.fillStyle = championsTheme.textPrimary;
            statsCtx.fillText(col.label, currentX + 18, tableYStart + statsRowHeight / 2);
          } else {
            statsCtx.textAlign = 'center';
            statsCtx.fillStyle = championsTheme.textPrimary;
            statsCtx.fillText(col.label, currentX + col.width / 2, tableYStart + statsRowHeight / 2);
          }
          col.start = currentX;
          col.center = currentX + col.width / 2;
          currentX += col.width;
        });

        let rowY = tableYStart + statsRowHeight;
        calculatedStats.forEach((player, index) => {
          statsCtx.fillStyle = index % 2 === 0 ? 'rgba(16,21,42,0.82)' : 'rgba(22,32,58,0.76)';
          statsCtx.fillRect(tableX, rowY, tableWidth, statsRowHeight);

          statsCtx.textAlign = 'left';
          statsCtx.fillStyle = championsTheme.textPrimary;
          statsCtx.font = 'bold 24px system-ui,Segoe UI,Arial';
          statsCtx.fillText(player.name || '-', columns[0].start + 18, rowY + statsRowHeight / 2);

          const values = [
            player.wins ?? 0,
            player.draws ?? 0,
            player.losses ?? 0,
            player.goals ?? 0,
            player.assists ?? 0,
            player.tackles ?? 0,
            player.saves ?? 0,
            player.failures ?? 0,
          ];

          statsCtx.textAlign = 'center';
          statsCtx.font = 'bold 20px system-ui,Segoe UI,Arial';
          statsCtx.fillStyle = '#cdeafe';
          values.forEach((value, idx) => {
            const column = columns[idx + 1];
            statsCtx.fillText(String(value), column.center, rowY + statsRowHeight / 2);
          });

          rowY += statsRowHeight;
        });
      }

      const avgRows = votingSummary?.avgList || [];
      const ratingsRows = Math.max(avgRows.length, 1);
      const ratingsRowHeight = 60;
      const ratingsHeight = pad + 240 + ratingsRowHeight * (ratingsRows + 1);
      const { canvas: ratingsCanvas, ctx: ratingsCtx } = createContext(ratingsHeight);
      drawHeader(ratingsCtx, 'Notas e destaques');

      const mvpLine = (votingSummary?.mvpNames?.length
        ? `MVP(s): ${votingSummary.mvpNames.join(', ')}`
        : 'MVP(s): Sem votos');
      ratingsCtx.fillStyle = championsTheme.cyan;
      ratingsCtx.font = 'bold 28px system-ui,Segoe UI,Arial';
      ratingsCtx.fillText(mvpLine, pad, pad + 172);
      ratingsCtx.fillStyle = championsTheme.textSecondary;
      ratingsCtx.font = '20px system-ui,Segoe UI,Arial';
      const totalVotesText = `Total de votos: ${votingSummary?.totalMvpVotes || 0}`;
      ratingsCtx.fillText(totalVotesText, pad, pad + 206);

      ratingsCtx.textBaseline = 'middle';
      if (avgRows.length === 0) {
        ratingsCtx.fillStyle = championsTheme.textSecondary;
        ratingsCtx.font = '20px system-ui,Segoe UI,Arial';
        ratingsCtx.fillText('Sem notas registradas.', pad, pad + 268);
      } else {
        const ratingColumns = [
          { key: 'name', label: 'Jogador', width: 440, align: 'left' },
          { key: 'avg', label: 'Media', width: 180, align: 'center' },
          { key: 'votes', label: 'Votos', width: 180, align: 'center' },
        ];
        const tableX = pad;
        const tableYStart = pad + 220;
        const tableWidth = ratingColumns.reduce((sum, col) => sum + col.width, 0);

        const ratingHeaderGradient = ratingsCtx.createLinearGradient(tableX, tableYStart, tableX + tableWidth, tableYStart);
        ratingHeaderGradient.addColorStop(0, 'rgba(67,56,202,0.9)');
        ratingHeaderGradient.addColorStop(0.5, 'rgba(168,85,247,0.85)');
        ratingHeaderGradient.addColorStop(1, 'rgba(6,182,212,0.8)');
        ratingsCtx.fillStyle = ratingHeaderGradient;
        ratingsCtx.fillRect(tableX, tableYStart, tableWidth, ratingsRowHeight);
        let currentX = tableX;
        ratingsCtx.font = 'bold 20px system-ui,Segoe UI,Arial';
        ratingColumns.forEach((col) => {
          if (col.align === 'left') {
            ratingsCtx.textAlign = 'left';
            ratingsCtx.fillStyle = championsTheme.textPrimary;
            ratingsCtx.fillText(col.label, currentX + 18, tableYStart + ratingsRowHeight / 2);
          } else {
            ratingsCtx.textAlign = 'center';
            ratingsCtx.fillStyle = championsTheme.textPrimary;
            ratingsCtx.fillText(col.label, currentX + col.width / 2, tableYStart + ratingsRowHeight / 2);
          }
          col.start = currentX;
          col.center = currentX + col.width / 2;
          currentX += col.width;
        });

        let rowY = tableYStart + ratingsRowHeight;
        avgRows.forEach((row, index) => {
          ratingsCtx.fillStyle = index % 2 === 0 ? 'rgba(16,21,42,0.82)' : 'rgba(22,32,58,0.76)';
          ratingsCtx.fillRect(tableX, rowY, tableWidth, ratingsRowHeight);

          ratingsCtx.textAlign = 'left';
          ratingsCtx.fillStyle = championsTheme.textPrimary;
          ratingsCtx.font = 'bold 24px system-ui,Segoe UI,Arial';
          ratingsCtx.fillText(row.name || '-', ratingColumns[0].start + 18, rowY + ratingsRowHeight / 2);

          ratingsCtx.textAlign = 'center';
          ratingsCtx.font = 'bold 22px system-ui,Segoe UI,Arial';
          ratingsCtx.fillStyle = championsTheme.cyan;
          const avgText = Number(row.avg ?? 0).toFixed(1);
          ratingsCtx.fillText(avgText, ratingColumns[1].center, rowY + ratingsRowHeight / 2);
          ratingsCtx.fillStyle = '#fef3c7';
          ratingsCtx.fillText(String(row.votes ?? 0), ratingColumns[2].center, rowY + ratingsRowHeight / 2);

          rowY += ratingsRowHeight;
        });
      }

      const statsUrl = statsCanvas.toDataURL('image/png');
      const ratingsUrl = ratingsCanvas.toDataURL('image/png');
      const data = { stats: statsUrl, ratings: ratingsUrl };

      if (!returnDataUrl) {
        Object.entries(data).forEach(([key, url]) => {
          const link = document.createElement('a');
          const filename = key === 'stats' ? 'relatorio_estatisticas.png' : 'relatorio_notas.png';
          link.href = url;
          link.download = filename;
          link.click();
        });
      }

      return data;
    } catch (e) {
      console.error('Falha ao gerar imagens:', e);
      alert('Nao foi possivel gerar as imagens do relatorio.');
      return {};
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#28324d] bg-gradient-to-br from-[#0e162c] via-[#10172f] to-[#060b1a] p-4 sm:p-8 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#4338ca33,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,#06b6d455,transparent_60%)]" />
      <div className="relative space-y-10">
      <header className="text-center space-y-3">
        <h2 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#4338ca] via-[#a855f7] to-[#06b6d4]">Relatorio da Sessao</h2>
        <p className="text-lg text-[#a5b4fc]">{sessionDate}</p>
      </header>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={handleOpenVoting}
          disabled={loading || isVotingDeadlinePassed || hasCurrentUserVoted}
          className="rounded-lg bg-gradient-to-r from-[#4338ca] via-[#5b4ae5] to-[#a855f7] px-5 py-2 font-semibold text-white shadow-lg shadow-[#4338ca33] transition-colors hover:from-[#4c3edb] hover:to-[#b779f3] disabled:opacity-60"
        >
          Votar
        </button>
        {votingCountdownText && (
          <p className="w-full text-center text-xs text-[#9aa7d7]">{votingCountdownText}{votingDeadline && !isVotingDeadlinePassed ? ` (encerra em ${votingDeadline.toLocaleString('pt-BR')})` : ''}</p>
        )}
        {hasCurrentUserVoted && (
          <p className="w-full text-center text-xs text-[#9aa7d7]">Voce ja votou nesta sessao.</p>
        )}
        <button
          onClick={shareReport}
          disabled={loading}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#4338ca] via-[#a855f7] to-[#06b6d4] text-white shadow-lg shadow-[#06b6d455] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          aria-label="Compartilhar relatorio"
        >
          <span className="sr-only">Compartilhar relatorio</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
            aria-hidden="true"
          >
            <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
            <path d="m16 6-4-4-4 4" />
            <path d="M12 2v13" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="text-center text-[#cbd5f5]">Carregando estatisticas...</div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="relative overflow-hidden rounded-xl border border-[#28324d] bg-[#111a32]/80 p-5 shadow-[0_20px_60px_rgba(4,8,20,0.45)] space-y-4">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#a855f7] to-transparent" />
            <h3 className="text-3xl font-bold text-[#e0e7ff] text-center">Estatisticas da partida</h3>
            {calculatedStats.length === 0 ? (
              <p className="text-center text-[#7c8fbf]">Sem estatisticas registradas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[760px]">
                  <thead className="bg-gradient-to-r from-[#4338ca]/60 via-[#a855f7]/55 to-[#06b6d4]/60 text-[#f8fafc] uppercase text-sm">
                    <tr>
                      <th className="p-3 text-left">Jogador</th>
                      <th className="p-3 text-center">V</th>
                      <th className="p-3 text-center">E</th>
                      <th className="p-3 text-center">D</th>
                      <th className="p-3 text-center">Gols</th>
                      <th className="p-3 text-center">Assist.</th>
                      <th className="p-3 text-center">Dribles</th>
                      <th className="p-3 text-center">Desarmes</th>
                      <th className="p-3 text-center">Defesas</th>
                      <th className="p-3 text-center">Falhas</th>
                    </tr>
                  </thead>
                  <tbody className="bg-[#131d36]/60">
                    {calculatedStats.map(player => (
                      <tr key={player.name} className="border-b border-[#27334e]/60">
                        <td className="p-3 font-semibold text-lg text-white">{player.name}</td>
                        <td className="p-3 text-center text-emerald-300 font-bold">{player.wins ?? 0}</td>
                        <td className="p-3 text-center text-[#cbd5f5] font-bold">{player.draws ?? 0}</td>
                        <td className="p-3 text-center text-rose-300 font-bold">{player.losses ?? 0}</td>
                        <td className="p-3 text-center text-[#b8c2ff]">{player.goals ?? 0}</td>
                        <td className="p-3 text-center text-[#b8c2ff]">{player.assists ?? 0}</td>
                        <td className="p-3 text-center text-[#b8c2ff]">{player.dribbles ?? 0}</td>
                        <td className="p-3 text-center text-[#8fd3ff]">{player.tackles ?? 0}</td>
                        <td className="p-3 text-center text-[#8fd3ff]">{player.saves ?? 0}</td>
                        <td className="p-3 text-center text-orange-300">{player.failures ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="relative overflow-hidden rounded-xl border border-[#28324d] bg-[#111a32]/80 p-5 shadow-[0_20px_60px_rgba(4,8,20,0.45)] space-y-4">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#06b6d4] to-transparent" />
            <h3 className="text-3xl font-bold text-[#e0e7ff] text-center">Notas dos jogadores</h3>
            <div className="text-center text-base text-[#b7c4f0] space-y-1">
              <div>
                <span className="text-[#9aa7d7]">MVP(s): </span>
                <span className="font-bold text-yellow-400">
                  {votingSummary.mvpNames && votingSummary.mvpNames.length > 0 ? votingSummary.mvpNames.join(', ') : 'Sem votos'}
                </span>
                {votingSummary.totalMvpVotes > 0 && (
                  <span className="text-[#7c8fbf]"> ({votingSummary.totalMvpVotes} voto(s))</span>
                )}
              </div>
            </div>
            {votingSummary.avgList && votingSummary.avgList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[520px]">
                  <thead className="bg-gradient-to-r from-[#4338ca]/60 via-[#a855f7]/55 to-[#06b6d4]/60 text-[#f8fafc] uppercase text-sm">
                    <tr>
                      <th className="p-3 text-left">Jogador</th>
                      <th className="p-3 text-center">Media</th>
                      <th className="p-3 text-center">Votos</th>
                    </tr>
                  </thead>
                  <tbody className="bg-[#131d36]/60">
                    {votingSummary.avgList.map(row => (
                      <tr key={row.id} className="border-b border-[#27334e]/60">
                        <td className="p-3 font-semibold text-lg text-white">{row.name}</td>
                        <td className="p-3 text-center text-[#b8c2ff]">{row.avg.toFixed(1)}</td>
                        <td className="p-3 text-center text-[#cbd5f5]">{row.votes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-[#7c8fbf]">Sem notas registradas.</p>
            )}
          </section>
        </div>
      )}

      {session.matchIds && session.matchIds.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-3xl font-bold text-[#e0e7ff] text-center">Resultados das partidas</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto p-1">
            {loading ? (
              <p className="text-center text-[#9aa7d7]">Carregando partidas...</p>
            ) : (
              matchesDetails.map((match, index) => {
                let scoreA = Number(match?.score?.teamA);
                let scoreB = Number(match?.score?.teamB);
                const playerStats = match?.playerStats || {};
                if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) {
                  scoreA = 0; scoreB = 0;
                  (match?.teams?.teamA || []).forEach(p => { scoreA += playerStats[p.id]?.goals || 0; });
                  (match?.teams?.teamB || []).forEach(p => { scoreB += playerStats[p.id]?.goals || 0; });
                }

                const events = Array.isArray(match?.events) ? match.events : [];
                const teamLabel = (k) => (k === 'teamA' ? 'Time A' : k === 'teamB' ? 'Time B' : '');
                const describe = (ev) => {
                  switch (ev.type) {
                    case 'goal':
                      return ev.assistName
                        ? `${ev.playerName} ${t('marcou (assistencia de')} ${ev.assistName})`
                        : `${ev.playerName} ${t('marcou')}`;
                    case 'ownGoal':
                      return `${ev.playerName} ${t('marcou contra')}`;
                    case 'assist':
                      return `${ev.playerName} ${t('registrou uma assistencia')}`;
                    case 'dribble':
                      return `${ev.playerName} ${t('realizou um drible')}`;
                    case 'tackle':
                      return `${ev.playerName} ${t('fez um desarme')}`;
                    case 'failure':
                      return `${ev.playerName} ${t('cometeu uma falha')}`;
                    case 'save':
                      return `${ev.playerName} ${t('fez uma defesa')}`;
                    case 'substitution':
                      return `${ev.playerOutName} ${t('saiu para')} ${ev.playerInName}`;
                    default:
                      return `${ev.playerName || ''} ${t('registrou')} ${ev.type}`;
                  }
                };
                return (
                  <div key={match.id || index} className="rounded-lg border border-[#28324d] bg-gradient-to-br from-[#101a31]/85 via-[#111a32]/70 to-[#0b1228]/90 p-3 text-center shadow-[0_12px_32px_rgba(6,182,212,0.18)]">
                    <p className="text-sm uppercase tracking-wide text-[#9aa7d7]">Partida {index + 1}</p>
                    <p className="font-bold text-xl text-white">
                      Time A <span className="mx-2 text-2xl text-[#b8c2ff]">{scoreA}</span>
                      vs
                      <span className="mx-2 text-2xl text-[#b8c2ff]">{scoreB}</span> Time B
                    </p>
                    <div className="mt-3 text-left">
                      <h4 className="text-xs uppercase tracking-[0.35em] text-[#9aa7d7]">{t('Eventos')}</h4>
                      {events.length === 0 ? (
                        <div className="text-[11px] text-[#7c8fbf]">{t('Nenhum evento registrado ainda.')}</div>
                      ) : (
                        <ul className="mt-2 space-y-1">
                          {events.map((ev) => (
                            <li key={ev.id} className="text-[12px] text-[#dbe2ff]">
                              <span className="text-[#9aa7d7] mr-2">{`${Math.max(ev.minute||0,0)}'`}</span>
                              {teamLabel(ev.teamKey) && <span className="mr-2 text-[#a6b3e6]">{teamLabel(ev.teamKey)}</span>}
                              <span>{describe(ev)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <div className="text-center flex items-center justify-center gap-3">
        <button
          onClick={handlePrintSessionReport}
          className="rounded-lg bg-gradient-to-r from-[#06b6d4] via-[#4338ca] to-[#a855f7] px-6 py-2 font-semibold text-white shadow-lg shadow-[#06b6d433] transition-transform hover:-translate-y-0.5"
        >
          Imprimir Relatório da Sessão
        </button>
        <button
          onClick={onBack}
          className="rounded-lg bg-gradient-to-r from-[#4338ca] via-[#a855f7] to-[#06b6d4] px-6 py-2 font-semibold text-white shadow-lg shadow-[#4338ca33] transition-transform hover:-translate-y-0.5"
        >
          Voltar para o Historico de Sessoes
        </button>
      </div>

      <PostSessionVotingModal
        isOpen={isVotingOpen}
        onClose={() => setIsVotingOpen(false)}
        players={participants}
        onSubmit={handleSubmitVoting}
      />
      </div>
    </div>
  );
};


export default SessionReportDetail;



