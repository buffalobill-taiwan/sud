export function centeredDialogPos(term, w, h) {
    return {
        x: Math.floor((term.cols - w) / 2),
        y: Math.floor((term.rows - h) / 2),
    };
}
