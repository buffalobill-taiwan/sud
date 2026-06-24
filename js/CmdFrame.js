export class CmdFrame {
    constructor(shell) {
        this.shell = shell;
        this.term = shell.term;
        this.done = false;
        this.started = false;
    }

    start() {}
    get blocked() { return false; }
    handleInput(data) { return false; }

    finish() {
        if (this.done) return;
        this.done = true;
    }
}

export class SyncCmdFrame extends CmdFrame {
    constructor(shell, cmdName, args) {
        super(shell);
        this.cmdName = cmdName;
        this.args = args;
        this._asyncPending = false;
    }

    start() {
        const handler = this.shell.commands[this.cmdName];
        if (handler) {
            const result = handler(this.args);
            if (result instanceof Promise) {
                this._asyncPending = true;
                result.then(() => {
                    this._asyncPending = false;
                    this.shell._tick();
                });
                return;
            }
        }
        if (!this.blocked) this.finish();
    }

    get blocked() {
        if (!this.started || this.done) return false;
        return this._asyncPending || this.shell.typewriter.isActive() || this.shell._busy;
    }
}

export class DialogFrame extends CmdFrame {
    constructor(shell, dialog) {
        super(shell);
        this.dialog = dialog;
    }

    handleInput(data) {
        this.dialog.handleKey(data);
        if (this.dialog.closed) this.finish();
        return true;
    }

    get blocked() {
        return !this.dialog.closed;
    }
}
