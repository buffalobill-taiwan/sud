import { CmdBase } from './CmdBase.js';

export class ClockCmd extends CmdBase {
    execute(args) {
        this.shell.clockMode();
    }
    static get commandName() { return 'clock'; }
    static get help() { return 'Show live clock (ESC to exit)'; }
    static get menu() { return 'Live clock'; }
}
