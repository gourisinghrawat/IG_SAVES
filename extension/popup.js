const API_BASE_URL = 'http://127.0.0.1:8000';
let currentUrls = [];

document.addEventListener('DOMContentLoaded', async () => {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const ingestBtn = document.getElementById('ingestBtn');
  const searchBtn = document.getElementById('searchBtn');
  const queryInput = document.getElementById('queryInput');
  const answerBox = document.getElementById('answerBox');
  const scrapedCount = document.getElementById('scrapedCount');
  const apiStatus = document.getElementById('apiStatus');

  // 1. Health check to FastAPI backend
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (res.ok) {
      apiStatus.textContent = 'Online';
      apiStatus.className = 'status-badge online';
    } else {
      apiStatus.textContent = 'Offline';
      apiStatus.className = 'status-badge offline';
    }
  } catch (err) {
    apiStatus.textContent = 'Offline';
    apiStatus.className = 'status-badge offline';
  }

  // 2. Query current tab status
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'GET_REELS' }, (response) => {
      if (chrome.runtime.lastError) {
        // Not an instagram tab or script not loaded yet
        return;
      }
      if (response && response.urls) {
        currentUrls = response.urls;
        scrapedCount.textContent = response.count;
      }
    });
  }

  // 3. Start Auto-Scroll
  startBtn.addEventListener('click', () => {
    if (!tab || !tab.id) return;
    chrome.tabs.sendMessage(tab.id, { type: 'START_SCRAPE' }, (response) => {
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
    });
  });

  // 4. Stop Auto-Scroll
  stopBtn.addEventListener('click', () => {
    if (!tab || !tab.id) return;
    chrome.tabs.sendMessage(tab.id, { type: 'STOP_SCRAPE' }, (response) => {
      stopBtn.style.display = 'none';
      startBtn.style.display = 'block';
      if (response && response.urls) {
        currentUrls = response.urls;
        scrapedCount.textContent = response.count;
      }
    });
  });

  // 5. Ingest Batch to FastAPI
  ingestBtn.addEventListener('click', () => {
    if (currentUrls.length === 0) {
      alert('No scraped reels found yet. Click Start Auto-Scroll on your Instagram page first.');
      return;
    }

    ingestBtn.disabled = true;
    ingestBtn.textContent = '⏳ Ingesting to RAG...';

    chrome.runtime.sendMessage({
      type: 'TRIGGER_BATCH_INGEST',
      urls: currentUrls
    });
  });

  // Listen for Ingestion Complete
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'INGEST_COMPLETE') {
      ingestBtn.disabled = false;
      ingestBtn.textContent = '🚀 Ingest Saved Reels to RAG';
      alert(`Successfully ingested ${message.data.successful} reels into RAG!`);
    } else if (message.type === 'INGEST_ERROR') {
      ingestBtn.disabled = false;
      ingestBtn.textContent = '🚀 Ingest Saved Reels to RAG';
      alert(`Ingestion Error: ${message.error}`);
    } else if (message.type === 'REELS_FOUND') {
      currentUrls = message.urls;
      scrapedCount.textContent = message.count;
    }
  });

  // 6. Quick Search inside Extension Popup
  searchBtn.addEventListener('click', async () => {
    const q = queryInput.value.trim();
    if (!q) return;

    searchBtn.disabled = true;
    answerBox.style.display = 'block';
    answerBox.textContent = 'Searching RAG index...';

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, top_k: 3 })
      });

      if (res.ok) {
        const data = await res.json();
        answerBox.innerHTML = `<strong>Answer:</strong><br>${data.answer}`;
      } else {
        answerBox.textContent = 'Search failed. Make sure reels are ingested.';
      }
    } catch (err) {
      answerBox.textContent = `Error: ${err.message}`;
    } finally {
      searchBtn.disabled = false;
    }
  });
});
