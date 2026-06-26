import { CmdBase } from './CmdBase.js';

export class Sleep extends CmdBase {
    execute(args) {
        const seconds = args.length > 0 ? parseFloat(args[0]) : 1;
        if (isNaN(seconds) || seconds < 0) {
            this.error('invalid number');
            return;
        }
        const gen = this.shell._abortGeneration;
        this.shell._busy = true;
        setTimeout(() => {
            if (gen !== this.shell._abortGeneration) return;
            this.shell._busy = false;
            this.shell._tick();
        }, seconds * 1000);
    }
    static get commandName() { return 'sleep'; }
    static get help() { return 'Wait for N seconds (default 1)'; }
    static get menu() { return null; }
    static get usage() { return 'sleep [seconds]'; }
}
