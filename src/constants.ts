/**
 * Standardized error messages used throughout the plugin.
 * 
 * Centralized error messages ensure consistency and make
 * it easier to update user-facing text in one place.
 */
export const ERROR_MESSAGES = {
	// Print errors
	NO_CONTENT: "No content to print",
	PRINT_FAILED: "Failed to print content",
	PRINT_DIALOG_FAILED: "Failed to open print dialog",
	PRINT_DIALOG_FAILED_DETAILS:
		"Failed to open print dialog. Check console for details.",
	PREPARE_CONTENT_FAILED: "Failed to prepare print content",

	// File/Folder errors
	NO_ACTIVE_VIEW: "No active markdown view",
	FOLDER_NOT_FOUND: "Could not resolve folder.",
	NO_MARKDOWN_FILES: "No markdown files found in the folder.",

	// Style errors
	STYLE_NOT_FOUND: "Default styling could not be located.",
	PLUGIN_PATH_NOT_FOUND:
		"Could not find the plugin path. No default print styles will be added.",

	// Preview errors
	PREVIEW_CAPTURE_FAILED: "Failed to capture preview content",

	// Validation errors
	INVALID_FONT_SIZE: "Please enter a valid positive number",
	FONT_SIZE_POSITIVE: "Please enter a positive number",
} as const;
