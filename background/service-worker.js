import { classifyAll } from '../lib/classifier.js';

/**
 * GitSweep Background Service Worker
 * Handles GitHub API calls, pagination, and caching.
 */

const GITHUB_API = 'https://api.github.com';

// --- Helpers ---

async function getToken() {
    const data = await chrome.storage.sync.get('github_token');
    return data.github_token || null;
}

async function githubFetch(endpoint, token, page = 1, perPage = 100) {
    const url = `${GITHUB_API}${endpoint}${endpoint.includes('?') ? '&' : '?'}page=${page}&per_page=${perPage}`;
    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28'
        }
    });

    if (res.status === 403 && res.headers.get('X-RateLimit-Remaining') === '0') {
        const reset = res.headers.get('X-RateLimit-Reset');
        const waitMin = Math.ceil((parseInt(reset) * 1000 - Date.now()) / 60000);
        throw new Error(`Rate limited. Try again in ~${waitMin} minutes.`);
    }

    if (!res.ok) {
        throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
}

async function paginatedFetch(endpoint, token, maxPages = 3) {
    let all = [];
    for (let page = 1; page <= maxPages; page++) {
        const data = await githubFetch(endpoint, token, page);
        if (!data.length) break;
        all = all.concat(data);
        if (data.length < 100) break;
    }
    return all;
}

// --- Core fetch logic ---

async function fetchAllComments(token) {
    // 1. Get authenticated user info
    const user = await githubFetch('/user', token);
    const username = user.login;

    // 2. Get user's repos (owned + public)
    const repos = await paginatedFetch('/user/repos?type=owner&sort=updated', token, 3);

    let allComments = [];

    for (const repo of repos.slice(0, 20)) { // cap at 20 repos to stay within rate limits
        const repoName = repo.full_name;

        try {
            // Issue comments
            const issueComments = await paginatedFetch(
                `/repos/${repoName}/issues/comments?sort=created&direction=desc`, token, 2
            );
            for (const c of issueComments) {
                if (c.user?.login !== username) {
                    allComments.push({
                        id: c.id,
                        body: c.body,
                        user: { login: c.user.login, avatar_url: c.user.avatar_url },
                        created_at: c.created_at,
                        updated_at: c.updated_at,
                        html_url: c.html_url,
                        repo: repoName,
                        type: 'issue'
                    });
                }
            }

            // PR review comments
            const prComments = await paginatedFetch(
                `/repos/${repoName}/pulls/comments?sort=created&direction=desc`, token, 2
            );
            for (const c of prComments) {
                if (c.user?.login !== username) {
                    allComments.push({
                        id: c.id,
                        body: c.body,
                        user: { login: c.user.login, avatar_url: c.user.avatar_url },
                        created_at: c.created_at,
                        updated_at: c.updated_at,
                        html_url: c.html_url,
                        repo: repoName,
                        type: 'pr_review'
                    });
                }
            }

            // Commit comments
            const commitComments = await paginatedFetch(
                `/repos/${repoName}/comments?sort=created&direction=desc`, token, 1
            );
            for (const c of commitComments) {
                if (c.user?.login !== username) {
                    allComments.push({
                        id: c.id,
                        body: c.body,
                        user: { login: c.user.login, avatar_url: c.user.avatar_url },
                        created_at: c.created_at,
                        updated_at: c.updated_at,
                        html_url: c.html_url,
                        repo: repoName,
                        type: 'commit'
                    });
                }
            }
        } catch (e) {
            console.warn(`GitSweep: Error fetching comments for ${repoName}:`, e.message);
        }
    }

    // Sort by date (newest first)
    allComments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Classify
    const classified = classifyAll(allComments);

    return { comments: classified, username, fetchedAt: new Date().toISOString() };
}

// --- Message listener ---

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'fetchComments') {
        (async () => {
            try {
                const token = await getToken();
                if (!token) {
                    sendResponse({ error: 'No GitHub token configured. Go to Settings to add one.' });
                    return;
                }
                const result = await fetchAllComments(token);
                await chrome.storage.local.set({ cachedComments: result });
                sendResponse({ success: true, data: result });
            } catch (err) {
                sendResponse({ error: err.message });
            }
        })();
        return true; // async response
    }

    if (msg.action === 'validateToken') {
        (async () => {
            try {
                const res = await fetch(`${GITHUB_API}/user`, {
                    headers: {
                        'Authorization': `Bearer ${msg.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                if (res.ok) {
                    const user = await res.json();
                    sendResponse({ valid: true, user: user.login, avatar: user.avatar_url });
                } else {
                    sendResponse({ valid: false, error: `HTTP ${res.status}` });
                }
            } catch (err) {
                sendResponse({ valid: false, error: err.message });
            }
        })();
        return true;
    }
});
