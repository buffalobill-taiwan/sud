# SUD — Single User Dungeon

## Overview

SUD replaces the demo shell entirely. On load, the terminal boots directly
into a text-based single-player dungeon game inspired by classic MUDs.

## Architecture

### Two-layer design

The game is a CmdBase subclass (`SudCmd`) that acts as the persistent REPL
frame — it takes the role of `ShellCmd` in the frame stack.

```
SystemManager.start()
  └→ SudCmd.execute()    [async, persistent in cmdStack]
       ├── readLineAsync()  ← system.readLine() via Promise
       ├── processCommand() ← game logic
       └── print()          ← system.print() via Typewriter
```

The frame stack never sees `ShellCmd`. `SudCmd` runs as an async `execute()`
with `_asyncPending` blocking the SyncCmdFrame while waiting for user input.

### Ctrl+C disabled

`SystemManager.ctrlCAbortEnabled = false` while the game runs. This means:

- Ctrl+C in `readLine` → clears input line, returns `null` to caller
- Ctrl+C during Typewriter → no abort, queue is not touched
- Ctrl+C in sleep/busy → no abort, no frame destruction

Async code in the game is straightforward try/catch with no epoch checking.

### I/O via system framework

| Need | API | Mechanism |
|---|---|---|
| Animated text output | `this.print(text)` | Typewriter enqueue + rAF |
| Instant text output | `term.write(text)` | Bypasses Typewriter |
| Line input | `this.readLineAsync()` | Promise-wrapped `system.readLine` |
| Menu selection | `this.selectAsync(opts)` | Promise-wrapped `CmdBase.select` |
| Confirm/choose/ask | `this.confirm()`, `this.choose()`, `this.ask()` | Dialog or select helpers |
| Status dialog | `this.showMessage()` | ShowDialog overlay z=100 |

### Title screen loop (SudCmd.execute)

`execute()` never exits during normal play. It loops: title screen → game → title screen.

```js
async execute() {
    system.ctrlCAbortEnabled = false;
    while (true) {
        await this._titleLoop();
    }
}

async _titleLoop() {
    this.print(titleBanner);
    const choice = await this.selectAsync({
        text: '',
        options: [['進行新遊戲', '載入存檔']],
    });
    if (!choice) return; // Ctrl+C → restart title
    if (choice.col === 0) await this._newGame();
    else await this._loadGame();
}
```

### Title screen

```
SUD — Single User Dungeon

    ╔══════════════════════════════╗
    ║   S  U  D                   ║
    ║   Single User Dungeon       ║
    ╚══════════════════════════════╝

→ 進行新遊戲
  載入存檔
```

- ASCII art banner via `this.print()` (Typewriter)
- Menu via `selectAsync()` with two options
- "載入存檔" grayed out if `localStorage` has no save
- Selection enters game loop; `quit` in-game returns here

### Game loop

```js
async _newGame() {
    this._player = new Player();
    this._engine = new Engine(this._player);
    this.print('你走進一座陰暗的地城...\n');
    await this._gameLoop();
}

async _loadGame() {
    const raw = localStorage.getItem('sud_save');
    if (!raw) { this.print('沒有存檔。\n'); return; }
    const data = JSON.parse(raw);
    this._player = Player.fromSave(data.player);
    this._engine = new Engine(this._player);
    this._engine.loadState(data);
    this.print('存檔載入完畢。\n');
    await this._gameLoop();
}

async _gameLoop() {
    while (true) {
        await this._printRoomDesc();
        const input = await this.readLineAsync();
        if (input === null) continue;
        if (input === 'quit') return;
        await this._engine.processCommand(input);
    }
}
```

### Save system

- `save` command: `localStorage.setItem('sud_save', JSON.stringify(gameState))`
- Load: `JSON.parse(localStorage.getItem('sud_save'))`
- Saved data: player stats, current room id, inventory, game flags (killed monsters, opened doors, etc.)
- Manual `save` command only.

## File structure

```
js/sud/
├── SUD.md              ← this file
├── index.js            export { SudCmd }
├── SudCmd.js           async execute(), game loop, input routing
├── engine.js           processCommand(), state transitions
├── player.js           Player class (HP, MP, ATK, DEF, inventory, pos)
├── world.js            World map loading, room lookup, room definitions
├── combat.js           Turn-based combat (command-driven)
├── monsters.js         Monster + NPC definitions
├── items.js            Item definitions
```

## Game commands

| Command | Aliases | Description |
|---|---|---|
| `go <dir>` | `n` `s` `e` `w` `u` `d` | Move in direction |
| `look` | `l` | Describe current room |
| `look <target>` | `l <t>` | Examine a target (NPC, item, exit) |
| `inventory` | `i` `inv` | List carried items |
| `attack <target>` | `kill` | Initiate combat |
| `talk <npc>` | `say` | Start dialogue |
| `take <item>` | `get` | Pick up item |
| `drop <item>` | | Drop carried item |
| `use <item>` | | Use an item |
| `status` | `st` | Show player stats |
| `help` | | Show command list |
| `save` | | Save game to localStorage |
| `quit` | `exit` | Return to title screen |

## Combat system

Turn-based, command-driven:

```
> attack goblin
You strike the goblin for 5 damage!
Goblin HP: 8/13

Goblin strikes you for 3 damage!
HP: 17/20

⚔ HP:17/20 MP:10/10 > _
```

Player types `attack` each turn (or `run` to flee). Targets are locked after
initiation — subsequent `attack` commands reuse the current target.

## World data

Rooms stored as a directed graph. Each room:

```js
{
    id: 'entrance_hall',
    name: '大廳入口',
    desc: '一座古老的石造大廳...',
    exits: {
        n: 'corridor_01',
        e: 'storage_room',
    },
    npcs: ['guardian'],
    items: ['torch'],
}
```

10-15 rooms forming a small dungeon with branching paths, a few NPCs,
and 2-3 monsters.

## Modifications to existing code

| File | Change |
|---|---|
| `js/system/system.js` | Add `ctrlCAbortEnabled = true` property; `_checkCtrlC` checks it; `readLine.onShowPrompt` returns null when disabled |
| `js/system/LineEditor.js` | Ctrl+C when abort disabled → `model.reset()` + `_redraw()` + callback(null), no `onShowPrompt` cancel |
| `js/system/system.js` `start()` | Push `SyncCmdFrame(SudCmd)` instead of `ShellFrame(ShellCmd)` |
| `js/cmd/index.js` | Add `SudCmd` to barrel exports |

## Rendering

## Implementation order

```
階段 1 — System 改造 (Ctrl+C 禁用 + 直接啟動 SUD)
階段 2 — 引擎實作 (items → monsters → world → player → combat → engine → SudCmd → index/cmd)
階段 3 — 測試與除錯
```

階段 1 和階段的 items/monsters/world 可平行進行。

All game text goes through `this.print()` (Typewriter). For static overlays
like a HP bar at the top/bottom, use `WidgetBase` with overlay z=10.
Inventory and status screens use `Dialog` overlays (z=100).
