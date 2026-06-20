/**
 * Terminal — thin coordinator composing Screen, Parser, and Renderer.
 *
 * Public API: write(), focus(), resize(), clearBuffer(),
 * scrollbackUp/Down(), lineFeed(), getRow/setRow(),
 * cursorHidden getter/setter, markAllDirty(), isWide().
 *
 * Callbacks: onData(data), onResize(cols, rows).
 */

import { Screen, XTERM_COLORS } from './Screen.js';
import { Parser } from './Parser.js';
import { Renderer } from './Renderer.js';

export { XTERM_COLORS };

export class Terminal {
    constructor(container, opts = {}) {
        this.onData = null;
        this.onResize = null;

        this.screen = new Screen(opts.cols || 80, opts.rows || 25);
        this.parser = new Parser(this.screen, {
            onSend: (data) => this._send(data),
        });
        this.renderer = new Renderer(container, this.screen, opts);
        this.container = container;

        this.textarea = document.getElementById('hidden-input');
        this._isComposing = false;
        this.mouseBtn = 0;
        this.mouseX = 0;
        this.mouseY = 0;

        this._bindEvents();
        this._initResizeListener();
        this.renderer.fitToViewport();

        if (!opts.noAutoRender) this.renderer.startRenderLoop();
    }

    // ── Delegated props ──

    get cols() { return this.screen.cols; }
    get rows() { return this.screen.rows; }
    get curX() { return this.screen.curX; }
    set curX(v) { this.screen.curX = v; }
    get curY() { return this.screen.curY; }
    set curY(v) { this.screen.curY = v; }
    get scrollTop() { return this.screen.scrollTop; }
    set scrollTop(v) { this.screen.scrollTop = v; }
    get scrollBottom() { return this.screen.scrollBottom; }
    set scrollBottom(v) { this.screen.scrollBottom = v; }
    get attr() { return this.screen.attr; }
    set attr(v) { this.screen.attr = v; }
    get modes() { return this.screen.modes; }
    get mouseMode() { return this.screen.mouseMode; }
    set mouseMode(v) { this.screen.mouseMode = v; }
    get viewOffset() { return this.screen.viewOffset; }
    set viewOffset(v) { this.screen.viewOffset = v; }
    get buffer() { return this.screen.buffer; }
    get scrollback() { return this.screen.scrollback; }
    get overlays() { return this.screen.overlays; }
    addOverlay(ov) { this.screen.addOverlay(ov); }
    removeOverlay(ov) { this.screen.removeOverlay(ov); }
    get charWidth() { return this.renderer.charWidth; }
    get charHeight() { return this.renderer.charHeight; }

    getRow(r) { return this.screen.getRow(r); }
    setRow(r, row) { this.screen.setRow(r, row); }
    get cursorHidden() { return this.screen.cursorHidden; }
    set cursorHidden(v) { this.screen.cursorHidden = v; }
    markAllDirty() { this.screen.markAllDirty(); }
    markRowDirty(r) { this.screen.markRowDirty(r); }
    isWide(ch) { return this.screen.isWide(ch); }

    write(data) { this.parser.write(data); }

    focus() {
        this.textarea.focus();
        this.textarea.value = '';
    }

    clearBuffer() { this.screen.clearBuffer(); }

    scrollbackUp(n) { this.screen.scrollbackUp(n); }
    scrollbackDown(n) { this.screen.scrollbackDown(n); }

    lineFeed() { this.screen.lineFeed(); }
    carriageReturn() { this.screen.carriageReturn(); }
    cursorUp(n) { this.screen.cursorUp(n); }
    cursorDown(n) { this.screen.cursorDown(n); }
    cursorForward(n) { this.screen.cursorForward(n); }
    cursorBack(n) { this.screen.cursorBack(n); }

    resize(cols, rows) {
        this.screen.resize(cols, rows);
        this.renderer.resizeDOM(cols, rows);
        if (this.onResize) this.onResize(cols, rows);
    }

    stopRenderLoop() { this.renderer.stopRenderLoop(); }

    // ── Input / events ──

    _send(data) {
        if (this.viewOffset > 0) {
            this.viewOffset = 0;
            this.screen.markAllDirty();
        }
        if (this.onData) this.onData(data);
    }

    _bindEvents() {
        this._keydownHandler = (e) => this._onKeyDown(e);
        this._beforeInputHandler = (e) => this._onBeforeInput(e);
        this._keyupHandler = (e) => this._onKeyUp(e);
        this._compStartHandler = () => { this._isComposing = true; };
        this._compEndHandler = (e) => this._onCompositionEnd(e);
        this._pasteHandler = (e) => this._onPaste(e);
        this._wheelHandler = (e) => this._onWheel(e);
        this._mouseDownHandler = (e) => this._onMouseDown(e);
        this._mouseUpHandler = (e) => this._onMouseUp(e);
        this._mouseMoveHandler = (e) => this._onMouseMove(e);
        this._contextHandler = (e) => e.preventDefault();

        document.addEventListener('keydown', this._keydownHandler);
        this.textarea.addEventListener('beforeinput', this._beforeInputHandler);
        document.addEventListener('keyup', this._keyupHandler);
        this.textarea.addEventListener('compositionstart', this._compStartHandler);
        this.textarea.addEventListener('compositionend', this._compEndHandler);
        this.textarea.addEventListener('paste', this._pasteHandler);
        this.container.addEventListener('wheel', this._wheelHandler, { passive: true });
        this.container.addEventListener('mousedown', this._mouseDownHandler);
        document.addEventListener('mouseup', this._mouseUpHandler);
        document.addEventListener('mousemove', this._mouseMoveHandler);
        this.container.addEventListener('contextmenu', this._contextHandler);
    }

    _onKeyDown(e) {
        if (!this.onData) return;
        if (this._isComposing || e.isComposing) return;
        if (e.ctrlKey && e.key === ' ') return;

        const key = e.key;
        const ctrl = e.ctrlKey || e.metaKey;
        const alt = e.altKey;
        const shift = e.shiftKey;

        if (ctrl && key === 'v') return;
        if (ctrl && alt && key === 'c') return;

        if ((ctrl && key === 'Insert') || (ctrl && shift && key.toLowerCase() === 'c')) {
            e.preventDefault();
            const sel = document.getSelection().toString();
            if (!sel) return;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(sel).catch(() => {});
            } else {
                const ta = document.createElement('textarea');
                ta.value = sel;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            return;
        }
        if ((shift && key === 'Insert') || (ctrl && shift && key.toLowerCase() === 'v')) {
            if (navigator.clipboard) {
                e.preventDefault();
                navigator.clipboard.readText().then(text => { if (text) this._send(text); }).catch(() => {});
            }
            return;
        }

        if (ctrl && !shift && key === 'c') { this._send('\x03'); e.preventDefault(); return; }
        if (ctrl && !shift && key === 'z') { this._send('\x1A'); e.preventDefault(); return; }
        if (ctrl && !shift && key === 'd') { this._send('\x04'); e.preventDefault(); return; }
        if (ctrl && !shift && key === 'a') { this._send('\x01'); e.preventDefault(); return; }
        if (ctrl && !shift && key === 'e') { this._send('\x05'); e.preventDefault(); return; }
        if (ctrl && !shift && key === 'l') { this._send('\x0C'); e.preventDefault(); return; }
        if (ctrl && !shift && key === 'u') { this._send('\x15'); e.preventDefault(); return; }
        if (ctrl && !shift && key === 'k') { this._send('\x0B'); e.preventDefault(); return; }
        if (ctrl && !shift && key === 'w') { this._send('\x17'); e.preventDefault(); return; }
        if (ctrl && !shift && key === 'r') { this._send('\x12'); e.preventDefault(); return; }
        if (ctrl && !shift && key === 'h') { this._send('\x08'); e.preventDefault(); return; }
        if (ctrl && !shift && key === 't') { this._send('\x14'); e.preventDefault(); return; }
        if (ctrl && !shift && key === 'y') { this._send('\x19'); e.preventDefault(); return; }
        if (ctrl && !shift && key === 'n') { this._send('\x0E'); e.preventDefault(); return; }
        if (ctrl && !shift && key === 'f') { this._send('\x06'); e.preventDefault(); return; }
        if (ctrl && !shift && key === 'b') { this._send('\x02'); e.preventDefault(); return; }
        if (ctrl && !shift && key === 'o') { this._send('\x0F'); e.preventDefault(); return; }
        if (ctrl && !shift && key === 'x') { this._send('\x18'); e.preventDefault(); return; }

        if (ctrl && key === 'Backspace') { this._send('\x08'); e.preventDefault(); return; }
        if (alt && key === 'Backspace') { this._send('\x1B\x7F'); e.preventDefault(); return; }
        if (alt && key === 'Enter') { this._send('\x1B\r'); e.preventDefault(); return; }

        if (key === 'Backspace') { this._send('\x7F'); e.preventDefault(); return; }
        if (key === 'Enter') { this._send('\r'); e.preventDefault(); return; }
        if (key === 'Tab') { this._send(shift ? '\x1B[Z' : '\t'); e.preventDefault(); return; }
        if (key === 'Escape') { this._send('\x1B'); e.preventDefault(); return; }

        let mod = 1;
        if (ctrl && shift && alt) mod = 8;
        else if (ctrl && alt) mod = 7;
        else if (ctrl && shift) mod = 6;
        else if (ctrl) mod = 5;
        else if (alt && shift) mod = 4;
        else if (alt) mod = 3;
        else if (shift) mod = 2;

        const navMap = { ArrowUp: 'A', ArrowDown: 'B', ArrowRight: 'C', ArrowLeft: 'D', Home: 'H', End: 'F' };
        const tildeMap = { Insert: '2', Delete: '3', PageUp: '5', PageDown: '6' };

        const dir = navMap[key];
        if (dir) {
            if (mod === 1) {
                const isAppCursor = key.startsWith('Arrow') && this.modes.applicationCursorKeys;
                this._send(isAppCursor ? '\x1BO' + dir : '\x1B[' + dir);
            } else {
                this._send(`\x1B[1;${mod}${dir}`);
            }
            e.preventDefault(); return;
        }

        const tilde = tildeMap[key];
        if (tilde) {
            this._send(mod === 1 ? `\x1B[${tilde}~` : `\x1B[${tilde};${mod}~`);
            e.preventDefault(); return;
        }

        if (key && key.length === 1 && !ctrl && !alt && !e.metaKey) {
            if (document.activeElement !== this.textarea) {
                this._send(key);
                e.preventDefault();
            }
            return;
        }

        if (alt && !ctrl && key && key.length === 1) {
            this._send('\x1B' + key);
            e.preventDefault();
            return;
        }

        if (ctrl && shift && (key === '+' || key === '=')) {
            this.viewOffset = Math.max(0, this.viewOffset - 1);
            this.screen.markAllDirty();
            e.preventDefault(); return;
        }
        if (ctrl && key === '-') {
            this.viewOffset = Math.min(this.screen._maxViewOffset(), this.viewOffset + 1);
            this.screen.markAllDirty();
            e.preventDefault(); return;
        }
    }

    _onBeforeInput(e) {
        if (this._isComposing) return;
        if (!this.onData || !e.data) return;
        if (e.inputType === 'insertText') {
            this._send(e.data);
            e.preventDefault();
        }
    }

    _onKeyUp(e) {
        if (this._isComposing) return;
        const code = e.keyCode;
        if (code === 16 || code === 17 || code === 18 || code === 91) return;
        if (code > 15) this._focusInput();
    }

    _onCompositionEnd(e) {
        this._isComposing = false;
        if (!this.onData) return;
        if (e.data) this._send(e.data);
        this._focusInput();
    }

    _onPaste(e) {
        if (!this.onData) return;
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        if (!text) return;
        if (this.modes.bracketedPaste) {
            this._send('\x1B[200~' + text + '\x1B[201~');
        } else {
            this._send(text);
        }
        this._focusInput();
    }

    _focusInput() {
        this.textarea.focus();
        this.textarea.value = '';
    }

    _initResizeListener() {
        let timer;
        window.addEventListener('resize', () => {
            clearTimeout(timer);
            timer = setTimeout(() => this.renderer.fitToViewport(), 80);
        });
    }

    _onWheel(e) {
        if (e.deltaY < 0) this.scrollbackUp(3);
        else this.scrollbackDown(3);
    }

    _onMouseDown(e) {
        this._focusInput();
        if (!this.onData || this.mouseMode === 0) return;
        e.preventDefault();

        const rect = this.container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const col = Math.floor(x / this.renderer.charWidth);
        const row = Math.floor(y / this.renderer.charHeight);
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;

        let btn = 0;
        if (e.button === 0) btn = 0;
        else if (e.button === 1) btn = 1;
        else if (e.button === 2) btn = 2;

        if (e.shiftKey) btn += 4;
        if (e.altKey) btn += 8;
        if (e.ctrlKey) btn += 16;

        this.mouseBtn = btn;
        this.mouseX = col;
        this.mouseY = row;

        if (this.mouseMode === 9 || this.mouseMode === 1000 || this.mouseMode === 1002 || this.mouseMode === 1003) {
            this._sendMouseEvent('M', btn, col + 1, row + 1);
        }
    }

    _onMouseUp(e) {
        if (!this.onData || this.mouseMode === 0) return;
        if (this.mouseMode === 1000 || this.mouseMode === 1002 || this.mouseMode === 1003) {
            const rect = this.container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const col = Math.floor(x / this.renderer.charWidth);
            const row = Math.floor(y / this.renderer.charHeight);
            if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
            if (this.mouseMode === 9) return;
            this._sendMouseEvent('m', this.mouseBtn, col + 1, row + 1);
        }
        this.mouseBtn = 0;
    }

    _onMouseMove(e) {
        if (!this.onData || this.mouseMode !== 1003) return;
        const rect = this.container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const col = Math.floor(x / this.renderer.charWidth);
        const row = Math.floor(y / this.renderer.charHeight);
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
        this._sendMouseEvent('M', this.mouseBtn, col + 1, row + 1);
    }

    _sendMouseEvent(prefix, btn, col, row) {
        if (this.mouseMode === 1006) {
            this._send(`\x1B[<${btn};${col};${row}${prefix}`);
        } else {
            const ev = (prefix === 'm') ? btn + 64 : btn + 32;
            this._send('\x1B[' + prefix + String.fromCharCode(ev) + String.fromCharCode(col + 32) + String.fromCharCode(row + 32));
        }
    }
}
