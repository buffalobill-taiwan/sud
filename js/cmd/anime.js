import { CmdBase } from './CmdBase.js';

export class AnimeCmd extends CmdBase {
    static get commandName() { return 'anime'; }
    static get help() { return 'Play anime frames (124 frames, 30fps, Ctrl+C to stop)'; }
    static get menu() { return 'Anime player'; }

    async execute(args) {
        const { default: data } = await import('./art/anime.js');
        const { cols, rows, frames } = data;
        const termRows = rows / 2;  // ▀ half-block: 2 px rows → 1 terminal row

        // Pre-render each frame as an ANSI string
        const rendered = frames.map(pixels => {
            let out = '\x1B[H';   // cursor to home before each frame
            for (let ty = 0; ty < termRows; ty++) {
                for (let x = 0; x < cols; x++) {
                    const fg = pixels[(ty * 2) * cols + x];
                    const bg = (ty * 2 + 1) < rows ? pixels[(ty * 2 + 1) * cols + x] : 0;
                    out += `\x1B[38;5;${fg};48;5;${bg}m▀`;
                }
                out += '\x1B[0m\r\n';
            }
            return out;
        });

        // Hide cursor, clear screen, start loop
        this.term.write('\x1B[?25l\x1B[2J');
        this.holdBusy();
        const gen = this.abortGeneration;
        let frameIdx = 0;

        const interval = setInterval(() => {
            if (gen !== this.abortGeneration) {
                clearInterval(interval);
                this.term.write('\x1B[?25h\x1B[2J\x1B[H');
                this.releaseBusy();
                return;
            }
            this.term.write(rendered[frameIdx]);
            frameIdx = (frameIdx + 1) % rendered.length;
        }, 1000 / 30);
    }
}
