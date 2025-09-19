import React, { useState, useMemo } from 'react';
import { LucideTrophy, LucideHandshake, LucideShieldCheck, LucideAward, LucideFrown } from 'lucide-react';

const RankingCard = ({ title, data, statKey, icon }) => (
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
        ) : <p className="text-gray-500">Ainda nao ha dados para este ranking.</p>}
    </div>
);

const HallOfFame = ({ players, matches }) => {
    const [filter, setFilter] = useState('week');

    const filteredMatches = useMemo(() => {
        const getMatchDate = (match) => {
            try {
                if (match?.date?.seconds) return new Date(match.date.seconds * 1000);
                if (typeof match?.date === 'string') return new Date(match.date);
                if (match?.endedAt) return new Date(match.endedAt);
                return null;
            } catch { return null; }
        };
        if (filter === 'all') return matches;
        const now = new Date();
        let startDate;
        switch (filter) {
            case 'week': {
                const d = new Date(now);
                const day = d.getDay();
                const diffToMonday = (day + 6) % 7;
                d.setHours(0,0,0,0);
                d.setDate(d.getDate() - diffToMonday);
                startDate = d;
                break;
            }
            case 'month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'quarter': startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); break;
            case 'semester': startDate = new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1); break;
            case 'year': startDate = new Date(now.getFullYear(), 0, 1); break;
            default: return matches;
        }
        return matches.filter(match => {
            const md = getMatchDate(match);
            return md && md >= startDate;
        });
    }, [matches, filter]);

    const rankings = useMemo(() => {
        const aggregatedStats = {};
        players.forEach(p => { aggregatedStats[p.id] = { id: p.id, name: p.name, position: p.position, goals: 0, assists: 0, dribbles: 0, tackles: 0, saves: 0, failures: 0 }; });
        filteredMatches.forEach(match => {
            if(match.playerStats) {
                for (const playerId in match.playerStats) {
                    if (aggregatedStats[playerId]) {
                        Object.keys(match.playerStats[playerId]).forEach(stat => {
                            const value = match.playerStats[playerId][stat] || 0;
                            if (typeof aggregatedStats[playerId][stat] !== 'number') {
                                aggregatedStats[playerId][stat] = 0;
                            }
                            aggregatedStats[playerId][stat] += value;
                        });
                    }
                }
            }
        });
        const allPlayersStats = Object.values(aggregatedStats);
        return {
            topScorers: [...allPlayersStats].sort((a, b) => b.goals - a.goals).filter(p => p.goals > 0).slice(0, 5),
            topAssisters: [...allPlayersStats].sort((a, b) => b.assists - a.assists).filter(p => p.assists > 0).slice(0, 5),
            topTacklers: [...allPlayersStats].sort((a, b) => b.tackles - a.tackles).filter(p => p.tackles > 0).slice(0, 5),
            topGoalkeepers: allPlayersStats.filter(p => p.position === 'Goleiro').sort((a, b) => b.saves - a.saves).filter(p => p.saves > 0).slice(0, 5),
            bolaMurcha: [...allPlayersStats].sort((a, b) => b.failures - a.failures).filter(p => p.failures > 0).slice(0, 5)
        };
    }, [players, filteredMatches]);

    return (
        <div>
            <div className="flex justify-center mb-6">
                <select onChange={(e) => setFilter(e.target.value)} value={filter} className="bg-gray-800 border border-gray-600 rounded-lg p-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    <option value="week">Esta Semana</option>
                    <option value="month">Este Mes</option>
                    <option value="quarter">Este Trimestre</option>
                    <option value="semester">Este Semestre</option>
                    <option value="year">Este Ano</option>
                    <option value="all">Geral</option>
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <RankingCard title="Artilheiros" data={rankings.topScorers} statKey="goals" icon={<LucideTrophy />} />
                <RankingCard title="Garcons" data={rankings.topAssisters} statKey="assists" icon={<LucideHandshake />} />
                <RankingCard title="Xerifes" data={rankings.topTacklers} statKey="tackles" icon={<LucideShieldCheck />} />
                <RankingCard title="Paredoes" data={rankings.topGoalkeepers} statKey="saves" icon={<LucideAward />} />
                <RankingCard title="Bola Murcha" data={rankings.bolaMurcha} statKey="failures" icon={<LucideFrown />} />
            </div>
        </div>
    );
};

export default HallOfFame;

