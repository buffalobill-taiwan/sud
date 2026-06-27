import { makeCell, defaultAttr, OverlayZ, createEmptyBuffer, makeOverlayGetCell } from '../sgr.js';
import { addDragMethods, markDirtyRows } from '../drag.js';

export class WidgetBase {
    constructor(term) {
        this.term = term;
        this._y = 0;
        this._x = 0;
        this._w = 0;
        this._h = 0;
        this._buffer = null;
        this._overlay = null;

        addDragMethods(this, this.term, {
            getX: () => this._x, getY: () => this._y,
            setX: v => this._x = v, setY: v => this._y = v,
            getW: () => this._w, getH: () => this._h,
            getOverlay: () => this._overlay,
        });
    }

    start() {
        this._buffer = createEmptyBuffer(this._w, this._h);
        this._overlay = {
            y: this._y,
            x: this._x,
            h: this._h,
            w: this._w,
            z: OverlayZ.WIDGET,
            owner: this,
            getCell: makeOverlayGetCell(() => this._buffer, this._w, this._h),
        };
        this.term.addOverlay(this._overlay);
    }

    stop() {
        if (this._overlay) {
            for (let r = this._y; r < this._y + this._h; r++) {
                this.term.markRowDirty(r);
            }
        }
        this.term.removeOverlay(this._overlay);
        this._overlay = null;
        this._buffer = null;
    }

    draw() {}

    setPosition(x, y) {
        this._x = x;
        this._y = y;
        if (this._overlay) {
            this._overlay.x = x;
            this._overlay.y = y;
        }
    }

    getPosition() {
        return { x: this._x, y: this._y };
    }

    getSaveState() {
        return { x: this._x, y: this._y };
    }

    restoreSaveState(state) {
        this.setPosition(state.x, state.y);
    }

    _markDirty() {
        markDirtyRows(this.term, this._y, this._h);
    }

    putc(x, y, ch, fg, bg, attrs) {
        if (y < 0 || y >= this._h || x < 0 || x >= this._w) return;
        const def = defaultAttr();
        const attr = {
            fg: fg != null ? fg : def.fg,
            bg: bg != null ? bg : def.bg,
            bold: attrs && attrs.bold || false,
            dim: attrs && attrs.dim || false,
            italic: attrs && attrs.italic || false,
            underline: attrs && attrs.underline || false,
            blink: attrs && attrs.blink || false,
            inverse: attrs && attrs.inverse || false,
            conceal: attrs && attrs.conceal || false,
            crossedOut: attrs && attrs.crossedOut || false,
        };
        this._buffer[y][x] = makeCell(ch, attr);
        this.term.markRowDirty(this._y + y);
    }

}
