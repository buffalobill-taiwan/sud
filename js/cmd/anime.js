import { CmdBase } from './CmdBase.js';

export class AnimeCmd extends CmdBase {
    static get commandName() { return 'anime'; }
    static get help() { return 'Play anime frames (124 frames, 30fps, Ctrl+C to stop)'; }
    static get menu() { return 'Anime player'; }

    async execute(args) {
        const { default: data } = await import('./art/anime.js');
        const { cols, rows, frames } = data;
        const termRows = rows / 2;  // ▀ half-block: 2 px rows → 1 terminal row

        // Pre-render all frames with cursor-up prefix for in-place update
        const rendered = frames.map(pixels => {
            let out = `\x1B[${termRows}A`;
            for (let ty = 0; ty < termRows; ty++) {
                for (let x = 0; x < cols; x++) {
                    const fg = pixels[ty * 2 * cols + x];
                    const bg = (ty * 2 + 1) < rows ? pixels[(ty * 2 + 1) * cols + x] : 0;
                    out += `\x1B[38;5;${fg};48;5;${bg}m▀\x1B[0m`;
                }
                out += '\n';
            }
            return out;
        });

        // Print frame 0 without cursor-up (first output, like art command)
        let firstFrame = '';
        const pixels0 = frames[0];
        for (let ty = 0; ty < termRows; ty++) {
            for (let x = 0; x < cols; x++) {
                const fg = pixels0[ty * 2 * cols + x];
                const bg = (ty * 2 + 1) < rows ? pixels0[(ty * 2 + 1) * cols + x] : 0;
                firstFrame += `\x1B[38;5;${fg};48;5;${bg}m▀\x1B[0m`;
            }
            firstFrame += '\n';
        }
        this.print(firstFrame);

        this.holdBusy();
        const gen = this.abortGeneration;
        let frameIdx = 0;

        this._afterDrain(() => {
            if (gen !== this.abortGeneration) { this.releaseBusy(); return; }

            const interval = setInterval(() => {
                if (gen !== this.abortGeneration) {
                    clearInterval(interval);
                    this.releaseBusy();
                    return;
                }
                frameIdx = (frameIdx + 1) % rendered.length;
                this.term.write(rendered[frameIdx]);
            }, Math.round(1000 / 30));
        });
    }
}
