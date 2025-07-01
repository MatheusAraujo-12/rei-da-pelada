// Exporta a função para que ela possa ser usada em outros arquivos
export const calculateOverall = (skills) => {
    if (!skills) return 0;
    const skillValues = Object.values(skills).map(Number).filter(v => !isNaN(v));
    if (skillValues.length === 0) return 0;
    return Math.round(skillValues.reduce((acc, val) => acc + val, 0) / skillValues.length);
};

// Se tivermos outras funções de ajuda no futuro, podemos adicioná-las aqui.