import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, collection, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import PostSessionVotingModal from './PostSessionVotingModal';

const SessionReportDetail = ({ session, onBack }) => {
  const [matchesDetails, setMatchesDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isVotingOpen, setIsVotingOpen] = useState(false);
  const [feedback, setFeedback] = useState([]);

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

  const calculatedStats = useMemo(() => {
    const stats = {};
    if (!session?.players || matchesDetails.length === 0) return [];

    (session.players || []).forEach(playerId => {
      stats[playerId] = {
        name: 'Desconhecido', wins: 0, draws: 0, losses: 0,
        goals: 0, assists: 0, tackles: 0, saves: 0, failures: 0,
      };
    });

    matchesDetails.forEach(match => {
      const teamAPlayers = match?.teams?.teamA || [];
      const teamBPlayers = match?.teams?.teamB || [];
      const teamAIds = teamAPlayers.map(p => p?.id);
      const teamBIds = teamBPlayers.map(p => p?.id);

      let scoreA = 0;
      let scoreB = 0;
      const playerStats = match?.playerStats || {};
      for (const pId in playerStats) {
        const ps = playerStats[pId] || {};
        if (teamAIds.includes(pId)) scoreA += ps.goals || 0;
        else if (teamBIds.includes(pId)) scoreB += ps.goals || 0;
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
    const totalMvpVotes = Object.values(mvpCounts).reduce((a,b)=>a+b,0);
    return { avgList, mvpNames, mvpCounts, totalMvpVotes };
  }, [feedback, participants]);

  const handleSubmitVoting = async ({ ratings, mvpId }) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) { alert('É necessário estar autenticado para votar.'); return; }
      if (!session?.groupId || !session?.id) { alert('Sessão inválida para votação.'); return; }
      const ref = doc(db, `groups/${session.groupId}/sessions/${session.id}/feedback`, uid);
      await setDoc(ref, { ratings: ratings || {}, mvp: mvpId || null, createdAt: serverTimestamp() }, { merge: true });
      setIsVotingOpen(false);
      alert('Voto enviado!');
    } catch (e) {
      console.error('Erro ao salvar voto:', e);
      alert('Falha ao salvar seu voto.');
    }
  };
  
  const shareReport = async () => {
    try {
      const dataUrl = await generateReportImage({ returnDataUrl: true });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'relatorio_sessao.png', { type: 'image/png' });
      const shareData = { title: 'Relatório da Sessão', text: `Relatório da sessão ${sessionDate || ''}`, files: [file] };
      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: 'Relatório da Sessão', text: `Relatório da sessão ${sessionDate || ''}` });
      }
      const summary = `Relatório da sessão ${sessionDate || ''}\nMVP(s): ${(votingSummary?.mvpNames || []).join(', ') || '—'}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`, '_blank');
      const a = document.createElement('a'); a.href = dataUrl; a.download = 'relatorio_sessao.png'; a.click();
    } catch (e) { console.error('Falha ao compartilhar:', e); alert('Não foi possível compartilhar.'); }
  };

  // Gera imagem PNG compartilhável com o resumo da sessão
  const generateReportImage = async ({ returnDataUrl = false } = {}) => {
    try {
      const width = 1200; const pad = 32; const rowH = 44;
      const headerH = 160; const tableHeadH = 40; const summaryH = 70;
      const rows = Math.max(calculatedStats.length, (votingSummary?.avgList?.length || 0));
      const height = headerH + summaryH + tableHeadH + (rows * rowH) + pad * 2;
      const ratio = Math.min(2, (window.devicePixelRatio || 1));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      const ctx = canvas.getContext('2d');
      ctx.scale(ratio, ratio);
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, width, height);
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, 'rgba(99,102,241,0.18)'); grad.addColorStop(1, 'rgba(11,18,32,0.2)');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#c7d2fe'; ctx.font = 'bold 36px system-ui,Segoe UI,Arial';
      ctx.fillText('Relatório da Sessão', pad, pad + 40);
      ctx.fillStyle = '#9ca3af'; ctx.font = '16px system-ui,Segoe UI,Arial';
      ctx.fillText(sessionDate || '', pad, pad + 68);
      const mvpText = (votingSummary?.mvpNames?.length ? `MVP(s): ${votingSummary.mvpNames.join(', ')}` : 'MVP(s): —');
      ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 18px system-ui,Segoe UI,Arial';
      ctx.fillText(mvpText, pad, pad + 100);
      ctx.fillStyle = '#9ca3af'; ctx.font = '14px system-ui,Segoe UI,Arial';
      if (votingSummary?.totalMvpVotes) ctx.fillText(`Total de votos: ${votingSummary.totalMvpVotes}`, pad, pad + 120);
      let y = headerH; const colX = [pad, width * 0.5 - 80, width * 0.5 + 20, width - pad - 60];
      ctx.fillStyle = '#111827'; ctx.fillRect(pad, y, width - pad * 2, 40);
      ctx.fillStyle = '#c7d2fe'; ctx.font = 'bold 14px system-ui,Segoe UI,Arial';
      ctx.fillText('Jogador', colX[0], y + 26);
      ctx.fillText('V/E/D | G/A/Ds', colX[1], y + 26);
      ctx.fillText('Média', colX[2], y + 26);
      ctx.fillText('Votos', colX[3], y + 26);
      y += 40;
      const avgRows = votingSummary?.avgList || [];
      for (let i = 0; i < Math.max(calculatedStats.length, avgRows.length); i++) {
        const stat = calculatedStats[i]; const avgRow = avgRows[i];
        ctx.fillStyle = i % 2 === 0 ? 'rgba(17,24,39,0.7)' : 'rgba(31,41,55,0.5)';
        ctx.fillRect(pad, y, width - pad * 2, rowH);
        ctx.fillStyle = '#e5e7eb'; ctx.font = 'bold 14px system-ui,Segoe UI,Arial';
        const name = avgRow?.name || stat?.name || '';
        ctx.fillText(name, colX[0], y + 28);
        ctx.fillStyle = '#9ca3af'; ctx.font = '12px system-ui,Segoe UI,Arial';
        if (stat) {
          const line = `${stat.wins||0}/${stat.draws||0}/${stat.losses||0} | ${stat.goals||0}/${stat.assists||0}/${stat.tackles||0}`;
          ctx.fillText(line, colX[1], y + 28);
        }
        if (avgRow) {
          ctx.fillStyle = '#c4b5fd'; ctx.fillText((avgRow.avg||0).toFixed(1), colX[2], y + 28);
          ctx.fillStyle = '#93c5fd'; ctx.fillText(String(avgRow.votes||0), colX[3], y + 28);
        }
        y += rowH;
      }
      const url = canvas.toDataURL('image/png');
      if (returnDataUrl) return url;
      const a = document.createElement('a'); a.href = url; a.download = `relatorio_sessao_${(sessionDate||'').replace(/\s+/g,'_')}.png`; a.click();
      return url;
    } catch (e) { console.error('Falha ao gerar imagem:', e); alert('Não foi possível gerar a imagem do relatório.'); }
  };

  // eslint-disable-next-line no-unused-vars
  const downloadPdfFromImage = async () => {
    try {
      const dataUrl = await generateReportImage({ returnDataUrl: true });
      const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
      if (!jsPDF) { alert('Para exportar PDF, adicione jsPDF ao projeto.'); return; }
      const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const img = new Image(); await new Promise(res => { img.onload = res; img.src = dataUrl; });
      const ratio = img.height / img.width; const pdfH = pdfW * ratio;
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfW, pdfH); pdf.save('relatorio_sessao.pdf');
    } catch (e) { console.error('Falha ao gerar PDF:', e); alert('Não foi possível gerar o PDF.'); }
  };

  const handlePrintDetailedReport = () => {
    try {
      const formatDate = (ts) => {
        if (!ts) return '';
        const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      };
      const html = [];
      html.push(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" />
        <title>Relatório da Sessão</title>
        <style>
          body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, 'Helvetica Neue', Arial; padding: 24px; }
          h1 { margin: 0 0 16px; }
          h2 { margin: 16px 0 8px; }
          table { border-collapse: collapse; width: 100%; margin: 8px 0 16px; }
          th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
          th { background: #f4f4f4; text-align: left; }
          .muted { color: #666; font-size: 12px; }
          @media print { button { display: none; } }
        </style></head><body>`);
      html.push(`<h1>Relatório da sessão (${formatDate(session?.date)})</h1>`);
      html.push(`<h2>Desempenho dos jogadores</h2>`);
      if (!calculatedStats || calculatedStats.length === 0) {
        html.push('<p class="muted">Sem estatísticas para esta sessão.</p>');
      } else {
        html.push(`<table><thead><tr>
          <th>Jogador</th><th>V</th><th>E</th><th>D</th><th>Gols</th><th>Assist.</th><th>Desarmes</th><th>Defesas</th><th>Falhas</th>
        </tr></thead><tbody>`);
        calculatedStats.forEach(p => {
          html.push(`<tr>
            <td>${p.name}</td>
            <td style="text-align:center;">${p.wins || 0}</td>
            <td style="text-align:center;">${p.draws || 0}</td>
            <td style="text-align:center;">${p.losses || 0}</td>
            <td style="text-align:center;">${p.goals || 0}</td>
            <td style="text-align:center;">${p.assists || 0}</td>
            <td style="text-align:center;">${p.tackles || 0}</td>
            <td style="text-align:center;">${p.saves || 0}</td>
            <td style="text-align:center;">${p.failures || 0}</td>
          </tr>`);
        });
        html.push(`</tbody></table>`);
      }
      html.push(`<h2>Resultados das partidas</h2>`);
      if (!matchesDetails || matchesDetails.length === 0) {
        html.push('<p class="muted">Sem partidas registradas nesta sessão.</p>');
      } else {
        html.push(`<table><thead><tr>
          <th>#</th><th>Time A</th><th>Placar</th><th>Time B</th>
        </tr></thead><tbody>`);
        matchesDetails.forEach((match, index) => {
          let scoreA = 0, scoreB = 0;
          const playerStats = match?.playerStats || {};
          (match?.teams?.teamA || []).forEach(p => { scoreA += playerStats[p.id]?.goals || 0; });
          (match?.teams?.teamB || []).forEach(p => { scoreB += playerStats[p.id]?.goals || 0; });
          const teamAList = (match?.teams?.teamA || []).map(p => p?.name || '-').join(', ');
          const teamBList = (match?.teams?.teamB || []).map(p => p?.name || '-').join(', ');
          html.push(`<tr>
            <td>${index + 1}</td>
            <td>${teamAList}</td>
            <td style="text-align:center; font-weight:600;">${scoreA} x ${scoreB}</td>
            <td>${teamBList}</td>
          </tr>`);
        });
        html.push(`</tbody></table>`);
      }
      html.push(`<div style="margin-top:24px;"><button onclick="window.print()">Imprimir</button></div>`);
      html.push(`</body></html>`);
      const win = window.open('', '_blank');
      if (!win) { alert('Permita pop-ups para imprimir.'); return; }
      win.document.open();
      win.document.write(html.join(''));
      win.document.close();
      win.focus();
      setTimeout(() => { try { win.print(); } catch {} }, 200);
    } catch (e) {
      console.error('Falha ao imprimir sessão:', e);
      alert('Não foi possível gerar o relatório desta sessão.');
    }
  };

  return (
    <div className="bg-gray-900/50 rounded-2xl p-4 sm:p-8 text-white space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-indigo-300 mb-2 text-center">Relatório da Sessão</h2>
        <p className="text-center text-gray-400 mb-4">{sessionDate}</p>
        <div className="flex items-center justify-center gap-2 mb-6">
          <button onClick={() => setIsVotingOpen(true)} disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold py-2 px-4 rounded-lg">
            Votar
          </button>
          <button onClick={handlePrintDetailedReport} disabled={loading} className="bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-60 text-white font-bold py-2 px-4 rounded-lg">
            Imprimir relatório
          </button>
          <button onClick={() => shareReport()} disabled={loading} className="bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-60 text-white font-bold py-2 px-4 rounded-lg">
            Compartilhar
          </button>
        </div>
        {loading ? (
          <div className="text-center">Carregando estatísticas...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[720px]">
              <thead className="bg-gray-800">
                <tr>
                  <th className="p-3">Jogador</th>
                  <th className="p-3 text-center">V</th>
                  <th className="p-3 text-center">E</th>
                  <th className="p-3 text-center">D</th>
                  <th className="p-3 text-center">Gols</th>
                  <th className="p-3 text-center">Assist.</th>
                  <th className="p-3 text-center">Desarmes</th>
                  <th className="p-3 text-center">Defesas</th>
                  <th className="p-3 text-center">Falhas</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800/50">
                {calculatedStats.map(player => (
                  <tr key={player.name} className="border-b border-gray-700">
                    <td className="p-3 font-semibold">{player.name}</td>
                    <td className="p-3 text-center text-green-400 font-bold">{player.wins}</td>
                    <td className="p-3 text-center text-gray-400 font-bold">{player.draws}</td>
                    <td className="p-3 text-center text-red-400 font-bold">{player.losses}</td>
                    <td className="p-3 text-center">{player.goals}</td>
                    <td className="p-3 text-center">{player.assists}</td>
                    <td className="p-3 text-center">{player.tackles}</td>
                    <td className="p-3 text-center">{player.saves}</td>
                    <td className="p-3 text-center">{player.failures}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Feedback agregado: MVP e médias das notas */}
      <div className="bg-gray-900/40 rounded-xl p-4 border border-gray-800">
        <h3 className="text-2xl font-bold text-indigo-300 mb-3 text-center">Feedback dos Participantes</h3>
        <div className="text-center mb-4">
          <span className="text-gray-400">MVP(s): </span>
          <span className="font-bold text-yellow-400">
            {votingSummary.mvpNames && votingSummary.mvpNames.length > 0 ? votingSummary.mvpNames.join(', ') : 'Sem votos'}
          </span>
          {votingSummary.totalMvpVotes > 0 && (
            <span className="text-gray-500"> ({votingSummary.totalMvpVotes} voto(s))</span>
          )}
        </div>
        {votingSummary.avgList && votingSummary.avgList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[520px]">
              <thead className="bg-gray-800">
                <tr>
                  <th className="p-2">Jogador</th>
                  <th className="p-2 text-center">Média</th>
                  <th className="p-2 text-center">Votos</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800/50">
                {votingSummary.avgList.map(row => (
                  <tr key={row.id} className="border-b border-gray-700">
                    <td className="p-2 font-semibold">{row.name}</td>
                    <td className="p-2 text-center">{row.avg.toFixed(1)}</td>
                    <td className="p-2 text-center">{row.votes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500">Sem notas registradas.</p>
        )}
      </div>

      {session.matchIds && session.matchIds.length > 0 && (
        <div>
          <h3 className="text-2xl font-bold text-indigo-300 mb-4 text-center">Resultados das Partidas</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto p-1">
            {loading ? (
              <p className="text-center">Carregando partidas...</p>
            ) : (
              matchesDetails.map((match, index) => {
                let scoreA = 0, scoreB = 0;
                const playerStats = match?.playerStats || {};
                (match?.teams?.teamA || []).forEach(p => { scoreA += playerStats[p.id]?.goals || 0; });
                (match?.teams?.teamB || []).forEach(p => { scoreB += playerStats[p.id]?.goals || 0; });
                return (
                  <div key={match.id || index} className="bg-gray-800 p-3 rounded-lg text-center">
                    <p className="text-sm text-gray-400">Partida {index + 1}</p>
                    <p className="font-bold text-lg text-white">
                      Time A <span className="text-xl text-indigo-300 mx-2">{scoreA}</span>
                      vs
                      <span className="text-xl text-indigo-300 mx-2">{scoreB}</span> Time B
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <div className="text-center mt-4">
        <button onClick={onBack} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg">
          Voltar para o Histórico de Sessões
        </button>
      </div>

      <PostSessionVotingModal
        isOpen={isVotingOpen}
        onClose={() => setIsVotingOpen(false)}
        players={participants}
        onSubmit={handleSubmitVoting}
      />
    </div>
  );
};

export default SessionReportDetail;
