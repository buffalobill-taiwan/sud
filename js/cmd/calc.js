import { CmdBase } from './CmdBase.js';
import { safeEval } from '../calc-expr.js';

export class Calc extends CmdBase {
    execute(args) {
        const p = this.parseArgs(args);
        if (p.hasHelp) return this.showHelp();
        const expr = p.rest.join(' ');
        if (!expr) return this.error('no expression provided');
        try {
            const result = safeEval(expr);
            this.print(result + '\n');
        } catch (e) {
            this.error('invalid expression');
        }
    }
    static get commandName() { return 'calc'; }
    static get help() { return 'Simple calculator'; }
    static get menu() { return 'Simple Calculator'; }
    static get usage() { return 'calc <expression>'; }
}
