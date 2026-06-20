/**
 * Screen — terminal buffer data model.
 *
 * Owns the cell buffer, cursor state, scroll regions, SGR attributes,
 * scrollback, alternate buffer, and dirty-row tracking.
 * No DOM, no escape parsing — pure data.
 */

export const XTERM_COLORS = [
    '#000000', '#CD0000', '#00CD00', '#CDCD00',
    '#0000EE', '#CD00CD', '#00CDCD', '#E5E5E5',
    '#7F7F7F', '#FF0000', '#00FF00', '#FFFF00',
    '#5C5CFF', '#FF00FF', '#00FFFF', '#FFFFFF',
    '#000000', '#00005f', '#000087', '#0000af', '#0000d7', '#0000ff',
    '#005f00', '#005f5f', '#005f87', '#005faf', '#005fd7', '#005fff',
    '#008700', '#00875f', '#008787', '#0087af', '#0087d7', '#0087ff',
    '#00af00', '#00af5f', '#00af87', '#00afaf', '#00afd7', '#00afff',
    '#00d700', '#00d75f', '#00d787', '#00d7af', '#00d7d7', '#00d7ff',
    '#00ff00', '#00ff5f', '#00ff87', '#00ffaf', '#00ffd7', '#00ffff',
    '#5f0000', '#5f005f', '#5f0087', '#5f00af', '#5f00d7', '#5f00ff',
    '#5f5f00', '#5f5f5f', '#5f5f87', '#5f5faf', '#5f5fd7', '#5f5fff',
    '#5f8700', '#5f875f', '#5f8787', '#5f87af', '#5f87d7', '#5f87ff',
    '#5faf00', '#5faf5f', '#5faf87', '#5fafaf', '#5fafd7', '#5fafff',
    '#5fd700', '#5fd75f', '#5fd787', '#5fd7af', '#5fd7d7', '#5fd7ff',
    '#5fff00', '#5fff5f', '#5fff87', '#5fffaf', '#5fffd7', '#5fffff',
    '#870000', '#87005f', '#870087', '#8700af', '#8700d7', '#8700ff',
    '#875f00', '#875f5f', '#875f87', '#875faf', '#875fd7', '#875fff',
    '#878700', '#87875f', '#878787', '#8787af', '#8787d7', '#8787ff',
    '#87af00', '#87af5f', '#87af87', '#87afaf', '#87afd7', '#87afff',
    '#87d700', '#87d75f', '#87d787', '#87d7af', '#87d7d7', '#87d7ff',
    '#87ff00', '#87ff5f', '#87ff87', '#87ffaf', '#87ffd7', '#87ffff',
    '#af0000', '#af005f', '#af0087', '#af00af', '#af00d7', '#af00ff',
    '#af5f00', '#af5f5f', '#af5f87', '#af5faf', '#af5fd7', '#af5fff',
    '#af8700', '#af875f', '#af8787', '#af87af', '#af87d7', '#af87ff',
    '#afaf00', '#afaf5f', '#afaf87', '#afafaf', '#afafd7', '#afafff',
    '#afd700', '#afd75f', '#afd787', '#afd7af', '#afd7d7', '#afd7ff',
    '#afff00', '#afff5f', '#afff87', '#afffaf', '#afffd7', '#afffff',
    '#d70000', '#d7005f', '#d70087', '#d700af', '#d700d7', '#d700ff',
    '#d75f00', '#d75f5f', '#d75f87', '#d75faf', '#d75fd7', '#d75fff',
    '#d78700', '#d7875f', '#d78787', '#d787af', '#d787d7', '#d787ff',
    '#d7af00', '#d7af5f', '#d7af87', '#d7afaf', '#d7afd7', '#d7afff',
    '#d7d700', '#d7d75f', '#d7d787', '#d7d7af', '#d7d7d7', '#d7d7ff',
    '#d7ff00', '#d7ff5f', '#d7ff87', '#d7ffaf', '#d7ffd7', '#d7ffff',
    '#ff0000', '#ff005f', '#ff0087', '#ff00af', '#ff00d7', '#ff00ff',
    '#ff5f00', '#ff5f5f', '#ff5f87', '#ff5faf', '#ff5fd7', '#ff5fff',
    '#ff8700', '#ff875f', '#ff8787', '#ff87af', '#ff87d7', '#ff87ff',
    '#ffaf00', '#ffaf5f', '#ffaf87', '#ffafaf', '#ffafd7', '#ffafff',
    '#ffd700', '#ffd75f', '#ffd787', '#ffd7af', '#ffd7d7', '#ffd7ff',
    '#ffff00', '#ffff5f', '#ffff87', '#ffffaf', '#ffffd7', '#ffffff',
    '#080808', '#121212', '#1c1c1c', '#262626', '#303030', '#3a3a3a',
    '#444444', '#4e4e4e', '#585858', '#626262', '#6c6c6c', '#767676',
    '#808080', '#8a8a8a', '#949494', '#9e9e9e', '#a8a8a8', '#b2b2b2',
    '#bcbcbc', '#c6c6c6', '#d0d0d0', '#dadada', '#e4e4e4', '#eeeeee',
];

export class Screen {
    constructor(cols, rows) {
        this.cols = cols;
        this.rows = rows;
        this.scrollbackSize = 2000;

        this.buffer = [];
        this.scrollback = [];
        this.viewOffset = 0;
        this.dirtyRows = new Set();

        this.curX = 0;
        this.curY = 0;
        this.savedX = -1;
        this.savedY = -1;
        this.scrollTop = 0;
        this.scrollBottom = this.rows - 1;

        this.attr = this._defaultAttr();

        this.modes = {
            applicationCursorKeys: false,
            bracketedPaste: false,
        };

        this.mouseMode = 0;

        this._cursorHidden = false;

        this.overlays = [];

        this._canv = null;
        this._ctx = null;

        this._normalLines = null;
        this._normalCurX = 0;
        this._normalCurY = 0;
        this._normalViewOffset = 0;
        this._saveScroll = null;

        this._initBuffer();
    }

    // ── Public helpers ──

    getRow(r) { return this.buffer[r]; }
    setRow(r, row) { this.buffer[r] = row; }
    get cursorHidden() { return this._cursorHidden; }
    set cursorHidden(v) { this._cursorHidden = v; }

    markAllDirty() {
        for (let i = 0; i < this.rows; i++) this.dirtyRows.add(i);
    }

    markRowDirty(rowIdx) {
        if (rowIdx >= 0 && rowIdx < this.rows) this.dirtyRows.add(rowIdx);
    }

    addOverlay(ov) { this.overlays.push(ov); }
    removeOverlay(ov) {
        const i = this.overlays.indexOf(ov);
        if (i >= 0) this.overlays.splice(i, 1);
    }

    isWide(ch) {
        const code = ch.charCodeAt ? ch.charCodeAt(0) : ch;

        if (code >= 0x1100) {
            if (code <= 0x11FF) return true;
            if (code >= 0x2E80 && code <= 0x9FFF) return true;
            if (code >= 0xAC00 && code <= 0xD7AF) return true;
            if (code >= 0xF900 && code <= 0xFAFF) return true;
            if (code >= 0xFE10 && code <= 0xFE19) return true;
            if (code >= 0xFE30 && code <= 0xFE6F) return true;
            if (code >= 0xFF01 && code <= 0xFF60) return true;
            if (code >= 0xFFE0 && code <= 0xFFE6) return true;
            if (code >= 0x20000 && code <= 0x2FFFF) return true;
            if (code >= 0x30000 && code <= 0x3FFFF) return true;
        }

        if (code < 0x100) return false;

        if (code === 0x23F0 || code === 0x23F3) return true;

        if (code >= 0x2190 && code <= 0x21FF) return false;
        if (code >= 0x2300 && code <= 0x23FF) return false;
        if (code >= 0x2500 && code <= 0x25FF) return false;

        if (!this._canv) {
            this._canv = document.createElement('canvas');
            this._ctx = this._canv.getContext('2d');
            this._ctx.font = '16px UnifontTerm, monospace';
        }
        const w = this._ctx.measureText(ch).width;
        return w > 10;
    }

    cursorUp(n) {
        this.markRowDirty(this.curY);
        this.curY = Math.max(0, this.curY - n);
        this.markRowDirty(this.curY);
    }

    cursorDown(n) {
        this.markRowDirty(this.curY);
        this.curY = Math.min(this.rows - 1, this.curY + n);
        this.markRowDirty(this.curY);
    }

    cursorForward(n) {
        this.curX = Math.min(this.cols - 1, this.curX + n);
    }

    cursorBack(n) {
        this.curX = Math.max(0, this.curX - n);
    }

    cursorPos(row, col) {
        this.markRowDirty(this.curY);
        this.curY = Math.max(0, Math.min(this.rows - 1, row - 1));
        this.curX = Math.max(0, Math.min(this.cols - 1, col - 1));
        this.markRowDirty(this.curY);
    }

    rowPos(row) {
        this.markRowDirty(this.curY);
        this.curY = Math.max(0, Math.min(this.rows - 1, row - 1));
        this.markRowDirty(this.curY);
    }

    carriageReturn() {
        this.curX = 0;
    }

    backspace() {
        if (this.curX > 0) this.curX--;
    }

    tab() {
        const next = (this.curX + 8) & ~7;
        this.curX = Math.min(this.cols - 1, next);
    }

    lineFeed() {
        if (this.curY < this.scrollTop) this.curY = this.scrollTop;
        this.markRowDirty(this.curY);
        if (this.curY >= this.scrollBottom) {
            this._scrollUp(1);
            this.curY = this.scrollBottom;
        } else {
            this.curY++;
        }
    }

    reverseIndex() {
        this.markRowDirty(this.curY);
        if (this.curY === this.scrollTop) {
            this._scrollDown(1);
        } else {
            this.curY--;
        }
        this.markRowDirty(this.curY);
    }

    writeChar(ch) {
        const cell = this._makeCell(ch);
        if (cell.width === 2 && this.curX >= this.cols - 1) {
            this.curX = 0;
            this.lineFeed();
        }
        if (this.curX >= this.cols) {
            this.curX = 0;
            this.lineFeed();
        }

        const row = this.buffer[this.curY];
        if (!row) return;

        row[this.curX] = cell;
        if (cell.width === 2 && this.curX + 1 < this.cols) {
            row[this.curX + 1] = {
                ch: '', fg: this.attr.fg, bg: this.attr.bg,
                bold: this.attr.bold, dim: this.attr.dim,
                italic: this.attr.italic, underline: this.attr.underline,
                blink: this.attr.blink, inverse: this.attr.inverse,
                conceal: this.attr.conceal, crossedOut: this.attr.crossedOut,
                width: 0,
            };
        }
        this.markRowDirty(this.curY);
        this.curX += cell.width;
    }

    clearBuffer() {
        this._initBuffer();
    }

    resize(newCols, newRows) {
        const oldCols = this.cols;
        const oldRows = this.rows;
        this.cols = newCols;
        this.rows = newRows;
        this.scrollBottom = newRows - 1;

        while (this.buffer.length < newRows) {
            this.buffer.push(this._emptyRow());
        }
        while (this.buffer.length > newRows) {
            this.buffer.pop();
        }
        for (let r = 0; r < newRows; r++) {
            const row = this.buffer[r];
            if (!row) continue;
            if (newCols > oldCols) {
                for (let c = oldCols; c < newCols; c++) row.push(this._makeCell(' '));
            } else if (newCols < oldCols) {
                row.length = newCols;
            }
        }
        this.curX = Math.min(this.curX, newCols - 1);
        this.curY = Math.min(this.curY, newRows - 1);
        this.markAllDirty();
    }

    scrollbackUp(n) {
        this.viewOffset = Math.min(this.viewOffset + n, this._maxViewOffset());
        this.markAllDirty();
    }

    scrollbackDown(n) {
        this.viewOffset = Math.max(0, this.viewOffset - n);
        this.markAllDirty();
    }

    altBuffer() {
        this._normalLines = this.buffer;
        this._normalCurX = this.curX;
        this._normalCurY = this.curY;
        this._normalViewOffset = this.viewOffset;
        this._saveScroll = { top: this.scrollTop, bottom: this.scrollBottom };

        this.buffer = [];
        for (let i = 0; i < this.rows; i++) this.buffer.push(this._emptyRow());
        this.curX = 0;
        this.curY = 0;
        this.viewOffset = 0;
        this.scrollTop = 0;
        this.scrollBottom = this.rows - 1;
        this.markAllDirty();
    }

    normalBuffer() {
        if (!this._normalLines) return;
        this.buffer = this._normalLines;
        this.curX = this._normalCurX || 0;
        this.curY = this._normalCurY || 0;
        this.viewOffset = this._normalViewOffset || 0;
        if (this._saveScroll) {
            this.scrollTop = this._saveScroll.top;
            this.scrollBottom = this._saveScroll.bottom;
        }
        this._normalLines = null;
        this.markAllDirty();
    }

    setSGR(params) {
        if (params.length === 0) params = [0];

        for (let i = 0; i < params.length; i++) {
            const p = params[i];
            if (p === 0) {
                this.attr = this._defaultAttr();
            } else if (p === 1) {
                this.attr.bold = true;
            } else if (p === 2) {
                this.attr.dim = true;
            } else if (p === 3) {
                this.attr.italic = true;
            } else if (p === 4) {
                this.attr.underline = true;
            } else if (p === 5 || p === 6) {
                this.attr.blink = true;
            } else if (p === 7) {
                this.attr.inverse = true;
            } else if (p === 8) {
                this.attr.conceal = true;
            } else if (p === 9) {
                this.attr.crossedOut = true;
            } else if (p === 21 || p === 22) {
                this.attr.bold = false; this.attr.dim = false;
            } else if (p === 23) {
                this.attr.italic = false;
            } else if (p === 24) {
                this.attr.underline = false;
            } else if (p === 25) {
                this.attr.blink = false;
            } else if (p === 27) {
                this.attr.inverse = false;
            } else if (p === 28) {
                this.attr.conceal = false;
            } else if (p === 29) {
                this.attr.crossedOut = false;
            } else if (p >= 30 && p <= 37) {
                this.attr.fg = p - 30;
            } else if (p === 38) {
                i = this._parseExtendedColor(params, i, 'fg');
            } else if (p === 39) {
                this.attr.fg = 7;
            } else if (p >= 40 && p <= 47) {
                this.attr.bg = p - 40;
            } else if (p === 48) {
                i = this._parseExtendedColor(params, i, 'bg');
            } else if (p === 49) {
                this.attr.bg = 0;
            } else if (p >= 90 && p <= 97) {
                this.attr.fg = p - 90 + 8;
            } else if (p >= 100 && p <= 107) {
                this.attr.bg = p - 100 + 8;
            }
        }
    }

    // ── Internal: buffer init / cells ──

    _initBuffer() {
        this.buffer = [];
        for (let i = 0; i < this.rows; i++) {
            this.buffer.push(this._emptyRow());
        }
        this.scrollback = [];
        this.viewOffset = 0;
        this.curX = 0;
        this.curY = 0;
        this.attr = this._defaultAttr();
        this.markAllDirty();
    }

    _defaultAttr() {
        return { fg: 7, bg: 0, bold: false, dim: false, italic: false, underline: false, blink: false, inverse: false, conceal: false, crossedOut: false };
    }

    _makeCell(ch) {
        const w = this.isWide(ch) ? 2 : 1;
        return {
            ch: ch || ' ',
            fg: this.attr.fg,
            bg: this.attr.bg,
            bold: this.attr.bold,
            dim: this.attr.dim,
            italic: this.attr.italic,
            underline: this.attr.underline,
            blink: this.attr.blink,
            inverse: this.attr.inverse,
            conceal: this.attr.conceal,
            crossedOut: this.attr.crossedOut,
            width: w,
        };
    }

    _emptyRow() {
        const row = new Array(this.cols);
        for (let i = 0; i < this.cols; i++) {
            row[i] = this._makeCell(' ');
        }
        return row;
    }

    _scrollUp(n) {
        for (let i = 0; i < n; i++) {
            if (this.scrollTop === 0) {
                this.scrollback.push(Array.from(this.buffer[0]));
                if (this.scrollback.length > this.scrollbackSize) {
                    this.scrollback.shift();
                }
            }
            for (let r = this.scrollTop; r < this.scrollBottom; r++) {
                this.buffer[r] = this.buffer[r + 1];
            }
            this.buffer[this.scrollBottom] = this._emptyRow();
        }
        if (this.viewOffset > 0) this.viewOffset = Math.min(this.viewOffset, this._maxViewOffset());
        this.markAllDirty();
    }

    _scrollDown(n) {
        for (let i = 0; i < n; i++) {
            for (let r = this.scrollBottom; r > this.scrollTop; r--) {
                this.buffer[r] = this.buffer[r - 1];
            }
            this.buffer[this.scrollTop] = this._emptyRow();
        }
        this.markAllDirty();
    }

    eraseDisplay(mode) {
        if (mode === 0) {
            this.eraseLine(0);
            for (let r = this.curY + 1; r < this.rows; r++) {
                this.buffer[r] = this._emptyRow();
                this.markRowDirty(r);
            }
        } else if (mode === 1) {
            for (let r = 0; r < this.curY; r++) {
                this.buffer[r] = this._emptyRow();
                this.markRowDirty(r);
            }
            this.eraseLine(1);
        } else if (mode === 2) {
            for (let r = 0; r < this.rows; r++) {
                this.buffer[r] = this._emptyRow();
                this.markRowDirty(r);
            }
        } else if (mode === 3) {
            this.scrollback = [];
            for (let r = 0; r < this.rows; r++) {
                this.buffer[r] = this._emptyRow();
                this.markRowDirty(r);
            }
        }
    }

    eraseLine(mode) {
        const row = this.buffer[this.curY];
        if (!row) return;
        if (mode === 0) {
            for (let c = this.curX; c < this.cols; c++) row[c] = this._makeCell(' ');
        } else if (mode === 1) {
            for (let c = 0; c <= this.curX; c++) row[c] = this._makeCell(' ');
        } else if (mode === 2) {
            for (let c = 0; c < this.cols; c++) row[c] = this._makeCell(' ');
        }
        this.markRowDirty(this.curY);
    }

    insertLines(n) {
        const top = Math.max(this.curY, this.scrollTop);
        n = Math.min(n, this.scrollBottom - top + 1);
        for (let i = 0; i < n; i++) {
            for (let r = this.scrollBottom; r > top; r--) {
                this.buffer[r] = this.buffer[r - 1];
            }
            this.buffer[top] = this._emptyRow();
        }
        this.markAllDirty();
    }

    deleteLines(n) {
        const top = Math.max(this.curY, this.scrollTop);
        n = Math.min(n, this.scrollBottom - top + 1);
        for (let i = 0; i < n; i++) {
            for (let r = top; r < this.scrollBottom; r++) {
                this.buffer[r] = this.buffer[r + 1];
            }
            this.buffer[this.scrollBottom] = this._emptyRow();
        }
        this.markAllDirty();
    }

    insertChars(n) {
        const row = this.buffer[this.curY];
        if (!row) return;
        n = Math.min(n, this.cols - this.curX);
        for (let c = this.cols - 1; c >= this.curX + n; c--) {
            row[c] = row[c - n];
        }
        for (let c = this.curX; c < this.curX + n; c++) {
            row[c] = this._makeCell(' ');
        }
        this.markRowDirty(this.curY);
    }

    deleteChars(n) {
        const row = this.buffer[this.curY];
        if (!row) return;
        n = Math.min(n, this.cols - this.curX);
        for (let c = this.curX; c < this.cols - n; c++) {
            row[c] = row[c + n];
        }
        for (let c = this.cols - n; c < this.cols; c++) {
            row[c] = this._makeCell(' ');
        }
        this.markRowDirty(this.curY);
    }

    eraseChars(n) {
        const row = this.buffer[this.curY];
        if (!row) return;
        n = Math.min(n, this.cols - this.curX);
        for (let c = this.curX; c < this.curX + n; c++) {
            row[c] = this._makeCell(' ');
        }
        this.markRowDirty(this.curY);
    }

    _parseExtendedColor(params, i, type) {
        if (i + 1 >= params.length) return i;
        const mode = params[i + 1];
        if (mode === 5 && i + 2 < params.length) {
            const idx = params[i + 2];
            if (type === 'fg') this.attr.fg = idx;
            else this.attr.bg = idx;
            return i + 2;
        }
        if (mode === 2 && i + 4 < params.length) {
            const r = params[i + 2], g = params[i + 3], b = params[i + 4];
            const hex = '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
            if (type === 'fg') this.attr.fg = hex;
            else this.attr.bg = hex;
            return i + 4;
        }
        return i;
    }

    _maxViewOffset() {
        return Math.min(this.scrollback.length, this.scrollbackSize);
    }
}
