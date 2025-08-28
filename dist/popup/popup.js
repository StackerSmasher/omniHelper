document.addEventListener('DOMContentLoaded', function() {
    const clearBtn = document.getElementById('clearBtn');
    const status = document.getElementById('status');
    const appealsList = document.getElementById('appealsList');
    const actionBtn = document.getElementById('actionBtn'); // This button is now for refreshing

    function displayAllData(appealIds, dialogIds) {
        let html = '<h3>Appeal IDs</h3>';
        if (!appealIds || appealIds.length === 0) {
            html += '<div class="no-data">No appeal IDs found</div>';
        } else {
            // Display latest first
            html += appealIds.slice().reverse().map(item => `
                <div class="appeal-item">
                    <div class="appeal-id">Appeal ID: <strong>${item.appealId}</strong></div>
                    <div class="appeal-time">${item.isoTimestamp}</div>
                    <div class="appeal-url">${item.url}</div>
                </div>
            `).join('');
        }

        html += '<h3>Dialog IDs</h3>';
        if (!dialogIds || dialogIds.length === 0) {
            html += '<div class="no-data">No dialog IDs found</div>';
        } else {
             // Display latest first
            html += dialogIds.slice().reverse().map(item => `
                <div class="appeal-item dialog-item">
                    <div class="appeal-id">Dialog ID: <strong>${item.dialogId}</strong></div>
                    <div class="appeal-time">${item.isoTimestamp}</div>
                    <div class="appeal-url">${item.url}</div>
                </div>
            `).join('');
        }

        appealsList.innerHTML = html;
    }

    function loadData() {
        status.textContent = 'Loading...';
        chrome.runtime.sendMessage({ action: 'getData' }, function(response) {
            if (chrome.runtime.lastError) {
                status.textContent = 'Error loading data.';
                console.error('Popup error:', chrome.runtime.lastError.message);
                return;
            }

            if (response && response.success) {
                const { appealIds, dialogIds } = response.data;
                displayAllData(appealIds, dialogIds);
                status.textContent = `Displaying ${appealIds.length} appeal(s) and ${dialogIds.length} dialog(s).`;
            } else {
                status.textContent = 'Failed to load data from background script.';
                console.error('Popup error:', response ? response.error : 'No response');
            }
        });
    }

    // The button will now just be a manual refresh.
    actionBtn.textContent = 'Refresh';
    actionBtn.addEventListener('click', loadData);

    clearBtn.addEventListener('click', function() {
        chrome.runtime.sendMessage({ action: 'clearData' }, function(response) {
             if (response && response.success) {
                appealsList.innerHTML = '<div class="no-data">All data cleared</div>';
                status.textContent = 'History cleared';
             } else {
                status.textContent = 'Error clearing data.';
             }
        });
    });

    // Load data as soon as the popup is opened.
    loadData();
});
