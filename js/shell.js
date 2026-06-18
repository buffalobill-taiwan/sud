class DemoShell {
    constructor(term) {
        this.term = term;
        this.line = '';
        this.prompt = '$ ';
        this.promptShown = false;
        this.running = false;
        this.history = [];
        this.historyPos = -1;
        this.stateStack = new StateStack(this.term);
        this.activeDialog = null;
        this.menuDialog = null;
        this._pendingAction = null;

        this.menuItems = [
            { name: 'neofetch', desc: 'System Information' },
            { name: 'fortune',  desc: 'Random Fortune' },
            { name: 'date',     desc: 'Current Date/Time' },
            { name: 'cowsay',   desc: 'Talking Cow' },
            { name: 'whoami',   desc: 'Show User' },
            { name: 'ascii',    desc: 'ANSI Color Chart' },
            { name: 'uname',    desc: 'System Name' },
            { name: 'clear',    desc: 'Clear Screen' },
            { name: 'calc',     desc: 'Simple Calculator' },
            { name: 'help',     desc: 'Available Commands' },
        ];

        this.commands = {
            help: () => {
                this.print('\x1B[1;33mAvailable commands:\x1B[0m\n');
                this.print('  help       Show this help\n');
                this.print('  menu       Open command menu\n');
                this.print('  clear      Clear the screen\n');
                this.print('  echo       Echo text\n');
                this.print('  date       Show current date/time\n');
                this.print('  uname      Show system info\n');
                this.print('  neofetch   Show system information\n');
                this.print('  cowsay     Let a cow speak\n');
                this.print('  ascii      Show ANSI color chart\n');
                this.print('  fortune    Show a fortune\n');
                this.print('  calc       Simple calculator\n');
                this.print('  exit       Exit (just for fun)\n');
                this.print('  whoami     Show user\n');
            },
            clear: () => {
                this.term.write('\x1B[2J\x1B[H');
            },
            echo: (args) => {
                this.print(args.join(' ') + '\n');
            },
            date: () => {
                this.print(new Date().toString() + '\n');
            },
            uname: () => {
                this.print('OpenCode Terminal v1.0.0\n');
            },
            neofetch: () => {
                this.print('\x1B[1;36m  OpenCodeTerm\x1B[0m\n');
                this.print('\x1B[1;34m  -----------\x1B[0m\n');
                this.print('  OS:     HTML5 + CSS3 + ES2024\n');
                this.print('  Host:   Web Browser\n');
                this.print('  Font:   Unifont 8x16\n');
                this.print('  Shell:  DemoShell v1.0\n');
                this.print('  Theme:  Green on Black\n');
            },
            cowsay: (args) => {
                const text = args.join(' ') || 'Moo!';
                const len = text.length;
                const border = '\x1B[33m' + '='.repeat(len + 2) + '\x1B[0m';
                const top = '  ' + border;
                const mid = '\x1B[33m< \x1B[1;37m' + text + '\x1B[0m \x1B[33m>\x1B[0m';
                const bot = '  ' + border;
                const cow = '\x1B[32m        \\   \x1B[1;37m^__^\x1B[0m\x1B[32m\n' +
                           '         \\  (\x1B[1;37moo\x1B[0m\x1B[32m)\\_______\n' +
                           '            (__)\\       )\\/\\\n' +
                           '                ||----\x1B[33mw\x1B[0m\x1B[32m |\n' +
                           '                ||     ||\x1B[0m\n';
                this.print(top + '\n' + mid + '\n' + bot + '\n' + cow);
            },
            ascii: () => {
                this.print('\x1B[1mStandard 16 ANSI Colors:\x1B[0m\n');
                for (let bg = 0; bg < 16; bg++) {
                    this.print('\x1B[48;5;' + bg + 'm  \x1B[0m');
                    if (bg % 8 === 7) this.print('\n');
                }
                this.print('\n\x1B[1mColor Cube (sample):\x1B[0m\n');
                for (let g = 0; g < 6; g++) {
                    for (let r = 0; r < 6; r++) {
                        const c = 16 + r + g * 36;
                        this.print('\x1B[48;5;' + c + 'm  \x1B[0m');
                    }
                    this.print('  ');
                    for (let b = 0; b < 6; b++) {
                        const c = 16 + b * 6 + g;
                        this.print('\x1B[48;5;' + c + 'm  \x1B[0m');
                    }
                    this.print('\n');
                }
            },
            fortune: () => {
                const fortunes = [
                    'A terminal emulator is never late, nor is it early.\nIt renders precisely when it means to.',
                    '42 is the answer. But what was the question again?',
                    'The Endless Loop: n.; see Loop, Endless.\nLoop, Endless: n.; see Endless Loop.',
                    'In a world of GUIs, be a terminal.',
                    'There is no place like ~',
                    'Have you tried turning it off and on again?',
                    '> make me a sandwich\n  What? I don\'t know how to make a sandwich.\n  > sudo make me a sandwich\n  Okay.',
                    'A journey of a thousand miles begins with\na single step. Or a single keystroke.',
                ];
                this.print(fortunes[Math.floor(Math.random() * fortunes.length)] + '\n');
            },
            calc: (args) => {
                try {
                    const expr = args.join(' ');
                    const result = Function('"use strict"; return (' + expr + ')')();
                    this.print(String(result) + '\n');
                } catch (e) {
                    this.print('Error: invalid expression\n');
                }
            },
            exit: () => {
                this.print('Goodbye!\n');
            },
            whoami: () => {
                this.print('user\n');
            },
            menu: () => this._menuCmd(),
        };

        this.start();
    }

    start() {
        this.running = true;
        this.term.write('\x1B[2J\x1B[H');
        this.term.write('\x1B[1;32mOpenCode Terminal v1.0.0\x1B[0m\n');
        this.term.write('Type \x1B[33mhelp\x1B[0m for available commands.\n\n');
        this.term.write('\x1B[90m日本語テスト漢字常用字非常用擴充字\x1B[0m');
        this.term.write('  \x1B[90m\u2200\u2600\u2665\u2713\x1B[0m\n\n');
        this.showPrompt();
    }

    showPrompt() {
        this.term.write(this.prompt);
        this.promptShown = true;
        this.line = '';
        this.historyPos = -1;
    }

    _isWide(ch) {
        const code = ch.charCodeAt ? ch.charCodeAt(0) : ch;

        if (code >= 0x1100) {
            if (code <= 0x11FF) return true;
            if (code >= 0x2E80 && code <= 0x9FFF) return true;
            if (code >= 0xAC00 && code <= 0xD7AF) return true;
            if (code >= 0xF900 && code <= 0xFAFF) return true;
            if (code >= 0xFE10 && code <= 0xFE19) return true;
            if (code >= 0xFE30 && code <= 0xFE6F) return true;
            if (code >= 0xFF01 && code <= 0xFF60) return true;
            if (code >= 0xFFE0 && code <= 0xFFE6) return true;
            if (code >= 0x20000 && code <= 0x2FFFF) return true;
            if (code >= 0x30000 && code <= 0x3FFFF) return true;
        }

        if (code < 0x100) return false;

        if (code >= 0x2190 && code <= 0x21FF) return false;
        if (code >= 0x2300 && code <= 0x23FF) return false;
        if (code >= 0x2500 && code <= 0x25FF) return false;

        if (!this._canv) {
            this._canv = document.createElement('canvas');
            this._ctx = this._canv.getContext('2d');
            this._ctx.font = '16px UnifontTerm, monospace';
        }
        const w = this._ctx.measureText(ch).width;
        return w > 10;
    }

    handleInput(data) {
        if (!this.running) return;

        if (this.activeDialog && !this.activeDialog.closed) {
            this.activeDialog.handleKey(data);
            if (this.activeDialog && this.activeDialog.closed) {
                this.activeDialog = null;
            }
            if (this._pendingAction) {
                const a = this._pendingAction;
                this._pendingAction = null;
                if (a.type === 'close-chain') {
                    if (this.menuDialog && !this.menuDialog.closed) this.menuDialog.close();
                    this.menuDialog = null;
                    this.activeDialog = null;
                    this.commands[a.cmd](a.args);
                } else if (a.type === 'exec') {
                    this.menuDialog = null;
                    this.commands[a.cmd](a.args);
                }
            }
            if (!this.activeDialog) this.showPrompt();
            return;
        }

        for (let i = 0; i < data.length; i++) {
            const ch = data[i];
            const code = ch.charCodeAt ? ch.charCodeAt(0) : ch;

            if (code === 0x03) {
                this.term.write('^C\n');
                this.showPrompt();
                continue;
            }

            if (code === 0x04) {
                if (this.line.length === 0) {
                    this.term.write('exit\n');
                    this.showPrompt();
                }
                continue;
            }

            if (code === 0x0C) {
                this.term.write('\x1B[2J\x1B[H');
                this.term.write(this.prompt + this.line);
                continue;
            }

            if (code === 0x0D || code === 0x0A) {
                this.term.write('\r\n');
                this.execute(this.line);
                if (!this.activeDialog) this.showPrompt();
                continue;
            }

            if (code === 0x7F || code === 0x08) {
                if (this.line.length > 0) {
                    const last = this.line[this.line.length - 1];
                    const w = this._isWide(last) ? 2 : 1;
                    this.line = this.line.slice(0, -1);
                    this.term.write('\b'.repeat(w) + ' '.repeat(w) + '\b'.repeat(w));
                }
                continue;
            }

            if (code === 0x09) {
                const completions = Object.keys(this.commands).filter(cmd => cmd.startsWith(this.line));
                if (completions.length === 1) {
                    const rest = completions[0].slice(this.line.length);
                    this.line = completions[0];
                    this.term.write(rest);
                } else if (completions.length > 1) {
                    this.term.write('\r\n');
                    this.term.write(completions.join('  ') + '\n');
                    this.term.write(this.prompt + this.line);
                }
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
                        continue;
                    }
                    if (seq === '\x1B[C' || seq === '\x1B[D') {
                        i += 2;
                        continue;
                    }
                }
                continue;
            }

            if (code >= 0x20) {
                this.line += ch;
                this.term.write(ch);
            }
        }
    }

    execute(line) {
        const trimmed = line.trim();
        if (trimmed.length === 0) return;
        this.history.push(trimmed);
        if (this.history.length > 100) this.history.shift();

        const parts = trimmed.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
        const cmd = parts[0] ? parts[0].toLowerCase() : '';
        const args = parts.slice(1).map(a => a.replace(/^"(.*)"$/, '$1'));

        const handler = this.commands[cmd];
        if (handler) {
            handler(args);
        } else {
            this.print('\x1B[91mCommand not found: ' + cmd + '\x1B[0m\n');
            this.print('Try \x1B[33mhelp\x1B[0m.\n');
        }
    }

    print(text) {
        this.term.write(text);
    }

    _menuCmd() {
        const menuDlg = new MenuDialog(this.term, this.menuItems, {
            width: 44,
            title: 'Command Menu',
            footer: '\u2191\u2193 Navigate  \u21A9 Execute  ESC Quit',
            visibleCount: 5,
            stack: this.stateStack,
            onSelect: (item) => {
                if (item.name === 'calc') {
                    const inputDlg = new InputDialog(this.term, {
                        title: '\u8ACB\u8F38\u5165\u7B97\u5F0F',
                        prompt: '\u7B97\u5F0F\uFF1A',
                        footer: 'Enter Confirm  ESC Back',
                        stack: this.stateStack,
                        onConfirm: (expr) => {
                            this._pendingAction = { type: 'close-chain', cmd: 'calc', args: [expr] };
                        },
                        onCancel: () => {
                            this.activeDialog = menuDlg;
                        }
                    });
                    this.activeDialog = inputDlg;
                    inputDlg.open();
                    return;
                }
                this._pendingAction = { type: 'exec', cmd: item.name, args: [] };
                return 'close';
            },
            onCancel: () => {
                this._pendingAction = null;
            }
        });
        this.activeDialog = menuDlg;
        this.menuDialog = menuDlg;
        menuDlg.open();
    }
}
