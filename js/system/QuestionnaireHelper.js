// Questionnaire and scoring helper

/**
 * Creates a dimensional aggregator for multi-dimension questionnaires.
 * Supports any number of answer options per dimension (not just A/B pairs).
 *
 * @param {Object} config
 * @param {string[]} config.dimensions - e.g. ['E/I', 'S/N', 'T/F', 'J/P']
 * @param {Object} config.scoringMap - e.g.
 *   { 'E/I': { A: { key: 'e', weight: 1 }, B: { key: 'i', weight: 1 } } }
 *   Each answer maps to { key, weight }. Weight defaults to 1 if omitted.
 */
export class DimensionalAggregator {
    constructor(config) {
        this.dimensions = config.dimensions || [];
        this.scoringMap = config.scoringMap || {};
        this.scores = {};
        this._initScores();
    }

    _initScores() {
        for (const dim of this.dimensions) {
            const map = this.scoringMap[dim];
            if (map) {
                for (const answerKey of Object.keys(map)) {
                    const entry = map[answerKey];
                    const targetKey = typeof entry === 'string' ? entry : entry.key;
                    if (!this.scores[targetKey]) this.scores[targetKey] = 0;
                }
            }
        }
    }

    /**
     * Record an answer for a dimension.
     * @param {string} dimension - Dimension name (e.g., 'E/I')
     * @param {string} answerKey - e.g. 'A', 'B', 'strongly_agree'
     * @param {number} weightOverride - Optional override weight
     */
    recordAnswer(dimension, answerKey, weightOverride) {
        const map = this.scoringMap[dimension];
        if (!map) throw new Error(`Unknown dimension: ${dimension}`);

        const entry = map[answerKey];
        if (!entry) throw new Error(`Invalid answer key "${answerKey}" for dimension "${dimension}"`);

        const targetKey = typeof entry === 'string' ? entry : entry.key;
        const weight = weightOverride != null ? weightOverride : (entry.weight != null ? entry.weight : 1);

        this.scores[targetKey] = (this.scores[targetKey] || 0) + weight;
    }

    /**
     * Get the dominant key for a dimension.
     * Returns the key with the highest score, or random on tie.
     * @param {string} dimension - Dimension name
     * @returns {string|null} Dominant key
     */
    getDominant(dimension) {
        const map = this.scoringMap[dimension];
        if (!map) return null;

        const candidates = {};
        for (const answerKey of Object.keys(map)) {
            const entry = map[answerKey];
            const targetKey = typeof entry === 'string' ? entry : entry.key;
            candidates[targetKey] = (candidates[targetKey] || 0) + (this.scores[targetKey] || 0);
        }

        const keys = Object.keys(candidates);
        if (keys.length === 0) return null;
        if (keys.length === 1) return keys[0];

        let best = keys[0];
        let tied = [keys[0]];
        for (let i = 1; i < keys.length; i++) {
            const k = keys[i];
            if (candidates[k] > candidates[best]) {
                best = k;
                tied = [k];
            } else if (candidates[k] === candidates[best]) {
                tied.push(k);
            }
        }

        return tied.length > 1
            ? tied[Math.floor(Math.random() * tied.length)]
            : best;
    }

    /**
     * Get final result as string (e.g., "ENTJ").
     * @param {Array<string>} dimensions - Ordered list of dimensions
     * @returns {string}
     */
    getFinalResult(dimensions) {
        return dimensions.map((dim) => {
            const key = this.getDominant(dim);
            return key ? key.toUpperCase() : '?';
        }).join('');
    }

    /**
     * Get detailed scores as object.
     */
    getScores() {
        return { ...this.scores };
    }
}
