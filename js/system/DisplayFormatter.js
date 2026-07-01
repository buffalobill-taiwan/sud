// Display formatting helpers for consistent UI output

import { bold, yellow, cyan, green, white, red } from '../util/sgr.js';

/**
 * Render a formatted box with title and items.
 * @param {string} title - Box title
 * @param {Array<{label: string, value: string|number, color?: Function}>} items - Content items
 * @param {Object} options - { width: number, colorFn?: Function }
 */
export function formatBox(title, items, options = {}) {
    const width = options.width || 50;
    const line = '='.repeat(width);
    const padding = Math.max(0, Math.floor((width - title.length) / 2));

    let result = bold(yellow(line)) + '\r\n';
    result += bold(cyan(' '.repeat(padding) + title)) + '\r\n';

    for (const item of items) {
        const color = item.color || white;
        result += '  ' + item.label + ': ' + color(String(item.value)) + '\r\n';
    }

    result += bold(yellow(line)) + '\r\n';
    return result;
}

/**
 * Render a score bar with visual representation.
 * @param {string} label - Score label
 * @param {number} score - Current score
 * @param {number} maxScore - Maximum possible score
 * @param {Object} options - { width: number, colorFn?: Function }
 */
export function scoreBar(label, score, maxScore, options = {}) {
    const barWidth = options.width || 20;
    const filled = Math.round((score / maxScore) * barWidth);
    const empty = barWidth - filled;

    const colorFn = score >= maxScore * 0.7 ? green :
                    score >= maxScore * 0.4 ? yellow : red;

    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `  ${label}: ${colorFn(bar)} ${score}/${maxScore}\r\n`;
}

/**
 * Format items as a columnar table.
 * @param {Array<Array<string>>} rows - 2D array of cell content
 * @param {Array<number>} columnWidths - Width of each column
 * @param {Object} options - { borders: boolean, headers: Array<string> }
 */
export function formatTable(rows, columnWidths, options = {}) {
    let result = '';

    if (options.headers && options.borders) {
        const headerRow = formatTableRow(options.headers, columnWidths);
        result += headerRow + '\r\n';
        result += bold(yellow('-'.repeat(columnWidths.reduce((a, b) => a + b) + columnWidths.length * 3))) + '\r\n';
    }

    for (const row of rows) {
        result += formatTableRow(row, columnWidths) + '\r\n';
    }

    return result;
}

function formatTableRow(cells, columnWidths) {
    return cells.map((cell, i) => {
        const width = columnWidths[i] || 10;
        const padded = String(cell).padEnd(width);
        return padded;
    }).join('   ');
}

/**
 * Render a centered title with decorative border.
 * @param {string} text - Title text
 * @param {Object} options - { width: number, char: string }
 */
export function centeredTitle(text, options = {}) {
    const width = options.width || 50;
    const char = options.char || '=';
    const available = width - text.length - 2;
    const left = Math.floor(available / 2);
    const right = available - left;

    const line = char.repeat(left) + ' ' + text + ' ' + char.repeat(right);
    return bold(cyan(line)) + '\r\n';
}
