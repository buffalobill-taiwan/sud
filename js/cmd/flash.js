import { CmdBase } from './CmdBase.js';

export class Flash extends CmdBase {
    execute(args) {
        const p = this.parseArgs(args);
        const border = p.flag('--border', '-b');
        const count = p.rest.length > 0 ? parseInt(p.rest[0], 10) : 1;
        if (isNaN(count) || count < 1) {
            this.error('invalid count');
            return;
        }
        if (border) {
            this.system.flashBorder(count);
        } else {
            this.system.flash(count);
        }
    }

    static get commandName() { return 'flash'; }
    static get help() { return 'Flash screen N times (default 1). --border for border flash.'; }
    static get menu() { return 'Flash the screen'; }
    static get usage() { return 'flash [--border] [count]'; }
}
