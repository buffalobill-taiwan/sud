// Interactive command lifecycle management

/**
 * Wraps an async interactive command flow with automatic open/close lifecycle.
 * @param {CmdBase} cmd - Command instance
 * @param {Function} flowFn - Async function(cmd) that runs the interactive flow.
 *                           Called after cmd.open().
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
