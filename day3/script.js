let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

//searchNotes(word) returns an array of notes whose text contains word, ignoring upper and lower case.
function searchNotes(word) {
  const query = word.toLowerCase();
  return notes.filter((note) => note.text.toLowerCase().includes(query));
}

// Tests
console.log("Search 'bread' (matches note 1):");
console.log(searchNotes("bread"));

console.log("\nSearch 'JAVASCRIPT' (case-insensitive test, matches note 4):");
console.log(searchNotes("JAVASCRIPT"));

console.log("\nSearch 'the' (matches notes 2 & 3):");
console.log(searchNotes("the"));

console.log("\nSearch 'gym' (no match, returns empty array):");
console.log(searchNotes("gym"));

//longestNote() returns the note object with the most characters, or null if there are no notes.
function longestNote(noteList = notes) {
  if (!noteList || noteList.length === 0) {
    return null;
  }

  return noteList.reduce((longest, current) => {
    return current.text.length > longest.text.length ? current : longest;
  });
}

// Tests
console.log("Longest note in the default notes list:");
// Note 3 has 34 characters: "Email the project report to Grace"
console.log(longestNote());

console.log("\nTesting with an empty array (should return null):");
console.log(longestNote([]));

console.log("\nTesting with null/undefined (should return null):");
console.log(longestNote(null));

//countByCategory() returns an object counting notes per category, such as { personal: 2, work: 1, study: 2 }.
function countByCategory(noteList = notes) {
  if (!noteList || noteList.length === 0) {
    return {};
  }

  return noteList.reduce((counts, note) => {
    counts[note.category] = (counts[note.category] || 0) + 1;
    return counts;
  }, {});
}

// Tests
console.log("Count by category for default notes (expected: { personal: 2, study: 2, work: 1 }):");
console.log(countByCategory());

console.log("\nTesting with an empty array (expected: {}):");
console.log(countByCategory([]));

console.log("\nTesting with custom list (expected: { work: 2, personal: 1 }):");
const customNotes = [
  { id: 10, text: "Task A", category: "work" },
  { id: 11, text: "Task B", category: "work" },
  { id: 12, text: "Task C", category: "personal" },
];
console.log(countByCategory(customNotes));

//getSummary() returns a sentence such as "5 notes: 2 personal, 1 work, 2 study."
function countByCategory(noteList = notes) {
  if (!noteList || noteList.length === 0) return {};
  return noteList.reduce((counts, note) => {
    counts[note.category] = (counts[note.category] || 0) + 1;
    return counts;
  }, {});
}

/**
 * Generates a formatted summary string of the notes.
 * @param {Array<Object>} [noteList=notes] - Array of note objects. Defaults to global `notes`.
 * @returns {string} Formatted summary sentence.
 */
function getSummary(noteList = notes) {
  const total = noteList?.length || 0;
  const noteWord = total === 1 ? "note" : "notes";

  if (total === 0) {
    return `0 notes.`;
  }

  const counts = countByCategory(noteList);
  const breakdown = Object.entries(counts)
    .map(([category, count]) => `${count} ${category}`)
    .join(", ");

  return `${total} ${noteWord}: ${breakdown}.`;
}

// Tests
console.log("Summary for default notes list:");
// Expected: "5 notes: 2 personal, 2 study, 1 work."
console.log(getSummary());

console.log("\nSummary for single note (testing singular 'note'):");
const singleNote = [{ id: 1, text: "Buy groceries", category: "personal" }];
// Expected: "1 note: 1 personal."
console.log(getSummary(singleNote));

console.log("\nSummary for empty list:");
// Expected: "0 notes."
console.log(getSummary([]));

//isDuplicate(text) returns true if a note with the same text already exists (ignoring case and extra spaces).
function isDuplicate(text, noteList = notes) {
  if (!text || !noteList || noteList.length === 0) return false;

  // Normalizes by trimming edges, collapsing multiple internal spaces into one, and converting to lowercase
  const normalize = (str) => str.trim().replace(/\s+/g, " ").toLowerCase();
  const normalizedTarget = normalize(text);

  return noteList.some((note) => normalize(note.text) === normalizedTarget);
}

// Tests
console.log("Exact duplicate ('Call mum'):");
// Expected: true
console.log(isDuplicate("Call mum"));

console.log("\nCase variation ('call MUM'):");
// Expected: true
console.log(isDuplicate("call MUM"));

console.log("\nExtra leading, trailing, and internal spaces ('   Buy   milk   and bread   '):");
// Expected: true
console.log(isDuplicate("   Buy   milk   and bread   "));

console.log("\nUnique note ('Walk the dog'):");
// Expected: false
console.log(isDuplicate("Walk the dog"));

console.log("\nEmpty or whitespace-only input ('   '):");
// Expected: false
console.log(isDuplicate("   "));

//addNote(text, category) adds a note only if it is 1–200 characters, is not a duplicate and the category is one of personal, work or study. It returns true when added and false otherwise, logging the reason.
const ALLOWED_CATEGORIES = ["personal", "work", "study"];
function addNote(text, category, noteList = notes) {
  if (typeof text !== "string") {
    console.log("Failed to add note: Text must be a string.");
    return false;
  }

  const trimmedText = text.trim();

  // 1. Length validation (1–200 characters)
  if (trimmedText.length < 1 || trimmedText.length > 200) {
    console.log(`Failed to add note: Text length (${trimmedText.length}) must be between 1 and 200 characters.`);
    return false;
  }

  // 2. Duplicate validation
  if (isDuplicate(trimmedText, noteList)) {
    console.log(`Failed to add note: A note with text "${trimmedText}" already exists.`);
    return false;
  }

  // 3. Category validation
  const normalizedCategory = typeof category === "string" ? category.trim().toLowerCase() : "";
  if (!ALLOWED_CATEGORIES.includes(normalizedCategory)) {
    console.log(`Failed to add note: "${category}" is invalid. Category must be one of: ${ALLOWED_CATEGORIES.join(", ")}.`);
    return false;
  }

  // Generate the next unique ID
  const nextId = noteList.length > 0 ? Math.max(...noteList.map((n) => n.id)) + 1 : 1;

  const newNote = {
    id: nextId,
    text: trimmedText,
    category: normalizedCategory,
  };

  noteList.push(newNote);
  console.log(`Successfully added note (ID: ${newNote.id}): "${newNote.text}" [${newNote.category}]`);
  return true;
}

// Tests
console.log("--- Test 1: Valid note ---");
console.log("Result:", addNote("Prepare weekly grocery budget", "personal"));

console.log("\n--- Test 2: Duplicate note ---");
console.log("Result:", addNote("call MUM", "personal"));

console.log("\n--- Test 3: Empty string (fails 1-200 char rule) ---");
console.log("Result:", addNote("   ", "study"));

console.log("\n--- Test 4: Text too long (> 200 chars) ---");
const longText = "A".repeat(201);
console.log("Result:", addNote(longText, "work"));

console.log("\n--- Test 5: Invalid category ---");
console.log("Result:", addNote("Renew gym membership", "fitness"));

console.log("\n--- Updated Notes List ---");
console.table(notes);