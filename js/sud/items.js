export const ITEMS = {
    torch: {
        name: '火把',
        desc: '一根粗糙的火把，頂端纏繞著浸過樹脂的布條。',
        takeable: true,
        use: 'light',
    },
    health_potion: {
        name: '生命藥水',
        desc: '裝有紅色液體的小玻璃瓶，散發微光。',
        takeable: true,
        use: 'heal',
        heal: 10,
        max: 5,
    },
    mana_potion: {
        name: '魔力藥水',
        desc: '裝有藍色液體的小玻璃瓶，微微發亮。',
        takeable: true,
        use: 'restore_mp',
        restoreMp: 10,
        max: 5,
    },
    rusty_sword: {
        name: '鏽蝕長劍',
        desc: '一把老舊的長劍，劍刃佈滿鐵鏽，但仍可使用。',
        takeable: true,
        equip: 'weapon',
        atk: 3,
    },
    iron_sword: {
        name: '鐵製長劍',
        desc: '一柄銳利的鐵劍，劍身在火光中閃爍寒光。',
        takeable: true,
        equip: 'weapon',
        atk: 5,
    },
    wooden_shield: {
        name: '木盾',
        desc: '一面樸素的木盾，表面有幾道深刻的刮痕。',
        takeable: true,
        equip: 'shield',
        def: 2,
    },
    iron_shield: {
        name: '鐵盾',
        desc: '一面堅固的鐵盾，足以抵擋多數攻擊。',
        takeable: true,
        equip: 'shield',
        def: 4,
    },
    silver_key: {
        name: '銀鑰匙',
        desc: '一把銀製的鑰匙，鏤刻著精細的花紋。',
        takeable: true,
        use: 'key',
        keyId: 'silver',
    },
    ancient_amulet: {
        name: '上古護符',
        desc: '一枚雕刻著古老符文的玉質護符，散發溫暖的能量。',
        takeable: true,
        use: 'quest',
    },
    gold_coins: {
        name: '金幣',
        desc: '一小袋閃閃發光的金幣。',
        takeable: true,
        stackable: true,
    },
    bread: {
        name: '黑麵包',
        desc: '一塊乾硬的黑麵包，勉強可以果腹。',
        takeable: true,
        use: 'heal',
        heal: 3,
    },
};

export function getItem(id) {
    const item = ITEMS[id];
    if (!item) return null;
    return { ...item, id };
}
