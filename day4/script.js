// ==========================================================================
// 1. Element Selectors & Constants
// ==========================================================================
const noteText = document.getElementById('note-text');
const charCount = document.getElementById('char-count');
const wordCount = document.getElementById('word-count');
const clearBtn = document.getElementById('clear-btn');
const themeToggle = document.getElementById('theme-toggle');

const STORAGE_KEYS = {
  DRAFT: 'day4_note_draft',
  THEME: 'day4_theme_preference'
};

const CHAR_LIMIT = 200;
const WARNING_THRESHOLD = 180;

// ==========================================================================
// Core Functions
// ==========================================================================

/**
 * Calculates characters & words, updates innerText,
 * and handles the warning/over threshold classes.
 */
function updateCounts() {
  const text = noteText.value;
  const numChars = text.length;

  // Split by whitespace and remove empty strings to accurately count words
  const trimmed = text.trim();
  const numWords = trimmed === '' ? 0 : trimmed.split(/\s+/).length;

  // Update counter text labels
  charCount.textContent = `${numChars} / ${CHAR_LIMIT} characters`;
  wordCount.textContent = `${numWords} words`;

  // Manage threshold classes on the character counter
  if (numChars > CHAR_LIMIT) {
    charCount.classList.remove('warning');
    charCount.classList.add('over');
  } else if (numChars > WARNING_THRESHOLD) {
    charCount.classList.add('warning');
    charCount.classList.remove('over');
  } else {
    charCount.classList.remove('warning', 'over');
  }
}

/**
 * Clears the textarea, resets counts, and purges localStorage draft.
 */
function clearAll() {
  noteText.value = '';
  localStorage.removeItem(STORAGE_KEYS.DRAFT);
  updateCounts();
}

/**
 * Toggles dark mode class on document.body, updates button label,
 * and saves preference to localStorage.
 */
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  themeToggle.textContent = isDark ? 'Light mode' : 'Dark mode';
  localStorage.setItem(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
}

/**
 * Applies a specific theme mode to the DOM and syncs the button text.
 */
function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark');
    themeToggle.textContent = 'Light mode';
  } else {
    document.body.classList.remove('dark');
    themeToggle.textContent = 'Dark mode';
  }
}

// ==========================================================================
// 2, 4, 5. Event Listeners
// ==========================================================================

// Handle live typing, counting, and draft auto-saving
noteText.addEventListener('input', () => {
  updateCounts();
  localStorage.setItem(STORAGE_KEYS.DRAFT, noteText.value);
});

// Clear button click
clearBtn.addEventListener('click', clearAll);

// Escape key listener within the textarea
noteText.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    clearAll();
  }
});

// Theme toggle button click
themeToggle.addEventListener('click', toggleTheme);

// ==========================================================================
// 3. Initialization on Page Load
// ==========================================================================

// Restore saved theme preference
const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
applyTheme(savedTheme);

// Restore saved draft
const savedDraft = localStorage.getItem(STORAGE_KEYS.DRAFT);
if (savedDraft !== null) {
  noteText.value = savedDraft;
}

// Initial calculation to sync state on load
updateCounts();