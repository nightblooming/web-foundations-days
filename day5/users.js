// DOM Element References
const loadUsersBtn = document.getElementById('load-users');
const filterInput = document.getElementById('filter-input');
const statusMsg = document.getElementById('status');
const usersList = document.getElementById('users-list');

// In-memory cache for fetched users
let users = [];

/**
 * Task 2: Renders an array of user objects to the DOM.
 * Uses document.createElement and textContent to prevent XSS.
 * Displays "No users match your filter." when a non-empty list filters down to 0 results.
 * 
 * @param {Array<Object>} list - The array of user objects to render.
 */
function renderUsers(list) {
  // Clear previous list entries
  usersList.textContent = '';

  // Check if filtering returned no results while we have loaded users
  if (list.length === 0 && users.length > 0) {
    statusMsg.textContent = 'No users match your filter.';
    return;
  }

  // Create document fragment for performant batch DOM insertion
  const fragment = document.createDocumentFragment();

  list.forEach((user) => {
    const li = document.createElement('li');

    // Name
    const nameHeading = document.createElement('strong');
    nameHeading.textContent = user.name || 'N/A';

    // Details paragraph (email, city, company)
    const details = document.createElement('p');
    const email = user.email || 'N/A';
    const city = user.address?.city || 'N/A';
    const company = user.company?.name || 'N/A';
    
    details.textContent = `Email: ${email} | City: ${city} | Company: ${company}`;

    li.appendChild(nameHeading);
    li.appendChild(details);
    fragment.appendChild(li);
  });

  usersList.appendChild(fragment);
}

/**
 * Task 1: Fetches users asynchronously, updates UI status,
 * handles errors, and ensures button state resets in `finally`.
 */
async function loadUsers() {
  loadUsersBtn.disabled = true;
  statusMsg.textContent = 'Loading users...';
  usersList.textContent = '';

  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/users');
    // Test 404 Not Found (triggers response.ok === false)
    //const response = await fetch('https://jsonplaceholder.typicode.com/invalid-endpoint');

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    users = data;

    // Reset filter input on fresh fetch
    filterInput.value = '';

    renderUsers(users);
    statusMsg.textContent = `Successfully loaded ${users.length} users.`;
  } catch (error) {
    statusMsg.textContent = `Error loading users: ${error.message}`;
    users = [];
  } finally {
    loadUsersBtn.disabled = false;
  }
}

/**
 * Task 3: Listen for the 'input' event on the filter box.
 * Performs a case-insensitive search on the cached array without fetching again.
 */
filterInput.addEventListener('input', (event) => {
  if (users.length === 0) return;

  const query = event.target.value.trim().toLowerCase();

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(query)
  );

  // Clear or update status based on results
  if (filteredUsers.length > 0) {
    statusMsg.textContent = `Showing ${filteredUsers.length} of ${users.length} users.`;
  }

  renderUsers(filteredUsers);
});

// Event listener for the Load Users button
loadUsersBtn.addEventListener('click', loadUsers);

