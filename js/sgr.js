/**
 * Shared SGR parsing and cell construction.
 *
 * Provides a single source of truth for:
 * - default attribute values
 * - SGR parameter application (all params except extended 38/48 colors)
 * - cell object construction
 *
 * Extended 38/48 colors are NOT handled here because they consume
 * variable-length parameter sequences and require caller context.
 */

export function defaultAttr() {
    return { fg: 7, bg: 0, bold: false, dim: false, italic: false, underline: false, blink: false, inverse: false, conceal: false, crossedOut: false };
}

export function applySGR(attr, params) {
    if (params.length === 0) params = [0];
    for (let i = 0; i < params.length; i++) {
        const p = params[i];
        if (p === 0) Object.assign(attr, defaultAttr());
        else if (p === 1) attr.bold = true;
        else if (p === 2) attr.dim = true;
        else if (p === 3) attr.italic = true;
        else if (p === 4) attr.underline = true;
        else if (p === 5 || p === 6) attr.blink = true;
        else if (p === 7) attr.inverse = true;
        else if (p === 8) attr.conceal = true;
        else if (p === 9) attr.crossedOut = true;
        else if (p === 21 || p === 22) { attr.bold = false; attr.dim = false; }
        else if (p === 23) attr.italic = false;
        else if (p === 24) attr.underline = false;
        else if (p === 25) attr.blink = false;
        else if (p === 27) attr.inverse = false;
        else if (p === 28) attr.conceal = false;
        else if (p === 29) attr.crossedOut = false;
        else if (p >= 30 && p <= 37) attr.fg = p - 30;
        else if (p === 39) attr.fg = 7;
        else if (p >= 40 && p <= 47) attr.bg = p - 40;
        else if (p === 49) attr.bg = 0;
        else if (p >= 90 && p <= 97) attr.fg = p - 90 + 8;
        else if (p >= 100 && p <= 107) attr.bg = p - 100 + 8;
    }
}

export function makeCell(ch, attr, width) {
    return {
        ch: ch || ' ',
        fg: attr.fg,
        bg: attr.bg,
        bold: attr.bold,
        dim: attr.dim,
        italic: attr.italic,
        underline: attr.underline,
        blink: attr.blink,
        inverse: attr.inverse,
        conceal: attr.conceal,
        crossedOut: attr.crossedOut,
        width: width || 1,
    };
}
