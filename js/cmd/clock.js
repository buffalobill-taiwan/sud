import { CmdBase } from './CmdBase.js';
import { ClockWidget } from './widgets/ClockWidget.js';

export class ClockCmd extends CmdBase {
    execute(args) {
        const term = this.term;
        term.write('\x1B[?25l');

        const widget = new ClockWidget(this.shell, { bg: 0 });
        widget._y = Math.min(term.curY, term.rows - 1);
        widget._x = 0;
        widget.start();
        widget.draw();

        this.shell._clockCleanup = () => {
            for (let r = 0; r < widget._h; r++)
                term.markRowDirty(widget._y + r);
            widget.stop();
            term.write('\r\n\x1B[?25h');
            this.shell.showPrompt();
        };
    }
    static get commandName() { return 'clock'; }
    static get help() { return 'Show live clock (ESC to exit)'; }
    static get menu() { return 'Live clock'; }
}
