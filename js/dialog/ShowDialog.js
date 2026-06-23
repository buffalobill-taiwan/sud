import { Dialog } from './Dialog.js';

export class ShowDialog extends Dialog {
    constructor(term, opts) {
        super(term, Object.assign({ width: 40, footer: 'ESC to back', title: null }, opts));
        this.message = opts.message || '';
        this._lines = this.message.split('\n');
        const h = Math.max(4, this._lines.length + 4);
        this.h = h;
        this.x = opts.x != null ? opts.x : Math.floor((term.cols - this.width) / 2);
        this.y = opts.y != null ? opts.y : Math.floor((term.rows - h) / 2);
        this._onExit = opts.onExit || null;
    }

    _renderContent() {
        for (let i = 0; i < this._lines.length; i++) {
            this._centerRow(1 + i, this._lines[i]);
        }
    }

    _onKey(data) {
        if (data.length !== 1) return;
        const code = data.charCodeAt(0);
        if (code === 0x1B || code === 0x03 || code === 0x0D || code === 0x0A) {
            if (this._onExit) this._onExit();
            return 'close';
        }
    }
}
