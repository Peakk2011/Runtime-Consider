// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
/**
 * Preload Script
 * 
 * This script runs before any window content loads.
 * It exposes secure APIs to the renderer process via contextBridge.
 */

import "./preload/electronAPI";

// Log that preload script has been initialized
console.log("[Preload] Runtime Consider preload script initialized");