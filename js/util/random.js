// Random utility functions for commands

export function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export function pickRandom(array) {
    if (!array || array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
}

export function pickRandomN(array, n) {
    if (!array || n <= 0) return [];
    const result = [...array];
    shuffle(result);
    return result.slice(0, Math.min(n, result.length));
}
