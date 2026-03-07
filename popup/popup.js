/**
 * GitSweep Popup Logic
 * Manages state, rendering, filtering, settings, and user interactions.
 * Settings are integrated directly into the popup (no separate options page).
 */

// ---- DOM Elements ----

// Main view
const commentList = document.getElementById('commentList');
const filterTabs = document.getElementById('filterTabs');
const tabIndicator = document.getElementById('tabIndicator');
const footer = document.getElementById('footer');
const lastUpdated = document.getElementById('lastUpdated');
const mainView = document.getElementById('mainView');
const contentPanel = document.getElementById('contentPanel');

// State views
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const setupState = document.getElementById('setupState');
const errorState = document.getElementById('errorState');
const errorMsg = document.getElementById('errorMsg');

// Buttons
const settingsBtn = document.getElementById('settingsBtn');
const userBtn = document.getElementById('userBtn');
const setupBtn = document.getElementById('setupBtn');
const retryBtn = document.getElementById('retryBtn');

// Settings view
const settingsView = document.getElementById('settingsView');
const settingsBackBtn = document.getElementById('settingsBackBtn');
const tokenInput = document.getElementById('tokenInput');
const toggleVisibility = document.getElementById('toggleVisibility');
const saveBtn = document.getElementById('saveBtn');
const validateBtn = document.getElementById('validateBtn');
const tokenStatus = document.getElementById('tokenStatus');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const userCard = document.getElementById('userCard');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const clearCacheBtn = document.getElementById('clearCacheBtn');
const cacheStatus = document.getElementById('cacheStatus');

// ---- State ----
let allComments = [];
let activeFilter = 'all';
let settingsOpen = false;

// ---- Init ----
function initTabIndicator() {
    if (!tabIndicator) return;
    const activeTab = filterTabs.querySelector('.tab.active');
    if (activeTab) {
        tabIndicator.style.transform = `translateX(${activeTab.offsetLeft - 4}px)`;
        tabIndicator.style.width = `${activeTab.offsetWidth}px`;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    initTabIndicator();

    const { github_token } = await chrome.storage.sync.get('github_token');

    if (!github_token) {
        showView('setup');
        return;
    }

    // Pre-load token into settings
    tokenInput.value = github_token;
    validateToken(github_token);

    // Try to load cached data
    const { cachedComments } = await chrome.storage.local.get('cachedComments');

    if (cachedComments && cachedComments.comments?.length) {
        allComments = cachedComments.comments;
        renderComments();
        showLastUpdated(cachedComments.fetchedAt);
    } else {
        fetchComments();
    }
});

// ================================================================
// EVENT LISTENERS — Main View
// ================================================================

settingsBtn.addEventListener('click', () => {
    openSettings();
});

userBtn.addEventListener('click', () => {
    openSettings();
});

setupBtn.addEventListener('click', () => {
    openSettings();
});

retryBtn.addEventListener('click', () => {
    fetchComments();
});

// ================================================================
// EVENT LISTENERS — Main View
// ================================================================

filterTabs.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') return;

    // Update active class
    filterTabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');

    // Animate indicator
    if (tabIndicator) {
        tabIndicator.style.transform = `translateX(${e.target.offsetLeft - 4}px)`;
        tabIndicator.style.width = `${e.target.offsetWidth}px`;
    }

    activeFilter = e.target.dataset.filter;
    renderComments();
});

// ================================================================
// EVENT LISTENERS — Settings View
// ================================================================

settingsBackBtn.addEventListener('click', () => {
    closeSettings();
});

// Toggle token visibility
let tokenVisible = false;
toggleVisibility.addEventListener('click', () => {
    tokenVisible = !tokenVisible;
    tokenInput.type = tokenVisible ? 'text' : 'password';
});

// Save token
saveBtn.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    if (!token) {
        showStatus('invalid', 'Please enter a token');
        return;
    }

    await chrome.storage.sync.set({ github_token: token });
    showStatus('valid', 'Token saved successfully');
    validateToken(token);
});

// Validate token
validateBtn.addEventListener('click', () => {
    const token = tokenInput.value.trim();
    if (!token) {
        showStatus('invalid', 'Please enter a token first');
        return;
    }
    validateToken(token);
});

// Clear cache
clearCacheBtn.addEventListener('click', async () => {
    await chrome.storage.local.remove('cachedComments');
    cacheStatus.textContent = 'Cache cleared ✓';
    setTimeout(() => { cacheStatus.textContent = ''; }, 3000);
});

// ================================================================
// SETTINGS PANEL — Open/Close
// ================================================================

function openSettings() {
    settingsOpen = true;
    settingsView.classList.add('active');
    mainView.classList.add('hidden');

    // Load current token
    chrome.storage.sync.get('github_token', (data) => {
        if (data.github_token) {
            tokenInput.value = data.github_token;
        }
    });
}

function closeSettings() {
    settingsOpen = false;
    settingsView.classList.remove('active');
    mainView.classList.remove('hidden');

    // Check if token was just added (transition from setup to fetch)
    chrome.storage.sync.get('github_token', (data) => {
        if (data.github_token && allComments.length === 0) {
            fetchComments();
        }
    });
}

// ================================================================
// SETTINGS FUNCTIONS
// ================================================================

async function validateToken(token) {
    showStatus('checking', 'Validating token…');

    chrome.runtime.sendMessage({ action: 'validateToken', token }, (response) => {
        if (chrome.runtime.lastError) {
            showStatus('invalid', 'Could not validate — extension error');
            return;
        }

        if (response?.valid) {
            showStatus('valid', `Authenticated as @${response.user}`);
            showUserCard(response.user, response.avatar);
        } else {
            showStatus('invalid', `Invalid: ${response?.error || 'unknown error'}`);
            userCard.style.display = 'none';
        }
    });
}

function showStatus(state, message) {
    tokenStatus.style.display = 'flex';
    statusDot.className = `status-dot ${state}`;
    statusText.textContent = message;
}

function showUserCard(name, avatar) {
    userCard.style.display = 'block';
    userName.textContent = `@${name}`;
    if (avatar) userAvatar.src = avatar;
}

// ================================================================
// MAIN VIEW FUNCTIONS
// ================================================================

function fetchComments() {
    showView('loading');

    chrome.runtime.sendMessage({ action: 'fetchComments' }, (response) => {
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
            showLastUpdated(response.data.fetchedAt);
        }
    });
}

function showView(view) {
    // Hide state views
    loadingState.style.display = 'none';
    emptyState.style.display = 'none';
    setupState.style.display = 'none';
    errorState.style.display = 'none';
    footer.style.display = 'none';

    // Remove comment cards (but keep state views)
    commentList.querySelectorAll('.comment-card').forEach(c => c.remove());

    // NOTE: filterTabs are always visible — never hidden

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
            footer.style.display = 'block';
            break;
    }
}

function showError(msg) {
    showView('error');
    errorMsg.textContent = msg;
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
    // Also clear any inline "no results" state views
    commentList.querySelectorAll('.state-view-inline').forEach(c => c.remove());

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
        const noResults = document.createElement('div');
        noResults.className = 'state-view state-view-inline';
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
