import { Platform } from "obsidian";

/**
 * Checks if the current platform is mobile (iOS/Android).
 * 
 * This is used throughout the plugin to adapt behavior for mobile:
 * - Skip modals on mobile (limited screen space)
 * - Use Printd instead of browser print (no Node.js modules)
 * - Adjust UI elements for touch interfaces
 * 
 * @returns true if running on mobile, false if on desktop
 */
export function isMobile(): boolean {
	return Platform.isMobile;
}
