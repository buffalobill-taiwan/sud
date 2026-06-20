# htmlterm — 80×25 HTML Terminal Emulator

## Goal
Pure HTML+CSS+JS 80×25 terminal emulator using Unifont monospace font, DOM `<span>` rendering.

## Architecture

### Overlay compositing

Each visual layer owns its own cell buffer. Renderer blends them at render time:

```
Renderer._blendOverlays(Y):
  1. base = main buffer row Y (or scrollback)
  2. for each overlay (sorted by z):
       if Y in [ov.y, ov.y+ov.h):
         for c in [ov.x, ov.x+ov.w):
           cell = ov.getCell(relY, relC)
           if cell != null → blended[c] = cell
  3. _rowToHTML(blended) → innerHTML
```

| Layer | Z | Buffer owner | Writes via |
|---|---|---|---|
| Main buffer (Screen) | 0 | Parser + shell | `term.write()` → Parser |
| Widget (TSR) | 10 | WidgetBase._buffer | `putc()` → fills own buffer |
| Dialog | 100 | Dialog._buffer | `_writeStr()` → inline SGR→cell attrs |

No `saveArea`/`restoreArea`, no scroll region protection. Each layer is
independent; the main buffer is never touched by overlays.

### Screen / Parser / Renderer split

`js/terminal.js` was split into three files:

| File | Responsibility | Size |
|---|---|---|
| `Screen.js` | Cell buffer, cursor, scroll + SGR state, dirty tracking | pure data |
| `Parser.js` | VT100 escape state machine → delegates to Screen | no DOM |
| `Renderer.js` | DOM rows, cursor element, render loop, overlay blend | DOM only |
| `terminal.js` | Thin coordinator (~100 lines) composing the three | event wiring |

`Terminal` delegates public props/methods to `screen` and `renderer`:
```js
get curX() { return this.screen.curX; }
set curX(v) { this.screen.curX = v; }
markRowDirty(r) { this.screen.markRowDirty(r); }
```

### LineEditor extracted

`js/LineEditor.js` handles line buffer, history, tab completion, and key
dispatch (Arrows, Ctrl+C/D/L, BS, Enter). `DemoShell.handleInput`
delegates to `this.editor.handleKey(data)` when no dialog/readLine
is active. Callbacks `onExecute(line)` and `onShowPrompt()` decouple
editing from shell logic.

### Overlay lifecycle

```
WidgetBase.start():
  _buffer = createEmptyBuffer(w, h)
  _overlay = { y, x, w, h, z:10, getCell }
  term.addOverlay(_overlay)

WidgetBase.stop():
  term.removeOverlay(_overlay)
  _buffer = _overlay = null

Dialog.open():
  _initBuffer()
  _overlay = { y, x, w, h, z:100, getCell }
  term.addOverlay(_overlay)
  stack.push(y, h)        // cursor state save
  _drawFrame() + refreshContent()

Dialog.close():
  stack.pop()             // cursor state restore, hooks fire
  term.removeOverlay(_overlay)
```

### SGR→cell attrs in dialogs

`_writeStr(buf, y, x, str, maxX)` parses SGR sequences inline:
- `\x1B[1m` → `cell.bold = true`
- `\x1B[36m` → `cell.fg = 6`
- `\x1B[0m` → reset to defaults
- Non-SGR chars become `_makeCell(ch, attr)` entries in `buf[y]`

## Changes Made This Session

### Done
- **Overlay compositing architecture**: Widgets and dialogs now own their own cell buffers. Renderer blends them over the main buffer at render time via `_blendOverlays()` in `Renderer.js`. No more `saveArea`/`restoreArea` or scroll region protection.
- **Screen/Parser/Renderer split** (`js/terminal.js` → `Screen.js` + `Parser.js` + `Renderer.js`): Terminal data model, escape parser, and DOM renderer separated into independent files. Terminal stays as thin coordinator (~100 lines).
- **LineEditor extraction** (`js/LineEditor.js`): Shell line editing (history, tab completion, key dispatch) extracted from `shell.js` into its own class.
- **WidgetBase buffer rewrite** (`js/cmd/WidgetBase.js`): Now owns `_buffer`, `putc()`, and overlay lifecycle (`_overlay`). `start()`/`stop()` register/unregister overlay on the terminal. No more `_saveBacking`/`_restoreBacking`.
- **Dialog buffer rewrite** (`js/dialog.js`): All rendering now fills `_buffer` via `_writeStr()` (inline SGR→cell attrs) instead of `term.write()` with CSI sequences. `open()`/`close()` manage overlay registration. StateStack simplified to cursor-only (no buffer save/restore).
- **ShellWidgetManager simplified** (`js/shell.js`): No `_setScrollTop()`, no scrollTop/scrollBottom management. Widgets register overlays independently via WidgetBase.

### Removed
- `saveArea()`, `restoreArea()`, `saveCursor()`, `restoreCursor()` — no longer needed
- `WidgetBase._saveBacking()`, `_restoreBacking()`
- `ShellWidgetManager._setScrollTop()`

## Command Architecture

```
js/cmd/
├── CmdBase.js    # execute(args) | print(text) | readLine(cb) | static commandName/help/menu
├── help.js       Help      — iterates shell._cmdList dynamically
├── clear.js      Clear
├── echo.js       Echo
├── date.js       Date
├── uname.js      Uname
├── neofetch.js   Neofetch
├── cowsay.js     Cowsay
├── ascii.js      Ascii
├── fortune.js    Fortune
├── calc.js       Calc
├── exit.js       Exit
├── whoami.js     Whoami
├── menu.js       MenuCmd   — execute delegates to shell._menuCmd()
├── widget.js     WidgetCmd — toggle TSR clock
├── clock.js      ClockCmd
├── quiz.js       Quiz
└── widgets/
    └── ClockWidget.js
```

**CmdBase contract:**

| Member | Purpose |
|---|---|
| `constructor(shell)` | Receives DemoShell instance; `this.term` available |
| `execute(args)` | Command logic, called with parsed arg array |
| `print(text)` | Enqueues text to shell's Typewriter |
| `readLine(callback)` | Request next line of input; callback receives trimmed string |
| `static get commandName()` | Command name string, e.g. `'fortune'` |
| `static get help()` | Description shown in `help` output |
| `static get menu()` | Menu description or `null` to hide from menu |

**Registration flow:**

```js
_registerCommands() {
    const classes = [Help, Clear, Echo, ..., MenuCmd];
    for (const Cls of classes) {
        const cmd = new Cls(this);
        this.commands[name] = cmd.execute.bind(cmd);
        this._cmdList.push({ name, help });
        if (menu) this.menuItems.push({ name, desc: menu });
    }
}
```

### readLine — Interactive Input for Commands

Commands that need multi-line interaction (e.g. `quiz`) use `readLine`:

```
CmdBase.readLine(callback)
  → shell.readLine(callback)    // sets this._readLinePending + this._readLineBuffer = ''
  → handleInput checks _readLinePending BEFORE normal editing loop
  → characters accumulated in _readLineBuffer (NOT this.line)
  → Enter: callback(_readLineBuffer.trim()), then showPrompt()
  → Ctrl+C: cancel, showPrompt()
```

**Processing order in `handleInput`:**

```
1. clockCleanup mode
2. activeDialog mode
3. readLine pending → _readLineBuffer (independent)
4. normal shell editing → this.line
```

**Critical rule:** `_readLineBuffer` is completely independent from `this.line`.
A cmd using `readLine` must NOT access `this.line` or `this.shell.line` — the
input arrives only through the callback parameter.

### Typewriter — animated command output

`Typewriter` buffers text and releases one token per tick:

| Token | Speed | Example |
|---|---|---|
| Wide/CJK | 8ms | 漢字 |
| Half-width | 4ms | a, b, $ |
| Escape seq | instant | `\x1B[31m` |
| Newline | instant | `\n` |

- `CmdBase.print()` → `shell.print()` → `Typewriter.enqueue()`
- Shell defers `showPrompt()` until typewriter drain
- Only `Ctrl+C` passes through during animation (aborts + shows prompt)
- Dialog rendering, widget buffers, and shell prompt bypass typewriter

## Key Constraints
- DOM rendering (not Canvas)
- 80×25 viewport, auto-scaled
- inline-block span width fix would be needed for any span mixing 32-unit and 64-unit glyphs

## Critical Font Metrics
- core font (eascii-core): all glyphs have advance=32 units = 8px at 16px font-size
- ext font (eascii-ext): glyphs like ⏎, ✓, ✖ have advance=64 units = 16px at 16px font-size
- U+2191 (↑), U+2193 (↓) are in core at 8px — only ⏎ was problematic

## Dialog Frame & Item Positioning (buffer-based)

Dialogs render into their own `_buffer[][]` via `_writeStr()`, not `term.write()`.

```js
_t(row, s) {  // row = 0-indexed offset from dialog.y
    _writeStr(this._buffer, row, 0, s, this.width);
}
```

**Frame width formula (for width W):**

| Element | Content | Width |
|---|---|---|
| Top/bottom border | `┌` + `─`×(W-2) + `┐` | W |
| Separator | `├` + `─`×(W-2) + `┤` | W |
| Content row | `│` + content(W-2) + `│` | W |

**Centering:** `_centerRow(row, content)` builds one string with SGR inline
and writes it via `_writeStr`:

```js
_centerRow(row, content) {
    pad = W - 2 - _bufWidth(content)
    _writeStr(buf, row, 0, '│' + spaces + content + spaces + '│', W)
}
```

**Highlight bar (inverted item):** SGR embedded directly in the string:

```js
s = '│';
if (sel) s += '\x1B[7m\x1B[1m';
s += content + ' '.repeat(pad);
if (sel) s += '\x1B[0m';
_writeStr(buf, row, 0, s, W);
```

**CJK safety:** `_bufWidth(str)` skips SGR sequences and sums cell widths
(`_isWide(ch) ? 2 : 1`). Used for centering and cursor positioning.

**`_bufWidth` ANSI skip:** `_bufWidth` detects `[` (0x5B) as a CSI introducer
(not a terminator), so param bytes like `1`, `;`, `32`, `m` in `\x1B[1;32m`
are not counted as visible chars.

### WidgetBase buffer

```js
this._buffer[y][x] = null  →  transparent (overlay skips this cell)
this._buffer[y][x] = cell  →  opaque (overlays main buffer)

putc(x, y, ch, fg, bg, attrs) {
    cell = { ch, fg, bg, bold, dim, italic, underline, inverse, ... }
    this._buffer[y][x] = cell;
    term.markRowDirty(this._y + y);
}
```

ClockWidget uses `putc()` to fill 8 cells with time chars (fg=7, bg=4):

```js
draw() {
    const time = formatTime(new Date());
    for (let i = 0; i < this._w; i++)
        this.putc(i, 0, time[i] || ' ', 7, 4);
}
```

## relevant Files

- `js/Screen.js`: Cell buffer, cursor, scroll/SGR state, dirty tracking, overlays[]
- `js/Parser.js`: VT100 escape state machine
- `js/Renderer.js`: DOM rows, cursor, render loop, `_blendOverlays()`
- `js/terminal.js`: Thin coordinator composing Screen/Parser/Renderer
- `js/LineEditor.js`: Line editing, history, tab completion
- `js/shell.js`: DemoShell orchestrates editor/typewriter/stateStack/dialogs/widgets
- `js/dialog.js`: Dialog base + Menu/Input/Clock/ShowDialog, `_writeStr`, StateStack
- `js/typewriter.js`: Animated text output
- `js/cmd/WidgetBase.js`: Overlay lifecycle, `_buffer`, `putc()`
- `js/cmd/widgets/ClockWidget.js`: TSR clock using `putc()`