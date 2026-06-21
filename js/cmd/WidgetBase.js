export class WidgetBase {
    constructor(shell) {
        this.shell = shell;
        this.term = shell.term;
        this._y = 0;
        this._x = 0;
        this._w = 0;
        this._h = 0;
        this._buffer = null;
        this._overlay = null;
    }

    start() {
        this._buffer = this._createEmptyBuffer();
        this._overlay = {
            y: this._y,
            x: this._x,
            h: this._h,
            w: this._w,
            z: 10,
            owner: this,
            getCell: (relRow, relCol) => {
                if (relRow < this._h && relCol < this._w && this._buffer) {
                    return this._buffer[relRow][relCol];
                }
                return null;
            }
        };
        this.term.addOverlay(this._overlay);
    }

    stop() {
        this.term.removeOverlay(this._overlay);
        this._overlay = null;
        this._buffer = null;
    }

    draw() {}

    startDrag(col, row) {
        this._dragOffX = col - this._x;
        this._dragOffY = row - this._y;
    }

    moveDrag(col, row) {
        const cols = this.term.cols;
        const rows = this.term.rows;
        const newX = Math.max(0, Math.min(cols - this._w, col - this._dragOffX));
        const newY = Math.max(0, Math.min(rows - this._h, row - this._dragOffY));
        if (newX !== this._x || newY !== this._y) {
            for (let r = this._y; r < this._y + this._h; r++) this.term.markRowDirty(r);
            this._x = newX;
            this._y = newY;
            this._overlay.x = newX;
            this._overlay.y = newY;
            for (let r = newY; r < newY + this._h; r++) this.term.markRowDirty(r);
        }
    }

    endDrag() {}

    putc(x, y, ch, fg, bg, attrs) {
        if (y < 0 || y >= this._h || x < 0 || x >= this._w) return;
        const cell = {
            ch: ch || ' ',
            fg: fg != null ? fg : 7,
            bg: bg != null ? bg : 0,
            bold: attrs && attrs.bold || false,
            dim: attrs && attrs.dim || false,
            italic: attrs && attrs.italic || false,
            underline: attrs && attrs.underline || false,
            blink: attrs && attrs.blink || false,
            inverse: attrs && attrs.inverse || false,
            conceal: attrs && attrs.conceal || false,
            crossedOut: attrs && attrs.crossedOut || false,
            width: 1,
        };
        this._buffer[y][x] = cell;
        this.term.markRowDirty(this._y + y);
    }

    _createEmptyBuffer() {
        const buf = [];
        for (let r = 0; r < this._h; r++) {
            const row = new Array(this._w);
            for (let c = 0; c < this._w; c++) {
                row[c] = null;
            }
            buf.push(row);
        }
        return buf;
    }
}