export function toDisplayId(id) {
    return id.split('_').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join('');
}

export function nameWithId(entity) {
    return `${entity.name}[${toDisplayId(entity.id)}]`;
}

export function matchTarget(target, entity) {
    const tl = target.toLowerCase();
    return tl === entity.name.toLowerCase() ||
        tl === entity.id.toLowerCase() ||
        tl === toDisplayId(entity.id).toLowerCase();
}
