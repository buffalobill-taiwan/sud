import { SystemManager } from '../../system.js';
import { WidgetBase } from '../WidgetBase.js';

export class DVDWidget extends WidgetBase {
    constructor() {
        super();
        this._w = 7;
        this._h = 3;
        const term = SystemManager.instance.term;
        const cols = term.cols;
        const rows = term.rows;
        this._vy = 1;
        this._vx = 1;
        this._bg = 0;
        this._fg = 3;
        this._intervalId = null;
        this._x = Math.floor((cols - this._w) / 2);
        this._y = Math.floor((rows - this._h) / 2);
    }

    start() {
        super.start();
        this.draw();
        this._intervalId = setInterval(() => this._tick(), 120);
    }

    stop() {
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
        super.stop();
    }

    _tick() {
        const term = SystemManager.instance.term;
        const cols = term.cols;
        const rows = term.rows;
        this._x += this._vx;
        this._y += this._vy;
        if (this._x + this._w >= cols) { this._x = cols - this._w; this._vx = -this._vx; this._fg = Math.floor(Math.random() * 7) + 1; }
        if (this._x <= 0) { this._x = 0; this._vx = -this._vx; this._fg = Math.floor(Math.random() * 7) + 1; }
        if (this._y + this._h >= rows) { this._y = rows - this._h; this._vy = -this._vy; this._fg = Math.floor(Math.random() * 7) + 1; }
        if (this._y <= 0) { this._y = 0; this._vy = -this._vy; this._fg = Math.floor(Math.random() * 7) + 1; }
        this.setPosition(this._x, this._y);
        this.draw();
    }

    draw() {
        const logo = [
            ['D', 'V', 'D'],
            [' ', 'L', 'o'],
            ['g', 'o', '!'],
        ];
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                this.putc(c + 2, r, logo[r][c], this._fg, this._bg);
            }
        }
    }
}
