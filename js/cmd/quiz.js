import { CmdBase } from './CmdBase.js';
import { cyan, bold, green, red, white } from '../sgr.js';

export class Quiz extends CmdBase {
    execute(args) {
        let a = Math.floor(Math.random() * 9) + 1;
        let b = Math.floor(Math.random() * 9) + 1;
        const ops = ['+', '-', '\×'];
        const op = ops[Math.floor(Math.random() * 3)];
        if (op === '-' && a < b) [a, b] = [b, a];
        const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;

        this.print(cyan(a + ' ' + op + ' ' + b + ' = ?') + '\n');

        this.readLine((line) => {
            const userAns = parseInt(line, 10);
            if (userAns === answer) {
                this.print(bold(green('\✓ Correct!')) + '\n');
            } else {
                this.print(bold(red('\✗ Wrong!')) + '  Answer: ' + bold(white(answer)) + '\n');
            }
        });
    }

    static get commandName() { return 'quiz'; }
    static get help() { return 'Math quiz'; }
    static get menu() { return 'Math Quiz'; }
}
