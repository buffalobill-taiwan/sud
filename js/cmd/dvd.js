import { CmdBase } from './CmdBase.js';
import { DVDWidget } from './widgets/DVDWidget.js';

export class DvdCmd extends CmdBase {
    execute(args) {
        if (this._dvd) {
            this.system.widgetManager.remove(this._dvd);
            this._dvd = null;
            this.print('DVD stopped\n');
            return;
        }
        this._dvd = new DVDWidget(this.term);
        this.system.widgetManager.add(this._dvd);
        this.print('DVD started\n');
    }

    static get commandName() { return 'dvd'; }
    static get help() { return 'Toggle DVD bouncing logo'; }
    static get menu() { return 'DVD bouncing logo (screen saver)'; }
}
