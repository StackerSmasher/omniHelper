# OmniHelper Extension - Architectural Documentation

This document provides a detailed overview of the refactored architecture for the OmniHelper browser extension. The primary goal of the refactoring was to move from a monolithic script to a modular, maintainable, and robust architecture based on the standard Chrome Extension patterns.

## 1. Core Architectural Principles

The new architecture is based on a clear separation of concerns, with each part of the extension having a single, well-defined responsibility.

*   **Background Script as Central Hub:** The background script (`dist/background/main.js`) is the brain of the extension. It is responsible for all state management (storing Appeal IDs and Dialog IDs) and acts as the central communication bus between all components.
*   **Decoupled Components:** The Content Scripts and the Popup Script are completely decoupled. They never communicate directly with each other. All communication is routed through the background script.
*   **Modular Content Scripts:** The logic for the content script has been broken down into smaller, single-responsibility files. These are loaded by Chrome in a specific order to ensure dependencies are met.
*   **No Build Step:** Due to environmental constraints (`npm install` being non-functional), this project does not use a bundler like Webpack. Modularity is achieved by loading multiple scripts in the `manifest.json`.

## 2. File Structure

The final, packaged extension is located in the `/dist` directory. The source code is developed in `/src`.

```
/dist
├── background/
│   └── main.js       # The background service worker (central hub)
├── content/
│   ├── main.js       # Content script entry point, initializes other modules
│   ├── responder.js  # Logic to analyze network responses
│   └── scanner.js    # Logic for scraping IDs from network and DOM
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── popup/
│   └── popup.js      # Logic for the popup UI
├── shared/
│   ├── config.js     # Shared configuration values
│   └── logger.js     # Simple logging utility
├── manifest.json     # The extension manifest
├── popup.css         # Styles for the popup
└── popup.html        # HTML for the popup
```

## 3. Communication Protocol

Communication between components is handled via `chrome.runtime.sendMessage`. The background script acts as the receiver for all messages.

### Messages to Background Script

| Action                      | Sender          | Data Payload                                  | Description                                                                 |
| --------------------------- | --------------- | --------------------------------------------- | --------------------------------------------------------------------------- |
| `saveAppealId`              | Content Script  | `{ appealId: string, url: string }`           | Sent when the scanner finds a new Appeal ID.                                |
| `saveDialogId`              | Content Script  | `{ dialogId: string, url:string }`            | Sent when the scanner finds a new Dialog ID.                                |
| `incomingMessageDetected`   | Content Script  | `{ dialogId: string }`                        | Sent when the responder logic detects an incoming message that needs a reply. |
| `getData`                   | Popup Script    | `null`                                        | Sent by the popup when it opens to request the lists of all found IDs.      |
| `clearData`                 | Popup Script    | `null`                                        | Sent by the popup when the user clicks the "Clear" button.                  |

### Responses from Background Script

The background script sends a response object of the form `{ success: boolean, data?: any, error?: string }` to all messages. For the `getData` action, the `data` payload is `{ appealIds: [], dialogIds: [] }`.

## 4. How to Extend

To add a new feature:

1.  **Identify the component:** Decide where the logic should live. Should it be in the background, content, or popup script?
2.  **Add new files if necessary:** If adding a new content script module, create a new file in `src/content/` and add it to the `js` array in `dist/manifest.json`. **The load order is important.**
3.  **Implement the logic:** Follow the established patterns of communication through the background script.
4.  **Update the documentation:** Add any new messages or architectural changes to this file.
