class ClockCmd extends CmdBase {
    execute(args) {
        this.shell._clockMode();
    }
    static get commandName() { return 'clock'; }
    static get help() { return 'Show live clock (ESC to exit)'; }
    static get menu() { return 'Live clock'; }
}
