import { CmdBase } from './CmdBase.js';

export class ShellCmd extends CmdBase {
    static get commandName() { return 'shell'; }
    static get help() { return null; }
    static get menu() { return null; }

    start() {
        this.open();
    }

    handleKey(data) {
        this.system.editor.handleKey(data);
        return true;
    }

    showPrompt() {
        const s = this.system;
        s.term.write(s.prompt);
        s.editor.reset();
        s.flushQueuedInput();
    }

    close() {}

    onCancel() {
        this.system.term.write('^C\n');
        this.showPrompt();
    }
}
