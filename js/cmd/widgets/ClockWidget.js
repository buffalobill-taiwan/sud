import { WidgetBase } from '../WidgetBase.js';
import { formatTime } from '../../time.js';

export class ClockWidget extends WidgetBase {
    constructor(shell) {
        super(shell);
        this._x = shell.term.cols - 8;
        this._w = 8;
        this._h = 1;
        this._intervalId = null;
    }

    start() {
        super.start();
        this.draw();
        this._intervalId = setInterval(() => {
            if (!this.shell.stateStack.isCovered(this._y)) {
                this.draw();
            }
        }, 1000);
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
            this.putc(i, 0, time[i] || ' ', 7, 4);
        }
    }
}