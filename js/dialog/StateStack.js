import { CURSOR_HIDE, CURSOR_SHOW } from '../sgr.js';

export class StateStack {
    constructor(term) {
        this.term = term;
        this._stack = [];
        this._restoreHooks = [];
    }

    addRestoreHook(fn) {
        this._restoreHooks.push(fn);
    }

    removeRestoreHook(fn) {
        const i = this._restoreHooks.indexOf(fn);
        if (i >= 0) this._restoreHooks.splice(i, 1);
    }

    push(y, h) {
        this._stack.push({
            y, h,
            cursor: { x: this.term.curX, y: this.term.curY },
            cursorHidden: this.term.cursorHidden,
        });
        this.term.cursorHidden = true;
        this.term.write(CURSOR_HIDE);
    }

    pop() {
        const state = this._stack.pop();
        if (!state) return;
        this.term.cursorHidden = state.cursorHidden;
        this.term.write(state.cursorHidden ? CURSOR_HIDE : CURSOR_SHOW);
        this.term.curX = state.cursor.x;
        this.term.curY = state.cursor.y;
        for (const fn of this._restoreHooks) fn();
    }
}
