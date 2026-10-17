-- Enable foreign key constraint enforcement in SQLite
PRAGMA foreign_keys = ON;

-- Clean existing tables if re-running
DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;


-- TABLE CREATION

CREATE TABLE students (
    student_id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name  TEXT NOT NULL,
    email      TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE courses (
    course_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code TEXT NOT NULL UNIQUE,
    course_name TEXT NOT NULL,
    credits     INTEGER NOT NULL CHECK(credits > 0)
);

CREATE TABLE enrolments (
    enrolment_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id     INTEGER NOT NULL,
    course_id      INTEGER NOT NULL,
    enrolment_date DATE DEFAULT CURRENT_DATE,
    grade          TEXT CHECK(grade IN ('A', 'B', 'C', 'D', 'E', 'F', 'Pending')),
    
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id)  REFERENCES courses(course_id) ON DELETE CASCADE,
    
    -- Prevents the same student from enrolling in the same course more than once
    CONSTRAINT uq_student_course UNIQUE (student_id, course_id)
);


-- SEED DATA

-- Inserting 4 students (Student 4 will have no enrolments to test Query 4)
INSERT INTO students (first_name, last_name, email) VALUES
('Ada', 'Lovelace', 'ada.lovelace@example.com'),
('Alan', 'Turing', 'alan.turing@example.com'),
('Grace', 'Hopper', 'grace.hopper@example.com'),
('Claude', 'Shannon', 'claude.shannon@example.com');

-- Inserting 3 courses
INSERT INTO courses (course_code, course_name, credits) VALUES
('CS101', 'Introduction to Computer Science', 3),
('CS201', 'Data Structures and Algorithms', 4),
('MATH301', 'Discrete Mathematics', 3);

-- Inserting 6 enrolments
INSERT INTO enrolments (student_id, course_id, grade) VALUES
(1, 1, 'A'),        -- Ada in CS101
(1, 2, 'Pending'),  -- Ada in CS201
(1, 3, 'A'),        -- Ada in MATH301
(2, 1, 'B'),        -- Alan in CS101
(2, 2, 'A'),        -- Alan in CS201
(3, 1, 'B');        -- Grace in CS101

-- ============================================================================
-- FIVE REQUIRED QUERIES
-- ============================================================================

-- 1. All courses for one student (by name)
SELECT 
    s.first_name,
    s.last_name,
    c.course_code,
    c.course_name,
    e.grade
FROM students s
INNER JOIN enrolments e ON s.student_id = e.student_id
INNER JOIN courses c    ON e.course_id = c.course_id
WHERE s.first_name = 'Ada' AND s.last_name = 'Lovelace';

-- 2. All students on one course
SELECT 
    c.course_code,
    c.course_name,
    s.first_name,
    s.last_name,
    s.email,
    e.grade
FROM courses c
INNER JOIN enrolments e ON c.course_id = e.course_id
INNER JOIN students s   ON e.student_id = s.student_id
WHERE c.course_code = 'CS101'
ORDER BY s.last_name ASC;

-- 3. The number of students per course (includes courses with 0 students)
SELECT 
    c.course_code,
    c.course_name,
    COUNT(e.student_id) AS enrolled_students_count
FROM courses c
LEFT JOIN enrolments e ON c.course_id = e.course_id
GROUP BY c.course_id, c.course_code, c.course_name
ORDER BY enrolled_students_count DESC;

-- 4. Students who have no enrolments
SELECT 
    s.student_id,
    s.first_name,
    s.last_name,
    s.email
FROM students s
LEFT JOIN enrolments e ON s.student_id = e.student_id
WHERE e.enrolment_id IS NULL;

-- 5. Update one enrolment's grade
UPDATE enrolments
SET grade = 'A'
WHERE student_id = (SELECT student_id FROM students WHERE email = 'ada.lovelace@example.com')
  AND course_id  = (SELECT course_id FROM courses WHERE course_code = 'CS201');

-- Verification check for the update
SELECT s.first_name, s.last_name, c.course_code, e.grade
FROM enrolments e
JOIN students s ON e.student_id = s.student_id
JOIN courses c ON e.course_id = c.course_id
WHERE s.email = 'ada.lovelace@example.com' AND c.course_code = 'CS201';