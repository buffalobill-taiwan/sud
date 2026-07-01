// Menu dialog registry and coordination

import { SystemManager } from './system.js';
import { InputDialog } from '../dialog/InputDialog.js';

/**
 * Registry for commands with menu dialogs (openMenuDialog static method).
 * Centralizes menu dialog creation and lifecycle.
 */
export class MenuDialogRegistry {
    constructor() {
        this.registry = new Map();
    }

    /**
     * Register a menu dialog handler.
     * @param {string} commandName - Command name
     * @param {Function} dialogFn - Function() -> creates and opens dialog
     */
    register(commandName, dialogFn) {
        this.registry.set(commandName, dialogFn);
    }

    /**
     * Open a registered menu dialog.
     * @param {string} commandName - Command name
     */
    open(commandName) {
        const dialogFn = this.registry.get(commandName);
        if (!dialogFn) {
            console.warn(`No menu dialog registered for: ${commandName}`);
            return;
        }
        dialogFn();
    }

    /**
     * Helper: create a simple input dialog for a command.
     * @param {Object} options - { title, prompt, onConfirm, onCancel, initialValue, validator }
     */
    createInputDialog(options = {}) {
        const system = SystemManager.instance;
        const cmd = system._currentCmd || this;

        const dialogInstance = new InputDialog(
            options.title || 'Input',
            options.initialValue || ''
        );

        dialogInstance.onConfirm = (value) => {
            if (options.validator && !options.validator(value)) {
                dialogInstance.setError('Invalid input');
                return;
            }
            if (options.onConfirm) {
                options.onConfirm(value);
            }
            dialogInstance.close();
        };

        dialogInstance.onCancel = () => {
            if (options.onCancel) {
                options.onCancel();
            }
            dialogInstance.close();
        };

        return dialogInstance;
    }
}

// Singleton instance
let instance = null;

export function getMenuDialogRegistry() {
    if (!instance) {
        instance = new MenuDialogRegistry();
    }
    return instance;
}
