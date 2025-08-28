(function() {
    'use strict';

    // Ensure the global namespace exists
    window.OmniHelper = window.OmniHelper || {};
    const logger = OmniHelper.logger;

    function foundAppealId(appealId, url) {
        logger.log('Scanner: Found Appeal ID:', appealId);
        chrome.runtime.sendMessage({
            action: 'saveAppealId',
            data: { appealId, url }
        });
    }

    function foundDialogId(dialogId, url) {
        logger.log('Scanner: Found Dialog ID:', dialogId);
        chrome.runtime.sendMessage({
            action: 'saveDialogId',
            data: { dialogId, url }
        });
    }

    function incomingMessageDetected(dialogId) {
        logger.log('Scanner: Notifying background of incoming message for Dialog ID:', dialogId);
        chrome.runtime.sendMessage({
            action: 'incomingMessageDetected',
            data: { dialogId }
        });
    }

    function interceptFetch() {
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            const [url, options] = args;

            // --- Request Interception ---
            if (options && (options.method === 'PUT' || options.method === 'POST' || options.method === 'GET')) {
                try {
                    const urlObj = new URL(url, window.location.origin);
                    const appealId = urlObj.searchParams.get('appealId');
                    const dialogId = urlObj.searchParams.get('dialogId');

                    if (appealId) foundAppealId(appealId, url);
                    if (dialogId) foundDialogId(dialogId, url);

                    if (options.body) {
                        try {
                            const body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
                            const jsonBody = JSON.parse(body);
                            if (jsonBody.dialogId || jsonBody.dialog_id) foundDialogId(jsonBody.dialogId || jsonBody.dialog_id, url);
                            if (jsonBody.appealId || jsonBody.appeal_id) foundAppealId(jsonBody.appealId || jsonBody.appeal_id, url);
                        } catch (e) {
                            // Ignore if body is not valid JSON
                        }
                    }
                } catch (error) {
                    logger.error('Error parsing fetch request:', error, url);
                }
            }

            // --- Response Interception ---
            const fetchPromise = originalFetch.apply(this, args);
            if (url.toString().includes('omnichat.rt.ru')) {
                fetchPromise.then(response => {
                    const clonedResponse = response.clone();
                    clonedResponse.text().then(responseText => {
                        try {
                            const data = JSON.parse(responseText);
                            let foundDialogIdInResponse = data.dialogId || data.dialog_id;

                            if (foundDialogIdInResponse) {
                                foundDialogId(foundDialogIdInResponse, url);
                            }

                            // *** NEW: Use the responder module to check for incoming messages ***
                            if (OmniHelper.responder) {
                                const incomingDialogId = OmniHelper.responder.analyze(data, url);
                                if (incomingDialogId) {
                                    incomingMessageDetected(incomingDialogId);
                                }
                            }

                        } catch (e) {
                             // Ignore if response is not valid JSON
                        }
                    });
                }).catch(e => {
                    logger.error('Fetch request failed:', e);
                });
            }

            return fetchPromise;
        };
    }

    function observeDOM() {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) { // Element node
                            const text = node.textContent || node.innerText || '';
                            const dialogIdMatch = text.match(/dialogId[:\s=]+(\d+)/i);
                            if (dialogIdMatch) {
                                foundDialogId(dialogIdMatch[1], 'DOM Observer');
                            }
                            const appealIdMatch = text.match(/appealId[:\s=]+(\d+)/i);
                            if (appealIdMatch) {
                                foundAppealId(appealIdMatch[1], 'DOM Observer');
                            }
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        logger.log('DOM Observer started.');
    }

    OmniHelper.scanner = {
        init: function() {
            logger.log('Initializing scanner...');
            interceptFetch();
            if (document.body) {
                 observeDOM();
            } else {
                 document.addEventListener('DOMContentLoaded', observeDOM);
            }
            logger.log('Scanner initialized.');
        }
    };

})();
