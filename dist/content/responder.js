(function() {
    'use strict';

    window.OmniHelper = window.OmniHelper || {};
    const logger = OmniHelper.logger;

    // This function analyzes a parsed network response to determine if it's an incoming message
    // that requires an auto-response.
    function analyzeResponseForIncomingMessage(data, url) {
        try {
            // Rule 1: The URL should not be the one we use to send messages.
            if (url.toString().includes('send-agent-message')) {
                return null;
            }

            // Rule 2: The payload should contain some text content.
            const hasText = data.text || (data.message && data.message.text);
            if (!hasText) {
                return null;
            }

            // Rule 3: The message should not be from an 'agent'.
            const author = data.author || (data.message && data.message.author);
            if (author === 'agent') {
                return null;
            }

            // Rule 4: The message must have a dialog ID.
            const dialogId = data.dialogId || data.dialog_id;
            if (!dialogId) {
                return null;
            }

            // If all rules pass, we consider it an incoming message.
            logger.log('Responder: Detected incoming message for dialog', dialogId);
            return dialogId;

        } catch (error) {
            logger.error('Error analyzing response:', error);
            return null;
        }
    }


    OmniHelper.responder = {
        analyze: analyzeResponseForIncomingMessage
    };

})();
