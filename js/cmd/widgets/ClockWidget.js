import { WidgetBase } from '../WidgetBase.js';
import { formatTime } from '../../sgr.js';

export class ClockWidget extends WidgetBase {
    constructor(shell, opts = {}) {
        super(shell);
        this._w = 8;
        this._x = shell.term.cols - this._w;
        this._h = 1;
        this._bg = opts.bg != null ? opts.bg : 4;
        this._intervalId = null;
    }

    start() {
        super.start();
        this.draw();
        this._intervalId = setInterval(() => this.draw(), 1000);
    }

    stop() {
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
        super.stop();
    }

    draw() {
        const time = formatTime(new Date());
        for (let i = 0; i < this._w; i++) {
            this.putc(i, 0, time[i] || ' ', 7, this._bg);
        }
    }
}
