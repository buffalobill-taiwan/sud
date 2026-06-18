# HTMLTerm

A pure HTML+CSS+JS 80×25 terminal emulator inspired by [term.ptt.cc](https://term.ptt.cc/).

Renders entirely via DOM `<span>` elements with CSS color classes — no Canvas.

## Features

- Full ANSI escape sequence support (SGR colors, cursor positioning, scroll regions, etc.)
- 16-color ANSI palette with bold brightening
- 256-color and truecolor support
- Mouse tracking (normal, button-events, any-event, SGR 1006)
- Scrollback buffer (2000 lines) with mouse wheel navigation
- IME support for Chinese/Japanese input via hidden textarea
- Bracketed paste mode
- Cursor blink animation
- CRT scanline overlay

## Architecture

| Component | Approach |
|-----------|----------|
| **Rendering** | DOM `<span>` elements grouped by color classes (`q{fgb} b{bg}`, inline styles for >16 colors) |
| **Buffer** | 2D array of cell objects (`{ch, fg, bg, bold, italic, ...}`) + scrollback array |
| **Input** | `keydown` on `document` (always captured) + hidden `<textarea>` for IME |
| **Focus** | Automatic refocus on `keyup` (ptt.cc pattern) |
| **Cursor** | Absolutely-positioned `<div>` with CSS `blink` animation |
| **Render loop** | `requestAnimationFrame` with dirty-row tracking |

## Fonts

Uses [Unifont](https://unifoundry.com/unifont/) bitmap font, subsetted into three WOFF2 files:
- **EASCII** — Basic Latin + common symbols
- **JA** — Hiragana + Katakana
- **ZH** — Traditional Chinese CJK

## Usage

Open `index.html` in a modern browser.

### Commands

| Command | Description |
|---------|-------------|
| `help` | List available commands |
| `clear` | Clear screen |
| `echo` | Print arguments |
| `date` | Show current date/time |
| `fortune` | Display a random fortune |
| `ascii` | Show ANSI color chart |
| `neofetch` | Display system info |
| `cowsay` | Let a cow speak |
| `calc` | Evaluate arithmetic expression |
| `whoami` | Show user name |
| `exit` | Exit the demo shell |

**Ctrl+Shift++ / Ctrl+-** — Scroll back/forward through history.

## License

MIT
