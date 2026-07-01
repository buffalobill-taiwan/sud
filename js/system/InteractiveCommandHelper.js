// Interactive command lifecycle management

/**
 * Wraps an async interactive command flow with automatic open/close lifecycle.
 * @param {CmdBase} cmd - Command instance
 * @param {Function} flowFn - Async function(cmd) that runs the interactive flow.
 *                           Called after cmd.open().
 *                           Must handle its own close() or return to auto-close.
 * @param {Object} options - { autoClose: boolean, onError?: Function }
 */
export async function wrapInteractiveFlow(cmd, flowFn, options = {}) {
    const autoClose = options.autoClose !== false;

    try {
        cmd.open();
        await flowFn(cmd);
    } catch (err) {
        if (options.onError) {
            options.onError(err);
        } else {
            cmd.error(String(err));
        }
    } finally {
        if (autoClose && !cmd.closed) {
            cmd.close();
        }
    }
}

/**
 * Lifecycle manager for multi-step interactive sessions.
 * Tracks state transitions and cleanup.
 */
export class InteractiveSession {
    constructor(cmd) {
        this.cmd = cmd;
        this.state = 'init';  // init -> running -> done
        this.data = {};
        this.hooks = { onStart: [], onStep: [], onComplete: [] };
    }

    isRunning() { return this.state === 'running'; }
    isDone() { return this.state === 'done'; }

    start() {
        if (this.state !== 'init') throw new Error('Session already started');
        this.state = 'running';
        this.cmd.open();
        for (const hook of this.hooks.onStart) hook(this);
    }

    step(stepData) {
        if (this.state !== 'running') throw new Error('Session not running');
        Object.assign(this.data, stepData);
        for (const hook of this.hooks.onStep) hook(this);
    }

    async complete() {
        if (this.state !== 'running') throw new Error('Session not running');
        this.state = 'done';
        for (const hook of this.hooks.onComplete) hook(this);
        if (!this.cmd.closed) {
            this.cmd.close();
        }
    }

    onStart(hook) { this.hooks.onStart.push(hook); return this; }
    onStep(hook) { this.hooks.onStep.push(hook); return this; }
    onComplete(hook) { this.hooks.onComplete.push(hook); return this; }

    /**
     * Run a series of selections with callback aggregation.
     * @param {Array<Object>} selections - Array of { prompt, options, onPick }
     */
    async runSelectionSeries(selections) {
        for (let i = 0; i < selections.length; i++) {
            const sel = selections[i];
            const result = await this.cmd.selectAsync({
                text: sel.prompt,
                options: sel.options,
                onPick: (row, col, value) => {
                    this.data[`step_${i}`] = { row, col, value };
                    if (sel.onPick) sel.onPick(row, col, value);
                },
            });
            if (!result) {
                throw new Error('Selection cancelled');
            }
        }
    }
}
