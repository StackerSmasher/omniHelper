(function() {
    'use strict';

    // Ensure the global namespace exists
    window.OmniHelper = window.OmniHelper || {};
    const logger = OmniHelper.logger;

    // Initialize all content script modules
    function initialize() {
        logger.log('Initializing content script modules...');

        // The scanner is the primary module that kicks everything off.
        if (OmniHelper.scanner) {
            OmniHelper.scanner.init();
        } else {
            logger.error('Scanner module not found!');
        }

        logger.log('Content script initialized.');
    }

    // This listener is for direct communication from the popup or other extension parts.
    // In our new architecture, most communication goes through the background script,
    // so this will be simpler.
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        logger.log('Message received in content script:', request.action);

        // The content script's main job is to provide data it has scraped,
        // but since all data is now pushed to the background script, this
        // listener has fewer responsibilities. We'll leave a placeholder
        // for potential future use cases.
        if (request.action === 'ping') {
            sendResponse({ success: true, response: 'pong' });
        }

        return true; // Keep the message channel open for an async response.
    });

    initialize();

})();
