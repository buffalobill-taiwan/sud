import { CmdBase } from './CmdBase.js';

export class GoodbyeCmd extends CmdBase {
    execute(args) {
        this.print('Goodbye!\n');
    }
    static get commandName() { return 'goodbye'; }
    static get help() { return 'Say goodbye'; }
    static get menu() { return null; }
}
