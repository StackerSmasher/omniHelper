(function() {
    'use strict';

    // Ensure the global namespace exists
    window.OmniHelper = window.OmniHelper || {};

    const LOG_PREFIX = '[OmniHelper]';
    const IS_DEBUG_MODE = true; // Set to false for production to disable logs

    OmniHelper.logger = {
        log: function(...args) {
            if (IS_DEBUG_MODE) {
                console.log(LOG_PREFIX, ...args);
            }
        },
        warn: function(...args) {
            if (IS_DEBUG_MODE) {
                console.warn(LOG_PREFIX, ...args);
            }
        },
        error: function(...args) {
            if (IS_DEBUG_MODE) {
                console.error(LOG_PREFIX, ...args);
            }
        }
    };

})();
