# School Enrollment Database Design

## 1. Table Summaries
* **`students`**: Stores core identity and communication details for each learner (`student_id`, `first_name`, `last_name`, `email`, `created_at`). `email` is strictly unique.
* **`courses`**: Contains academic offerings and curricular metadata (`course_id`, `course_code`, `course_name`, `credits`).
* **`enrolments`**: Tracks the registration events connecting individual students to specific courses (`enrolment_id`, `student_id`, `course_id`, `enrolment_date`, `grade`).

## 2. Relationships & The Need for a Join Table
* **Cardinality**: The fundamental relationship between **students** and **courses** is **Many-to-Many ($M:N$)**. One student can take multiple courses, and one course can be attended by multiple students.
* **Why a Join Table is Required**: Relational databases cannot store multi-valued or array attributes directly without violating First Normal Form ($1\text{NF}$). Adding a `course_id` column to the `students` table limits each student to one course; adding comma-separated IDs breaks indexing, atomicity, and referential integrity.
* **Decomposition into One-to-Many ($1:N$)**: The `enrolments` table resolves the $M:N$ relation by acting as an associative bridge:
  * `students` to `enrolments`: **One-to-Many ($1:N$)** (one student, multiple enrollment records).
  * `courses` to `enrolments`: **One-to-Many ($1:N$)** (one course, multiple enrollment records).
  * A composite uniqueness constraint `UNIQUE(student_id, course_id)` enforces business validity at the schema level.

## 3. Recommended Index
* **Index**: 
  ```sql
  CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);

Reasoning: While enrolments(student_id, course_id) is already covered by the composite unique index created for the rule constraint (which indexes student_id as the leading column), filtering or joining on course_id in reverse (e.g., finding all students in a given course, or aggregating counts per course) causes full table scans on enrolments. A dedicated B-Tree index on enrolments(course_id) reduces lookup complexity from $O(N)$ to $O(\log N)$ for course-centric queries.

## 4. Architectural Selection: SQL vs. NoSQLA relational 
(SQL) database is the superior architecture for a school enrollment system. Academic data is inherently relational, highly structured, and governed by strict constraints—such as preventing duplicate enrollments, maintaining referential integrity across course rosters, and avoiding grade update anomalies. SQL provides full ACID guarantees, ensuring transactional consistency during simultaneous registrations and grading. In contrast, a NoSQL document store would either require duplicating student and course metadata across documents (leading to data anomalies when a student updates their email or a course title changes) or simulating joins manually in the application layer without database-level referential guarantees.