<img src="../assets/Runtime Consider.png" alt="Runtime Consider Logo" width="150"/>

# Technical Architecture Documentation <br>Runtime Consider

## Table of Contents
1. [Tech Stack](#tech-stack)
2. [Application Architecture](#application-architecture)
3. [Core Components](#core-components)
4. [Key Functions & Methods](#key-functions--methods)
5. [Process Model](#process-model)
6. [Configuration System](#configuration-system)
7. [Utilities & Helpers](#utilities--helpers)

---

## Tech Stack

### Core Framework
- **Electron 39.2.7** - Desktop application framework
  - Combines Node.js and Chromium engine
  - Provides native OS integrations

### Build & Development Tools
- **Vite 5.4.21** - Frontend build tool
  - HMR (Hot Module Replacement) or maybe vite hot reload?
  - Optimized production builds
  - Three separate Vite configurations:
    - `vite.main.config.ts` - Main process
    - `vite.renderer.config.ts` - Renderer process
    - `vite.preload.config.ts` - Preload scripts

- **Electron Forge 7.10.2** - Build tool for Electron applications
  - Automated packaging and distribution
  - Support for multiple target platforms (Windows, macOS, Linux)

### Language & Type System
- **TypeScript 4.5.4** - Strongly typed JavaScript
  - Full type safety across the Runtime Consider application
  - Path aliases configured

- **ESLint 8.57.1** - Code linting and quality
  - TypeScript support via `@typescript-eslint/parser`
  - Import validation via `eslint-plugin-import`

### Data Validation & Schema
- **Zod 4.3.4** - TypeScript-first schema validation
  - Runtime type checking
  - Type inference from schemas

### Logging & Monitoring
- **electron-log 5.4.3** - Structured logging for Electron apps
  - Main and renderer process logging
  - File-based log persistence

### Cross-Platform Support
- **electron-squirrel-startup 1.0.1** - Windows installer handling
  - Automatic start on Windows installations
  - Clean application launching

---

## Application Architecture

### Process Model Overview

```
  Main Process (Node.js)
  ├─ App Lifecycle Management       
  ├─ Window Creation & Management   
  ├─ Native OS Integration          
  └─ Electron Bridge                
  ────────────────┬───────────────
                  │
      ┌───────────┴───────────┐
      │                       │
┌─────▼───────┐        ┌──────▼──────┐
│  Renderer   │        │   Preload   │
│   Process   │        │   Process   │
│ (Chromium)  │        │  (Security) │
└─────────────┘        └─────────────┘
```

### Directory Structure & Purpose

```
src/
├── main.ts                                # Entry point - initializes application
├── preload.ts                             # Preload script for renderer security
├── preload/
│   └── electronAPI.ts                     # IPC bridge - exposes safe APIs
├── types/
│   └── index.ts                           # Type definitions for app
├── config/
│   └── window.json                        # Window configuration (size, bounds)
├── core/
│   ├── bootstrap.ts                       # Core services initialization
│   ├── app/
│   │   └── createApplication.ts           # Application initialization
│   ├── window/
│   │   ├── createWindow.ts                # Window creation orchestration
│   │   ├── windowConfig.ts                # Window configuration schema
│   │   └── hwnd/                          # Hardware window interface
│   │       ├── browserWindow.ts           # BrowserWindow instantiation
│   │       ├── windowOptions.ts           # BrowserWindow options factory
│   │       └── windowLoader.ts            # URL/file loading strategy
│   ├── storage/
│   │   ├── storageManager.ts              # File system storage operations
│   │   ├── schema.ts                      # Zod schemas for validation
│   │   └── entryStateManager.ts           # Immutability enforcement
│   ├── ipc/
│   │   └── registerHandlers.ts            # IPC handler registration
│   ├── config/
│   │   └── configManager.ts               # Configuration management
│   ├── error/
│   │   └── errorHandler.ts                # Error handling & recovery
│   └── utils/
│       └── dateUtils.ts                   # Date utilities & timeline
├── renderer/
│   ├── renderer.ts                        # Renderer process setup
│   ├── scripts/                           # Frontend scripts
│   │   ├── index.ts                       # Main renderer logic
│   │   └── dev-functions.ts               # Development utilities
│   └── stylesheet/                        # UI styling
│       ├── index.css                      # Main styles
│       ├── variables.css                  # CSS variables & theme
│       └── components.css                 # Component styles
├── utils/
│   ├── logger.ts                          # Structured logging system
│   └── userAgent.ts                       # System & storage information
└── __tests__/
    └── index.test.ts                      # Test suite (Jest-ready)
```

---

## Core Components

### 1. Application Initialization (`createApplication`)

**File:** [src/core/app/createApplication.ts](../src/core/app/createApplication.ts)

**Purpose:** Bootstraps the Electron application lifecycle

**Key Features:**
- Handles Squirrel Windows installer startup
- Manages app ready/window-all-closed/activate events
- Ensures single window management for macOS

**Event Handling:**
- `app.whenReady()` - Initializes window creation when app is ready
- `window-all-closed` - Quits app on non-Darwin platforms
- `activate` - Recreates window when app is activated (macOS behavior)

### 2. Window Management System

#### `createWindow` - Window Creation Orchestration
**File:** [src/core/window/createWindow.ts](../src/core/window/createWindow.ts)

**Responsibilities:**
- Instantiates BrowserWindow with configured options
- Loads window content (URL or file)
- Measures and logs performance metrics

**Performance Metrics:**
```
- Window shown: Time to display window
- Content loaded: Time to load HTML/CSS/JS
- DOM ready: Time until interactive
```

**Event Listeners:**
- `show` - Logs window display timing
- `did-finish-load` - Tracks content loading
- `dom-ready` - Captures DOM interaction readiness

#### `createBrowserWindow` - Window Factory
**File:** [src/core/window/hwnd/browserWindow.ts](../src/core/window/hwnd/browserWindow.ts)

**Purpose:** Creates Electron BrowserWindow instances

**Function:**
```typescript
export const createBrowserWindow = (): BrowserWindow => {
    return new BrowserWindow(getWindowOptions());
};
```

#### `getWindowOptions` - Configuration Factory
**File:** [src/core/window/hwnd/windowOptions.ts](../src/core/window/hwnd/windowOptions.ts)

**Configuration Provided:**
- **Dimensions:** Width, height, min/max bounds
- **Visual:** Resizable, fullscreen, title bar styling
- **Platform-Specific:**
  - **macOS:** Hidden inset title bar with traffic light position
  - **Windows:** Hidden title bar with overlay
  - **Linux:** Standard title bar
- **Title Bar Overlay:** Custom coloring with dark/light mode detection
- **Web Preferences:** Preload script injection for security

#### `loadWindowContent` - Content Loader
**File:** [src/core/window/hwnd/windowLoader.ts](../src/core/window/hwnd/windowLoader.ts)

**Dual-Mode Loading:**
```
Development: Loads from Vite dev server
Production: Loads bundled HTML from file system
```

**Environment Detection:**
- `MAIN_WINDOW_VITE_DEV_SERVER_URL` - Points to dev server
- `MAIN_WINDOW_VITE_NAME` - Points to production build

#### `windowConfig` - Configuration Schema
**File:** [src/core/window/windowConfig.ts](../src/core/window/windowConfig.ts)

**Configured from:** [src/config/window.json](../src/config/window.json)

**Properties:**
```typescript
interface WindowConfig {
    size: {
        width: number;           // Default: 380px
        height: number;          // Default: 600px
        min?: { width, height }; // Minimum bounds
        max?: { width, height }; // Maximum bounds
    };
    resizable?: boolean;         // Default: true
    fullscreen?: boolean;        // Default: false
    title?: string;              // Default: "Runtime Consider"
}
```

---

## Key Functions & Methods

### Logger System

**File:** [src/utils/logger.ts](../src/utils/logger.ts)

#### Interface: `Logger`

```typescript
interface Logger {
    info(message: string, data?: Record<string, unknown>): void;
    warn(message: string, data?: Record<string, unknown>): void;
    error(message: string, error?: Error | unknown): void;
    debug(message: string, data?: Record<string, unknown>): void;
}
```

#### Key Methods:

**1. `formatLogMessage(level: LogLevel, message: string): string`**
- Creates structured log messages with timestamps
- Format: `Runtime Consider [ISO-TIMESTAMP] [LEVEL] message`
- Used internally by all logging methods

**2. `logger.info(message, data?)`**
- Logs informational messages
- Optional contextual data attached
- Example: `logger.info('Window shown', { duration: 42 })`

**3. `logger.warn(message, data?)`**
- Logs warning-level messages
- Indicates potential issues or deprecations
- Console output via `console.warn`

**4. `logger.error(message, error?)`**
- Logs error conditions
- Can accept Error objects or custom data
- Console output via `console.error`

**5. `logger.debug(message, data?)`**
- Development-only logging
- Only active when:
  - `NODE_ENV === 'development'`
  - Or `!app.isPackaged`
- Helps with debugging without cluttering production logs

#### Log Levels Enum:
```typescript
const LogLevel = {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG',
} as const;
```

### User Agent & System Info

**File:** [src/utils/userAgent.ts](../src/utils/userAgent.ts)

**Purpose:** Gather system information and storage metrics

#### Function: `info(): string`
**Returns:** OS-specific user agent information

**Platform-Specific Formatting:**
```
Windows:   "Windows NT 10.0; Win64; x64"
macOS:     "Macintosh; Intel Mac OS X 10_15_7"
Linux:     "X11; Linux x64"
```

#### Function: `getEngineInfo(): string`
**Returns:** Browser engine (Chrome/Electron) version

**Format:** `AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{chromeVersion} Electron/{electronVersion}`

**Extracted from:** Node.js process.versions

#### Function: `getLocalStorageInfo(win: BrowserWindow): Promise<LocalStorageInfo | null>`
**Returns:** Current localStorage usage metrics

**Metrics Returned:**
```typescript
interface LocalStorageInfo {
    used: string;       // MB used in localStorage
    quota: string;      // MB quota (5MB standard)
    remaining: string;  // MB available
}
```

**Implementation Details:**
- Executes JavaScript in renderer process
- Calculates bytes from all localStorage keys and values
- Assumes 5MB standard quota (browser standard)
- Safely handles exceptions and missing webContents
- Converts to MB with 2 decimal precision

---

## Process Model

### Main Process (Node.js)
- **Runs in:** Node.js runtime
- **Access:** Full file system, native APIs
- **Responsibilities:**
  - Creating/managing BrowserWindow instances
  - Handling app lifecycle events
  - Cross-platform integration
  - IPC communication with renderer

### Renderer Process (Chromium)
- **Runs in:** Chromium engine
- **Access:** DOM, Web APIs, Preload script APIs
- **Security:** Node.js integration disabled by default
- **Stylesheet Context:** [src/stylesheet/](../src/stylesheet/)

### Preload Script
- **File:** [src/preload.ts](../src/preload.ts)
- **Purpose:** Secure bridge between main and renderer
- **Execution:** Runs in context of main process with renderer access
- **Current State:** Minimal implementation (documentation placeholder)

---

## Configuration System

### Window Configuration

**File:** [src/config/window.json](../src/config/window.json)

```json
{
    "width": number,
    "height": number,
    "resizable": boolean,
    "fullscreen": boolean,
    "title": string,
    "min": {
        "width": number,
        "height": number
    }
}
```

**Configuration Loading Flow:**
```
window.json → windowConfig.ts → getWindowOptions() → BrowserWindow
```

### Build Configuration

**Vite Configurations:**
- `vite.main.config.ts` - Main process bundling
- `vite.renderer.config.ts` - UI bundling
- `vite.preload.config.ts` - Preload script bundling

**TypeScript Paths (tsconfig.json):**
```typescript
{
    "@/*": "src/*",
    "@app/*": "src/core/app/*",
    "@config/*": "src/config/*",
    "@core/*": "src/core/*",
    "@window/*": "src/core/window/*",
    "@utils/*": "src/utils/*"
}
```

---

## Utilities & Helpers

### Type System

**Window Configuration Types:**
```typescript
interface WindowSize {
    width: number;
    height: number;
    min?: { width: number; height: number };
    max?: { width?: number; height?: number };
}

interface WindowConfig {
    size: WindowSize;
    resizable?: boolean;
    fullscreen?: boolean;
    title?: string;
}
```

**Logger Types:**
```typescript
type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface Logger {
    info(message: string, data?: Record<string, unknown>): void;
    warn(message: string, data?: Record<string, unknown>): void;
    error(message: string, error?: Error | unknown): void;
    debug(message: string, data?: Record<string, unknown>): void;
}
```

### Performance Monitoring

The application includes built-in performance measurement:

```typescript
// In createWindow.ts
const windowCreationStartTime = process.hrtime.bigint();
// ... later
const elapsedTime = Number(process.hrtime.bigint() - windowCreationStartTime) / 1_000_000;
logger.info(`Window shown in ${elapsedTime.toFixed(2)} ms`);
```

**Measured Milestones:**
1. Window shown to user
2. Content (HTML/CSS/JS) fully loaded
3. DOM ready for interaction

---

## Lifecycle Flow

```
1. main.ts
   ↓
2. createApplication()
   ↓
3. app.whenReady()
   ↓
4. createWindow()
   ├── createBrowserWindow()
   │   └── getWindowOptions() → windowConfig → window.json
   └── loadWindowContent()
       ├── Check: MAIN_WINDOW_VITE_DEV_SERVER_URL (dev)
       └── Or: Load from file system (production)
   ↓
5. Performance metrics logged via logger
   ├── window.on('show')
   ├── webContents.on('did-finish-load')
   └── webContents.on('dom-ready')
   ↓
6. User interaction via renderer process
   ↓
7. app.on('window-all-closed') → app.quit() (non-Darwin)
```

---

## Development Workflow

### Scripts Available

```bash
npm start          # Start the application
npm run lint       # Run ESLint
npm run package    # Package application
npm run make       # Build distributable
npm run publish    # Publish to release channel
```

### Building Process

1. **Development Mode:**
   - Vite dev server runs
   - HMR enabled for instant updates
   - Source maps generated
   - Logger debug output available

2. **Production Build:**
   - Vite optimizes and bundles
   - Creates `.vite/build/` directory
   - Electron Forge packages for distribution
   - Logger runs without debug output

---

## Security Considerations

### Preload Script Integration
- Located between main and renderer processes
- Can safely expose specific APIs to renderer
- Prevents direct renderer access to Node.js

### Cross-Platform Compatibility
- Platform-specific title bar styling (macOS/Windows/Linux)
- Native theme detection for dark mode
- Window manager adaptation per OS

### Type Safety
- TypeScript strict mode enforced
- Zod schema validation available
- ESLint enforcement across codebase

---

## 8. Data Persistence System

### Storage Architecture

**File:** [src/core/storage/storageManager.ts](../src/core/storage/storageManager.ts)

**Purpose:** Persistent storage on file system using Electron's userData directory

**Directory Structure:**
```
userData/
├── runtime-consider/
│   ├── entries/
│   │   ├── 2026-01-15.json
│   │   ├── 2026-01-16.json
│   └── backups/
│   │   ├── backup-2026-01-16T12-30-45.json
│   └── config.json
│   └── manifest.json
```

**Key Features:**
- **Immutable Entries** - Once committed, entries cannot be modified
- **Automatic Backups** - Daily or configurable interval backups
- **Export Functionality** - Export all data as JSON
- **Data Recovery** - Backup restoration capability

### Schema Validation

**File:** [src/core/storage/schema.ts](../src/core/storage/schema.ts)

**Schemas Defined:**
- `EntrySchema` - Validates daily entry structure
- `ManifestSchema` - Validates entry manifest
- `AppConfigSchema` - Validates application configuration

**Validation Library:** Zod 4.3.4 for runtime type checking

---

## 9. IPC Communication System

### Main ↔ Renderer Communication

**Files:**
- [src/preload/electronAPI.ts](../src/preload/electronAPI.ts) - Preload script with exposed APIs
- [src/core/ipc/registerHandlers.ts](../src/core/ipc/registerHandlers.ts) - IPC handler registration

**Exposed APIs to Renderer:**

```typescript
window.electron.storage: StorageAPI {
    getToday(): Promise<string>
    getTodayEntry(): Promise<Entry | null>
    getAllEntries(): Promise<string[]>
    getEntry(date: string): Promise<Entry | null>
    saveEntry(date: string, text: string): Promise<void>
    deleteEntry(date: string): Promise<void>
    exportData(exportPath: string): Promise<void>
    createBackup(): Promise<string>
}

window.electron.config: ConfigAPI {
    getConfig(): Promise<AppConfig>
    saveConfig(config: AppConfig): Promise<void>
}

window.electron.logger: LoggerAPI {
    info(message: string, data?: object): void
    warn(message: string, data?: object): void
    error(message: string, error?: object): void
}
```

**Security:** Uses contextBridge to safely expose only necessary APIs

### IPC Handlers

All handlers include:
- Parameter validation
- Date format verification
- Immutability enforcement
- Error handling with logging
- Schema validation with Zod

---

## 10. Immutability Enforcement

### Entry State Management

**File:** [src/core/storage/entryStateManager.ts](../src/core/storage/entryStateManager.ts)

**Key Methods:**
- `commitEntry(date)` - Mark entry as immutable
- `isCommitted(date)` - Check if entry is locked
- `assertCanModify(date)` - Throw error if attempting modification
- `getCommittedEntries()` - Get all immutable entries

**Implementation:**
```typescript
// Once committed, trying to modify throws error:
"Entry for 2026-01-15 is committed and immutable"
```

---

## 11. Date Handling & Timeline

### Date Utilities

**File:** [src/core/utils/dateUtils.ts](../src/core/utils/dateUtils.ts)

**Utilities Provided:**
- Date parsing and formatting (YYYY-MM-DD)
- Date range calculations
- Gap detection (missing days)
- Week/month calculations
- Human-readable formatting ("Today", "Yesterday", etc.)
- Timeline creation with empty day indicators

**Key Methods:**
```typescript
DateUtils.getToday()                    // Today's date
DateUtils.getDateRange(start, end)      // All dates between
DateUtils.findMissingDates(dates, ...)  // Find gaps
DateUtils.formatForDisplay(date)        // Human-readable
DateUtils.getWeekDates(date)            // Week dates
DateUtils.getMonthDates(date)           // Month dates
```

### Timeline Display

**Interface:**
```typescript
interface TimelineDay {
    date: string
    dateFormatted: string
    hasEntry: boolean
    entry?: DisplayEntry
    isToday: boolean
    isEmpty: boolean  // Clearly marks missing days
}
```

---

## 12. Configuration Management

### Config Manager

**File:** [src/core/config/configManager.ts](../src/core/config/configManager.ts)

**Configuration Options:**
```typescript
interface AppConfig {
    theme: "light" | "dark" | "system"
    timeFormat: "12h" | "24h"
    autoBackup: boolean
    backupInterval: number  // Days
    version: string
}
```

**Features:**
- Default configuration values
- Validation with Zod schema
- Export/import capability
- Reset to defaults option

---

## 13. Error Handling & Recovery

### Error Types

**File:** [src/core/error/errorHandler.ts](../src/core/error/errorHandler.ts)

**Custom Errors:**
- `StorageError` - File system operation failures
- `ValidationError` - Schema validation failures
- `ImmutabilityError` - Attempted modification of locked entry
- `DataCorruptionError` - Corrupted data detected

### Error Recovery Strategies

**Available Methods:**
- `ErrorRecovery.recoverFromStorageError()` - Storage failure recovery
- `ErrorRecovery.validateDataIntegrity()` - Data validation
- `ErrorRecovery.recoverCorruptedEntry()` - Backup restoration
- `withErrorBoundary()` - Wrapper for async operations
- `withRetry()` - Automatic retry with exponential backoff

---

## 14. Type System

### Core Types

**File:** [src/types/index.ts](../src/types/index.ts)

**Defined Types:**
- `Entry` - Daily immutable record
- `DisplayEntry` - Entry with formatted fields
- `AppState` - Current application state
- `AppConfig` - Configuration object
- `TimelineDay` - Timeline entry
- `OperationResult<T>` - Operation result wrapper
- `StorageMetrics` - Storage statistics
- `ErrorResponse` - Standardized error responses

**Type Safety:**
- TypeScript strict mode
- Zod runtime validation
- Full type inference from schemas

---

## 15. Testing Infrastructure

### Test Files

**File:** [src/__tests__/index.test.ts](../src/__tests__/index.test.ts)

**Test Suites:**
- StorageManager tests
- DateUtils tests
- EntryStateManager tests
- Schema validation tests
- ConfigManager tests
- Error handling tests
- IPC communication tests

**Test Framework:** Jest (ready to implement)

**Run Tests:**
```bash
npm test                # Run once
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage report
```

---

## Integration Points

### 1. Main Application Initialization
- Load config from storage
- Initialize StorageManager
- Register IPC handlers
- Create main window

### 2. Window Creation
- Create BrowserWindow with config
- Load preload script
- Expose APIs via contextBridge

### 3. Renderer Startup
- Initialize UI
- Check today's entry status
- Load entry history
- Render timeline with date utilities

### 4. Data Operations
- Validate with Zod schemas
- Store with StorageManager
- Enforce immutability
- Update EntryStateManager

### 5. Error Handling
- Catch validation errors
- Attempt recovery
- Log with Logger
- Display user-friendly messages

---

## Summary of Implemented Features

✅ **Complete Persistent Storage** - File system based with backups
✅ **IPC Communication** - Secure main/renderer bridge
✅ **Schema Validation** - Zod-powered runtime type checking
✅ **Immutability Enforcement** - Entry state management
✅ **Date Handling** - Complete date utilities and timeline
✅ **Configuration Management** - User preferences and settings
✅ **Error Handling** - Custom errors, recovery, and retry logic
✅ **Type Safety** - Full TypeScript support
✅ **Testing Infrastructure** - Jest-ready test suite
✅ **Documentation** - Comprehensive architecture guide

---

**Last Updated:** January 28, 2026 <br>
**Version:** 1.1.0 (Core Systems Complete) <br>
**Author:** Peakk2011 - Mint teams <br>
**License:** MIT <a href="../LICENSE.md">License Here</a> <br>