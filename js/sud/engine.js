import { World, ROOMS } from './world.js';
import { getItem } from './items.js';
import { Combat } from './combat.js';
import { bold, red, green, yellow, cyan, gray } from '../util/sgr.js';
import { isWide } from '../util/unicode-width.js';
import { system } from '../system/sys.js';
import { nameWithId, matchTarget } from './display.js';

export class Engine {
    constructor(player) {
        this.player = player;
        this.world = new World();
        this.combat = null;
    }

    async processCommand(input, cmd) {
        if (!input || !input.trim()) return;
        const parts = input.trim().split(/\s+/);
        const verb = parts[0].toLowerCase();
        const args = parts.slice(1);

        if (this.combat && this.combat.active) {
            const result = await this.combat.handleCommand(input, (text) => cmd.print(text));
            if (this.combat && !this.combat.active) {
                if (!this.player.isAlive()) {
                    await this._handleDeath(cmd);
                } else {
                    this._removeDefeatedMonster();
                    this.combat = null;
                }
            }
            return;
        }

        switch (verb) {
            case 'n': case 's': case 'e': case 'w': case 'u': case 'd':
            case '北': case '南': case '東': case '西': case '上': case '下':
                await this._doGo(verb, cmd);
                break;
            case 'go': case '移動':
                await this._doGo(args.join(' '), cmd);
                break;
            case 'look': case 'l': case '看':
                await this._doLook(args.join(' '), cmd);
                break;
            case 'inventory': case 'i': case 'inv': case '背包':
                await this._doInventory(cmd);
                break;
            case 'attack': case 'kill': case '攻擊':
                await this._doAttack(args.join(' '), cmd);
                break;
            case 'talk': case 'say': case '對話':
                await this._doTalk(args.join(' '), cmd);
                break;
            case 'take': case 'get': case '撿':
                await this._doTake(args.join(' '), cmd);
                break;
            case 'drop': case '丟':
                await this._doDrop(args.join(' '), cmd);
                break;
            case 'use': case '使用':
                await this._doUse(args.join(' '), cmd);
                break;
            case 'equip': case '裝備':
                await this._doEquip(args.join(' '), cmd);
                break;
            case 'status': case 'st': case '狀態':
                await this._doStatus(cmd);
                break;
            case 'save': case '存檔':
                await this._doSave(cmd);
                break;
            case 'help': case 'h': case '幫助':
                await this._doHelp(cmd);
                break;
            default:
                cmd.print(`不認識的指令「${red(verb)}」。輸入 ${yellow('help')} 查看可用指令。\n`);
        }
    }

    async _doGo(dir, cmd) {
        const room = this.world.getRoom(this.player.currentRoom);
        const exitDir = room.getExitDir(dir);
        if (!exitDir) {
            cmd.print('那裡沒有出口。\n');
            return;
        }
        const nextRoomId = room.exits[exitDir];
        if (!nextRoomId) {
            cmd.print('那裡沒有出口。\n');
            return;
        }
        // Check lock on target room
        const nextRoom = this.world.getRoom(nextRoomId);
        if (nextRoom && nextRoom.locked) {
            if (this.player.hasItem(nextRoom.locked + '_key') || this.player.flags['unlocked_' + nextRoom.id]) {
                // already unlocked
            } else {
                cmd.print(`門是鎖著的。你需要一把鑰匙來打開它。\n`);
                return;
            }
        }
        if (nextRoom && nextRoom.requireFlag && !this.player.flags[nextRoom.requireFlag]) {
            cmd.print('一股強大的黑暗力量阻擋了你前進。\n');
            return;
        }
        this.player.currentRoom = nextRoomId;
        await this._lookRoom(cmd);
    }

    async _doLook(target, cmd) {
        if (!target) {
            await this._lookRoom(cmd);
            return;
        }
        const room = this.world.getRoom(this.player.currentRoom);
        // Check items in inventory
        const invItem = this.player.inventory.find(i =>
            matchTarget(target, i)
        );
        if (invItem) {
            cmd.print(`${bold(nameWithId(invItem))}：${invItem.desc}\n`);
            return;
        }
        // Check items in room
        for (const item of room.items) {
            if (matchTarget(target, item)) {
                cmd.print(`${bold(nameWithId(item))}：${item.desc}\n`);
                return;
            }
        }
        // Check NPCs
        for (const npc of room.npcs) {
            if (matchTarget(target, npc)) {
                cmd.print(`${bold(nameWithId(npc))}：${npc.desc}\n`);
                return;
            }
        }
        // Check monsters
        for (const m of room.monsters) {
            if (matchTarget(target, m)) {
                cmd.print(`${bold(nameWithId(m))}：${m.desc}\n`);
                return;
            }
        }
        // Check exits
        const dirMap = { n: '北[N]', s: '南[S]', e: '東[E]', w: '西[W]', u: '上[U]', d: '下[D]' };
        for (const [k, v] of Object.entries(room.exits)) {
            const dirName = dirMap[k] || k;
            if (dirName === target || k === target || k.toUpperCase() === target.toUpperCase()) {
                const nextRoom = this.world.getRoom(v);
                if (nextRoom) {
                    cmd.print(`${dirName}：${nextRoom.name}\n`);
                }
                return;
            }
        }
        cmd.print(`你看不到那樣的東西。\n`);
    }

    async _lookRoom(cmd) {
        const room = this.world.getRoom(this.player.currentRoom);
        if (!room) {
            cmd.print('你迷失在虛空中...\n');
            return;
        }
        cmd.print(bold(yellow(`【${room.name}】`)) + '\n');
        cmd.print(room.desc + '\n');

        if (room.id === 'temple' && this.player.inventory.some(i => i.id === 'ancient_amulet')) {
            cmd.print(yellow('上古護符發出了微微光芒...\n'));
        }

        if (room.items.length > 0) {
            const itemNames = room.items.map(i => yellow(nameWithId(i))).join('  ');
            cmd.print(`\n這裡有：${itemNames}\n`);
        }
        if (room.monsters.length > 0) {
            const monNames = room.monsters.map(m => bold(red(nameWithId(m)))).join('  ');
            cmd.print(`\n⚠ 危險！這裡有 ${monNames}！\n`);
        }
        if (room.npcs.length > 0) {
            const npcNames = room.npcs.map(n => bold(cyan(nameWithId(n)))).join('  ');
            cmd.print(`\n這裡有：${npcNames}\n`);
        }
        if (room.exitsList.length > 0) {
            cmd.print(`\n出口：${green(room.exitsList.join('  '))}\n`);
        }
    }

    async _doInventory(cmd) {
        const p = this.player;
        if (p.inventory.length === 0) {
            cmd.print('你的背包是空的。\n');
            return;
        }

        // Categorize: equipped → equippable → other
        const equipped = [];
        const equippable = [];
        const other = [];

        for (const item of p.inventory) {
            if (p.equipped.weapon === item || p.equipped.shield === item) {
                equipped.push(item);
            } else if (item.equip) {
                equippable.push(item);
            } else {
                other.push(item);
            }
        }

        // Group other items by ID and count
        const grouped = new Map();
        for (const item of other) {
            const arr = grouped.get(item.id) || [];
            arr.push(item);
            grouped.set(item.id, arr);
        }

        cmd.print(bold('背包中的物品：') + '\n');

        for (const item of equipped) {
            cmd.print(`  ${yellow(nameWithId(item))} （已裝備）\n`);
        }

        for (const item of equippable) {
            cmd.print(`  ${yellow(nameWithId(item))}\n`);
        }

        for (const [, items] of grouped) {
            const item = items[0];
            if (items.length > 1) {
                cmd.print(`  ${yellow(nameWithId(item))} × ${items.length}\n`);
            } else {
                cmd.print(`  ${yellow(nameWithId(item))}\n`);
            }
        }
    }

    async _doAttack(target, cmd) {
        const room = this.world.getRoom(this.player.currentRoom);
        if (room.monsters.length === 0) {
            cmd.print('這裡沒有可以攻擊的目標。\n');
            return;
        }
        let monster = null;
        if (target) {
            monster = room.monsters.find(m =>
                matchTarget(target, m)
            );
            if (!monster) {
                cmd.print(`這裡沒有 ${target}。\n`);
                return;
            }
        } else {
            monster = room.monsters[0];
        }
        // Refresh monster data
        const { getMonster } = await import('./monsters.js');
        const freshMonster = getMonster(monster.id);
        if (!freshMonster) return;
        this.combat = new Combat(this, this.player, freshMonster);
        await this.combat.start((text) => cmd.print(text));
        if (!this.combat.active) {
            if (this.player.isAlive()) {
                this._removeDefeatedMonster();
            } else {
                await this._handleDeath(cmd);
            }
            this.combat = null;
        }
    }

    _removeDefeatedMonster() {
        const room = this.world.getRoom(this.player.currentRoom);
        if (!room) return;
        const defeatedId = this.combat ? this.combat.monster.id : null;
        if (defeatedId) {
            this.player.flags['killed_' + defeatedId] = true;
            room.monsterIds = room.monsterIds.filter(id => id !== defeatedId);
            room._monsters = null;
        }
        // Drop loot
        const monster = this.combat ? this.combat.monster : null;
        if (monster && monster.loot && monster.loot.length > 0) {
            for (const lootId of monster.loot) {
                const item = getItem(lootId);
                if (!item) continue;
                if (item.unique) {
                    const alreadyHas = this.player.inventory.some(i => i.id === lootId);
                    if (alreadyHas) continue;
                }
                room.itemIds.push(lootId);
            }
        }
    }

    async _doTalk(target, cmd) {
        const room = this.world.getRoom(this.player.currentRoom);
        if (!target) {
            cmd.print('你想跟誰說話？\n');
            return;
        }
        const npc = room.npcs.find(n => matchTarget(target, n));
        if (!npc) {
            cmd.print(`這裡沒有 ${target}。\n`);
            return;
        }
        if (!npc.dialogue) {
            cmd.print(`${bold(nameWithId(npc))} 沒有回應。\n`);
            return;
        }
        const flagKey = 'talked_' + npc.id;
        const freedKey = 'freed_' + npc.id;
        if (this.player.flags['killed_dark_knight'] && npc.dialogue.after_fight) {
            cmd.print(`${bold(nameWithId(npc))}說：「${npc.dialogue.after_fight}」\n`);
        } else if (this.player.flags[freedKey] && npc.dialogue.freed) {
            cmd.print(`${bold(nameWithId(npc))}說：「${npc.dialogue.freed}」\n`);
        } else if (!this.player.flags[flagKey] && npc.dialogue.first) {
            cmd.print(`${bold(nameWithId(npc))}說：「${npc.dialogue.first}」\n`);
            this.player.flags[flagKey] = true;
        } else if (npc.dialogue.default) {
            cmd.print(`${bold(nameWithId(npc))}說：「${npc.dialogue.default}」\n`);
        }
        // Prisoner release — offered whenever player has the key and prisoner is still here
        if (npc.id === 'prisoner' && !this.player.flags[freedKey]) {
            const key = this.player.inventory.find(i => i.id === 'silver_key');
            if (key) {
                cmd.print(`${bold(nameWithId(npc))}「你找到銀鑰匙了！快幫我打開柵欄！」\n`);
                const open = await cmd.confirm('要打開柵欄嗎？');
                if (open) {
                    this.player.removeItem('silver_key');
                    this.player.flags[freedKey] = true;
                    this.player.flags['unlocked_dungeon_cell'] = true;
                    cmd.print(`${bold(nameWithId(npc))}「謝謝你！我自由了！」\n`);
                    cmd.print('囚犯快步離開了地牢。\n');
                    room.npcIds = room.npcIds.filter(id => id !== 'prisoner');
                    room._npcs = null;
                }
            }
        }
    }

    async _doTake(target, cmd) {
        const room = this.world.getRoom(this.player.currentRoom);
        if (!target) {
            cmd.print('你想撿起什麼？\n');
            return;
        }
        const itemIdx = room.itemIds.findIndex(id => {
            const item = getItem(id);
            return item && matchTarget(target, item);
        });
        if (itemIdx < 0) {
            cmd.print(`這裡沒有 ${target}。\n`);
            return;
        }
        const itemId = room.itemIds[itemIdx];
        const item = getItem(itemId);
        if (!item.takeable) {
            cmd.print(`你無法拿起 ${bold(nameWithId(item))}。\n`);
            return;
        }
        room.itemIds.splice(itemIdx, 1);
        this.player.addItem(item);
        cmd.print(`你撿起了 ${bold(yellow(nameWithId(item)))}。\n`);
    }

    async _doDrop(target, cmd) {
        if (!target) {
            cmd.print('你想丟掉什麼？\n');
            return;
        }
        const item = this.player.inventory.find(i => matchTarget(target, i));
        if (!item) {
            cmd.print(`你沒有 ${target}。\n`);
            return;
        }
        this.player.removeItem(item.id);
        const room = this.world.getRoom(this.player.currentRoom);
        room.itemIds.push(item.id);
        cmd.print(`你丟下了 ${bold(yellow(nameWithId(item)))}。\n`);
    }

    async _doUse(target, cmd) {
        if (!target) {
            cmd.print('你想使用什麼？\n');
            return;
        }
        const item = this.player.inventory.find(i => matchTarget(target, i));
        if (!item) {
            cmd.print(`你沒有 ${target}。\n`);
            return;
        }
        if (item.use === 'heal') {
            if (this.player.hp >= this.player.maxHp) {
                cmd.print('你的生命值已經全滿了。\n');
                return;
            }
            const healed = this.player.heal(item.heal || 5);
            this.player.removeItem(item.id);
            cmd.print(`你使用了 ${bold(nameWithId(item))}，恢復了 ${bold(green(String(healed)))} 點生命值。\n`);
        } else if (item.use === 'restore_mp') {
            if (this.player.mp >= this.player.maxMp) {
                cmd.print('你的魔力已經全滿了。\n');
                return;
            }
            const restored = this.player.restoreMp(item.restoreMp || 5);
            this.player.removeItem(item.id);
            cmd.print(`你使用了 ${bold(nameWithId(item))}，恢復了 ${bold(cyan(String(restored)))} 點魔力。\n`);
        } else if (item.use === 'key') {
            const room = this.world.getRoom(this.player.currentRoom);
            let unlocked = false;
            for (const nextId of Object.values(room.exits)) {
                const next = this.world.getRoom(nextId);
                if (next && next.locked === item.keyId && !this.player.flags['unlocked_' + next.id]) {
                    cmd.print(`你用 ${bold(nameWithId(item))} 打開了通往 ${next.name} 的鎖！\n`);
                    this.player.flags['unlocked_' + next.id] = true;
                    unlocked = true;
                    break;
                }
            }
            if (!unlocked && room.locked === item.keyId) {
                cmd.print(`你用 ${bold(nameWithId(item))} 打開了鎖！\n`);
                this.player.flags['unlocked_' + room.id] = true;
                unlocked = true;
            }
            if (!unlocked) {
                cmd.print('這裡沒有可以用這把鑰匙打開的鎖。\n');
            }
        } else if (item.use === 'light') {
            const room = this.world.getRoom(this.player.currentRoom);
            cmd.print(`你點燃了 ${bold(nameWithId(item))}，火光驅散了周圍的黑暗。\n`);
            this.player.flags['lit_' + room.id] = true;
        } else if (item.id === 'ancient_amulet') {
            const room = this.world.getRoom(this.player.currentRoom);
            if (room.id === 'temple') {
                cmd.print(bold(yellow('你高舉上古護符，耀眼的光芒瞬間充滿了整座神殿！\n')));
                cmd.print(bold(red('一陣低沉的笑聲從地底傳來...所有被你擊敗的怪物復活了！\n\n')));
                for (const [id, data] of Object.entries(ROOMS)) {
                    const r = this.world.getRoom(id);
                    if (r) {
                        r.monsterIds = [...data.monsters];
                        r._monsters = null;
                    }
                }
                this.player.flags = Object.fromEntries(
                    Object.entries(this.player.flags).filter(([k]) => !k.startsWith('killed_'))
                );
                cmd.print(red('四周的陰影中傳來了熟悉的低吼聲...\n'));
            } else {
                cmd.print(`${bold(nameWithId(item))} 散發出溫暖的光芒，\
你感到一股古老的力量流遍全身。也許這東西在別的地方還有用處。\n`);
            }
        } else {
            cmd.print(`你不知道該如何使用 ${bold(nameWithId(item))}。\n`);
        }
    }

    async _doEquip(target, cmd) {
        if (!target) {
            cmd.print('你想裝備什麼？\n');
            return;
        }
        const item = this.player.inventory.find(i => matchTarget(target, i));
        if (!item) {
            cmd.print(`你沒有 ${target}。\n`);
            return;
        }
        if (!item.equip) {
            cmd.print(`${bold(nameWithId(item))} 無法被裝備。\n`);
            return;
        }
        const slot = item.equip;
        const old = this.player.equipped[slot];
        this.player.equipped[slot] = item;
        let msg = `你裝備了 ${bold(green(nameWithId(item)))}。`;
        if (item.atk) msg += ` 攻擊力 +${item.atk}`;
        if (item.def) msg += ` 防禦力 +${item.def}`;
        cmd.print(msg + '\n');
        if (old) {
            cmd.print(`${bold(nameWithId(old))} 被放回了背包。\n`);
        }
    }

    async _doStatus(cmd) {
        const p = this.player;
        const hpBar = this._bar(p.hp, p.maxHp, 15);
        const mpBar = this._bar(p.mp, p.maxMp, 15);
        cmd.print(`\n${bold('✦ 角色狀態 ✦')}\n`);
        cmd.print(`${bold('等級')}：Lv.${p.level}\n`);
        cmd.print(`${bold('經驗')}：${p.exp}/${p.expToNext}\n`);
        cmd.print(`${bold('生命')}：${hpBar} ${p.hp}/${p.maxHp}\n`);
        cmd.print(`${bold('魔力')}：${mpBar} ${p.mp}/${p.maxMp}\n`);
        cmd.print(`${bold('攻擊')}：${p.totalAtk} ${p.equipped.weapon ? '(含裝備)' : ''}\n`);
        cmd.print(`${bold('防禦')}：${p.totalDef} ${p.equipped.shield ? '(含裝備)' : ''}\n`);
        if (p.equipped.weapon) cmd.print(`${bold('武器')}：${yellow(nameWithId(p.equipped.weapon))}\n`);
        if (p.equipped.shield) cmd.print(`${bold('盾牌')}：${yellow(nameWithId(p.equipped.shield))}\n`);
        cmd.print('\n');
    }

    async _doSave(cmd) {
        const worldState = {};
        for (const [id, room] of Object.entries(this.world._rooms)) {
            worldState[id] = {
                monsterIds: room.monsterIds,
                itemIds: room.itemIds,
                npcIds: room.npcIds,
            };
        }
        const data = {
            player: this.player.toSave(),
            flags: this.player.flags,
            world: worldState,
            timestamp: Date.now(),
        };
        try {
            localStorage.setItem('sud_save', JSON.stringify(data));
            cmd.print(bold(green('✓ 存檔完成！\n')));
        } catch (e) {
            cmd.print(red('存檔失敗：') + e.message + '\n');
        }
    }

    async _doHelp(cmd) {
        const strWidth = (s) => {
            let w = 0;
            for (const ch of s) w += isWide(ch) ? 2 : 1;
            return w;
        };
        const padCenter = (content, width) => {
            const cw = strWidth(content);
            const pad = width - cw;
            const left = Math.floor(pad / 2);
            const right = pad - left;
            return ' '.repeat(left) + content + ' '.repeat(right);
        };

        const BOX_W = 40;
        const title = 'SUD 指令列表';
        const innerW = BOX_W - 2;
        cmd.print(bold('╔' + '═'.repeat(innerW) + '╗\n'));
        cmd.print(bold('║' + padCenter(title, innerW) + '║\n'));
        cmd.print(bold('╚' + '═'.repeat(innerW) + '╝\n'));
        const commands = [
            ['n / s / e / w', '往指定方向移動'],
            ['look / l', '觀察周圍'],
            ['look <目標>', '仔細觀察某個目標'],
            ['inventory / i', '檢視背包'],
            ['attack <目標>', '攻擊目標'],
            ['talk <NPC>', '與 NPC 對話'],
            ['take <物品>', '撿起物品'],
            ['drop <物品>', '丟棄物品'],
            ['use <物品>', '使用物品'],
            ['equip <物品>', '裝備武器或盾牌'],
            ['status / st', '檢視角色狀態'],
            ['save', '儲存遊戲進度'],
            ['quit', '回到標題畫面'],
        ];
        for (const [cmdName, desc] of commands) {
            cmd.print(`  ${yellow(cmdName.padEnd(15))}${desc}\n`);
        }
        cmd.print(`${gray('可使用中括號內的 ID（如 Goblin、Torch）來指定目標。')}\n\n`);
    }

    async _handleDeath(cmd) {
        cmd.print(bold(red('\n☠ 你死了...\n')));
        cmd.print('眼前一片黑暗，你失去了意識...\n\n');
        // Return to title screen by closing
        await cmd.showMessage('遊戲結束。點擊任意鍵回到標題畫面。');
        // Trigger quit
        // We can't directly quit, so we throw a special signal
        this._quitSignal = true;
    }

    loadState(data) {
        // Restore flags from save
        if (data.flags) {
            Object.assign(this.player.flags, data.flags);
        }
        // Restore full world state (monsters, items, NPCs per room)
        if (data.world) {
            for (const [id, state] of Object.entries(data.world)) {
                const room = this.world.getRoom(id);
                if (room) {
                    room.monsterIds = state.monsterIds;
                    room.itemIds = state.itemIds;
                    room.npcIds = state.npcIds;
                    room._monsters = null;
                    room._npcs = null;
                }
            }
        } else {
            // Legacy save fallback — restore from flags only
            for (const [key, val] of Object.entries(this.player.flags)) {
                if (key.startsWith('killed_') && val) {
                    const monsterId = key.slice(7);
                    for (const room of Object.values(this.world._rooms)) {
                        if (room.monsterIds.includes(monsterId)) {
                            room.monsterIds = room.monsterIds.filter(id => id !== monsterId);
                            room._monsters = null;
                        }
                    }
                }
                if (key.startsWith('freed_') && val) {
                    const npcId = key.slice(6);
                    for (const room of Object.values(this.world._rooms)) {
                        if (room.npcIds.includes(npcId)) {
                            room.npcIds = room.npcIds.filter(id => id !== npcId);
                            room._npcs = null;
                        }
                    }
                }
            }
        }
    }

    _bar(current, max, length) {
        const filled = Math.round((current / max) * length);
        const empty = length - filled;
        const color = current / max > 0.5 ? '32' : current / max > 0.25 ? '33' : '31';
        return `\x1B[${color}m${'█'.repeat(filled)}${'░'.repeat(empty)}\x1B[0m`;
    }
}
