/**
 * LineEditor — command line editing with history, tab completion,
 * and basic linewise key handling.
 *
 * Does NOT own the terminal output directly — writes through a `term`
 * reference and calls back `onExecute` / `onShowPrompt`.
 */

export class LineEditor {
    constructor(term, callbacks = {}) {
        this.term = term;
        this._onExecute = callbacks.onExecute || (() => {});
        this._onShowPrompt = callbacks.onShowPrompt || (() => {});

        this.line = '';
        this.history = [];
        this.historyPos = -1;
        this._commands = [];
        this._prompt = '$ ';
    }

    /** Provide command name list for tab completion. */
    setCommands(names) {
        this._commands = names;
    }

    /** Set prompt string (for Ctrl+L redisplay). */
    setPrompt(text) {
        this._prompt = text;
    }

    /** Reset line buffer (e.g. after showing prompt). */
    reset() {
        this.line = '';
        this.historyPos = -1;
    }

    /**
     * Process a data string of key events.
     * Returns true if any key was consumed.
     */
    handleKey(data) {
        let consumed = false;
        for (let i = 0; i < data.length; i++) {
            const ch = data[i];
            const code = ch.charCodeAt ? ch.charCodeAt(0) : ch;

            if (code === 0x03) {
                this.term.write('^C\n');
                this._onShowPrompt();
                consumed = true;
                continue;
            }

            if (code === 0x04) {
                if (this.line.length === 0) {
                    this.term.write('exit\n');
                    this._onShowPrompt();
                }
                consumed = true;
                continue;
            }

            if (code === 0x0C) {
                this.term.write('\x1B[2J\x1B[H');
                this.term.write(this._promptText + this.line);
                consumed = true;
                continue;
            }

            if (code === 0x0D || code === 0x0A) {
                this.term.write('\r\n');
                this._onExecute(this.line);
                this.line = '';
                consumed = true;
                continue;
            }

            if (code === 0x7F || code === 0x08) {
                if (this.line.length > 0) {
                    const last = this.line[this.line.length - 1];
                    const w = this.term.isWide(last) ? 2 : 1;
                    this.line = this.line.slice(0, -1);
                    this.term.write('\b'.repeat(w) + ' '.repeat(w) + '\b'.repeat(w));
                }
                consumed = true;
                continue;
            }

            if (code === 0x09) {
                const completions = this._commands.filter(cmd => cmd.startsWith(this.line));
                if (completions.length === 1) {
                    const rest = completions[0].slice(this.line.length);
                    this.line = completions[0];
                    this.term.write(rest);
                } else if (completions.length > 1) {
                    this.term.write('\r\n');
                    this.term.write(completions.join('  ') + '\n');
                    this.term.write(this._promptText + this.line);
                }
                consumed = true;
                continue;
            }

            if (code === 0x1B) {
                if (data[i + 1] === '[' || data[i + 1] === 'O') {
                    const seq = data.slice(i, i + 3);
                    if (seq === '\x1B[A') {
                        if (this.history.length > 0) {
                            if (this.historyPos === -1) this.historyPos = this.history.length - 1;
                            else if (this.historyPos > 0) this.historyPos--;
                            const newLine = this.history[this.historyPos];
                            const diff = this.line.length;
                            this.term.write('\b \b'.repeat(diff));
                            this.line = newLine;
                            this.term.write(newLine);
                        }
                        i += 2;
                        consumed = true;
                        continue;
                    }
                    if (seq === '\x1B[B') {
                        if (this.historyPos >= 0) {
                            this.historyPos++;
                            const diff = this.line.length;
                            this.term.write('\b \b'.repeat(diff));
                            if (this.historyPos >= this.history.length) {
                                this.line = '';
                                this.historyPos = -1;
                            } else {
                                this.line = this.history[this.historyPos];
                                this.term.write(this.line);
                            }
                        }
                        i += 2;
                        consumed = true;
                        continue;
                    }
                    if (seq === '\x1B[C' || seq === '\x1B[D') {
                        i += 2;
                        consumed = true;
                        continue;
                    }
                }
                consumed = true;
                continue;
            }

            if (code >= 0x20) {
                this.line += ch;
                this.term.write(ch);
                consumed = true;
            }
        }
        return consumed;
    }

    get _promptText() {
        return '$ ';
    }
}
