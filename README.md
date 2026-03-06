<p align="center">
  <img src="icons/icon128.png" alt="GitSweep Logo" width="80" height="80" style="border-radius: 16px;">
</p>

<h1 align="center">GitSweep</h1>

<p align="center">
  <em>Sweep through the noise. Surface what matters.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Chrome Extension">
  <img src="https://img.shields.io/badge/Manifest-V3-34A853?style=for-the-badge&logo=google&logoColor=white" alt="Manifest V3">
  <img src="https://img.shields.io/badge/GitHub-API-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub API">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="MIT License">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-30d158?style=flat-square" alt="Status">
  <img src="https://img.shields.io/badge/Version-1.0.0-0a84ff?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/PRs-Welcome-ff6b6b?style=flat-square" alt="PRs Welcome">
</p>

---

## 🧹 What is GitSweep?

**GitSweep** is a Chrome extension that fetches all comments people leave on your GitHub repositories and intelligently classifies them so you can focus on what actually matters.

It pulls comments from **Issues**, **Pull Requests**, and **Commits** across your repos, then categorizes each one as:

| Category | Color | Examples |
|----------|-------|----------|
| **Useful** | Green | Bug reports, suggestions, questions, code reviews, feature requests |
| **Noise** | Red | "Thanks!", "+1", emoji-only, bot messages, "LGTM" |
| **Neutral** | Yellow | Everything in between |

No AI APIs. No subscriptions. **Completely free and offline** after fetching.

---

##  Features

- ** Smart Classification** — Heuristic-based classifier scores comments using keyword matching, length analysis, code block detection, and bot filtering
- ** Dashboard Stats** — See your total, useful, noise, and neutral counts at a glance
- ** Filter Tabs** — Quickly toggle between All / Useful / Noise / Neutral
- ** One-Click Navigation** — Click any comment card to open it directly on GitHub
- ** Privacy First** — Your token stays in local Chrome storage. No data sent to third parties
- ** Cached Results** — Comments are cached locally for instant re-opens
- ** Apple Liquid Glass UI** — Frosted glass panels, ambient glows, smooth animations

---

##  Getting Started

### Prerequisites

- **Google Chrome** (or any Chromium-based browser)
- **GitHub Account** with at least one repository
- **GitHub Personal Access Token (PAT)** with `repo` scope

### Installation

1. **Clone or download** this repository:
   ```bash
   git clone https://github.com/aaryanadiger/GitSweep.git
   ```

2. Open Chrome and navigate to:
   ```
   chrome://extensions
   ```

3. Enable **Developer Mode** (toggle in the top-right corner)

4. Click **Load unpacked** → select the `GitSweep` folder

5. The GitSweep icon will appear in your toolbar ✓

### Setup

1. Click the **GitSweep** icon → click **Open Settings**
2. Go to [github.com/settings/tokens](https://github.com/settings/tokens) → **Generate new token (classic)**
3. Select the `repo` scope → generate
4. Paste the token into GitSweep → click **Save Token**
5. Go back to the popup → click the **↻ Refresh** button
6. Your classified comments will appear!

---

##  Project Structure

```
GitSweep/
├── manifest.json                # Chrome Extension Manifest V3
├── background/
│   └── service-worker.js        # GitHub API integration & caching
├── lib/
│   └── classifier.js            # Heuristic comment classifier
├── popup/
│   ├── popup.html               # Main extension popup
│   ├── popup.css                # Apple liquid glass design system
│   └── popup.js                 # Popup state management & rendering
├── options/
│   ├── options.html             # Settings page
│   ├── options.css              # Settings styling
│   └── options.js               # Token management & validation
├── icons/
│   ├── icon16.png               # Toolbar icon
│   ├── icon48.png               # Extension management icon
│   └── icon128.png              # Chrome Web Store icon
└── README.md
```

---

## 🔧 How It Works

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────┐
│  GitHub API   │────▶│  Service Worker    │────▶│  Classifier  │
│  (REST v3)    │     │  (Fetch + Cache)   │     │  (Heuristic) │
└──────────────┘     └───────────────────┘     └──────┬───────┘
                                                       │
                                                       ▼
                                              ┌──────────────┐
                                              │  Chrome       │
                                              │  Storage      │
                                              └──────┬───────┘
                                                       │
                                                       ▼
                                              ┌──────────────┐
                                              │  Popup UI     │
                                              │  (Liquid Glass│
                                              └──────────────┘
```

1. **Fetches** issue comments, PR review comments, and commit comments from your repos via the GitHub REST API
2. **Filters out** your own comments — only shows what others have written
3. **Classifies** each comment using keyword heuristics, length checks, code detection, and bot patterns
4. **Caches** results in `chrome.storage.local` for offline access
5. **Renders** cards in a filterable, glass-effect popup UI

---


## 📡 API Usage

GitSweep uses the [GitHub REST API v3](https://docs.github.com/en/rest) with the following endpoints:

| Endpoint | Purpose |
|----------|---------|
| `GET /user` | Authenticated user info |
| `GET /user/repos` | List user's repositories |
| `GET /repos/{owner}/{repo}/issues/comments` | Issue comments |
| `GET /repos/{owner}/{repo}/pulls/comments` | PR review comments |
| `GET /repos/{owner}/{repo}/comments` | Commit comments |

**Rate Limit:** 5,000 requests/hour for authenticated users (more than enough).

---

##  Privacy & Security

-  Your PAT is stored in `chrome.storage.sync` — encrypted by Chrome, never leaves your browser
-  No data is sent to any third-party server
- Classification runs entirely offline using local heuristics
-  Clear your cache anytime from Settings

---

## 🛣️ Roadmap

- [ ] Chrome Web Store listing
- [ ] OAuth login (no manual PAT entry)
- [ ] Dark/light theme toggle
- [ ] Export comments as CSV/JSON
- [ ] Notification badges for new useful comments
- [ ] AI-powered classification (optional, opt-in)
- [ ] Firefox & Edge support

---

##  Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

##  License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ by Aarya Nadiger
</p>
