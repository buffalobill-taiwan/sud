export const MONSTERS = {
    rat: {
        name: '巨鼠',
        desc: '一隻如貓般大的老鼠，紅眼中閃爍著兇光。',
        hp: 8,
        atk: 2,
        def: 0,
        exp: 3,
        loot: [],
        dialogue: null,
    },
    spider: {
        name: '洞穴蜘蛛',
        desc: '一隻佈滿斑紋的巨型蜘蛛，八隻眼睛死死盯著你。',
        hp: 12,
        atk: 4,
        def: 1,
        exp: 5,
        loot: [],
        dialogue: null,
    },
    goblin: {
        name: '哥布林',
        desc: '一個矮小醜陋的綠皮膚生物，手持生鏽的短刀。',
        hp: 15,
        atk: 5,
        def: 2,
        exp: 8,
        loot: ['gold_coins'],
        dialogue: {
            first: '「該死的探險者…滾出我們的地盤！」',
            default: '「吼嘎！我要把你的骨頭拿來當牙籤！」',
        },
    },
    skeleton: {
        name: '骷髏戰士',
        desc: '一具披著破爛鎧甲的骷髏，空洞的眼眶中閃爍著幽藍的火光。',
        hp: 20,
        atk: 6,
        def: 3,
        exp: 12,
        loot: ['iron_sword'],
        dialogue: null,
    },
    ghost: {
        name: '幽魂',
        desc: '一個半透明的靈體，散發出刺骨的寒意。',
        hp: 14,
        atk: 8,
        def: 0,
        exp: 15,
        loot: [],
        dialogue: {
            first: '「嗚…離開…這裡…不是…你該來的地方…」',
            default: '「永…生…不…得…安…息…」',
        },
    },
    dark_knight: {
        name: '黑暗騎士',
        desc: '一名身穿漆黑鎧甲的騎士，手持巨大的雙手劍，散發著不祥的氣息。',
        hp: 35,
        atk: 10,
        def: 5,
        exp: 30,
        loot: ['ancient_amulet', 'gold_coins'],
        dialogue: {
            first: '「你終於來了…但我不能讓你通過。這是我的職責。」',
            default: '「放下武器，或面對你的命運。」',
        },
    },
};

export const NPCS = {
    old_man: {
        name: '老人',
        desc: '一位白髮蒼蒼的老人，坐在角落的椅子上，手中捧著一本厚重的書。',
        dialogue: {
            first: '「啊，又有新的冒險者來了。北方的大廳裡有你需要的东西，但小心那些怪物。」',
            default: '「記住，勇敢不代表魯莽。準備好了再前進。」',
            after_fight: '「你打敗黑暗騎士了？真是了不起！地城深處的寶藏現在屬於你了。」',
        },
    },
    prisoner: {
        name: '囚犯',
        desc: '一個被關在鐵柵欄後的瘦弱男子，看到你時眼中燃起希望。',
        dialogue: {
            first: '「求求你！救救我出去！我被那些哥布林關在這裡好幾天了…聽說銀鑰匙可以打開這扇門。」',
            default: '「找到銀鑰匙了嗎？就在東邊的儲藏室裡。」',
            freed: '「謝謝你！我終於自由了！作為回報，告訴你一個秘密：黑暗騎士的弱點是火。」',
        },
    },
};

export function getMonster(id) {
    const m = MONSTERS[id];
    if (!m) return null;
    return { ...m, id, maxHp: m.hp };
}

export function getNPC(id) {
    const n = NPCS[id];
    if (!n) return null;
    return { ...n, id };
}
