import { CmdBase } from '../cmd/CmdBase.js';
import { Engine } from './engine.js';
import { Player } from './player.js';
import { system, term } from '../system/sys.js';
import { bold, red, green, yellow, cyan, gray, magenta } from '../util/sgr.js';
import { nameWithId } from './display.js';

export class SudCmd extends CmdBase {
    static get commandName() { return 'sud'; }
    static get help() { return 'SUD — Single User Dungeon'; }
    static get menu() { return null; }

    async execute() {
        system.ctrlCAbortEnabled = false;
        while (true) {
            term.write('\x1B[2J\x1B[H');
            await this._titleLoop();
        }
    }

    async _titleLoop() {
        const BOX_W = 40;

        const strWidth = (s) => {
            let w = 0;
            for (const ch of s) w += term.isWide(ch) ? 2 : 1;
            return w;
        };

        const centerLine = (content, colorFn) => {
            const cw = strWidth(content);
            const pad = BOX_W - 2 - cw;
            const left = Math.floor(pad / 2);
            const right = pad - left;
            const colored = colorFn ? colorFn(content) : content;
            return bold(magenta('║')) + ' '.repeat(left) + colored + ' '.repeat(right) + bold(magenta('║'));
        };

        const box = (content) => bold(magenta(content));

        const art = [
            '██████  █   █  █████',
            '█       █   █  █   █',
            '██████  █   █  █   █',
            '     █  █   █  █   █',
            '██████  █████  █████',
        ];

        this.print('\n');
        this.print(box('╔══════════════════════════════════════╗') + '\n');
        this.print(centerLine('') + '\n');
        for (const line of art) {
            this.print(centerLine(line, cyan) + '\n');
        }
        this.print(centerLine('') + '\n');
        this.print(centerLine('Single User Dungeon', yellow) + '\n');
        this.print(centerLine('') + '\n');
        this.print(box('╚══════════════════════════════════════╝') + '\n\n');

        // Build options: always show new game, only show load if save exists
        const hasSave = typeof localStorage !== 'undefined' && localStorage.getItem('sud_save');
        let options;
        if (hasSave) {
            options = [['進行新遊戲', '載入存檔']];
        } else {
            options = [['進行新遊戲']];
        }

        const choice = await this.selectAsync({
            text: '',
            options,
            render: (selRow, selCol, opts, t) => {
                for (let r = 0; r < opts.length; r++) {
                    let line = '';
                    if (r === selRow) {
                        line += bold(green('→ ')) + bold(green(opts[r][selCol]));
                    } else {
                        line += '  ' + gray(opts[r][selCol]);
                    }
                    if (r < opts.length - 1) line += '\n';
                    t.write('\r\x1B[K' + line + '\n');
                }
                t.write('\x1B[' + opts.length + 'A');
            },
        });

        this.close();
        if (!choice) return;

        if (choice.value === '進行新遊戲' || choice.col === 0) {
            await this._newGame();
        } else {
            await this._loadGame();
        }
    }

    async _newGame() {
        this._player = new Player();
        this._engine = new Engine(this._player);
        term.write('\x1B[2J\x1B[H');
        this.print(bold(red('你走進一座陰暗的地城...\n\n')));
        this.print('潮濕的空氣挾帶著霉味撲面而來。\n');
        this.print('身後的鐵門發出沉重的聲響，緩緩關上。\n');
        this.print('唯一的道路，是通往前方的黑暗。\n\n');
        await this._gameLoop();
    }

    async _loadGame() {
        const raw = localStorage.getItem('sud_save');
        if (!raw) {
            this.print('沒有找到存檔。\n');
            return;
        }
        try {
            const data = JSON.parse(raw);
            this._player = Player.fromSave(data.player);
            this._engine = new Engine(this._player);
            this._engine.loadState(data);
            term.write('\x1B[2J\x1B[H');
            this.print(bold(green('✓ 存檔載入完畢。\n\n')));
            await this._gameLoop();
        } catch (e) {
            this.print(red('存檔損壞，無法載入。\n'));
        }
    }

    async _drainTypewriter() {
        if (system.typewriter.isActive()) {
            await new Promise(resolve => {
                const cb = () => { system.typewriter.removeOnDrain(cb); resolve(); };
                system.typewriter.onDrain(cb);
            });
        }
    }

    async _gameLoop() {
        await this._lookRoom();

        while (true) {
            // Check for quit signal from death
            if (this._engine._quitSignal) {
                this._engine._quitSignal = false;
                return;
            }

            // Check for room healing
            const room = this._engine.world.getRoom(this._player.currentRoom);
            if (room && room.heal && this._player.hp < this._player.maxHp) {
                const healed = this._player.heal(3);
                this.print(gray(`(聖壇的能量恢復了你 ${healed} 點生命值)` + '\n'));
            }

            await this._drainTypewriter();
            term.write('> ');
            const input = await this.readLineAsync('> ');
            if (input === null) continue;
            if (input.trim().toLowerCase() === 'quit') {
                // Save on quit
                this.print('\n');
                await this._engine._doSave(this);
                this.print(bold(cyan('\n回到標題畫面...\n')));
                return;
            }
            await this._engine.processCommand(input, this);
        }
    }

    async _lookRoom() {
        const room = this._engine.world.getRoom(this._player.currentRoom);
        if (!room) return;
        this.print(bold(yellow(`【${room.name}】`)) + '\n');
        this.print(room.desc + '\n');

        if (room.items.length > 0) {
            const itemNames = room.items.map(i => yellow(nameWithId(i))).join('  ');
            this.print(`\n這裡有：${itemNames}\n`);
        }
        if (room.monsters.length > 0) {
            const monNames = room.monsters.map(m => bold(red(nameWithId(m)))).join('  ');
            this.print(`\n⚠ 危險！這裡有 ${monNames}！\n`);
        }
        if (room.npcs.length > 0) {
            const npcNames = room.npcs.map(n => bold(cyan(nameWithId(n)))).join('  ');
            this.print(`\n這裡有：${npcNames}\n`);
        }
        if (room.exitsList.length > 0) {
            this.print(`\n出口：${green(room.exitsList.join('  '))}\n`);
        }
    }

    close() {
        super.close();
    }
}
