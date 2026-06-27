import { CmdBase } from './CmdBase.js';

export class Flash extends CmdBase {
    execute(args) {
        this._flashGen = this.abortGeneration;
        const p = this.parseArgs(args);
        const border = p.flag('--border', '-b');
        const count = p.rest.length > 0 ? parseInt(p.rest[0], 10) : 1;
        if (isNaN(count) || count < 1) {
            this.error('invalid count');
            return;
        }

        if (border) {
            const screen = this.term.container;
            if (!screen) return;

            const cw = this.term.charWidth;
            const ch = this.term.charHeight;

            let el = screen.querySelector('.smallflash-overlay');
            if (!el) {
                el = document.createElement('div');
                el.className = 'smallflash-overlay';
                screen.appendChild(el);
            }
            el.style.borderTopWidth = ch + 'px';
            el.style.borderBottomWidth = ch + 'px';
            el.style.borderLeftWidth = cw + 'px';
            el.style.borderRightWidth = cw + 'px';

            this.holdBusy();
            this._flash(el, count);
        } else {
            const wrapper = document.getElementById('terminal-wrapper');
            if (!wrapper) return;

            let el = wrapper.querySelector('.flash-overlay');
            if (!el) {
                el = document.createElement('div');
                el.className = 'flash-overlay';
                wrapper.appendChild(el);
            }

            this.holdBusy();
            this._flash(el, count);
        }
    }

    _flash(el, remaining) {
        if (this._flashGen !== this.abortGeneration) return;
        el.classList.add('active');
        setTimeout(() => {
            if (this._flashGen !== this.abortGeneration) return;
            el.classList.remove('active');
            if (remaining > 1) {
                setTimeout(() => this._flash(el, remaining - 1), 100);
            } else {
                this.releaseBusy();
            }
        }, 60);
    }

    static get commandName() { return 'flash'; }
    static get help() { return 'Flash screen N times (default 1). --border for border flash.'; }
    static get menu() { return 'Flash the screen'; }
    static get usage() { return 'flash [--border] [count]'; }
}
