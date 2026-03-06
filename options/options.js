/**
 * GitSweep Settings Page Logic
 */

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

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
    const { github_token } = await chrome.storage.sync.get('github_token');
    if (github_token) {
        tokenInput.value = github_token;
        validateToken(github_token);
    }
});

// ---- Toggle visibility ----
let visible = false;
toggleVisibility.addEventListener('click', () => {
    visible = !visible;
    tokenInput.type = visible ? 'text' : 'password';
});

// ---- Save token ----
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

// ---- Validate token ----
validateBtn.addEventListener('click', () => {
    const token = tokenInput.value.trim();
    if (!token) {
        showStatus('invalid', 'Please enter a token first');
        return;
    }
    validateToken(token);
});

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
            showStatus('invalid', `Invalid token: ${response?.error || 'unknown error'}`);
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

// ---- Clear cache ----
clearCacheBtn.addEventListener('click', async () => {
    await chrome.storage.local.remove('cachedComments');
    cacheStatus.textContent = 'Cache cleared ✓';
    setTimeout(() => { cacheStatus.textContent = ''; }, 3000);
});
