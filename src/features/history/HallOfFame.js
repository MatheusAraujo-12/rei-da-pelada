import React, { useState, useMemo } from 'react';
import { LucideTrophy, LucideHandshake, LucideShieldCheck, LucideAward, LucideFrown } from 'lucide-react';

const STAT_KEYS = ['goals', 'assists', 'dribbles', 'tackles', 'saves', 'failures'];

const RankingCard = ({ title, data, statKey, icon, t }) => (
    <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-700">
        <h3 className="text-2xl font-bold text-indigo-300 mb-4 flex items-center gap-3">{icon}{title}</h3>
        {data.length > 0 ? (
            <ol className="space-y-3">
                {data.map((player, index) => (
                    <li key={player.id || player.name} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                        <div className="flex items-center">
                            <span className={`text-xl font-bold w-8 ${index < 3 ? 'text-indigo-300' : 'text-gray-400'}`}>{index + 1}.</span>
                            <span className="font-semibold text-white">{player.name}</span>
                        </div>
                        <span className="text-xl font-bold text-white">{player[statKey]}</span>
                    </li>
                ))}
            </ol>
        ) : <p className="text-gray-500">{t('Ainda nao ha dados para este ranking.')}</p>}
    </div>
);

const HallOfFame = ({ players, matches, t }) => {
    const [filter, setFilter] = useState('week');

    const playersMap = useMemo(() => {
        const map = new Map();
        (players || []).forEach((player) => {
            if (player?.id) map.set(player.id, player);
        });
        return map;
    }, [players]);

    const getMatchDate = (match) => {
        try {
            if (match?.date?.seconds) return new Date(match.date.seconds * 1000);
            if (typeof match?.date === 'string') return new Date(match.date);
            if (match?.endedAt) return new Date(match.endedAt);
            return null;
        } catch {
            return null;
        }
    };

    const filteredMatches = useMemo(() => {
        if (filter === 'all') return matches;
        const now = new Date();
        let startDate;
        switch (filter) {
            case 'week': {
                const d = new Date(now);
                const day = d.getDay();
                const diffToMonday = (day + 6) % 7;
                d.setHours(0, 0, 0, 0);
                d.setDate(d.getDate() - diffToMonday);
                startDate = d;
                break;
            }
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'quarter':
                startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
                break;
            case 'semester':
                startDate = new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                return matches;
        }
        return matches.filter(match => {
            const md = getMatchDate(match);
            return md && md >= startDate;
        });
    }, [matches, filter]);

    const { aggregatedStats, dailyStats } = useMemo(() => {
        const aggregated = {};
        const daily = {};

        const ensureRecord = (container, playerId, sourceStats = {}) => {
            if (!playerId) return null;
            if (!container[playerId]) {
                const info = playersMap.get(playerId) || {};
                container[playerId] = {
                    id: playerId,
                    name: info.name || sourceStats.playerName || sourceStats.name || playerId,
                    position: info.position || info.detailedPosition || sourceStats.position || '',
                    photoURL: info.photoURL || info.avatarURL || sourceStats.photoURL || null,
                    flagURL: info.flagURL || info.flagUrl || info.countryFlag || sourceStats.flagURL || sourceStats.flagUrl || sourceStats.countryFlag || null,
                    teamName: info.teamName || info.team || sourceStats.teamName || sourceStats.team || '',
                    goals: 0,
                    assists: 0,
                    dribbles: 0,
                    tackles: 0,
                    saves: 0,
                    failures: 0,
                };
            }
            return container[playerId];
        };

        (players || []).forEach(player => {
            ensureRecord(aggregated, player.id, player);
        });

        (filteredMatches || []).forEach(match => {
            const matchDate = getMatchDate(match);
            if (!matchDate) return;
            const dateKey = matchDate.toISOString().slice(0, 10);
            if (!daily[dateKey]) daily[dateKey] = {};

            const playerStats = match?.playerStats || {};
            Object.entries(playerStats).forEach(([playerId, stats]) => {
                const aggregatedRecord = ensureRecord(aggregated, playerId, stats);
                const dailyRecord = ensureRecord(daily[dateKey], playerId, stats);
                STAT_KEYS.forEach((statKey) => {
                    const value = Number(stats?.[statKey] || 0);
                    if (!Number.isFinite(value) || value === 0) return;
                    if (aggregatedRecord) aggregatedRecord[statKey] += value;
                    if (dailyRecord) dailyRecord[statKey] += value;
                });
            });
        });

        return { aggregatedStats: aggregated, dailyStats: daily };
    }, [players, playersMap, filteredMatches]);

    const allPlayersStats = useMemo(() => Object.values(aggregatedStats), [aggregatedStats]);

    const rankings = useMemo(() => {
        const stats = allPlayersStats;
        const sortedBy = (key, filterFn) => {
            const list = filterFn ? stats.filter(filterFn) : stats;
            return [...list]
                .sort((a, b) => (b[key] - a[key]) || a.name.localeCompare(b.name))
                .filter(p => (p[key] || 0) > 0)
                .slice(0, 5);
        };

        return {
            topScorers: sortedBy('goals'),
            topAssisters: sortedBy('assists'),
            topTacklers: sortedBy('tackles'),
            topGoalkeepers: sortedBy('saves', (p) => (p.position || '').toLowerCase() === 'goleiro'),
            bolaMurcha: sortedBy('failures'),
        };
    }, [allPlayersStats]);

    const dailyHighlights = useMemo(() => {
        const dateKeys = Object.keys(dailyStats || {});
        if (dateKeys.length === 0) return null;
        dateKeys.sort();
        const latestDate = dateKeys[dateKeys.length - 1];
        const statsForDay = dailyStats[latestDate];
        if (!statsForDay) return null;
        const dailyArray = Object.values(statsForDay);
        if (dailyArray.length === 0) return null;

        const pickHighlight = (statKey, { filter, minValue = 1 } = {}) => {
            const candidates = dailyArray
                .filter((player) => {
                    if (filter && !filter(player)) return false;
                    return (player[statKey] || 0) >= minValue;
                })
                .sort((a, b) => (b[statKey] - a[statKey]) || a.name.localeCompare(b.name));
            if (!candidates.length) return null;
            const best = candidates[0];
            return {
                id: best.id,
                name: best.name,
                position: best.position,
                photoURL: best.photoURL,
                statValue: best[statKey],
            };
        };

        const isGoalkeeper = (player) => (player.position || '').toLowerCase() === 'goleiro';

        const highlights = {
            artilheiro: pickHighlight('goals'),
            garcom: pickHighlight('assists'),
            xerife: pickHighlight('tackles'),
            paredao: pickHighlight('saves', { filter: isGoalkeeper }),
            bolaMurcha: pickHighlight('failures'),
        };

        const hasData = Object.values(highlights).some(Boolean);
        if (!hasData) return null;

        return { date: latestDate, ...highlights };
    }, [dailyStats]);

    const renderHighlightBadge = (highlight, meta) => {
        const outerClip = 'polygon(50% 0%, 97% 6%, 100% 40%, 82% 100%, 18% 100%, 0% 40%, 3% 6%)';
        const innerClip = 'polygon(50% 0%, 95% 8%, 96% 38%, 80% 96%, 20% 96%, 4% 38%, 5% 8%)';

        if (!highlight) {
            return (
                <div className="flex flex-col items-center text-center opacity-70">
                    <div
                        className="relative h-40 w-32"
                        style={{ clipPath: outerClip }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-[#172332] via-[#0e161f] to-[#131d29] border border-white/15" style={{ clipPath: 'inherit' }} />
                        <div className="absolute inset-[6px] bg-[#0c131d] border border-white/8" style={{ clipPath: innerClip }} />
                        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-emerald-100/70">{meta.label}</span>
                    </div>
                    <span className="mt-3 text-xs text-emerald-100/60">Sem dados</span>
                </div>
            );
        }

        const initials = (highlight.name || '?')
            .split(' ')
            .map((part) => (part ? part.charAt(0) : ''))
            .join('')
            .toUpperCase()
            .slice(0, 2) || '--';
        const statValue = Number(highlight.statValue || 0);
        const rating = Number.isFinite(statValue) ? Math.round(statValue).toString().padStart(2, '0') : '00';
        const position = (highlight.position || meta.label || '')
            .toUpperCase()
            .slice(0, 3) || '---';
        const statLabel = meta.statLabel || '';
        const topRightLabel = meta.short || statLabel.slice(0, 3).toUpperCase();
        const flagUrl = highlight.flagURL || highlight.teamFlag || highlight.countryFlag || null;

        return (
            <div className="flex flex-col items-center text-center gap-3">
                <div className="relative h-40 w-32" style={{ clipPath: outerClip }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-[#2f52ff] via-[#682ef4] to-[#b12ce9] border border-white/25 shadow-[0_22px_55px_rgba(63,47,178,0.45)]" style={{ clipPath: 'inherit' }} />
                    <div className="absolute inset-[6px] bg-gradient-to-br from-[#0c1b31] via-[#13223d] to-[#160e2c] border border-white/12" style={{ clipPath: innerClip }} />
                    <div className="relative flex h-full w-full flex-col justify-between px-4 py-4 text-white">
                        <div className="flex items-start justify-between text-left">
                            <div className="flex flex-col leading-none">
                                <span className="text-4xl font-black tracking-tight">{rating}</span>
                                <span className="text-lg font-semibold uppercase text-white/80">{position}</span>
                            </div>
                            <div className="flex h-8 w-12 items-center justify-center rounded-sm border border-white/25 bg-white/10 text-[11px] font-semibold uppercase text-white/80 overflow-hidden">
                                {flagUrl ? (
                                    <img src={flagUrl} alt={meta.label} className="h-full w-full object-cover" />
                                ) : (
                                    topRightLabel
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative h-16 w-16 rounded-full border-2 border-white/30 bg-gradient-to-br from-[#25324a] to-[#131c2c] overflow-hidden shadow-[0_10px_20px_rgba(0,0,0,0.45)]">
                                {highlight.photoURL ? (
                                    <img src={highlight.photoURL} alt={highlight.name} className="h-full w-full object-cover" />
                                ) : (
                                    <span className="flex h-full w-full items-center justify-center text-xl font-extrabold text-white/85">{initials}</span>
                                )}
                            </div>
                            <h3 className="text-lg font-bold uppercase tracking-wide">{highlight.name}</h3>
                        </div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">{meta.label}</div>
                    </div>
                </div>
            </div>
        );
    };
    const lineupMeta = {
        artilheiro: { label: 'Artilheiro', statLabel: 'Gols', short: 'GLS' },
        garcom: { label: 'Garcom', statLabel: 'Assistencias', short: 'AST' },
        xerife: { label: 'Xerifao', statLabel: 'Desarmes', short: 'DSR' },
        paredao: { label: 'Paredao', statLabel: 'Defesas', short: 'DEF' },
        bolaMurcha: { label: 'Bola Murcha', statLabel: 'Falhas', short: 'ERR' },
    };


    const dailyDateLabel = useMemo(() => {
        if (!dailyHighlights?.date) return null;
        const date = new Date(`${dailyHighlights.date}T00:00:00`);
        if (Number.isNaN(date.getTime())) return dailyHighlights.date;
        return date.toLocaleDateString();
    }, [dailyHighlights]);

    const hasDailyHighlights = dailyHighlights && ['artilheiro', 'garcom', 'xerife', 'paredao', 'bolaMurcha'].some(key => dailyHighlights[key]);

    return (
        <div>
            {hasDailyHighlights && (
                <section className="mb-10">
                    <h2 className="text-2xl font-bold text-center text-indigo-100">Destaques do dia</h2>
                    {dailyDateLabel && (
                        <p className="mt-1 text-sm text-center text-indigo-200/80">Referente a {dailyDateLabel}</p>
                    )}
                    <div className="relative mx-auto mt-6 max-w-4xl overflow-hidden rounded-[44px] border border-emerald-500/40 bg-gradient-to-br from-[#041c12] via-[#08311d] to-[#03160c] px-8 py-10 shadow-[0_35px_70px_rgba(2,18,8,0.5)]">
                        <div className="pointer-events-none absolute inset-4 rounded-[40px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(74,222,128,0.18),transparent_65%)]" />
                        <div className="relative grid h-full grid-cols-3 grid-rows-4 items-center justify-items-center gap-y-8 py-4">
                            <div className="col-span-3 row-start-1 flex justify-center">
                                {renderHighlightBadge(dailyHighlights.artilheiro, lineupMeta.artilheiro)}
                            </div>
                            <div className="col-span-3 row-start-2 flex justify-center">
                                {renderHighlightBadge(dailyHighlights.garcom, lineupMeta.garcom)}
                            </div>
                            <div className="col-span-1 row-start-3 justify-self-start">
                                {renderHighlightBadge(dailyHighlights.xerife, lineupMeta.xerife)}
                            </div>
                            <div className="col-span-1 row-start-3 col-start-3 justify-self-end">
                                {renderHighlightBadge(dailyHighlights.bolaMurcha, lineupMeta.bolaMurcha)}
                            </div>
                            <div className="col-span-3 row-start-4 flex justify-center">
                                {renderHighlightBadge(dailyHighlights.paredao, lineupMeta.paredao)}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            <div className="flex justify-center mb-6">
                <select onChange={(e) => setFilter(e.target.value)} value={filter} className="bg-gray-800 border border-gray-600 rounded-lg p-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    <option value="week">{t('Esta Semana')}</option>
                    <option value="month">{t('Este Mes')}</option>
                    <option value="quarter">{t('Este Trimestre')}</option>
                    <option value="semester">{t('Este Semestre')}</option>
                    <option value="year">{t('Este Ano')}</option>
                    <option value="all">{t('Geral')}</option>
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <RankingCard title={t('Artilheiros')} data={rankings.topScorers} statKey="goals" icon={<LucideTrophy />} t={t} />
                <RankingCard title={t('Garcons')} data={rankings.topAssisters} statKey="assists" icon={<LucideHandshake />} t={t} />
                <RankingCard title={t('Xerifes')} data={rankings.topTacklers} statKey="tackles" icon={<LucideShieldCheck />} t={t} />
                <RankingCard title={t('Paredoes')} data={rankings.topGoalkeepers} statKey="saves" icon={<LucideAward />} t={t} />
                <RankingCard title={t('Bola Murcha')} data={rankings.bolaMurcha} statKey="failures" icon={<LucideFrown />} t={t} />
            </div>
        </div>
    );
};

export default HallOfFame;





