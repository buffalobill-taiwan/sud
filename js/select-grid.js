export function defaultGridMove(data, row, col, options) {
    if (data === '\x1B[A') {
        if (row === 0) return { row, col };
        const prev = options[row - 1];
        return { row: row - 1, col: Math.min(col, prev.length - 1) };
    }
    if (data === '\x1B[B') {
        if (row === options.length - 1) return { row, col };
        const next = options[row + 1];
        return { row: row + 1, col: Math.min(col, next.length - 1) };
    }
    if (data === '\x1B[D') {
        if (col === 0) return { row, col };
        return { row, col: col - 1 };
    }
    if (data === '\x1B[C') {
        const cur = options[row];
        if (col === cur.length - 1) return { row, col };
        return { row, col: col + 1 };
    }
    return { row, col };
}

export function displayWidth(s) {
    let w = 0;
    for (const ch of s) {
        w += ch.codePointAt(0) > 0x2E7F ? 2 : 1;
    }
    return w;
}
