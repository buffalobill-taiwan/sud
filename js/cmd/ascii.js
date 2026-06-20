import { CmdBase } from './CmdBase.js';

export class Ascii extends CmdBase {
    execute(args) {
        this.print('\x1B[1mStandard 16 ANSI Colors:\x1B[0m\n');
        for (let bg = 0; bg < 16; bg++) {
            this.print('\x1B[48;5;' + bg + 'm  \x1B[0m');
            if (bg % 8 === 7) this.print('\n');
        }
        this.print('\n\x1B[1mColor Cube 6\u00D76\u00D76 (\u2584 bg=G\u2081 fg=G\u2092, B=0..5):\x1B[0m\n');
        for (let g = 0; g < 6; g += 2) {
            this.print('\x1B[90m' + g + '-' + (g + 1) + '\x1B[0m ');
            for (let b = 0; b < 6; b++) {
                this.print('\x1B[90m' + b + '\x1B[0m');
                for (let r = 0; r < 6; r++) {
                    const top = 16 + r + g * 36 + b * 6;
                    const bot = 16 + r + (g + 1) * 36 + b * 6;
                    this.print('\x1B[38;5;' + bot + 'm\x1B[48;5;' + top + 'm\u2584\x1B[0m');
                }
            }
            this.print('\n');
        }
    }
    static get commandName() { return 'ascii'; }
    static get help() { return 'Show ANSI color chart'; }
    static get menu() { return 'ANSI Color Chart'; }
}
