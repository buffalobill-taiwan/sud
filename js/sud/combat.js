import { bold, red, green, yellow, cyan } from '../util/sgr.js';
import { nameWithId, matchTarget } from './display.js';

export class Combat {
    constructor(engine, player, monsters) {
        this.engine = engine;
        this.player = player;
        this.monsters = monsters;
        this.active = true;
        this.turnCount = 0;
        this.fled = false;
    }

    get aliveMonsters() {
        return this.monsters.filter(m => m.hp > 0);
    }

    get isAllDead() {
        return this.aliveMonsters.length === 0;
    }

    async start(print) {
        const list = this.aliveMonsters.map(m => bold(yellow(nameWithId(m)))).join('、');
        print(bold(red('⚔ 戰鬥開始！')) + '\n');
        print(`你面對的是 ${list}！\n\n`);
        await this._showStatus(print);
    }

    async handleCommand(input, print) {
        const parts = input.toLowerCase().trim().split(/\s+/);
        const cmd = parts[0];

        if (cmd === 'attack' || cmd === 'a' || cmd === 'kill') {
            const target = parts.slice(1).join(' ');
            return await this._playerAttack(target, print);
        }
        if (cmd === 'run' || cmd === 'flee') {
            return await this._tryFlee(print);
        }
        if (cmd === 'status' || cmd === 'st') {
            await this._showStatus(print);
            return false;
        }
        if (cmd === 'use') {
            const itemName = parts.slice(1).join(' ');
            return await this._useItem(itemName, print);
        }
        print(`戰鬥中用 ${yellow('attack [目標]')} 攻擊、${yellow('run')} 逃跑、${yellow('use <物品>')} 使用物品。\n`);
        return false;
    }

    async _playerAttack(target, print) {
        const alive = this.aliveMonsters;
        if (alive.length === 0) {
            await this._victory(print);
            return true;
        }
        let monster;
        if (target) {
            monster = alive.find(m => matchTarget(target, m));
            if (!monster) {
                print(`這裡沒有 ${target}。\n`);
                return false;
            }
        } else {
            monster = alive[0];
        }

        const atk = this.player.totalAtk;
        const def = monster.def;
        const baseDmg = Math.max(1, atk - def + Math.floor(Math.random() * 4) - 1);
        const crit = Math.random() < 0.15;
        const dmg = crit ? baseDmg * 2 : baseDmg;

        if (crit) {
            print(bold(yellow('⚡ 會心一擊！')));
        }
        print(`你對 ${bold(nameWithId(monster))} 造成了 ${bold(red(String(dmg)))} 點傷害！\n`);
        monster.hp -= dmg;

        if (monster.hp <= 0) {
            print(bold(green(`\n✧ 你擊敗了 ${bold(nameWithId(monster))}！✧\n`)));
            this.engine._monsterDefeated(monster.id);
            const exp = monster.exp || 0;
            const leveled = this.player.addExp(exp);
            print(`獲得 ${yellow(String(exp))} 經驗值。\n`);
            if (leveled) {
                print(bold(green(`\n▲ 升級！你現在是 Lv.${this.player.level} 了！\n`)));
                print(`HP ${bold(green(String(this.player.maxHp)))}  MP ${bold(cyan(String(this.player.maxMp)))}\n`);
            }
            if (this.isAllDead) {
                await this._victory(print);
                return true;
            }
        }

        await this._monsterTurn(print);
        return this.player.isAlive();
    }

    async _monsterTurn(print) {
        const alive = this.aliveMonsters;
        if (alive.length === 0) return;

        for (const monster of alive) {
            const baseDmg = Math.max(1, monster.atk - this.player.totalDef + Math.floor(Math.random() * 3) - 1);
            const dmg = this.player.takeDamage(baseDmg);
            print(`${bold(nameWithId(monster))} 對你造成了 ${bold(red(String(dmg)))} 點傷害！\n`);
            if (!this.player.isAlive()) {
                await this._defeat(print);
                return;
            }
        }

        await this._showStatus(print);
    }

    async _tryFlee(print) {
        const chance = 0.4 + (this.turnCount * 0.05);
        if (Math.random() < chance) {
            print(bold(green('你成功逃離了戰鬥！\n')));
            this.active = false;
            this.fled = true;
            return true;
        }
        print(yellow('逃跑失敗！\n'));
        await this._monsterTurn(print);
        return this.player.isAlive();
    }

    async _useItem(target, print) {
        const item = this.player.inventory.find(i => matchTarget(target, i));
        if (!item) {
            print(`你沒有 ${target}。\n`);
            return false;
        }
        if (item.use === 'heal') {
            const healed = this.player.heal(item.heal || 5);
            print(`你使用了 ${bold(nameWithId(item))}，恢復了 ${bold(green(String(healed)))} 點生命值。\n`);
            this.player.removeItem(item.id);
            await this._monsterTurn(print);
            return this.player.isAlive();
        }
        if (item.use === 'restore_mp') {
            const restored = this.player.restoreMp(item.restoreMp || 5);
            print(`你使用了 ${bold(nameWithId(item))}，恢復了 ${bold(cyan(String(restored)))} 點魔力。\n`);
            this.player.removeItem(item.id);
            await this._monsterTurn(print);
            return this.player.isAlive();
        }
        print(`你無法在戰鬥中使用 ${bold(nameWithId(item))}。\n`);
        return false;
    }

    async _victory(print) {
        this.active = false;
        print(bold(green('\n✦ 勝利！你擊敗了所有敵人！✦\n')));
    }

    async _defeat(print) {
        this.active = false;
        print(bold(red('\n☠ 你被擊敗了...\n')));
    }

    async _showStatus(print) {
        this.turnCount++;
        const pHpBar = this._bar(this.player.hp, this.player.maxHp, 10);
        print(`\n${bold('你')}    HP: ${pHpBar} ${this.player.hp}/${this.player.maxHp}\n`);
        for (const m of this.aliveMonsters) {
            const mHpBar = this._bar(m.hp, m.maxHp, 10);
            print(`${bold(nameWithId(m))} HP: ${mHpBar} ${Math.max(0, m.hp)}/${m.maxHp}\n`);
        }
        print('\n');
    }

    _bar(current, max, length) {
        const filled = Math.round((current / max) * length);
        const empty = length - filled;
        const color = current / max > 0.5 ? '32' : current / max > 0.25 ? '33' : '31';
        return `\x1B[${color}m${'█'.repeat(filled)}${'░'.repeat(empty)}\x1B[0m`;
    }
}
