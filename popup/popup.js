/**
 * GitSweep Popup Logic
 * Manages state, rendering, filtering, and user interactions.
 */

// ---- DOM Elements ----
const commentList = document.getElementById('commentList');
const statsBar = document.getElementById('statsBar');
const filterTabs = document.getElementById('filterTabs');
const footer = document.getElementById('footer');
const lastUpdated = document.getElementById('lastUpdated');

// State views
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const setupState = document.getElementById('setupState');
const errorState = document.getElementById('errorState');
const errorMsg = document.getElementById('errorMsg');

// Stats
const totalCount = document.getElementById('totalCount');
const usefulCount = document.getElementById('usefulCount');
const noiseCount = document.getElementById('noiseCount');
const neutralCount = document.getElementById('neutralCount');

// Buttons
const refreshBtn = document.getElementById('refreshBtn');
const settingsBtn = document.getElementById('settingsBtn');
const setupBtn = document.getElementById('setupBtn');
const retryBtn = document.getElementById('retryBtn');

// ---- State ----
let allComments = [];
let activeFilter = 'all';

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
    // Check if token exists
    const { github_token } = await chrome.storage.sync.get('github_token');

    if (!github_token) {
        showView('setup');
        return;
    }

    // Try to load cached data
    const { cachedComments } = await chrome.storage.local.get('cachedComments');

    if (cachedComments && cachedComments.comments?.length) {
        allComments = cachedComments.comments;
        renderComments();
        updateStats();
        showLastUpdated(cachedComments.fetchedAt);
    } else {
        fetchComments();
    }
});

// ---- Event Listeners ----

refreshBtn.addEventListener('click', () => {
    fetchComments();
});

settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

setupBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

retryBtn.addEventListener('click', () => {
    fetchComments();
});

// Filter tabs
filterTabs.addEventListener('click', (e) => {
    if (!e.target.classList.contains('tab')) return;

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');

    activeFilter = e.target.dataset.filter;
    renderComments();
});

// ---- Functions ----

function fetchComments() {
    showView('loading');
    refreshBtn.classList.add('spinning');

    chrome.runtime.sendMessage({ action: 'fetchComments' }, (response) => {
        refreshBtn.classList.remove('spinning');

        if (chrome.runtime.lastError) {
            showError('Could not connect to background service.');
            return;
        }

        if (response?.error) {
            showError(response.error);
            return;
        }

        if (response?.data) {
            allComments = response.data.comments;
            renderComments();
            updateStats();
            showLastUpdated(response.data.fetchedAt);
        }
    });
}

function showView(view) {
    // Hide everything
    loadingState.style.display = 'none';
    emptyState.style.display = 'none';
    setupState.style.display = 'none';
    errorState.style.display = 'none';
    statsBar.style.display = 'none';
    filterTabs.style.display = 'none';
    footer.style.display = 'none';

    // Remove comment cards
    commentList.querySelectorAll('.comment-card').forEach(c => c.remove());

    switch (view) {
        case 'loading':
            loadingState.style.display = 'flex';
            break;
        case 'empty':
            emptyState.style.display = 'flex';
            break;
        case 'setup':
            setupState.style.display = 'flex';
            break;
        case 'error':
            errorState.style.display = 'flex';
            break;
        case 'comments':
            statsBar.style.display = 'flex';
            filterTabs.style.display = 'flex';
            footer.style.display = 'block';
            break;
    }
}

function showError(msg) {
    showView('error');
    errorMsg.textContent = msg;
}

function updateStats() {
    const useful = allComments.filter(c => c.classification?.category === 'useful').length;
    const noise = allComments.filter(c => c.classification?.category === 'noise').length;
    const neutral = allComments.filter(c => c.classification?.category === 'neutral').length;

    totalCount.textContent = allComments.length;
    usefulCount.textContent = useful;
    noiseCount.textContent = noise;
    neutralCount.textContent = neutral;
}

function showLastUpdated(isoDate) {
    if (!isoDate) return;
    const date = new Date(isoDate);
    const now = new Date();
    const diff = Math.round((now - date) / 60000);

    let text;
    if (diff < 1) text = 'Updated just now';
    else if (diff < 60) text = `Updated ${diff}m ago`;
    else if (diff < 1440) text = `Updated ${Math.round(diff / 60)}h ago`;
    else text = `Updated ${date.toLocaleDateString()}`;

    lastUpdated.textContent = text;
}

function renderComments() {
    // Clear existing cards
    commentList.querySelectorAll('.comment-card').forEach(c => c.remove());

    let filtered = allComments;
    if (activeFilter !== 'all') {
        filtered = allComments.filter(c => c.classification?.category === activeFilter);
    }

    if (filtered.length === 0 && allComments.length === 0) {
        showView('empty');
        return;
    }

    showView('comments');

    if (filtered.length === 0) {
        // Show inline empty for filter
        const noResults = document.createElement('div');
        noResults.className = 'state-view';
        noResults.innerHTML = `
      <p class="state-text">No ${activeFilter} comments</p>
      <p class="state-sub">Try a different filter</p>
    `;
        commentList.appendChild(noResults);
        return;
    }

    filtered.forEach(comment => {
        const card = createCommentCard(comment);
        commentList.appendChild(card);
    });
}

function createCommentCard(comment) {
    const category = comment.classification?.category || 'neutral';

    const card = document.createElement('div');
    card.className = `comment-card ${category}`;
    card.addEventListener('click', () => {
        chrome.tabs.create({ url: comment.html_url });
    });

    const timeAgo = formatTimeAgo(comment.created_at);
    const typeLabel = comment.type === 'pr_review' ? 'PR Review' :
        comment.type === 'issue' ? 'Issue' : 'Commit';
    const repoShort = comment.repo?.split('/')[1] || comment.repo;

    card.innerHTML = `
    <div class="card-header">
      <img class="avatar" src="${comment.user?.avatar_url || ''}" alt="${comment.user?.login || 'user'}" loading="lazy">
      <div class="card-meta">
        <div class="card-user">${escapeHtml(comment.user?.login || 'Unknown')}</div>
        <div class="card-repo">${escapeHtml(repoShort)}</div>
      </div>
      <span class="card-badge ${category}">${category}</span>
    </div>
    <div class="card-body">${escapeHtml(comment.body || '')}</div>
    <div class="card-footer">
      <span class="card-time">${timeAgo}</span>
      <span class="card-type">${typeLabel}</span>
    </div>
  `;

    return card;
}

function formatTimeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
    if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
    return `${Math.floor(seconds / 31536000)}y ago`;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
