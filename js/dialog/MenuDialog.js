import { Dialog } from './Dialog.js';
import { _writeStr } from './write.js';
import { centeredDialogPos } from './position.js';

export class MenuDialog extends Dialog {
    constructor(term, items, opts) {
        const width = opts.width || 44;
        const visibleCount = opts.visibleCount || 5;
        const h = visibleCount + 6;
        const pos = centeredDialogPos(term, width, h);

        super(term, { ...opts, width, x: opts.x != null ? opts.x : pos.x, y: opts.y != null ? opts.y : Math.max(0, pos.y - 1) });

        this.h = h;
        this.items = items;
        this.visibleCount = visibleCount;
        this.selected = 0;
        this.scrollOffset = 0;
        this._onSelect = opts.onSelect || (() => {});
        this._onCancel = opts.onCancel || (() => {});
    }

    _renderContent() {
        for (let i = 0; i < this.visibleCount; i++) {
            const idx = this.scrollOffset + i;
            const r = 3 + i;
            if (idx < this.items.length) {
                this._drawItem(idx, r);
            } else {
                _writeStr(this._buffer, r, 0, '\│' + ' '.repeat(this.width - 3));
            }
        }
        this._drawScrollBar();
    }

    _drawItem(index, bufRow) {
        const item = this.items[index];
        const sel = index === this.selected;
        const contentWidth = this.width - 3;
        const namePadded = item.name.padEnd(10);
        const content = '  ' + namePadded + '  ' + item.desc;
        const bufW = this._bufWidth(content);
        const pad = contentWidth - bufW;

        let s = '\│';
        if (sel) s += '\x1B[7m\x1B[1m';
        s += content + ' '.repeat(Math.max(0, pad));
        if (sel) s += '\x1B[0m';
        _writeStr(this._buffer, bufRow, 0, s, this.width);
    }

    _drawScrollBar() {
        const total = this.items.length;
        const visible = this.visibleCount;
        const offset = this.scrollOffset;
        const startRow = 3;
        const col = this.width - 2;

        if (total <= visible) {
            for (let i = 0; i < visible; i++) {
                _writeStr(this._buffer, startRow + i, col, ' \│', this.width);
            }
            return;
        }

        const maxOffset = total - visible;
        const thumbRow = maxOffset > 0 ? Math.round((offset / maxOffset) * (visible - 1)) : 0;

        for (let i = 0; i < visible; i++) {
            const idx = offset + i;
            if (idx >= total) {
                _writeStr(this._buffer, startRow + i, col, ' \│', this.width);
                continue;
            }
            const ch = (i === thumbRow) ? '\█' : '\░';
            _writeStr(this._buffer, startRow + i, col, ch + '\│', this.width);
        }
    }

    _onKey(data) {
        if (data.length > 1) {
            if (data === '\x1B[A') {
                if (this.selected > 0) {
                    this.selected--;
                    if (this.selected < this.scrollOffset) {
                        this.scrollOffset = this.selected;
                        this.refreshContent();
                    } else {
                        this._drawItem(this.selected, 3 + this.selected - this.scrollOffset);
                        this._drawItem(this.selected + 1, 3 + this.selected + 1 - this.scrollOffset);
                        this._drawScrollBar();
                        this._markDirty();
                    }
                }
                return;
            }
            if (data === '\x1B[B') {
                if (this.selected < this.items.length - 1) {
                    this.selected++;
                    if (this.selected >= this.scrollOffset + this.visibleCount) {
                        this.scrollOffset = this.selected - this.visibleCount + 1;
                        this.refreshContent();
                    } else {
                        this._drawItem(this.selected - 1, 3 + this.selected - 1 - this.scrollOffset);
                        this._drawItem(this.selected, 3 + this.selected - this.scrollOffset);
                        this._drawScrollBar();
                        this._markDirty();
                    }
                }
                return;
            }
            return;
        }

        const code = data.charCodeAt(0);
        if (code === 0x0D || code === 0x0A) {
            const result = this._onSelect(this.items[this.selected]);
            if (result === 'close') return 'close';
            return;
        }
        if (code === 0x1B || code === 0x03) {
            this._onCancel();
            return 'close';
        }
    }
}
