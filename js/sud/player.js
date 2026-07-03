export class Player {
    constructor() {
        this.hp = 20;
        this.maxHp = 20;
        this.mp = 10;
        this.maxMp = 10;
        this.atk = 5;
        this.def = 2;
        this.level = 1;
        this.exp = 0;
        this.expToNext = 10;
        this.inventory = [];
        this.equipped = { weapon: null, shield: null };
        this.currentRoom = 'entrance_hall';
        this.flags = {};
    }

    get totalAtk() {
        let bonus = this.atk;
        if (this.equipped.weapon) {
            const item = this.equipped.weapon;
            bonus += item.atk || 0;
        }
        return bonus;
    }

    get totalDef() {
        let bonus = this.def;
        if (this.equipped.shield) {
            const item = this.equipped.shield;
            bonus += item.def || 0;
        }
        return bonus;
    }

    addItem(item) {
        this.inventory.push(item);
    }

    removeItem(itemId) {
        const idx = this.inventory.findIndex(i => i.id === itemId);
        if (idx >= 0) {
            const item = this.inventory[idx];
            // unequip if equipped
            if (this.equipped.weapon && this.equipped.weapon.id === itemId) {
                this.equipped.weapon = null;
            }
            if (this.equipped.shield && this.equipped.shield.id === itemId) {
                this.equipped.shield = null;
            }
            this.inventory.splice(idx, 1);
            return true;
        }
        return false;
    }

    hasItem(itemId) {
        return this.inventory.some(i => i.id === itemId);
    }

    equip(itemId) {
        const item = this.inventory.find(i => i.id === itemId);
        if (!item || !item.equip) return false;
        if (item.equip === 'weapon') {
            if (this.equipped.weapon) {
                // swap: put current back to inventory
            }
            this.equipped.weapon = item;
        } else if (item.equip === 'shield') {
            this.equipped.shield = item;
        }
        return true;
    }

    heal(amount) {
        const before = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        return this.hp - before;
    }

    restoreMp(amount) {
        const before = this.mp;
        this.mp = Math.min(this.maxMp, this.mp + amount);
        return this.mp - before;
    }

    takeDamage(dmg) {
        const actual = Math.max(1, dmg - this.totalDef);
        this.hp = Math.max(0, this.hp - actual);
        return actual;
    }

    addExp(amount) {
        this.exp += amount;
        let leveled = false;
        while (this.exp >= this.expToNext) {
            this.exp -= this.expToNext;
            this.level++;
            this.maxHp += 5;
            this.hp = this.maxHp;
            this.maxMp += 3;
            this.mp = this.maxMp;
            this.atk += 2;
            this.def += 1;
            this.expToNext = Math.floor(this.expToNext * 1.5);
            leveled = true;
        }
        return leveled;
    }

    isAlive() {
        return this.hp > 0;
    }

    toSave() {
        return {
            hp: this.hp,
            maxHp: this.maxHp,
            mp: this.mp,
            maxMp: this.maxMp,
            atk: this.atk,
            def: this.def,
            level: this.level,
            exp: this.exp,
            expToNext: this.expToNext,
            inventory: this.inventory,
            equipped: {
                weapon: this.equipped.weapon ? { ...this.equipped.weapon } : null,
                shield: this.equipped.shield ? { ...this.equipped.shield } : null,
            },
            currentRoom: this.currentRoom,
            flags: { ...this.flags },
        };
    }

    static fromSave(data) {
        const p = new Player();
        p.hp = data.hp;
        p.maxHp = data.maxHp;
        p.mp = data.mp;
        p.maxMp = data.maxMp;
        p.atk = data.atk;
        p.def = data.def;
        p.level = data.level;
        p.exp = data.exp;
        p.expToNext = data.expToNext;
        p.inventory = data.inventory || [];
        p.equipped = data.equipped || { weapon: null, shield: null };
        // Re-link equipped references to inventory objects (so === checks work)
        if (p.equipped.weapon) {
            const found = p.inventory.find(i => i.id === p.equipped.weapon.id);
            if (found) p.equipped.weapon = found;
        }
        if (p.equipped.shield) {
            const found = p.inventory.find(i => i.id === p.equipped.shield.id);
            if (found) p.equipped.shield = found;
        }
        p.currentRoom = data.currentRoom;
        p.flags = data.flags || {};
        return p;
    }
}
