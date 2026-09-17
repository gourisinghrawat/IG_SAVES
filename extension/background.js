const API_BASE_URL = 'http://127.0.0.1:8000';

let extensionState = {
  scrapedUrls: [],
  ingestStatus: 'idle',
  processedCount: 0,
  totalCount: 0
};

// Handle batch ingestion request to local FastAPI server
async function ingestBatch(urls) {
  extensionState.ingestStatus = 'ingesting';
  extensionState.totalCount = urls.length;
  extensionState.processedCount = 0;

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/ingest/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ urls: urls })
    });

    if (response.ok) {
      const data = await response.json();
      extensionState.ingestStatus = 'completed';
      extensionState.processedCount = data.successful;
      chrome.runtime.sendMessage({ type: 'INGEST_COMPLETE', data: data });
    } else {
      const err = await response.json();
      extensionState.ingestStatus = 'error';
      chrome.runtime.sendMessage({ type: 'INGEST_ERROR', error: err.detail || 'Batch ingestion failed.' });
    }
  } catch (error) {
    extensionState.ingestStatus = 'error';
    chrome.runtime.sendMessage({ type: 'INGEST_ERROR', error: error.message });
  }
}

// Message Listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REELS_FOUND') {
    extensionState.scrapedUrls = message.urls;
  } else if (message.type === 'TRIGGER_BATCH_INGEST') {
    ingestBatch(message.urls);
    sendResponse({ status: 'started' });
  } else if (message.type === 'GET_STATE') {
    sendResponse(extensionState);
  }
  return true;
});
