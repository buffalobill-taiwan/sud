import { CmdBase } from './CmdBase.js';
import { DVDWidget } from './widgets/DVDWidget.js';

export class DvdCmd extends CmdBase {
    execute(args) {
        if (this._dvd) {
            this.shell._savedPositions['dvd-widget'] = { x: this._dvd._x, y: this._dvd._y };
            this._dvd.stop();
            this._dvd = null;
            this.shell.print('DVD stopped\n');
            return;
        }
        this._dvd = new DVDWidget(this.shell);
        const saved = this.shell._savedPositions['dvd-widget'];
        if (saved) {
            this._dvd._x = saved.x;
            this._dvd._y = saved.y;
        }
        this._dvd.start();
        this.shell.print('DVD started\n');
    }

    static get commandName() { return 'dvd'; }
    static get help() { return 'Toggle DVD bouncing logo'; }
    static get menu() { return 'DVD bouncing logo (screen saver)'; }
}
