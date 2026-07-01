// Questionnaire and scoring helper

/**
 * Creates a dimensional aggregator for multi-dimension questionnaires (e.g., MBTI).
 * @param {Object} config - { dimensions: string[], valuePairs: Object }
 *   dimensions: ['E/I', 'S/N', 'T/F', 'J/P']
 *   valuePairs: { 'E/I': {A: 'e', B: 'i'}, ...}
 */
export class DimensionalAggregator {
    constructor(config) {
        this.dimensions = config.dimensions || [];
        this.valuePairs = config.valuePairs || {};
        this.scores = {};
        this._initScores();
    }

    _initScores() {
        for (const dim of this.dimensions) {
            const pair = this.valuePairs[dim];
            if (pair) {
                for (const key of Object.values(pair)) {
                    this.scores[key] = 0;
                }
            }
        }
    }

    /**
     * Record an answer for a dimension.
     * @param {string} dimension - Dimension name (e.g., 'E/I')
     * @param {string} answerKey - 'A' or 'B'
     */
    recordAnswer(dimension, answerKey) {
        const pair = this.valuePairs[dimension];
        if (!pair) throw new Error(`Unknown dimension: ${dimension}`);

        const scoreKey = pair[answerKey];
        if (!scoreKey) throw new Error(`Invalid answer key: ${answerKey}`);

        this.scores[scoreKey]++;
    }

    /**
     * Get the dominant key for a dimension.
     * @param {string} dimension - Dimension name
     * @returns {string} Dominant key or null if tied
     */
    getDominant(dimension) {
        const pair = this.valuePairs[dimension];
        if (!pair) return null;

        const aKey = pair.A;
        const bKey = pair.B;
        const aScore = this.scores[aKey] || 0;
        const bScore = this.scores[bKey] || 0;

        if (aScore > bScore) return aKey;
        if (bScore > aScore) return bKey;
        return (Math.random() < 0.5) ? aKey : bKey;  // Tie
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

/**
 * Helper to run a questionnaire loop with selection interface.
 * @param {CmdBase} cmd - Command instance
 * @param {Array<Object>} questions - Array of { dimension, text, options }
 * @param {Function} onAnswer - Called per answer: (question, row, col, value)
 * @param {Object} options - { onComplete?: Function }
 */
export async function runQuestionnaireLoop(cmd, questions, onAnswer, options = {}) {
    const answers = [];

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];

        const result = await cmd.selectAsync({
            text: `Question ${i + 1}/${questions.length}\n${q.text}\n`,
            options: q.options,
            onPick: (row, col, value) => {
                answers.push({ question: q, row, col, value });
                if (onAnswer) onAnswer(q, row, col, value);
            },
        });

        if (!result) {
            throw new Error('Questionnaire cancelled');
        }
    }

    if (options.onComplete) {
        options.onComplete(answers);
    }

    return answers;
}

/**
 * Calculate dimension scores from raw answers.
 * @param {Array<Object>} answers - Result from runQuestionnaireLoop()
 * @param {Function} scoringFn - Function(answer) -> { dimension, key }
 * @returns {DimensionalAggregator}
 */
export function aggregateAnswers(answers, scoringFn, aggregator) {
    for (const answer of answers) {
        const { dimension, key } = scoringFn(answer);
        if (dimension && key) {
            aggregator.recordAnswer(dimension, key);
        }
    }
    return aggregator;
}
