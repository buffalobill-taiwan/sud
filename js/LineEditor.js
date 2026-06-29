/**
 * LineEditor — command line editing with cursor positioning, wide-char
 * correctness, history (with saved draft), tab prefix completion, and
 * Ctrl+A/E/U/K/W shortcuts.
 *
 * Internal model:
 *   this._chars   — Array of Unicode codepoints (spread of the JS string),
 *                   so each element is exactly one logical character.
 *   this._cursor  — Index into _chars (0 = before first char, _chars.length = end).
 *
 * "Display width" of a char is 2 for wide/CJK, 1 for everything else.
 * We use term.isWide(ch) which delegates to unicode-width.js isWide().
 */

export class LineEditor {
    constructor(term, callbacks = {}) {
        this.term = term;
        this._onExecute   = callbacks.onExecute   || (() => {});
        this._onShowPrompt = callbacks.onShowPrompt || (() => {});

        this._chars   = [];   // Array<string> — one logical char per element
        this._cursor  = 0;    // cursor index into _chars

        this.history    = [];
        this.historyPos = -1;
        this._savedLine = null; // draft saved before navigating history

        this._commands = [];
        this._prompt   = '$ ';
    }

    setCommands(names) { this._commands = names; }
    setPrompt(text)    { this._prompt = text; }

    // ── Public helpers ────────────────────────────────────────────────────────

    /** Current line as a plain string. */
    get line() { return this._chars.join(''); }

    reset() {
        this._chars  = [];
        this._cursor = 0;
        this.historyPos = -1;
        this._savedLine = null;
    }

    // ── Wide-char helpers ─────────────────────────────────────────────────────

    _w(ch) { return this.term.isWide(ch) ? 2 : 1; }

    /** Display width of _chars[from..to). */
    _widthRange(from, to) {
        let w = 0;
        for (let i = from; i < to; i++) w += this._w(this._chars[i]);
        return w;
    }

    // ── Redraw helper ─────────────────────────────────────────────────────────

    /**
     * Redraw the entire line in place, leaving the terminal cursor positioned
     * at this._cursor.
     *
     * Strategy:
     *   1. Move terminal cursor to column right after prompt (\r then write prompt).
     *   2. Write all chars + erase-to-end.
     *   3. Move cursor left by the width of chars after _cursor.
     */
    _redraw() {
        const after = this._widthRange(this._cursor, this._chars.length);
        // Return to start of line, rewrite prompt + content, then erase tail,
        // then move cursor back to logical position.
        this.term.write(
            '\r' + this._prompt +
            this._chars.join('') +
            '\x1B[K' +                                // erase to end of line
            (after > 0 ? `\x1B[${after}D` : '')      // move left to cursor
        );
    }

    // ── History helpers ───────────────────────────────────────────────────────

    _loadHistory(idx) {
        const text = idx === -1 ? (this._savedLine || '') : this.history[idx];
        this._chars  = [...text];
        this._cursor = this._chars.length;
        this._redraw();
    }

    // ── Key handler ───────────────────────────────────────────────────────────

    handleKey(data) {
        let consumed = false;
        let i = 0;

        while (i < data.length) {
            const ch   = data[i];
            const code = ch.charCodeAt(0);

            // ── Ctrl+C ─────────────────────────────────────────────────────
            if (code === 0x03) {
                this.term.write('^C\n');
                this._chars  = [];
                this._cursor = 0;
                this._onShowPrompt();
                consumed = true; i++; continue;
            }

            // ── Ctrl+D ─────────────────────────────────────────────────────
            if (code === 0x04) {
                if (this._chars.length === 0) {
                    this.term.write('exit\n');
                    this._onShowPrompt();
                }
                consumed = true; i++; continue;
            }

            // ── Ctrl+L ─────────────────────────────────────────────────────
            if (code === 0x0C) {
                this.term.write('\x1B[2J\x1B[H');
                this._redraw();
                consumed = true; i++; continue;
            }

            // ── Enter ──────────────────────────────────────────────────────
            if (code === 0x0D || code === 0x0A) {
                this.term.write('\r\n');
                const line = this.line;
                this._chars  = [];
                this._cursor = 0;
                this.historyPos  = -1;
                this._savedLine  = null;
                this._onExecute(line);
                consumed = true; i++; continue;
            }

            // ── Backspace ──────────────────────────────────────────────────
            if (code === 0x7F || code === 0x08) {
                if (this._cursor > 0) {
                    this._cursor--;
                    this._chars.splice(this._cursor, 1);
                    this._redraw();
                }
                consumed = true; i++; continue;
            }

            // ── Tab completion ─────────────────────────────────────────────
            if (code === 0x09) {
                this._handleTab();
                consumed = true; i++; continue;
            }

            // ── Ctrl+A  (move to start) ────────────────────────────────────
            if (code === 0x01) {
                if (this._cursor !== 0) {
                    this._cursor = 0;
                    this._redraw();
                }
                consumed = true; i++; continue;
            }

            // ── Ctrl+E  (move to end) ──────────────────────────────────────
            if (code === 0x05) {
                if (this._cursor !== this._chars.length) {
                    this._cursor = this._chars.length;
                    this._redraw();
                }
                consumed = true; i++; continue;
            }

            // ── Ctrl+U  (delete to start) ──────────────────────────────────
            if (code === 0x15) {
                if (this._cursor > 0) {
                    this._chars.splice(0, this._cursor);
                    this._cursor = 0;
                    this._redraw();
                }
                consumed = true; i++; continue;
            }

            // ── Ctrl+K  (delete to end) ────────────────────────────────────
            if (code === 0x0B) {
                if (this._cursor < this._chars.length) {
                    this._chars.splice(this._cursor);
                    this._redraw();
                }
                consumed = true; i++; continue;
            }

            // ── Ctrl+W  (delete word before cursor) ───────────────────────
            if (code === 0x17) {
                this._deleteWordBefore();
                consumed = true; i++; continue;
            }

            // ── Escape sequences ───────────────────────────────────────────
            if (code === 0x1B) {
                const rest = data.slice(i);
                const adv  = this._handleEscape(rest);
                i += adv;
                consumed = true;
                continue;
            }

            // ── Printable characters ───────────────────────────────────────
            if (code >= 0x20) {
                // Use codePointAt to correctly handle surrogate pairs (emoji etc.)
                const cp = data.codePointAt(i);
                const c  = String.fromCodePoint(cp);
                this._chars.splice(this._cursor, 0, c);
                this._cursor++;
                // If we are at end, just write the char (fast path, no full redraw)
                if (this._cursor === this._chars.length) {
                    // Erase-to-end not needed; just write char
                    this.term.write(c);
                } else {
                    this._redraw();
                }
                // Advance by actual UTF-16 code units consumed
                i += (cp > 0xFFFF) ? 2 : 1;
                consumed = true;
                continue;
            }

            i++;
        }

        return consumed;
    }

    // ── Tab completion ────────────────────────────────────────────────────────

    _handleTab() {
        const prefix = this.line;
        const matches = this._commands.filter(c => c.startsWith(prefix));
        if (matches.length === 0) return;

        if (matches.length === 1) {
            // Unique match — complete it
            const rest = matches[0].slice(prefix.length);
            for (const c of rest) {
                this._chars.splice(this._cursor, 0, c);
                this._cursor++;
            }
            this.term.write(rest);
            return;
        }

        // Multiple matches — fill common prefix first
        const common = _commonPrefix(matches);
        if (common.length > prefix.length) {
            const rest = common.slice(prefix.length);
            for (const c of rest) {
                this._chars.splice(this._cursor, 0, c);
                this._cursor++;
            }
            this.term.write(rest);
            return;
        }

        // Already at common prefix — show candidates
        this.term.write('\r\n' + matches.join('  ') + '\n');
        this.term.write(this._prompt + this._chars.join(''));
        // Restore cursor position
        const after = this._widthRange(this._cursor, this._chars.length);
        if (after > 0) this.term.write(`\x1B[${after}D`);
    }

    // ── Ctrl+W ────────────────────────────────────────────────────────────────

    _deleteWordBefore() {
        if (this._cursor === 0) return;
        let end = this._cursor;
        // Skip trailing spaces
        let j = end - 1;
        while (j >= 0 && this._chars[j] === ' ') j--;
        // Skip word characters
        while (j >= 0 && this._chars[j] !== ' ') j--;
        const newCursor = j + 1;
        this._chars.splice(newCursor, end - newCursor);
        this._cursor = newCursor;
        this._redraw();
    }

    // ── Escape sequence handler ───────────────────────────────────────────────

    /**
     * Handle an escape sequence starting at data[0].
     * Returns the number of characters consumed.
     */
    _handleEscape(data) {
        if (data.length < 2) return 1; // lone ESC

        if (data[1] === '[' || data[1] === 'O') {
            // Try to read a complete CSI / SS3 sequence
            // Format: ESC [ <params> <final>   where final is 0x40–0x7E
            //     or: ESC O <letter>
            if (data[1] === 'O' && data.length >= 3) {
                this._handleCSIFinal(data[2], '');
                return 3;
            }
            // CSI: collect param bytes (0x30–0x3F) + intermediate (0x20–0x2F)
            let j = 2;
            while (j < data.length && data.charCodeAt(j) >= 0x20 && data.charCodeAt(j) <= 0x3F) j++;
            if (j >= data.length) return data.length; // incomplete
            const params = data.slice(2, j);
            const final  = data[j];
            this._handleCSIFinal(final, params);
            return j + 1;
        }

        return 2; // ESC + unknown byte
    }

    _handleCSIFinal(final, params) {
        switch (final) {
            case 'A': this._historyUp();   break;   // ↑
            case 'B': this._historyDown(); break;   // ↓
            case 'C': this._moveRight();   break;   // →
            case 'D': this._moveLeft();    break;   // ←
            case 'H': this._moveHome();    break;   // Home (CSI H)
            case 'F': this._moveEnd();     break;   // End  (CSI F)
            case '~':
                if (params === '1' || params === '7') this._moveHome(); // Home variants
                if (params === '4' || params === '8') this._moveEnd();  // End  variants
                if (params === '3') this._deleteForward();              // Delete key
                break;
        }
    }

    // ── Cursor movement ───────────────────────────────────────────────────────

    _moveLeft() {
        if (this._cursor > 0) {
            this._cursor--;
            const w = this._w(this._chars[this._cursor]);
            this.term.write(`\x1B[${w}D`);
        }
    }

    _moveRight() {
        if (this._cursor < this._chars.length) {
            const w = this._w(this._chars[this._cursor]);
            this._cursor++;
            this.term.write(`\x1B[${w}C`);
        }
    }

    _moveHome() {
        if (this._cursor !== 0) {
            this._cursor = 0;
            this._redraw();
        }
    }

    _moveEnd() {
        if (this._cursor !== this._chars.length) {
            this._cursor = this._chars.length;
            this._redraw();
        }
    }

    _deleteForward() {
        if (this._cursor < this._chars.length) {
            this._chars.splice(this._cursor, 1);
            this._redraw();
        }
    }

    // ── History navigation ────────────────────────────────────────────────────

    _historyUp() {
        if (this.history.length === 0) return;
        if (this.historyPos === -1) {
            // Save the current draft before navigating away
            this._savedLine = this.line;
            this.historyPos = this.history.length - 1;
        } else if (this.historyPos > 0) {
            this.historyPos--;
        } else {
            return; // already at oldest
        }
        this._loadHistory(this.historyPos);
    }

    _historyDown() {
        if (this.historyPos === -1) return;
        this.historyPos++;
        if (this.historyPos >= this.history.length) {
            this.historyPos = -1;
        }
        this._loadHistory(this.historyPos);
    }
}

// ── Module-level helper ───────────────────────────────────────────────────────

function _commonPrefix(strs) {
    if (strs.length === 0) return '';
    let prefix = strs[0];
    for (let i = 1; i < strs.length; i++) {
        while (!strs[i].startsWith(prefix)) prefix = prefix.slice(0, -1);
    }
    return prefix;
}
