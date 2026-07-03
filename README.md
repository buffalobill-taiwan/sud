# HTMLTerm + SUD (Single User Dungeon)

[![Live Demo](https://img.shields.io/badge/demo-online-44cc11?style=flat-square)](https://buffalobill-taiwan.github.io/sud/)

A pure HTML+CSS+JS 80×25 terminal emulator running **SUD** (Single User Dungeon),
a single-player MUD-style dungeon game. Renders entirely via DOM `<span>` elements
with CSS color classes — no Canvas.

## Features

### Terminal core

- Full ANSI escape sequence support (SGR colors, cursor positioning, scroll regions, etc.)
- 16-color ANSI palette with bold brightening
- 256-color and truecolor support
- CJK double-width character handling (buffer + rendering + input/delete)
- Viewport auto-scaling (maintains 80×25 aspect ratio)
- Scrollback buffer (2000 lines)
- rAF-based Typewriter animation for game text output

### SUD Game

- **Title screen** — SUD ASCII art with New Game / Load Save
- **10+ rooms** — dungeon, sanctuary, prison, treasure vault, etc.
- **Combat** — turn-based with `attack`, `run`, `use <item>`; HP bars, critical hits, leveling
- **Monsters** — rat, goblin, skeleton, dark knight (boss)
- **NPCs** — talk to NPCs with branching dialogue; free the prisoner subquest
- **Items** — potions, torches, silver key, weapons, shields; inventory management
- **ID system** — entities shown as `Name[ID]` (e.g. `老人[OldMan]`, `火把[Torch]`);
  targeting via display ID (case-insensitive, e.g. `OldMan`, `old_man`, `Torch`)
- **Equipment** — equip weapons and shields for stat bonuses
- **Save/Load** — persistent via `localStorage`
- **Full CJK support** — play in Chinese or English

## Architecture

| Component | Approach |
|-----------|----------|
| **Core split** | `Screen.js` (buffer) · `Parser.js` (VT100) · `Renderer.js` (DOM grid) · `terminal.js` (coordinator) |
| **Rendering** | Pre-created 80×25 `<span>` grid; dirty-row updates |
| **Overlays** | Widgets (z=10), dialogs (z=100) own separate buffers; composited at render time |
| **Shell** | `SystemManager` + `sys.js` (Proxy exports) + `SyncCmdFrame(SudCmd)` |
| **Input** | `keydown` on `document` + hidden `<textarea>` for IME |
| **Cursor** | Absolutely-positioned `<div>` with CSS `blink` animation |
| **Output** | rAF Typewriter for animated text; `term.write()` for synchronous output |

See [AGENTS.md](AGENTS.md) for detailed architecture, frame stack lifecycle, and game system docs.

## Fonts

Uses [Unifont](https://unifoundry.com/unifont/) bitmap font, subsetted into five WOFF2 files:

- **eascii-core** — Basic Latin + common symbols (8px advance)
- **eascii-ext** — Extended symbols (⏎ ✓ ✖, 16px advance)
- **ja** — Hiragana + Katakana
- **zh-common** — Common CJK
- **zh-rare** — Rare CJK

## Usage

Open `index.html` in a modern browser, or visit the live demo:

<https://buffalobill-taiwan.github.io/sud/>

### Game Commands

| Command | Description |
|---------|-------------|
| `n` / `s` / `e` / `w` / `u` / `d` | Move (north/south/east/west/up/down) |
| `look` / `l` | Look around the current room |
| `attack` / `kill` | Start or continue combat |
| `talk` / `say` | Talk to an NPC (e.g. `talk OldMan`) |
| `take` / `get` | Pick up an item (e.g. `take Torch`) |
| `drop` | Drop an item |
| `use` | Use an item (e.g. `use HealthPotion`) |
| `inventory` / `i` | Show inventory |
| `equip` / `un` | Equip / unequip items |
| `status` / `st` | Show player status (HP, MP, level, equipment) |
| `save` | Save game |
| `quit` | Return to title screen |
| `help` / `h` | Show help |

### Keyboard

| Key | Action |
|-----|--------|
| Type commands | Input game actions |
| `Enter` | Execute command |
| `Backspace` | Delete character |
| `Ctrl+C` | Clear current input (in-game; does not abort) |

## Project layout

```
js/
├── main.js
├── terminal/          Screen.js Parser.js Renderer.js terminal.js   # VT100 core
├── system/            sys.js system.js CmdFrame.js LineEditor.js    # Shell system
├── util/              sgr.js unicode-width.js constants.js           # Utilities
├── sud/               SUD game files (see AGENTS.md)
├── cmd/               SudCmd.js only (registered via index.js)
├── dialog/            Dialog framework
css/style.css
index.html
```

## License

MIT
