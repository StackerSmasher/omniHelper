// In-memory state
let appealIds = [];
let dialogIds = [];

// --- Initialization ---
function initialize() {
    // Load stored data on startup
    chrome.storage.local.get(['appealIds', 'dialogIds'], function(result) {
        if (result.appealIds) {
            appealIds = result.appealIds;
            console.log('BACKGROUND: Loaded', appealIds.length, 'appeal IDs from storage.');
        }
        if (result.dialogIds) {
            dialogIds = result.dialogIds;
            console.log('BACKGROUND: Loaded', dialogIds.length, 'dialog IDs from storage.');
        }
    });
}

// Call initialize when the extension is first installed or updated.
chrome.runtime.onInstalled.addListener(initialize);
// Also initialize on browser startup
chrome.runtime.onStartup.addListener(initialize);


// --- Data Handling Functions ---
function saveAppealId(appealId, url) {
    const newEntry = {
        appealId: appealId,
        url: url,
        timestamp: Date.now(),
        isoTimestamp: new Date().toISOString()
    };

    // Avoid duplicates
    if (!appealIds.find(item => item.appealId === appealId)) {
        appealIds.push(newEntry);
        chrome.storage.local.set({ appealIds: appealIds }, function() {
            console.log('BACKGROUND: Saved new appeal ID:', appealId);
        });
    }
}

function saveDialogId(dialogId, url) {
    const newEntry = {
        dialogId: dialogId,
        url: url,
        timestamp: Date.now(),
        isoTimestamp: new Date().toISOString()
    };

    // Avoid duplicates
    const existingEntry = dialogIds.find(item => item.dialogId === dialogId);
    if (!existingEntry) {
        dialogIds.push(newEntry);
        chrome.storage.local.set({ dialogIds: dialogIds }, function() {
            if (chrome.runtime.lastError) {
                console.error('BACKGROUND: Error saving dialogID to storage:', chrome.runtime.lastError);
            } else {
                console.log('BACKGROUND: Saved new dialog ID:', dialogId);
            }
        });
    }
}

function clearAllData() {
    appealIds = [];
    dialogIds = [];
    chrome.storage.local.remove(['appealIds', 'dialogIds'], function() {
        console.log('BACKGROUND: All data cleared.');
    });
}

// --- Auto-Responder ---
function sendAutoResponse(dialogId) {
    console.log('BACKGROUND: Preparing auto-response for dialog ID:', dialogId);

    const responseData = {
        "dialogId": dialogId,
        "text": "Добрый день! Запрос принят в работу. Пожалуйста, не покидайте чат и оставайтесь на связи.",
        "replyId": null,
        "templateId": 5103
    };

    fetch('https://omnichat.rt.ru/core/messages/send-agent-message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(responseData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('BACKGROUND: Auto-response sent successfully for dialog ID:', dialogId, 'Response:', data);
    })
    .catch(error => {
        console.error('BACKGROUND: Error sending auto-response for dialog ID:', dialogId, error);
    });
}

// --- Message Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('BACKGROUND: Received message:', request.action, 'from tab', sender.tab ? sender.tab.id : 'popup');

    switch (request.action) {
        case 'saveAppealId':
            if (request.data) {
                saveAppealId(request.data.appealId, request.data.url);
                sendResponse({success: true});
            } else {
                 sendResponse({success: false, error: 'No data provided for saveAppealId'});
            }
            break;

        case 'saveDialogId':
            if (request.data) {
                saveDialogId(request.data.dialogId, request.data.url);
                sendResponse({success: true});
            } else {
                 sendResponse({success: false, error: 'No data provided for saveDialogId'});
            }
            break;

        case 'incomingMessageDetected':
            if (request.data && request.data.dialogId) {
                sendAutoResponse(request.data.dialogId);
                sendResponse({success: true});
            } else {
                sendResponse({success: false, error: 'No dialogId provided for incoming message'});
            }
            break;

        case 'getData':
            sendResponse({
                success: true,
                data: {
                    appealIds: appealIds,
                    dialogIds: dialogIds
                }
            });
            break;

        case 'clearData':
            clearAllData();
            sendResponse({success: true});
            break;

        default:
            console.warn('BACKGROUND: Received unknown action:', request.action);
            sendResponse({success: false, error: 'Unknown action'});
            break;
    }

    // Return true to indicate that the response will be sent asynchronously.
    return true;
});

console.log('BACKGROUND: Service worker started and listeners attached.');
