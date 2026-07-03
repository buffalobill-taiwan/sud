# htmlterm — 80×25 HTML Terminal Emulator + SUD Game

## Goal
Pure HTML+CSS+JS 80×25 terminal emulator using Unifont monospace font, DOM `<span>` rendering.
The demo shell has been replaced by **SUD** (Single User Dungeon), a single-player
MUD-style dungeon game that boots directly on terminal load.

## Project Status

| Area | Status |
|---|---|
| Terminal core (Screen/Parser/Renderer) | Complete |
| Overlay compositing (widgets + dialogs) | Complete |
| Frame-stack shell + Typewriter | Complete |
| **SUD Game** (engine, combat, world, player, NPCs, items, save/load) | Complete |
| Demo commands (original 19) | Removed — replaced by SUD |
| Automated tests | Excluded — manual testing only |
| CI | Excluded — not planned |

Recent focus (Jul 2026 — SUD rewrite of demo shell):
- `SystemManager.start()` pushes `SyncCmdFrame(SudCmd)` instead of `ShellFrame(ShellCmd)`.
- Game boots directly to title screen; `Ctrl+C` disabled in-game via `ctrlCAbortEnabled`.
- `readLine()` accepts optional `prompt` parameter (e.g. `readLineAsync('> ')`), fixing
  backspace-overwrites-prompt bug.
- `LineEditor.setPrompt()` now updates `_cursorDisplayCol` / `_lastTotalWidth` for
  correct fast-path cursor tracking.
- `LineEditor._redraw()` uses `\x1B[K` (erase line) instead of `\x1B[J` (erase display)
  to prevent erasing room description on Backspace.
- `engine.js` bug fix: `_removeDefeatedMonster()` called before `this.combat = null`,
  so defeated monster IDs are available.
- `display.js` `matchTarget()` now checks display ID (`toDisplayId`) for case-insensitive
  matching by CamelCase name (e.g. `OldMan` matches `old_man`).
- Title screen uses `isWide()`-based `strWidth()` for proper centering; new SUD ASCII art.

## Architecture

### Overlay compositing

Each visual layer owns its own cell buffer. Renderer blends them at render time:

```
Renderer._blendOverlays(Y):
  1. base = main buffer row Y (or scrollback)
  2. for each overlay (registration order, later wins):
       if Y in [ov.y, ov.y+ov.h):
         for c in [ov.x, ov.x+ov.w):
           cell = ov.getCell(relY, relC)
           if cell != null → blended[c] = cell
  3. per-cell: span.textContent / span.className / span.style.cssText
```

| Layer | Z | Buffer owner | Writes via |
|---|---|---|---|
| Main buffer (Screen) | 0 | Parser + shell | `term.write()` → Parser |
| Widget (TSR) | 10 | WidgetBase._buffer | `putc()` → fills own buffer |
| Dialog | 100 | Dialog._buffer | `_writeStr()` → inline SGR→cell attrs |
| Flash (transient) | 200 | flash-helper.js | `screenFlash()` / `borderFlash()` / `artSequence()` |

### Screen / Parser / Renderer split

| File | Responsibility |
|---|---|
| `Screen.js` | Cell buffer, cursor, scroll + SGR state, dirty tracking |
| `Parser.js` | VT100 escape state machine → delegates to Screen |
| `Renderer.js` | Per-cell DOM grid (`cellEls[][]`), cursor element, render loop, overlay blend |
| `terminal.js` | Thin coordinator composing the three |

## Shell Architecture (as used by SUD)

### System Proxy — `js/system/sys.js`

Two Proxy objects (`system`, `term`) exported from `js/system/sys.js` wrap every
property access with a live `SystemManager.instance` lookup. All game code uses
these proxies; `SystemManager` is never imported directly in `js/sud/`.

`CmdBase` methods (`this.print()`, `this.readLine()`, `this.select()`, etc.) use
the proxies internally. CmdBase subclass code imports `system` or `term` directly
from `'../system/sys.js'`.

### Frame stack

`SystemManager` owns the frame stack (`cmdStack`). SUD uses `SyncCmdFrame` as the
persistent bottom frame (never popped because `execute()` is an async infinite loop):

| Frame | `blocked` condition | I/O owner |
|---|---|---|
| `SyncCmdFrame` (SUD's sole frame) | `_asyncPending` (always true) | `SudCmd._gameLoop()` via readLine/print |
| `DialogFrame` | `!dialog.closed` | dialog's `handleKey` |

### Input routing priority

| Priority | Condition | Handler |
|---|---|---|
| 1 | `top.handleInput` (DialogFrame / SyncCmdFrame) | `frame.handleInput(data)` |
| 2 | `readLineState` active | `_handleReadLineInput(data)` |
| 3 | `top.blocked` | Ctrl+C → `_abortAll()`; else queue |
| 4 | (normal) | `editor.handleKey(data)` (readLine) |

### Output routing

| Producer | Path | Animation |
|---|---|---|
| **Cmd** (`this.print()`) | `CmdBase.print()` → `system.print()` → `Typewriter.enqueue()` | Animated (rAF) |
| **term.write()** (direct) | Bypasses Typewriter | Instant |

### Prompt scheduling — `_processStack`

`SystemManager._processStack()` is the single gate for advancing the frame stack.
SUD's game loop handles its own prompt (`> `) via `_drainTypewriter()` +
`readLineAsync('> ')`, bypassing the shell prompt entirely.

### readLine — Interactive game input

```
CmdBase.readLineAsync(prompt)
  → system.readLine(callback, prompt)    // creates LineEditor with prompt
  → handleInput checks readLineState (priority 2)
  → Enter: callback(line.trim()), then tick()
  → Ctrl+C (abort disabled): callback(null)
```

### Typewriter — animated output

`Typewriter` uses `requestAnimationFrame` with per-frame credit budgeting:
- Half-width char: 1 credit
- Wide/CJK char: 2 credits
- Escape seq: instant

`CmdBase.print()` enqueues via Typewriter. The game calls `_drainTypewriter()`
before showing the prompt to ensure ordering.

### Ctrl+C handling

`SystemManager.ctrlCAbortEnabled` (default `true`). SUD sets it to `false`:
- LineEditor: Ctrl+C clears input line via `model.reset()` + `_redraw()`, stays in input
- Typewriter: continues animating (Ctrl+C ignored)
- `_checkCtrlC` in system.js: queues input instead of aborting

## Game Architecture — `js/sud/`

```
js/sud/
├── index.js          Barrel export — auto-registers SudCmd
├── SudCmd.js         Main game command (title screen, game loop)
├── engine.js         Command parser, room interactions, movement, combat init
├── combat.js         Turn-based combat (attack, run, use items)
├── world.js          Room definitions, exits, room state
├── player.js         Player state (HP, MP, inventory, equipment, flags)
├── items.js          Item definitions + getItem()
├── monsters.js       Monster + NPC definitions, getMonster(), getNPC()
└── display.js        Name/ID formatting: nameWithId(), matchTarget(), toDisplayId()
```

### SudCmd — entry point

`SudCmd.execute()` is an async infinite loop:
```
while (true):
  clear screen
  show title screen (box + SUD art + selectAsync)
  New Game → load or create player → enter _gameLoop()
  Load Save → load from localStorage → enter _gameLoop()
  _gameLoop():
    _lookRoom()
    while (true):
      drain typewriter
      readLine('> ')
      quit → save → return to title
      processCommand(input)
```

### Engine — command dispatch

```
processCommand(input):
  if in combat → combat.handleCommand()
  else:
    n/s/e/w/u/d → _doGo() → move + trigger events
    look/l      → _doLook() → room + items + monsters + NPCs
    inventory/i → _doInventory()
    attack/kill → _startCombat()
    take/get    → _doTake()
    drop        → _doDrop()
    use         → _doUse()
    talk/say    → _doTalk()
    status/st   → _doStatus()
    equip/un    → _doEquip()/_doUnequip()
    save        → _doSave()
    help/h      → _doHelp()
```

### Combat — turn-based fights

```
Combat.start()            → show intro + status
Combat.handleCommand():
  attack/kill → _playerAttack() → damage calc → victory or monster turn
  run/flee    → _tryFlee()      → chance-based escape
  use <item>  → _useItem()      → heal/restore_mp
  status/st   → _showStatus()   → HP bars

Defeat → death handling (respawn at start, lose items)
Victory → _removeDefeatedMonster() → removes from room.monsterIds
```

### Display helpers — `display.js`

| Function | Purpose |
|---|---|
| `toDisplayId(id)` | `snake_case` → `CamelCase` (e.g. `silver_key` → `SilverKey`) |
| `nameWithId(entity)` | Returns `"Name[ID]"` format (e.g. `老人[OldMan]`) |
| `matchTarget(target, entity)` | Case-insensitive match against name, id, display ID |

### World — room definitions

Rooms defined in `world.js` with:
- `name`, `desc`, `exits` (direction → roomId map)
- `monsterIds`, `npcIds`, `itemIds`
- `heal` flag (sanctuary)
- `flags` (e.g. `dark`, `locked_exit`)
- Dynamic state: `monsterIds`/`itemIds`/`npcIds` filtered on defeat/collection

Monsters/NPCs/items are fetched by ID from `monsters.js` / `items.js` via getter:
```
get monsters() {
  if (!this._monsters)
    this._monsters = this.monsterIds.map(getMonster).filter(Boolean)
  return this._monsters
}
```

### Save/load

Save to `localStorage` key `'sud_save'`:
- Player state (HP, MP, level, exp, inventory, equipment, flags)
- World state (filtered room.monsterIds, room.itemIds, room.npcIds)

## Key Constraints
- DOM rendering (not Canvas)
- 80×25 viewport, auto-scaled
- No filesystem — all data is in-memory + localStorage
- Ctrl+C disabled in-game (clears input line, never aborts)

## Design Decisions

- **CSS color classes stay static**: `.q0`-`.q255` / `.b0`-`.b255` in `style.css` are
  hand-maintained and will NOT be generated from JS at runtime.
- **Native UTF-8 strings only**: All string literals in JS source use native
  UTF-8 characters, not `\uXXXX` escape sequences.
- **No filesystem**: This project is entirely in-browser. No virtual filesystem,
  no file I/O.
- **`SyncCmdFrame` as bottom frame**: SUD replaces the persistent `ShellFrame`.
  `execute()` is an async never-returning loop, keeping `_asyncPending = true`
  permanently.
- **`_drainTypewriter()` before prompt**: Game calls `term.write('> ')` (synchronous)
  after waiting for Typewriter drain, ensuring `_lastPromptRow` is correct.

## Critical Font Metrics
- core font (eascii-core): all glyphs have advance=32 units = 8px at 16px font-size
- ext font (eascii-ext): glyphs like ⏎, ✓, ✖ have advance=64 units = 16px at 16px font-size

## Relevant Files

### `js/sud/` — Game files

- `SudCmd.js`: Main game command (title screen, game loop, `_drainTypewriter`)
- `engine.js`: Command parser, movement, combat init, item/NPC interactions
- `combat.js`: Turn-based combat system
- `world.js`: Room definitions, exits, room state management
- `player.js`: Player stats, inventory, equipment, flags, save/load
- `items.js`: Item definitions + `getItem()` factory
- `monsters.js`: Monster + NPC definitions, `getMonster()`, `getNPC()`
- `display.js`: `toDisplayId()`, `nameWithId()`, `matchTarget()`

### `js/system/` — Shell system layer

- `sys.js`: `system` / `term` Proxy exports
- `system.js`: SystemManager (singleton, typewriter, editor, frame stack, input routing)
- `CmdFrame.js`: Frame stack types (SyncCmdFrame, DialogFrame)
- `LineEditor.js`: Line editing, history; `_redraw()` with prompt support
- `TextInputModel.js`: Low-level text input model
- `typewriter.js`: rAF-based animated command output

### `js/util/` — Pure utilities

- `constants.js`, `sgr.js`, `unicode-width.js`, `drag.js`, `tokenize.js`
