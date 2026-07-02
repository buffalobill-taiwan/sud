import { SystemManager } from './system.js';

function instance() {
    const s = SystemManager.instance;
    if (!s) throw new Error('SystemManager not initialized');
    return s;
}

export const system = new Proxy({}, {
    get(_, prop) {
        const s = instance();
        const v = s[prop];
        return typeof v === 'function' ? (...args) => v.apply(s, args) : v;
    }
});

export const term = new Proxy({}, {
    get(_, prop) {
        const t = instance().term;
        const v = t[prop];
        return typeof v === 'function' ? (...args) => v.apply(t, args) : v;
    }
});
