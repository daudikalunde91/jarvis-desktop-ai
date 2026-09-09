/**
 * Electron development launcher.
 *
 * Electron expects its application entry point to be a JavaScript file.  A
 * TypeScript file passed directly to the Electron CLI is handled by
 * Electron's module loader before tsx's require hook gets a chance to
 * transform it, which produces ERR_UNKNOWN_FILE_EXTENSION for .ts.
 *
 * This tiny CommonJS shim loads tsx first, then requires the real TypeScript
 * entry point through the normal CommonJS require path.
 */
require('tsx/cjs');
require('./main.ts');
