import { CmdBase } from './CmdBase.js';
import { yellow, bold, white, green } from '../sgr.js';

export class Cowsay extends CmdBase {
    execute(args) {
        const text = args.join(' ') || 'Moo!';
        const len = text.length;
        const border = yellow('='.repeat(len + 2));
        const mid = yellow('< ') + bold(white(text)) + yellow(' >');
        const cow = green('        \\   ') + bold(white('^__^')) + green('\n') +
                   green('         \\  (') + bold(white('oo')) + green(')\\_______\n') +
                   green('            (__)\\       )\\/\\\n') +
                   green('                ||----') + yellow('w') + green(' |\n') +
                   green('                ||     ||') + '\n';
        this.print(' ' + border + '\n' + mid + '\n' + ' ' + border + '\n' + cow);
    }
    static get commandName() { return 'cowsay'; }
    static get help() { return 'Let a cow speak'; }
    static get menu() { return 'Talking Cow'; }
}
