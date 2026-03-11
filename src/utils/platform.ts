import { Platform } from "obsidian";

/**
 * Checks if the current platform is mobile (iOS/Android)
 * @returns true if running on mobile, false if on desktop
 */
export function isMobile(): boolean {
	return Platform.isMobile;
}
