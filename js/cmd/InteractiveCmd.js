import { CmdBase } from './CmdBase.js';
import { red } from '../sgr.js';

export class InteractiveCmd extends CmdBase {
    constructor(shell) {
        super(shell);
        this.closed = true;
        this.isTyping = false;
        this.inHandleKey = false;
        this._cbSession = 0;
    }

    open() {
        this.closed = false;
        this.shell.activeDialog = this;
        this.term.write('\x1B[?25l');
    }

    close() {
        this.closed = true;
        this.term.write('\x1B[?25h');
        if (!this.inHandleKey) {
            if (this.shell.activeDialog === this) {
                this.shell.activeDialog = null;
            }
            this.shell._schedulePrompt();
        }
    }

    onCancel() {
        this.close();
    }

    printThen(text, callback) {
        this._cbSession++;
        const session = this._cbSession;
        this.print(text);
        const cb = () => {
            this.shell.typewriter.removeOnDrain(cb);
            if (this.closed || session !== this._cbSession) return;
            callback();
        };
        this.shell.typewriter.onDrain(cb);
    }

    handleKey(data) {
        if (this.closed) return;
        this.inHandleKey = true;
        try {
            this._handleKey(data);
        } finally {
            this.inHandleKey = false;
        }
    }

    _handleKey(data) {
        if (data.charCodeAt(0) === 0x03) {
            this._selectState = null;
            if (this.shell.typewriter.isActive()) {
                this.shell.typewriter.dispose();
            }
            this.onCancel();
            return;
        }
        if (this.isTyping) {
            if (this.shell.typewriter.isActive()) {
                this.shell.typewriter.abort();
            }
            return;
        }
        if (this._selectState) {
            this._handleSelectKey(data);
            return;
        }
        this._onKey(data);
    }

    _onKey(data) {}

    select(opts) {
        this._selectState = {
            options: opts.options,
            render: opts.render,
            move: opts.move,
            onPick: opts.onPick,
            onCancel: opts.onCancel || null,
            term: this.term,
            selected: 0,
        };
        this.isTyping = true;
        this.printThen(opts.text || '', () => {
            this.isTyping = false;
            opts.render(0, opts.options, this.term);
        });
    }

    _handleSelectKey(data) {
        const ss = this._selectState;
        if (data.length === 1 && data.charCodeAt(0) === 0x1B) {
            this._selectState = null;
            (ss.onCancel || this.onCancel).call(this);
            return;
        }
        const code = data.charCodeAt(0);
        if (code === 0x0D || code === 0x0A) {
            this._selectState = null;
            ss.onPick(ss.selected);
            return;
        }
        const newIdx = ss.move(data, ss.selected, ss.options.length);
        if (newIdx !== ss.selected) {
            ss.selected = Math.max(0, Math.min(ss.options.length - 1, newIdx));
            ss.render(ss.selected, ss.options, ss.term);
        }
    }

    ask(text, options, render, onPick) {
        if (typeof render === 'function' && !onPick) {
            onPick = render;
            render = null;
        }
        const r = render || defaultOptionRender;
        let scrollOffset = 0;
        this.select({
            text,
            options,
            render: (sel, opts, term) => r(sel, opts, scrollOffset, term),
            move: (data, cur, len) => {
                if (data === '\x1B[A') {
                    const newSel = Math.max(0, cur - 1);
                    if (newSel < scrollOffset) scrollOffset = newSel;
                    return newSel;
                }
                if (data === '\x1B[B') {
                    const newSel = Math.min(len - 1, cur + 1);
                    if (newSel >= scrollOffset + 5) scrollOffset = newSel - 4;
                    return newSel;
                }
                return cur;
            },
            onPick,
        });
    }

    prompt(text, onInput) {
        this.isTyping = true;
        this.printThen(text, () => {
            this.isTyping = false;
            this.shell.readLine(onInput);
        });
    }
}

function defaultOptionRender(selected, options, scrollOffset, term) {
    const h = 5;
    const start = Math.max(0, Math.min(scrollOffset, options.length - h));
    const end = Math.min(start + h, options.length);
    for (let i = start; i < end; i++) {
        const prefix = i === selected ? '\x1B[7m ▶ ' : '   ';
        const suffix = i === selected ? '\x1B[0m' : '';
        term.write('\r\n' + prefix + options[i] + suffix);
    }
}
