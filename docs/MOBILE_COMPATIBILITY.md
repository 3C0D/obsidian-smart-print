# Mobile Compatibility Implementation

## Overview

This document describes the implementation of mobile device support for the Obsidian Smart Print plugin. The plugin now works on both desktop and mobile platforms with appropriate functionality for each.

## Problem Statement

The original plugin used Node.js APIs that are **only available on desktop**:

- `os.tmpdir()` - Access to system temporary directory
- `fs` (writeFileSync, unlinkSync) - File system operations
- `child_process.exec()` - Execute system commands
- `path` - Path manipulation

These APIs are **not available on mobile** (iOS/Android) where Obsidian runs in a sandboxed environment.

## Solution Architecture

### Platform Detection

**File:** `src/utils/platform.ts`

```typescript
export function isMobile(): boolean {
	return Platform.isMobile;
}
```

Uses Obsidian's built-in `Platform.isMobile` API to detect the current platform.

---

## Implementation Details

### 1. Browser Print Manager (`src/browserPrintManager.ts`)

**Changes:**

- Added platform detection at the start of `browserPrint()` method
- Conditional logic based on `isMobile()` result

**Desktop Behavior:**

- Uses original implementation
- Creates temporary HTML file
- Opens in default browser via `child_process.exec()`
- Deletes temp file after 5 seconds

**Mobile Behavior:**

- Uses `Printd` library (already in dependencies)
- Parses HTML string with `DOMParser`
- Extracts styles from `<style>` tags
- Calls `printd.print()` for in-app printing
- No file system access needed

### 2. Print Mode Modal (`src/PrintModeModal.ts`)

**Changes:**

- Imported `isMobile()` utility
- Added platform check before rendering browser-based modes

**Desktop Display:**

```
┌─────────────────────────────────┐
│  Print Options                  │
├─────────────────────────────────┤
│  [Basic] [Standard] [Advanced]  │
└─────────────────────────────────┘
```

**Mobile Display:**

```
┌─────────────────────────────────┐
│  Print Options                  │
├─────────────────────────────────┤
│         [Basic]                 │
└─────────────────────────────────┘
```

### 3. Main Plugin (`src/main.ts`)

**New Command Added:**

- **ID:** `quick-print-note`
- **Name:** "Quick print (no modal)"
- **Behavior:** Directly calls `basicPrint()` without showing the modal
- **Use Case:** Fast printing on mobile without extra steps

### 4. Manifest (`manifest.json`)

**Change:**

```json
"isDesktopOnly": false
```

Plugin is now available on both desktop and mobile app stores.

---

## Printing Modes Comparison

| Mode            | Desktop      | Mobile       | Technology        |
| --------------- | ------------ | ------------ | ----------------- |
| **Basic**       | ✅ Available | ✅ Available | Printd (Electron) |
| **Standard**    | ✅ Available | ❌ Not shown | Browser + Node.js |
| **Advanced**    | ✅ Available | ❌ Not shown | Browser + Node.js |
| **Quick Print** | ✅ Available | ✅ Available | Printd (Electron) |

---

## Technical Details

### Why Printd Works on Mobile

- **Printd** is a lightweight printing library that works with Electron
- Obsidian on mobile uses Electron's rendering engine
- Printd uses DOM manipulation and `window.print()` internally
- No file system or process execution required

### Why Browser Modes Don't Work on Mobile

- **Standard/Advanced modes** require opening an external browser
- Mobile Obsidian runs in a sandboxed environment
- No access to `child_process` or system file operations
- Cannot reliably open external applications

---

## User Experience

### Desktop Users

- **No changes** - All 3 modes still available
- Modal shows all options
- Can choose between Basic, Standard, or Advanced
- Quick print command available

### Mobile Users

- **Simplified experience** - Only Basic mode shown
- Modal shows only one button
- Quick print command available for faster access
- Same print quality as desktop Basic mode
- No performance degradation

---

## Files Modified

1. **src/utils/platform.ts** (NEW)
    - Platform detection utility

2. **src/browserPrintManager.ts**
    - Added mobile/desktop conditional logic
    - Dynamic imports for Node.js modules on desktop

3. **src/PrintModeModal.ts**
    - Platform-aware button rendering
    - Mobile shows only Basic button

4. **src/main.ts**
    - Added "Quick print (no modal)" command

5. **manifest.json**
    - Changed `isDesktopOnly` to `false`

---

## Testing Checklist

- [ ] Desktop: All 3 modes work (Basic, Standard, Advanced)
- [ ] Desktop: Quick print command works
- [ ] Desktop: Modal shows all 3 buttons
- [ ] Mobile: Basic mode works
- [ ] Mobile: Quick print command works
- [ ] Mobile: Modal shows only Basic button
- [ ] Mobile: No console errors related to Node.js APIs
- [ ] Mobile: Print preview displays correctly
- [ ] Mobile: Print dialog opens properly

---

## Future Improvements

1. **Mobile-specific optimizations:**
    - Detect screen size and optimize layout
    - Add mobile-friendly font sizes
    - Optimize for portrait/landscape printing

2. **Feature parity:**
    - Consider implementing Standard mode for mobile using web APIs
    - Explore alternative rendering methods

3. **User preferences:**
    - Add setting to skip modal on mobile
    - Remember last used print mode per platform

---

## References

- [Obsidian Platform API](https://docs.obsidian.md/Reference/TypeScript+API/Platform)
- [Printd Library](https://github.com/jmjuanes/printd)
- [Electron Documentation](https://www.electronjs.org/docs)
