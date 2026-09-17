let isScraping = false;
let scrollInterval = null;
let extractedUrls = new Set();

function extractReelsFromDOM() {
  const reelLinks = document.querySelectorAll('a[href*="/reel/"], a[href*="/p/"]');
  let newFound = 0;

  reelLinks.forEach(link => {
    let href = link.getAttribute('href');
    if (href) {
      // Normalize URL
      if (href.startsWith('/')) {
        href = 'https://www.instagram.com' + href;
      }
      // Remove query parameters to get clean canonical link
      const cleanUrl = href.split('?')[0];

      if (!extractedUrls.has(cleanUrl)) {
        extractedUrls.add(cleanUrl);
        newFound++;

        // Visual Green Border Highlight on Extracted Reel Card
        link.style.border = '3px solid #00ff66';
        link.style.borderRadius = '8px';
        link.style.transition = 'all 0.3s ease';
      }
    }
  });

  if (newFound > 0) {
    chrome.runtime.sendMessage({
      type: 'REELS_FOUND',
      count: extractedUrls.size,
      urls: Array.from(extractedUrls)
    });
  }
}

function startAutoScroll() {
  if (isScraping) return;
  isScraping = true;
  extractedUrls.clear();

  extractReelsFromDOM();

  scrollInterval = setInterval(() => {
    if (!isScraping) return;

    window.scrollBy({
      top: 600,
      behavior: 'smooth'
    });

    setTimeout(extractReelsFromDOM, 1000);
  }, 2000);
}

function stopAutoScroll() {
  isScraping = false;
  if (scrollInterval) {
    clearInterval(scrollInterval);
    scrollInterval = null;
  }
}

// Listen for commands from popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_SCRAPE') {
    startAutoScroll();
    sendResponse({ status: 'started', count: extractedUrls.size });
  } else if (message.type === 'STOP_SCRAPE') {
    stopAutoScroll();
    sendResponse({ status: 'stopped', count: extractedUrls.size, urls: Array.from(extractedUrls) });
  } else if (message.type === 'GET_REELS') {
    extractReelsFromDOM();
    sendResponse({ count: extractedUrls.size, urls: Array.from(extractedUrls) });
  }
  return true;
});
