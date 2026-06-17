# HTMLTerm

A pure HTML+CSS+JS 80×25 terminal emulator rendered on Canvas with bitmap font support.

## Features

- Full ANSI escape sequence support (colors, cursor positioning, SGR, etc.)
- Mouse tracking (normal, button-events, any-event)
- Scrollback buffer
- Canvas rendering with CRT scanline overlay
- IME support for Chinese/Japanese input via hidden textarea
- Bracketed paste mode

## Fonts

Uses [Unifont](https://unifoundry.com/unifont/) bitmap font, subsetted into three WOFF2 files:
- **EASCII** — Basic Latin + common symbols
- **JA** — Hiragana + Katakana
- **ZH** — Traditional Chinese CJK

## Usage

Open `index.html` in a modern browser. A demo shell with several built-in commands starts automatically.

### Commands

- `help` — List available commands
- `clear` — Clear screen
- `echo` — Print arguments
- `date` — Show current date/time
- `fortune` — Display a random fortune
- `ascii` — Show ASCII art table
- `neofetch` — Display system info
- `cowsay` — Cow say
- `calc` — Evaluate arithmetic expression
- `whoami` — Show user name
- `exit` — Exit the demo shell

## License

MIT
