import { getItem } from './items.js';
import { getMonster, getNPC } from './monsters.js';

export const ROOMS = {
    entrance_hall: {
        id: 'entrance_hall',
        name: '入口大廳',
        desc: '你站在一座寬敞的石造大廳中。頭頂的拱頂高聳入雲，\
牆上的火炬發出搖曳的光芒。地面鋪著磨損的石板，\
上面刻滿了古老的符文。\n\n北方的通道延伸進黑暗之中，\
東邊有一扇半掩的木門。',
        exits: { n: 'dark_corridor', e: 'storage_room' },
        npcs: ['old_man'],
        items: ['torch', 'bread'],
        monsters: [],
        dark: false,
    },
    dark_corridor: {
        id: 'dark_corridor',
        name: '黑暗走廊',
        desc: '一條狹長的走廊，黑暗幾乎吞噬了一切。\
牆壁上滲著水珠，空氣中瀰漫著霉味。\
你腳下踩到了什麼脆硬的東西——\
是骨頭。',
        exits: { s: 'entrance_hall', n: 'guard_room', e: 'armory', w: 'library' },
        npcs: [],
        items: [],
        monsters: ['rat', 'spider'],
        dark: true,
    },
    storage_room: {
        id: 'storage_room',
        name: '儲藏室',
        desc: '一間堆滿了木箱和酒桶的狹窄房間。\
灰塵在火炬光中飛舞，角落裡有一個被遺忘的鐵箱。',
        exits: { w: 'entrance_hall' },
        npcs: [],
        items: ['health_potion', 'silver_key'],
        monsters: ['spider'],
        dark: false,
    },
    guard_room: {
        id: 'guard_room',
        name: '警衛室',
        desc: '這裡曾經是警衛的休息室。牆上掛著一面破舊的旗幟，\
壁爐中殘留著灰燼。一張翻倒的桌子上散落著紙牌。',
        exits: { s: 'dark_corridor', n: 'dungeon_cell' },
        npcs: [],
        items: ['rusty_sword', 'wooden_shield'],
        monsters: ['goblin'],
        dark: false,
    },
    armory: {
        id: 'armory',
        name: '武器庫',
        desc: '一間小型武器庫，架上陳列著各種武器與防具。\
可惜大多數已經腐朽不堪使用了。\
不過在角落裡似乎還有一些堪用的裝備。',
        exits: { w: 'dark_corridor' },
        npcs: [],
        items: ['iron_shield'],
        monsters: ['skeleton'],
        dark: false,
    },
    library: {
        id: 'library',
        name: '圖書館',
        desc: '一間圓形的圖書館，高聳的書架上塞滿了佈滿灰塵的書籍。\
房間中央有一張巨大的橡木桌，桌上攤開著一本古老的卷軸。',
        exits: { e: 'dark_corridor', n: 'temple' },
        npcs: [],
        items: ['mana_potion', 'health_potion'],
        monsters: ['ghost'],
        dark: false,
    },
    dungeon_cell: {
        id: 'dungeon_cell',
        name: '地牢',
        desc: '陰暗潮濕的地牢，鐵柵欄將房間一分為二。\
柵欄的另一側似乎關著什麼人。\
柵欄上掛著一把堅固的鎖。',
        exits: { s: 'guard_room' },
        npcs: ['prisoner'],
        items: [],
        monsters: [],
        dark: false,
        locked: 'silver',
    },
    temple: {
        id: 'temple',
        name: '古老神殿',
        desc: '一座莊嚴肅穆的神殿。五彩的玻璃窗投射出斑斕的光芒，\
祭壇上擺放著一個閃閃發光的聖杯。\
空氣中充滿了安詳的氣息。',
        exits: { s: 'library', n: 'boss_chamber' },
        npcs: [],
        items: ['health_potion', 'mana_potion'],
        monsters: [],
        dark: false,
        heal: true,
    },
    treasure_vault: {
        id: 'treasure_vault',
        name: '寶藏庫',
        desc: '一間寬敞的石室，中央堆積著成山的金幣和珠寶。\
牆壁上鑲嵌著發光的寶石，照亮了整個房間。\
這就是地城的最深處，所有寶藏都聚集在這裡。',
        exits: { s: 'boss_chamber' },
        npcs: [],
        items: ['gold_coins', 'health_potion', 'mana_potion'],
        monsters: [],
        dark: false,
        requireFlag: 'killed_dark_knight',
    },
    boss_chamber: {
        id: 'boss_chamber',
        name: '黑暗王座',
        desc: '一個巨大的圓形廳堂，中央矗立著一座黑曜石王座。\
牆壁上刻滿了古老的戰鬥壁畫。\
空氣中充滿了壓迫感，讓你不寒而慄。\
北方的通道通往更深處的寶藏庫。',
        exits: { s: 'temple', n: 'treasure_vault' },
        npcs: [],
        items: [],
        monsters: ['dark_knight'],
        dark: false,
        boss: true,
    },
};

export class Room {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.desc = data.desc;
        this.exits = data.exits || {};
        this.npcIds = data.npcs || [];
        this.itemIds = data.items || [];
        this.monsterIds = data.monsters || [];
        this.dark = data.dark || false;
        this.locked = data.locked || null;
        this.requireFlag = data.requireFlag || null;
        this.heal = data.heal || false;
        this.boss = data.boss || false;
        this._npcs = null;
        this._monsters = null;
    }

    get npcs() {
        if (!this._npcs) {
            this._npcs = this.npcIds.map(id => getNPC(id)).filter(Boolean);
        }
        return this._npcs;
    }

    get monsters() {
        if (!this._monsters) {
            this._monsters = this.monsterIds.map(id => getMonster(id)).filter(Boolean);
        }
        return this._monsters;
    }

    get items() {
        return this.itemIds.map(id => getItem(id)).filter(Boolean);
    }

    get exitsList() {
        const dirMap = { n: '北[N]', s: '南[S]', e: '東[E]', w: '西[W]', u: '上[U]', d: '下[D]' };
        return Object.entries(this.exits).map(([k]) => dirMap[k] || k);
    }

    getExitDir(dir) {
        const map = { n: 'n', s: 's', e: 'e', w: 'w', u: 'u', d: 'd',
                      北: 'n', 南: 's', 東: 'e', 西: 'w', 上: 'u', 下: 'd' };
        return map[dir] || null;
    }
}

export class World {
    constructor() {
        this._rooms = {};
        for (const [id, data] of Object.entries(ROOMS)) {
            this._rooms[id] = new Room(data);
        }
    }

    getRoom(id) {
        return this._rooms[id] || null;
    }

    getStartingRoom() {
        return this._rooms['entrance_hall'];
    }
}
