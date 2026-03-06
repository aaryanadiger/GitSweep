/**
 * GitSweep Comment Classifier
 * Heuristic-based classifier that scores comments as useful, noise, or neutral.
 */

const USEFUL_KEYWORDS = [
  'bug', 'issue', 'error', 'fix', 'broken', 'crash', 'fail',
  'suggest', 'suggestion', 'feature', 'request', 'improve', 'improvement',
  'consider', 'should', 'could', 'would', 'recommend',
  'question', 'how', 'why', 'what', 'where', 'when',
  'help', 'problem', 'trouble', 'unable', 'cannot', 'can\'t',
  'review', 'feedback', 'opinion', 'thoughts',
  'performance', 'security', 'vulnerability', 'deprecat',
  'refactor', 'breaking', 'migration', 'update', 'upgrade',
  'documentation', 'docs', 'example', 'clarif'
];

const NOISE_KEYWORDS = [
  'thanks', 'thank you', 'thx', 'ty',
  'lgtm', 'looks good', 'ship it',
  'nice', 'great', 'awesome', 'cool', 'amazing', 'perfect',
  'good job', 'well done', 'neat', 'sweet',
  '+1', '👍', '🎉', '❤️', '🚀', '✅', '💯',
  'bump', 'following', 'subscribe', 'me too', 'same here',
  'first', 'noice'
];

const BOT_PATTERNS = [
  /\[bot\]/i,
  /github-actions/i,
  /dependabot/i,
  /renovate/i,
  /codecov/i,
  /coveralls/i,
  /stale\[bot\]/i,
  /This is an automated/i
];

/**
 * Classify a single comment
 * @param {Object} comment - { body, user, created_at, html_url, repo }
 * @returns {Object} - { category, score, tags }
 */
export function classifyComment(comment) {
  const body = (comment.body || '').trim();
  const tags = [];
  let score = 0;

  // --- Bot detection ---
  if (BOT_PATTERNS.some(p => p.test(comment.user?.login || '') || p.test(body))) {
    return { category: 'noise', score: -10, tags: ['bot'] };
  }

  // --- Length signals ---
  if (body.length < 10) {
    score -= 3;
    tags.push('very-short');
  } else if (body.length > 200) {
    score += 2;
    tags.push('detailed');
  }

  // --- Code blocks ---
  if (/```[\s\S]*?```/.test(body) || /`[^`]+`/.test(body)) {
    score += 3;
    tags.push('has-code');
  }

  // --- Questions ---
  if (/\?/.test(body)) {
    score += 2;
    tags.push('question');
  }

  // --- URLs / references ---
  if (/https?:\/\/[^\s]+/.test(body)) {
    score += 1;
    tags.push('has-link');
  }

  // --- Useful keyword matching ---
  const bodyLower = body.toLowerCase();
  let usefulHits = 0;
  for (const kw of USEFUL_KEYWORDS) {
    if (bodyLower.includes(kw)) {
      usefulHits++;
    }
  }
  if (usefulHits > 0) {
    score += Math.min(usefulHits * 1.5, 6);
    tags.push('actionable');
  }

  // --- Noise keyword matching ---
  let noiseHits = 0;
  for (const kw of NOISE_KEYWORDS) {
    if (bodyLower.includes(kw)) {
      noiseHits++;
    }
  }
  if (noiseHits > 0) {
    score -= Math.min(noiseHits * 2, 6);
    tags.push('low-signal');
  }

  // --- Emoji-only detection ---
  const stripped = body.replace(/[\p{Emoji_Presentation}\p{Emoji}\u200d\ufe0f\s]/gu, '');
  if (stripped.length === 0 && body.length > 0) {
    score -= 5;
    tags.push('emoji-only');
  }

  // --- Determine category ---
  let category;
  if (score >= 3) {
    category = 'useful';
  } else if (score <= -2) {
    category = 'noise';
  } else {
    category = 'neutral';
  }

  return { category, score: Math.round(score * 10) / 10, tags };
}

/**
 * Classify an array of comments
 * @param {Array} comments
 * @returns {Array} - comments with classification attached
 */
export function classifyAll(comments) {
  return comments.map(c => ({
    ...c,
    classification: classifyComment(c)
  }));
}
