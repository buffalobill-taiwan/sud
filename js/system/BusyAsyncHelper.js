// Async busy-wait helper with abort epoch detection

/**
 * Creates an abort guard function for use in async loops.
 * Detects when Ctrl+C (abort epoch change) occurs.
 * @param {Function} getAbortEpoch - Function that returns current epoch value
 * @returns {Function} Guard function: returns true if NOT aborted, false if aborted
 */
export function createAbortGuard(getAbortEpoch) {
    const gen = getAbortEpoch();
    return () => gen === getAbortEpoch();
}

/**
 * Schedule a callback with setTimeout, abort-safe.
 * @param {Function} getAbortEpoch - Function that returns current epoch value
 * @param {Function} callback - Function to call after delay
 * @param {number} ms - Delay in milliseconds
 * @returns {number} Timeout ID (can be cancelled via clearTimeout)
 */
export function scheduleWithAbort(getAbortEpoch, callback, ms) {
    const guard = createAbortGuard(getAbortEpoch);
    const timeoutId = setTimeout(() => {
        if (guard()) callback();
    }, ms);
    return timeoutId;
}

/**
 * Wraps an RAF loop with abort epoch checking and automatic cleanup.
 * @param {Function} getAbortEpoch - Function that returns current epoch value
 * @param {Function} loopFn - Function(ts, isAborted) -> void. Called per frame.
 *                            isAborted = boolean: true if Ctrl+C was pressed.
 *                            loopFn should return false to stop looping, or void to continue.
 * @param {Function} cleanupFn - Called when loop ends (abort or explicit stop)
 * @returns {Object} { stop: Function } - Call stop() to end the loop
 */
export function createRAFGuard(getAbortEpoch, loopFn, cleanupFn) {
    const gen = getAbortEpoch();
    let rafId = null;

    const loop = (ts) => {
        const isAborted = gen !== getAbortEpoch();
        const shouldStop = loopFn(ts, isAborted);
        if (shouldStop === false || isAborted) {
            cleanup();
        } else {
            rafId = requestAnimationFrame(loop);
        }
    };

    const cleanup = () => {
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        if (cleanupFn) cleanupFn();
    };

    return {
        start() { rafId = requestAnimationFrame(loop); },
        stop() { cleanup(); },
    };
}
