# Library Books REST API Specification

This document outlines the RESTful API endpoints for managing the library's `books` resource, including standard CRUD operations, filtering, and common error responses.

---

## Endpoints

### 1. List All Books
* **Method:** `GET`
* **Path:** `/api/v1/books`
* **Description:** Retrieves a paginated list of all books in the library catalog.
* **Request Body:** None
* **Success Status Code:** `200 OK`

---

### 2. Get a Specific Book
* **Method:** `GET`
* **Path:** `/api/v1/books/:id`
* **Description:** Retrieves the detailed information of a single book by its unique ID.
* **Request Body:** None
* **Success Status Code:** `200 OK`

---

### 3. Filter Books by Author
* **Method:** `GET`
* **Path:** `/api/v1/books?author=:authorName`
* **Description:** Retrieves a list of books matching a specific author name via a query parameter.
* **Request Body:** None
* **Success Status Code:** `200 OK`

---

### 4. Create a Book
* **Method:** `POST`
* **Path:** `/api/v1/books`
* **Description:** Adds a new book to the library catalog.
* **Request Body:**
  ```json
  {
    "title": "Clean Code",
    "author": "Robert C. Martin",
    "isbn": "9780132350884",
    "publishedYear": 2008,
    "genre": "Software Engineering",
    "copiesAvailable": 5
  }
  ```
* **Success Status Code:** `201 Created`

---

### 5. Update a Book
* **Method:** `PUT`
* **Path:** `/api/v1/books/:id`
* **Description:** Updates the complete record of an existing book by its ID.
* **Request Body:**
  ```json
  {
    "title": "Clean Code: A Handbook of Agile Software Craftsmanship",
    "author": "Robert C. Martin",
    "isbn": "9780132350884",
    "publishedYear": 2008,
    "genre": "Software Engineering",
    "copiesAvailable": 4
  }
  ```
* **Success Status Code:** `200 OK`

---

### 6. Delete a Book
* **Method:** `DELETE`
* **Path:** `/api/v1/books/:id`
* **Description:** Permanently removes a book from the library catalog.
* **Request Body:** None
* **Success Status Code:** `204 No Content`

---

## Common Error Codes

* **`400 Bad Request`**
  * **When it occurs:** The client sends a malformed request body, omits mandatory fields during creation/update, or supplies an invalid data type.
  * **Example Scenario:** A client sends a `POST /api/v1/books` request without the mandatory `title` field, or provides `"publishedYear": "two-thousand-eight"` instead of an integer.

* **`404 Not Found`**
  * **When it occurs:** The requested resource does not exist on the server.
  * **Example Scenario:** A client sends a `GET /api/v1/books/99999` or `DELETE /api/v1/books/99999` request, but no book with ID `99999` exists in the database.