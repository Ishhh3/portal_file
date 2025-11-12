const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;
const SALT_ROUNDS = 10;

app.use(cors());
app.use(bodyParser.json());

const db = mysql.createConnection({
  host: "153.92.15.6",
  user: "u579076463_eucportal",
  password: "Mseufciportalcollege_@2025",
  database: "u579076463_eucportal_db",
});

db.connect((err) => {
  if (err) throw err;
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'arielescobilla2203@gmail.com',
    pass: 'rsekdnagphssxgmh'
  }
});

app.get("/api/members", (req, res) => {
  db.query("SELECT * FROM accounts", (err, rows) => {
    if (err) throw err;
    res.json(rows);
  });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const studentQuery = "SELECT student_id AS username, password_hash, 'student' AS role FROM accounts WHERE student_id = ?";
  db.query(studentQuery, [username], async (err, studentResults) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Server error" });
    }

    if (studentResults.length > 0) {
      const student = studentResults[0];
      const isMatch = await bcrypt.compare(password, student.password_hash);
      if (isMatch) {
        return res.json({
          success: true,
          role: "student",
          username: student.username,
          student_id: student.username,
        });
      } else {
        return res.status(400).json({ success: false, message: "Invalid password" });
      }
    }

    const teacherQuery = `
      SELECT ta.name_teacher AS username, ta.password_hash, 
             'teacher' AS role, t.teacher_id, t.teacherUser_id 
      FROM teacher_accounts ta
      JOIN teachers t ON ta.teacher_id = t.teacher_id
      WHERE ta.name_teacher = ?
    `;

    db.query(teacherQuery, [username], async (err, teacherResults) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Server error" });
      }

      if (teacherResults.length > 0) {
        const teacher = teacherResults[0];
        const isMatch = await bcrypt.compare(password, teacher.password_hash);
        if (isMatch) {
          return res.json({
            success: true,
            role: "teacher",
            username: teacher.username,
            teacher_id: teacher.teacher_id,
            teacherUser_id: teacher.teacherUser_id,
          });
        } else {
          return res.status(400).json({ success: false, message: "Invalid password" });
        }
      }

      const adminQuery = `
        SELECT admin_id, username, password_hash, full_name, email, phone, 'admin' AS role
        FROM admin_accounts
        WHERE username = ?
      `;

      db.query(adminQuery, [username], async (err, adminResults) => {
        if (err) {
          return res.status(500).json({ success: false, message: "Server error" });
        }

        if (adminResults.length > 0) {
          const admin = adminResults[0];
          const isMatch = await bcrypt.compare(password, admin.password_hash);
          if (isMatch) {
            return res.json({
              success: true,
              role: "admin",
              username: admin.username,
              admin_id: admin.admin_id,
              full_name: admin.full_name,
              email: admin.email,
              phone: admin.phone,
            });
          } else {
            return res.status(400).json({ success: false, message: "Invalid password" });
          }
        }

        return res.status(404).json({ success: false, message: "User not found" });
      });
    });
  });
});

app.get("/student/dashboard/:student_id", (req, res) => {
  const student_id = req.params.student_id;

  const studentQuery = `
    SELECT 
      a.student_id, 
      CONCAT(s.first_name, ' ', s.middle_name, '. ', s.last_name) AS full_name, 
      c.course_name AS course, 
      y.year_level_name AS year_level,
      s.studentUser_id
    FROM accounts a
    JOIN students s ON a.studentUser_id = s.studentUser_id 
    JOIN courses c ON s.course_id = c.course_id 
    JOIN year_levels y ON s.year_level_id = y.year_level_id 
    WHERE a.student_id = ?;
  `;

  const enrolledSubjectsQuery = `
    SELECT COUNT(*) AS enrolled_subjects
    FROM student_subject ss
    WHERE ss.studentUser_id = ?;
  `;

  const totalUnitsQuery = `
    SELECT SUM(sub.unit) AS total_units
    FROM student_subject ss
    JOIN subjects sub ON ss.subject_id = sub.subject_id
    WHERE ss.studentUser_id = ?;
  `;

  const gwaQuery = `
    SELECT SUM(g.final_grade * sub.unit) / SUM(sub.unit) AS average_final
    FROM grades g
    JOIN subjects sub ON g.subject_id = sub.subject_id
    WHERE g.studentUser_id = ? AND g.final_grade IS NOT NULL;
  `;

  const leaderboardQuery = `
    SELECT 
      a.student_id,
      SUM(g.final_grade * sub.unit) / SUM(sub.unit) AS gwa
    FROM grades g
    INNER JOIN students s ON g.studentUser_id = s.studentUser_id
    INNER JOIN accounts a ON s.studentUser_id = a.studentUser_id
    INNER JOIN subjects sub ON g.subject_id = sub.subject_id
    WHERE g.final_grade IS NOT NULL
    GROUP BY a.student_id, s.studentUser_id
    HAVING gwa >= 1.0000 AND gwa <= 1.7500
    ORDER BY gwa ASC
  `;

  db.query(studentQuery, [student_id], (err, studentRows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    if (studentRows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const studentData = studentRows[0];
    const studentUserId = studentData.studentUser_id;

    db.query(enrolledSubjectsQuery, [studentUserId], (err, enrolledRows) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }

      db.query(totalUnitsQuery, [studentUserId], (err, unitsRows) => {
        if (err) {
          return res.status(500).json({ error: "Database error" });
        }

        db.query(gwaQuery, [studentUserId], (err, gwaRows) => {
          if (err) {
            return res.status(500).json({ error: "Database error" });
          }

          const enrolled_subjects = enrolledRows[0].enrolled_subjects || 0;
          const total_units = unitsRows[0].total_units || 0;
          const average_final = gwaRows[0].average_final || 0;

          db.query(leaderboardQuery, (err, leaderboardRows) => {
            if (err) {
              return res.status(500).json({ error: "Database error" });
            }

            const studentGWA = parseFloat(average_final);
            let ranking = 0;

            if (studentGWA >= 1.0000 && studentGWA <= 1.7500) {
              const rankIndex = leaderboardRows.findIndex(row => row.student_id === student_id);
              ranking = rankIndex >= 0 ? rankIndex + 1 : 0;
            }

            let scholar_type = '';
            if (studentGWA >= 1.0000 && studentGWA <= 1.2999) {
              scholar_type = 'University Scholar';
            } else if (studentGWA >= 1.3000 && studentGWA <= 1.5000) {
              scholar_type = 'College Scholar';
            } else if (studentGWA >= 1.5001 && studentGWA <= 1.7500) {
              scholar_type = "Dean's Lister";
            }

            res.json({
              student_id: studentData.student_id,
              full_name: studentData.full_name,
              course: studentData.course,
              year_level: studentData.year_level,
              average_final: average_final,
              enrolled_subjects: enrolled_subjects,
              total_units: total_units,
              ranking: ranking,
              scholar_type: scholar_type
            });
          });
        });
      });
    });
  });
});

app.get("/teacher/dashboard/:teacher_id", (req, res) => {
  const teacher_id = req.params.teacher_id;
  

  const selectQuery = `
    SELECT 
      t.teacher_id,
      t.teacherUser_id,
      CONCAT(t.first_name, ' ', t.middle_name, '. ', t.last_name) AS full_name,
      d.department_name,
      '2024-2025' as academic_year
    FROM teachers t
    JOIN departments d ON t.department_id = d.department_id
    LEFT JOIN teacher_accounts ta ON t.teacher_id = ta.teacher_id
    WHERE t.teacher_id = ?
    LIMIT 1;
  `;

  db.query(selectQuery, [teacher_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: "Teacher not found" });
    }
    res.json(rows[0]);
  });
});

app.get("/teacher/stats/:teacher_id", (req, res) => {
  const teacher_id = req.params.teacher_id;
  

  const statsQuery = `
    SELECT 
      COUNT(DISTINCT ss.subject_id) as total_classes,
      (SELECT COUNT(DISTINCT hs.subject_id) 
       FROM handle_subject hs 
       WHERE hs.teacher_id = ?) as total_subjects,
      COUNT(DISTINCT ss.studentUser_id) as total_students
    FROM student_subject ss
    WHERE ss.teacher_id = ?
  `;
  
  const announcementsQuery = `SELECT COUNT(*) as announcements FROM announcements`;

  db.query(statsQuery, [teacher_id, teacher_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    
    db.query(announcementsQuery, (err2, announcementsResult) => {
      if (err2) {
        return res.status(500).json({ error: "Database error" });
      }
      
      const stats = {
        total_classes: results[0].total_classes || 0,
        total_subjects: results[0].total_subjects || 0,
        total_students: results[0].total_students || 0,
        announcements: announcementsResult[0].announcements || 0
      };
      
      res.json(stats);
    });
  });
});

app.get("/admin/dashboard/:admin_id", (req, res) => {
  const admin_id = req.params.admin_id;
  

  const selectQuery = `
    SELECT 
      admin_id,
      username,
      full_name,
      email,
      phone,
      created_at,
      postion,
      adminuser_id
    FROM admin_accounts
    WHERE admin_id = ?
    LIMIT 1;
  `;

  db.query(selectQuery, [admin_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: "Admin not found" });
    }
    res.json(rows[0]);
  });
});

app.get("/admin/stats", (req, res) => {
  const statsQuery = `
    SELECT 
      (SELECT COUNT(*) FROM students WHERE studentUser_id IS NOT NULL) as total_students,
      (SELECT COUNT(*) FROM teachers WHERE teacher_id IS NOT NULL) as total_teachers,
      (SELECT COUNT(*) FROM subjects WHERE subject_id IS NOT NULL) as total_subjects,
      (SELECT COUNT(*) FROM courses WHERE course_id IS NOT NULL) as total_courses,
      (SELECT COUNT(*) FROM announcements WHERE id IS NOT NULL) as total_announcements
  `;

  db.query(statsQuery, (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results[0]);
  });
});

app.get("/admin/students", (req, res) => {
  const query = `
    SELECT 
      s.studentUser_id,
      a.student_id,
      CONCAT(s.first_name, ' ', s.middle_name, '. ', s.last_name) AS full_name,
      s.birthdate,
      s.gender,
      s.email,
      s.phone,
      c.course_name,
      y.year_level_name
    FROM students s
    JOIN accounts a ON s.studentUser_id = a.studentUser_id
    JOIN courses c ON s.course_id = c.course_id
    JOIN year_levels y ON s.year_level_id = y.year_level_id
    ORDER BY s.last_name, s.first_name
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to fetch students",
        error: err.message 
      });
    }

    res.json(results);
  });
});

app.get("/student/grades/:student_id", (req, res) => {
  const student_id = req.params.student_id;

  const gradesQuery = `
    SELECT 
      g.grade_id,
      g.studentUser_id,
      s.subject_code,
      s.subject_name,
      g.midterm_grade,
      g.final_grade,
      g.academic_year,
      g.semester,
      CONCAT(t.first_name, ' ', t.middle_name, '. ', t.last_name) AS teacher_name
    FROM grades g
    JOIN accounts a ON g.studentUser_id = a.studentUser_id
    JOIN subjects s ON g.subject_id = s.subject_id
    JOIN teachers t ON g.teacher_id = t.teacher_id
    JOIN student_subject ss ON g.studentUser_id = ss.studentUser_id AND g.subject_id = ss.subject_id
    WHERE a.student_id = ?
    ORDER BY g.academic_year DESC, g.semester DESC, s.subject_name ASC
  `;

  db.query(gradesQuery, [student_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

app.get("/student/registration/:student_id", (req, res) => {
  const student_id = req.params.student_id;

  const registrationQuery = `
    SELECT 
      a.student_id,
      CONCAT(s.first_name, ' ', s.middle_name, '. ', s.last_name) AS full_name,
      s.birthdate,
      s.gender,
      s.email,
      s.phone,
      c.course_name,
      y.year_level_name
    FROM accounts a
    JOIN students s ON a.studentUser_id = s.studentUser_id
    JOIN courses c ON s.course_id = c.course_id
    JOIN year_levels y ON s.year_level_id = y.year_level_id
    WHERE a.student_id = ?
  `;

  db.query(registrationQuery, [student_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }
    res.json(rows[0]);
  });
});

app.get("/student/email/:student_id", (req, res) => {
  const student_id = req.params.student_id;

  const query = `
    SELECT email 
    FROM students s
    JOIN accounts a ON s.studentUser_id = a.studentUser_id
    WHERE a.student_id = ?
  `;

  db.query(query, [student_id], (err, results) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        error: "Failed to fetch email" 
      });
    }

    if (results.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Student not found" 
      });
    }

    res.json({ 
      success: true, 
      email: results[0].email 
    });
  });
});

app.put("/api/change-password-student", async (req, res) => {
  const { studentId, oldPassword, newPassword } = req.body;

  if (!studentId || !oldPassword || !newPassword) {
    return res.status(400).json({ 
      success: false, 
      message: "All fields are required" 
    });
  }

  const verifyQuery = `
    SELECT account_id, password_hash
    FROM accounts
    WHERE student_id = ?
  `;

  db.query(verifyQuery, [studentId], async (err, results) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: "Database error" 
      });
    }

    if (results.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Student account not found" 
      });
    }

    const account = results[0];
    const isMatch = await bcrypt.compare(oldPassword, account.password_hash);

    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: "Current password is incorrect" 
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    // Update both password_hash and plain_password
    const updateQuery = `
      UPDATE accounts 
      SET password_hash = ?, plain_password = ? 
      WHERE account_id = ?
    `;

    db.query(updateQuery, [hashedNewPassword, newPassword, account.account_id], (err, result) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: "Failed to update password" 
        });
      }

      res.json({ 
        success: true, 
        message: "Password changed successfully!" 
      });
    });
  });
});

app.get("/grades/:student_id", (req, res) => {
  const student_id = req.params.student_id;

  const gradesQuery = `
    SELECT 
      g.grade_id,
      g.studentUser_id,
      s.subject_code,
      s.subject_name,
      g.midterm_grade,
      g.final_grade,
      g.academic_year,
      g.semester,
      CONCAT(t.first_name, ' ', t.middle_name, '. ', t.last_name) AS teacher_name
    FROM grades g
    JOIN accounts a ON g.studentUser_id = a.studentUser_id
    JOIN subjects s ON g.subject_id = s.subject_id
    JOIN teachers t ON g.teacher_id = t.teacher_id
    WHERE a.student_id = ?
    ORDER BY g.academic_year DESC, g.semester DESC, s.subject_name ASC;
  `;

  db.query(gradesQuery, [student_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

app.get("/grades/teacher/:teacher_id", (req, res) => {
  const teacher_id = req.params.teacher_id;

  const gradesQuery = `
    SELECT 
      g.grade_id,
      g.studentUser_id,
      CONCAT(st.first_name, ' ', st.middle_name, '. ', st.last_name) AS student_name,
      s.subject_code,
      s.subject_name,
      g.midterm_grade,
      g.final_grade,
      g.academic_year,
      g.semester
    FROM grades g
    JOIN students st ON g.studentUser_id = st.studentUser_id
    JOIN subjects s ON g.subject_id = s.subject_id
    WHERE g.teacher_id = ?
    ORDER BY s.subject_name ASC, st.last_name ASC;
  `;

  db.query(gradesQuery, [teacher_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

app.get("/teacher/subjects/:teacher_id", (req, res) => {
  const teacher_id = req.params.teacher_id;
  
  const subjectsQuery = `
    SELECT DISTINCT
      s.subject_id,
      s.subject_code,
      s.subject_name,
      hs.sectionCode,
      d.department_name,
      COUNT(DISTINCT ss.studentUser_id) as student_count
    FROM handle_subject hs
    INNER JOIN subjects s ON hs.subject_id = s.subject_id
    INNER JOIN departments d ON hs.department_id = d.department_id
    LEFT JOIN student_subject ss ON ss.subject_id = hs.subject_id 
      AND ss.teacher_id = hs.teacher_id 
      AND ss.sectionCode = hs.sectionCode
    WHERE hs.teacher_id = ?
    GROUP BY s.subject_id, s.subject_code, s.subject_name, hs.sectionCode, d.department_name
    ORDER BY s.subject_name, hs.sectionCode;
  `;

  db.query(subjectsQuery, [teacher_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

app.get("/teacher/students/:teacher_id/:subject_id/:section_code", (req, res) => {
  const { teacher_id, subject_id, section_code } = req.params;
  
  const studentsQuery = `
    SELECT 
      st.studentUser_id,
      CONCAT(st.first_name, ' ', st.middle_name, '. ', st.last_name) AS student_name,
      g.midterm_grade,
      g.final_grade,
      g.grade_id
    FROM student_subject ss
    INNER JOIN students st ON ss.studentUser_id = st.studentUser_id
    LEFT JOIN grades g ON st.studentUser_id = g.studentUser_id 
      AND g.subject_id = ss.subject_id 
      AND g.teacher_id = ss.teacher_id
    WHERE ss.teacher_id = ? 
      AND ss.subject_id = ? 
      AND ss.sectionCode = ?
    ORDER BY st.last_name, st.first_name;
  `;

  db.query(studentsQuery, [teacher_id, subject_id, section_code], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

app.get("/teacher/encoding-status/:teacher_id", (req, res) => {
  const teacher_id = req.params.teacher_id;
  
  const statusQuery = `
    SELECT encode, final_encode, archive 
    FROM teachers 
    WHERE teacher_id = ?
  `;

  db.query(statusQuery, [teacher_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: "Teacher not found" });
    }
    res.json(rows[0]);
  });
});

app.put("/grades/midterm/:grade_id", (req, res) => {
  const grade_id = req.params.grade_id;
  const { midterm_grade } = req.body;

  if (midterm_grade === null || midterm_grade === undefined) {
    return res.status(400).json({ error: "Midterm grade is required" });
  }

  const updateQuery = `UPDATE grades SET midterm_grade = ? WHERE grade_id = ?`;

  db.query(updateQuery, [midterm_grade, grade_id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Grade record not found" });
    }
    res.json({ success: true, message: "Midterm grade updated successfully" });
  });
});

app.put("/grades/final/:grade_id", (req, res) => {
  const grade_id = req.params.grade_id;
  const { final_grade } = req.body;

  if (final_grade === null || final_grade === undefined) {
    return res.status(400).json({ error: "Final grade is required" });
  }

  const updateQuery = `UPDATE grades SET final_grade = ? WHERE grade_id = ?`;

  db.query(updateQuery, [final_grade, grade_id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Grade record not found" });
    }
    res.json({ success: true, message: "Final grade updated successfully" });
  });
});

app.post("/grades", (req, res) => {
  const { studentUser_id, subject_id, teacher_id, midterm_grade, final_grade, academic_year, semester } = req.body;

  const insertQuery = `
    INSERT INTO grades (studentUser_id, subject_id, teacher_id, midterm_grade, final_grade, academic_year, semester)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    insertQuery,
    [studentUser_id, subject_id, teacher_id, midterm_grade, final_grade, academic_year, semester],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }
      res.json({ 
        success: true, 
        message: "Grade created successfully",
        grade_id: result.insertId 
      });
    }
  );
});

app.get("/announcements", (req, res) => {
  const query = `SELECT * FROM announcements ORDER BY date_published DESC`;

  db.query(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

app.post("/announcements", (req, res) => {
  const { title, content, category, date_published } = req.body;

  const insertQuery = `
    INSERT INTO announcements (title, content, category, date_published)
    VALUES (?, ?, ?, ?)
  `;

  db.query(insertQuery, [title, content, category, date_published], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ 
      success: true, 
      message: "Announcement created successfully",
      id: result.insertId 
    });
  });
});

app.put("/announcements/:id", (req, res) => {
  const id = req.params.id;
  const { title, content, category, date_published } = req.body;

  const updateQuery = `
    UPDATE announcements 
    SET title = ?, content = ?, category = ?, date_published = ?
    WHERE id = ?
  `;

  db.query(updateQuery, [title, content, category, date_published, id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Announcement not found" });
    }
    res.json({ success: true, message: "Announcement updated successfully" });
  });
});

app.delete("/announcements/:id", (req, res) => {
  const id = req.params.id;

  const deleteQuery = `DELETE FROM announcements WHERE id = ?`;

  db.query(deleteQuery, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Announcement not found" });
    }
    res.json({ success: true, message: "Announcement deleted successfully" });
  });
});

app.put("/admin/toggle-encoding/:teacher_id", (req, res) => {
  const { teacher_id } = req.params;
  const { enabled } = req.body;
  const encodingValue = enabled ? 'on' : 'off';

  const query = `UPDATE teachers SET encode = ? WHERE teacher_id = ?`;

  db.query(query, [encodingValue, teacher_id], (err, result) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to update encoding status",
        error: err.message 
      });
    }

    res.json({ 
      success: true, 
      message: `Encoding ${enabled ? 'enabled' : 'disabled'} successfully`,
      teacherId: teacher_id,
      encode: encodingValue
    });
  });
});

app.put("/admin/toggle-encoding-bulk", (req, res) => {
  const { teacherIds, enabled, encodingType } = req.body;
  const encodingValue = enabled ? 'on' : 'off';

  if (!Array.isArray(teacherIds) || teacherIds.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: "Invalid teacher IDs array" 
    });
  }

  const fieldToUpdate = encodingType === 'final' ? 'final_encode' : 'encode';
  
  const placeholders = teacherIds.map(() => '?').join(',');
  const query = `UPDATE teachers SET ${fieldToUpdate} = ? WHERE teacher_id IN (${placeholders})`;
  const params = [encodingValue, ...teacherIds];


  db.query(query, params, (err, result) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to update encoding for teachers",
        error: err.message 
      });
    }

    res.json({ 
      success: true, 
      message: `${encodingType === 'final' ? 'Final' : 'Midterm'} encoding ${enabled ? 'enabled' : 'disabled'} for ${result.affectedRows} teachers`,
      affectedRows: result.affectedRows,
      encodingType: encodingType,
      fieldUpdated: fieldToUpdate,
      value: encodingValue
    });
  });
});

app.put("/admin/toggle-final-encoding/:teacher_id", (req, res) => {
  const { teacher_id } = req.params;
  const { enabled } = req.body;
  const encodingValue = enabled ? 'on' : 'off';

  const query = `UPDATE teachers SET final_encode = ? WHERE teacher_id = ?`;

  db.query(query, [encodingValue, teacher_id], (err, result) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to update final encoding status",
        error: err.message 
      });
    }

    res.json({ 
      success: true, 
      message: `Final encoding ${enabled ? 'enabled' : 'disabled'} successfully`,
      teacherId: teacher_id,
      final_encode: encodingValue
    });
  });
});

app.put("/admin/toggle-final-encoding-bulk", (req, res) => {
  const { teacherIds, enabled } = req.body;
  const encodingValue = enabled ? 'on' : 'off';

  if (!Array.isArray(teacherIds) || teacherIds.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: "Invalid teacher IDs array" 
    });
  }

  const placeholders = teacherIds.map(() => '?').join(',');
  const query = `UPDATE teachers SET final_encode = ? WHERE teacher_id IN (${placeholders})`;
  const params = [encodingValue, ...teacherIds];

  db.query(query, params, (err, result) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to update final encoding for teachers",
        error: err.message 
      });
    }

    res.json({ 
      success: true, 
      message: `Final encoding ${enabled ? 'enabled' : 'disabled'} for ${result.affectedRows} teachers`,
      affectedRows: result.affectedRows,
      final_encode: encodingValue
    });
  });
});

app.put("/admin/archive-teacher", (req, res) => {
  const { teacherId } = req.body;

  const query = `UPDATE teachers SET archive = 'on' WHERE teacher_id = ?`;

  db.query(query, [teacherId], (err, result) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to archive teacher",
        error: err.message 
      });
    }

    res.json({ 
      success: true, 
      message: "Teacher archived successfully",
      teacherId: teacherId
    });
  });
});

app.put("/admin/unarchive-teacher", (req, res) => {
  const { teacherId } = req.body;

  const query = `UPDATE teachers SET archive = 'off' WHERE teacher_id = ?`;

  db.query(query, [teacherId], (err, result) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to unarchive teacher",
        error: err.message 
      });
    }

    res.json({ 
      success: true, 
      message: "Teacher unarchived successfully",
      teacherId: teacherId
    });
  });
});

app.get("/admin/teachers", (req, res) => {
  const query = `
    SELECT 
      t.teacher_id,
      t.teacherUser_id,
      CONCAT(t.first_name, ' ', t.middle_name, '. ', t.last_name) AS full_name,
      t.email,
      t.encode,
      t.final_encode,
      t.archive,
      d.department_name
    FROM teachers t
    LEFT JOIN departments d ON t.department_id = d.department_id
    ORDER BY t.first_name, t.last_name
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to fetch teachers",
        error: err.message 
      });
    }

    res.json(results);
  });
});

app.get("/admin/departments", (req, res) => {
  const query = `SELECT * FROM departments ORDER BY department_name`;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to fetch departments",
        error: err.message 
      });
    }

    res.json(results);
  });
});

app.get("/admin/teacher-classes/:teacher_id", (req, res) => {
  const { teacher_id } = req.params;

  const query = `
    SELECT DISTINCT
      hs.subject_id,
      hs.sectionCode,
      s.subject_code,
      s.subject_name,
      d.department_name,
      COUNT(DISTINCT ss.studentUser_id) as student_count
    FROM handle_subject hs
    INNER JOIN subjects s ON hs.subject_id = s.subject_id
    INNER JOIN departments d ON hs.department_id = d.department_id
    LEFT JOIN student_subject ss ON ss.subject_id = hs.subject_id 
      AND ss.teacher_id = hs.teacher_id 
      AND ss.sectionCode = hs.sectionCode
    WHERE hs.teacher_id = ?
    GROUP BY hs.subject_id, hs.sectionCode, s.subject_code, s.subject_name, d.department_name
    ORDER BY s.subject_name, hs.sectionCode
  `;

  db.query(query, [teacher_id], (err, results) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to fetch teacher classes",
        error: err.message 
      });
    }

    res.json(results);
  });
});

app.get("/admin/teacher-sections/:teacher_id/:subject_id", (req, res) => {
  const { teacher_id, subject_id } = req.params;

  const query = `
    SELECT DISTINCT
      hs.sectionCode,
      COUNT(DISTINCT ss.studentUser_id) as student_count
    FROM handle_subject hs
    LEFT JOIN student_subject ss ON ss.subject_id = hs.subject_id 
      AND ss.teacher_id = hs.teacher_id 
      AND ss.sectionCode = hs.sectionCode
    WHERE hs.teacher_id = ? AND hs.subject_id = ?
    GROUP BY hs.sectionCode
    ORDER BY hs.sectionCode
  `;

  db.query(query, [teacher_id, subject_id], (err, results) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to fetch sections",
        error: err.message 
      });
    }

    res.json(results);
  });
});

app.get("/admin/class-students/:teacher_id/:subject_id/:section_code", (req, res) => {
  const { teacher_id, subject_id, section_code } = req.params;

  const query = `
    SELECT 
      s.studentUser_id,
      CONCAT(s.first_name, ' ', s.middle_name, '. ', s.last_name) AS student_name,
      g.midterm_grade,
      g.final_grade
    FROM student_subject ss
    INNER JOIN students s ON ss.studentUser_id = s.studentUser_id
    LEFT JOIN grades g ON s.studentUser_id = g.studentUser_id 
      AND g.subject_id = ss.subject_id 
      AND g.teacher_id = ss.teacher_id
    WHERE ss.teacher_id = ? 
      AND ss.subject_id = ? 
      AND ss.sectionCode = ?
    ORDER BY s.last_name, s.first_name
  `;

  db.query(query, [teacher_id, subject_id, section_code], (err, results) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to fetch students",
        error: err.message 
      });
    }

    res.json(results);
  });
});

app.get("/api/announcements", (req, res) => {
  const query = "SELECT * FROM announcements ORDER BY date_published DESC, id DESC";
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        error: "Failed to fetch announcements" 
      });
    }
    
    res.json(results);
  });
});

app.post("/api/announcements", (req, res) => {
  const { title, content, category, date_published } = req.body;
  
  if (!title || !content || !date_published) {
    return res.status(400).json({ 
      success: false, 
      error: "Title, content, and date are required" 
    });
  }
  
  const query = "INSERT INTO announcements (title, content, category, date_published) VALUES (?, ?, ?, ?)";
  
  db.query(query, [title, content, category || 'General', date_published], (err, result) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        error: "Failed to create announcement" 
      });
    }
    
    res.status(201).json({ 
      success: true, 
      message: "Announcement created successfully",
      id: result.insertId 
    });
  });
});

app.put("/api/announcements/:id", (req, res) => {
  const { id } = req.params;
  const { title, content, category, date_published } = req.body;
  
  if (!title || !content || !date_published) {
    return res.status(400).json({ 
      success: false, 
      error: "Title, content, and date are required" 
    });
  }
  
  const query = "UPDATE announcements SET title = ?, content = ?, category = ?, date_published = ? WHERE id = ?";
  
  db.query(query, [title, content, category || 'General', date_published, id], (err, result) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        error: "Failed to update announcement" 
      });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Announcement not found" 
      });
    }
    
    res.json({ 
      success: true, 
      message: "Announcement updated successfully" 
    });
  });
});

app.delete("/api/announcements/:id", (req, res) => {
  const { id } = req.params;
  
  const query = "DELETE FROM announcements WHERE id = ?";
  
  db.query(query, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        error: "Failed to delete announcement" 
      });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Announcement not found" 
      });
    }
    
    res.json({ 
      success: true, 
      message: "Announcement deleted successfully" 
    });
  });
});

app.get("/api/leaderboard", (req, res) => {
  const query = `
    SELECT 
      a.student_id,
      CONCAT(s.first_name, ' ', s.middle_name, '. ', s.last_name) AS student_name,
      c.course_name AS department,
      y.year_level_name AS year_level,
      g.academic_year,
      g.semester,
      SUM(g.final_grade * sub.unit) / SUM(sub.unit) AS gwa
    FROM grades g
    INNER JOIN students s ON g.studentUser_id = s.studentUser_id
    INNER JOIN accounts a ON s.studentUser_id = a.studentUser_id
    INNER JOIN courses c ON s.course_id = c.course_id
    INNER JOIN year_levels y ON s.year_level_id = y.year_level_id
    INNER JOIN subjects sub ON g.subject_id = sub.subject_id
    WHERE g.final_grade IS NOT NULL
    GROUP BY a.student_id, s.first_name, s.middle_name, s.last_name, 
             c.course_name, y.year_level_name, g.academic_year, g.semester
    HAVING gwa IS NOT NULL
    ORDER BY gwa ASC, student_name ASC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        error: "Failed to fetch leaderboard" 
      });
    }
    
    const leaderboard = results
      .filter(student => {
        const gwa = parseFloat(student.gwa);
        return gwa >= 1.0000 && gwa <= 1.7500;
      })
      .map((student, index) => {
        const gwa = parseFloat(student.gwa).toFixed(2);
        let scholar_type = '';
        
        if (gwa >= 1.0000 && gwa <= 1.2999) {
          scholar_type = 'University Scholar';
        } else if (gwa >= 1.3000 && gwa <= 1.5000) {
          scholar_type = 'College Scholar';
        } else if (gwa >= 1.5001 && gwa <= 1.7500) {
          scholar_type = "Dean's Lister";
        }
        
        return {
          rank: index + 1,
          student_id: student.student_id,
          student_name: student.student_name,
          department: student.department,
          year_level: student.year_level,
          academic_year: student.academic_year,
          semester: student.semester,
          gwa: gwa,
          scholar_type: scholar_type
        };
      });
    
    res.json(leaderboard);
  });
});

app.get("/api/leaderboard/departments", (req, res) => {
  const query = "SELECT course_id, course_name FROM courses ORDER BY course_name";
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        error: "Failed to fetch departments" 
      });
    }
    
    res.json(results);
  });
});


app.get("/teacher/classes/:teacher_id", (req, res) => {
  const teacher_id = req.params.teacher_id;
  
  const query = `
    SELECT DISTINCT
      hs.subject_id,
      hs.sectionCode,
      s.subject_code,
      s.subject_name,
      d.department_name,
      COUNT(DISTINCT ss.studentUser_id) as student_count
    FROM handle_subject hs
    INNER JOIN subjects s ON hs.subject_id = s.subject_id
    INNER JOIN departments d ON hs.department_id = d.department_id
    LEFT JOIN student_subject ss ON ss.subject_id = hs.subject_id 
      AND ss.teacher_id = hs.teacher_id 
      AND ss.sectionCode = hs.sectionCode
    WHERE hs.teacher_id = ?
    GROUP BY hs.subject_id, hs.sectionCode, s.subject_code, s.subject_name, d.department_name
    ORDER BY s.subject_name, hs.sectionCode
  `;

  db.query(query, [teacher_id], (err, results) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to fetch teacher classes",
        error: err.message 
      });
    }

    const classes = results.map(cls => ({
      ...cls,
      status: 'Pending'
    }));

    res.json(classes);
  });
});

app.get("/subject/:subject_id", (req, res) => {
  const subject_id = req.params.subject_id;
  
  const query = `
    SELECT 
      subject_id,
      subject_code,
      subject_name,
      course_id,
      unit
    FROM subjects
    WHERE subject_id = ?
  `;

  db.query(query, [subject_id], (err, results) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to fetch subject",
        error: err.message 
      });
    }
    
    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Subject not found"
      });
    }

    res.json(results[0]);
  });
});

app.get("/teacher/subject/:subject_id/sections/:teacher_id", (req, res) => {
  const { teacher_id, subject_id } = req.params;

  const query = `
    SELECT DISTINCT
      hs.sectionCode,
      COUNT(DISTINCT ss.studentUser_id) as student_count,
      yl.year_level_name
    FROM handle_subject hs
    LEFT JOIN student_subject ss ON ss.subject_id = hs.subject_id 
      AND ss.teacher_id = hs.teacher_id 
      AND ss.sectionCode = hs.sectionCode
    LEFT JOIN students st ON ss.studentUser_id = st.studentUser_id
    LEFT JOIN year_levels yl ON st.year_level_id = yl.year_level_id
    WHERE hs.teacher_id = ? AND hs.subject_id = ?
    GROUP BY hs.sectionCode, yl.year_level_name
    ORDER BY hs.sectionCode
  `;

  db.query(query, [teacher_id, subject_id], (err, results) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to fetch sections",
        error: err.message 
      });
    }

    res.json(results);
  });
});

app.get("/teacher/section-grades/:teacher_id/:subject_id/:section_code", (req, res) => {
  const { teacher_id, subject_id, section_code } = req.params;

  const teacherQuery = `
    SELECT encode, final_encode 
    FROM teachers 
    WHERE teacher_id = ?
  `;

  const gradesQuery = `
    SELECT 
      ss.studentUser_id,
      a.student_id,
      CONCAT(s.first_name, ' ', s.middle_name, '. ', s.last_name) AS student_name,
      yl.year_level_name,
      g.grade_id,
      g.midterm_grade,
      g.final_grade,
      g.semester
    FROM student_subject ss
    INNER JOIN students s ON ss.studentUser_id = s.studentUser_id
    INNER JOIN accounts a ON s.studentUser_id = a.studentUser_id
    INNER JOIN year_levels yl ON s.year_level_id = yl.year_level_id
    LEFT JOIN grades g ON s.studentUser_id = g.studentUser_id 
      AND g.subject_id = ss.subject_id 
      AND g.teacher_id = ss.teacher_id
    WHERE ss.teacher_id = ? 
      AND ss.subject_id = ? 
      AND ss.sectionCode = ?
    ORDER BY s.last_name, s.first_name
  `;

  db.query(teacherQuery, [teacher_id], (err, teacherResults) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to fetch teacher status",
        error: err.message 
      });
    }

    const teacherStatus = teacherResults[0] || { encode: 'off', final_encode: 'off' };

    db.query(gradesQuery, [teacher_id, subject_id, section_code], (err, results) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: "Failed to fetch students",
          error: err.message 
        });
      }

      res.json({
        students: results,
        encode: teacherStatus.encode,
        final_encode: teacherStatus.final_encode
      });
    });
  });
});

app.post("/teacher/grades/bulk-update", (req, res) => {
  const { grades } = req.body;

  if (!grades || !Array.isArray(grades) || grades.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: "No grades provided" 
    });
  }

  let successCount = 0;
  let errorCount = 0;
  const promises = [];

  grades.forEach(grade => {
    const promise = new Promise((resolve) => {
      const checkQuery = `
        SELECT grade_id FROM grades 
        WHERE studentUser_id = ? AND subject_id = ? AND teacher_id = ?
      `;

      db.query(checkQuery, [grade.studentUser_id, grade.subject_id, grade.teacher_id], (err, results) => {
        if (err) {
          errorCount++;
          resolve();
          return;
        }

        if (results.length > 0) {
          const updateQuery = `
            UPDATE grades 
            SET midterm_grade = ?, final_grade = ?, academic_year = ?, semester = ?
            WHERE grade_id = ?
          `;

          db.query(updateQuery, [
            grade.midterm_grade,
            grade.final_grade,
            grade.academic_year,
            grade.semester,
            results[0].grade_id
          ], (err) => {
            if (err) {
              errorCount++;
            } else {
              successCount++;
            }
            resolve();
          });
        } else {
          const insertQuery = `
            INSERT INTO grades (studentUser_id, subject_id, teacher_id, midterm_grade, final_grade, academic_year, semester)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `;

          db.query(insertQuery, [
            grade.studentUser_id,
            grade.subject_id,
            grade.teacher_id,
            grade.midterm_grade,
            grade.final_grade,
            grade.academic_year,
            grade.semester
          ], (err) => {
            if (err) {
              errorCount++;
            } else {
              successCount++;
            }
            resolve();
          });
        }
      });
    });

    promises.push(promise);
  });

  Promise.all(promises).then(() => {
    res.json({ 
      success: errorCount === 0, 
      successCount, 
      errorCount,
      message: `${successCount} grade(s) updated successfully`
    });
  });
});

app.get("/teacher/leaderboard/:teacher_id", (req, res) => {
  const teacher_id = req.params.teacher_id;
  const subject_id = req.query.subject_id;

  let query = `
    SELECT 
      a.student_id,
      CONCAT(s.first_name, ' ', s.middle_name, '. ', s.last_name) AS student_name,
      c.course_name AS department,
      yl.year_level_name AS year_level,
      g.academic_year,
      g.semester,
      g.subject_id,
      sub.subject_name,
      g.final_grade AS gwa
    FROM grades g
    INNER JOIN students s ON g.studentUser_id = s.studentUser_id
    INNER JOIN accounts a ON s.studentUser_id = a.studentUser_id
    INNER JOIN courses c ON s.course_id = c.course_id
    INNER JOIN year_levels yl ON s.year_level_id = yl.year_level_id
    INNER JOIN subjects sub ON g.subject_id = sub.subject_id
    WHERE g.teacher_id = ?
      AND g.final_grade IS NOT NULL
      AND g.final_grade >= 1.00
      AND g.final_grade <= 1.75
  `;

  const params = [teacher_id];

  if (subject_id) {
    query += ` AND g.subject_id = ?`;
    params.push(subject_id);
  }

  query += `
    ORDER BY g.final_grade ASC, student_name ASC
  `;

  db.query(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        error: "Failed to fetch leaderboard" 
      });
    }

    const leaderboard = results.map((student, index) => {
      const gwa = parseFloat(student.gwa).toFixed(2);
      let scholar_type = '';
      
      if (gwa >= 1.0000 && gwa <= 1.2999) {
        scholar_type = 'University Scholar';
      } else if (gwa >= 1.3000 && gwa <= 1.5000) {
        scholar_type = 'College Scholar';
      } else if (gwa >= 1.5001 && gwa <= 1.7500) {
        scholar_type = "Dean's Lister";
      }
      
      return {
        rank: index + 1,
        student_id: student.student_id,
        student_name: student.student_name,
        department: student.department,
        year_level: student.year_level,
        academic_year: student.academic_year,
        semester: student.semester,
        subject_name: student.subject_name,
        gwa: gwa,
        scholar_type: scholar_type
      };
    });

    res.json(leaderboard);
  });
});

app.get("/api/leaderboard/departments", (req, res) => {
  const query = `
    SELECT DISTINCT course_name 
    FROM courses 
    ORDER BY course_name ASC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        error: "Failed to fetch departments" 
      });
    }
    
    res.json(results);
  });
});


app.get("/teacher/subjects/:teacher_id", (req, res) => {
  const teacher_id = req.params.teacher_id;
  
  const query = `
    SELECT DISTINCT sub.subject_id, sub.subject_name
    FROM subjects sub
    INNER JOIN handle_subject hs ON sub.subject_id = hs.subject_id
    WHERE hs.teacher_id = ?
    ORDER BY sub.subject_name ASC
  `;
  
  db.query(query, [teacher_id], (err, results) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        error: "Failed to fetch subjects" 
      });
    }
    
    res.json(results);
  });
});


app.get("/api/announcements/:student_id", (req, res) => {
  const student_id = req.params.student_id;

  const studentQuery = `
    SELECT a.studentUser_id
    FROM accounts a
    WHERE a.student_id = ?;
  `;

  const gwaQuery = `
    SELECT SUM(g.final_grade * sub.unit) / SUM(sub.unit) AS gwa
    FROM grades g
    JOIN subjects sub ON g.subject_id = sub.subject_id
    WHERE g.studentUser_id = ? AND g.final_grade IS NOT NULL;
  `;

  const leaderboardQuery = `
    SELECT a.student_id
    FROM grades g
    INNER JOIN students s ON g.studentUser_id = s.studentUser_id
    INNER JOIN accounts a ON s.studentUser_id = a.studentUser_id
    INNER JOIN subjects sub ON g.subject_id = sub.subject_id
    WHERE g.final_grade IS NOT NULL
    GROUP BY a.student_id, s.studentUser_id
    HAVING SUM(g.final_grade * sub.unit) / SUM(sub.unit) >= 1.0000 
       AND SUM(g.final_grade * sub.unit) / SUM(sub.unit) <= 1.7500
    ORDER BY SUM(g.final_grade * sub.unit) / SUM(sub.unit) ASC
  `;

  db.query(studentQuery, [student_id], (err, studentRows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    if (studentRows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const studentUserId = studentRows[0].studentUser_id;

    db.query(gwaQuery, [studentUserId], (err, gwaRows) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }

      const studentGWA = parseFloat(gwaRows[0]?.gwa || 0);
      let isScholar = false;

      if (studentGWA >= 1.0000 && studentGWA <= 1.7500) {
        db.query(leaderboardQuery, (err, leaderboardRows) => {
          if (err) {
            return res.status(500).json({ error: "Database error" });
          }

          isScholar = leaderboardRows.some(row => row.student_id === student_id);
          fetchAnnouncements(isScholar);
        });
      } else {
        fetchAnnouncements(isScholar);
      }
    });
  });

  function fetchAnnouncements(isScholar) {
    const announcementsQuery = `
      SELECT id, title, content, category, date_published
      FROM announcements
      ORDER BY date_published DESC
    `;

    db.query(announcementsQuery, (err, announcements) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }

      let filteredAnnouncements = announcements;
      if (!isScholar) {
        filteredAnnouncements = announcements.filter(a => a.category !== 'Academic');
      }

      res.json({
        isScholar: isScholar,
        announcements: filteredAnnouncements
      });
    });
  }
});

app.get("/student/grades/:student_id", (req, res) => {
  const student_id = req.params.student_id;

  const gradesQuery = `
    SELECT 
      g.grade_id,
      sub.subject_code,
      sub.subject_name,
      g.midterm_grade,
      g.final_grade,
      g.academic_year,
      g.semester
    FROM grades g
    INNER JOIN students s ON g.studentUser_id = s.studentUser_id
    INNER JOIN accounts a ON s.studentUser_id = a.studentUser_id
    INNER JOIN subjects sub ON g.subject_id = sub.subject_id
    WHERE a.student_id = ?
    ORDER BY g.academic_year DESC, g.semester ASC, sub.subject_code ASC
  `;

  db.query(gradesQuery, [student_id], (err, grades) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }

    res.json(grades);
  });
});

app.put("/api/change-password-teacher", async (req, res) => {
  const { teacherUserId, oldPassword, newPassword } = req.body;

  if (!teacherUserId || !oldPassword || !newPassword) {
    return res.status(400).json({ 
      success: false, 
      message: "All fields are required" 
    });
  }

  const verifyQuery = `
    SELECT ta.account_id, ta.password_hash, ta.name_teacher, t.teacher_id
    FROM teacher_accounts ta
    INNER JOIN teachers t ON ta.teacher_id = t.teacher_id
    WHERE t.teacherUser_id = ?
  `;

  db.query(verifyQuery, [teacherUserId], async (err, results) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: "Database error" 
      });
    }

    if (results.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Teacher account not found" 
      });
    }

    const account = results[0];
    const isMatch = await bcrypt.compare(oldPassword, account.password_hash);

    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: "Current password is incorrect" 
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    // Update both password_hash and plain_password
    const updateQuery = `
      UPDATE teacher_accounts 
      SET password_hash = ?, plain_password = ? 
      WHERE account_id = ?
    `;

    db.query(updateQuery, [hashedNewPassword, newPassword, account.account_id], (err, result) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: "Failed to update password" 
        });
      }

      res.json({ 
        success: true, 
        message: "Password changed successfully!" 
      });
    });
  });
});

// Get teacher email endpoint
app.get("/teacher/email/:teacher_id", (req, res) => {
  const teacher_id = req.params.teacher_id;

  const query = `
    SELECT email 
    FROM teachers 
    WHERE teacher_id = ?
  `;

  db.query(query, [teacher_id], (err, results) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        error: "Failed to fetch email" 
      });
    }

    if (results.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Teacher not found" 
      });
    }

    res.json({ 
      success: true, 
      email: results[0].email 
    });
  });
});

// Send OTP via email endpoint
app.post("/api/send-otp", (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ 
      success: false, 
      message: "Email and OTP are required" 
    });
  }


  const mailOptions = {
    from: 'arielescobilla2203@gmail.com',
    to: email,
    subject: 'Password Change OTP - MSEUF',
    html: `
      <h2>Password Change Verification</h2>
      <p>Your OTP for password change is:</p>
      <h1 style="color: #800000; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
      <p>This OTP will expire in 5 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
      <br>
      <p>Best regards,<br>MSEUF Candelaria</p>
    `
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send OTP email' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'OTP sent successfully' 
    });
  });
});

app.post("/api/hash-password", async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, message: "Password is required" });
  }
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  res.json({ success: true, hashedPassword });
});

app.get("/admin/passwords", (req, res) => {
  const studentQuery = `
    SELECT 
      a.student_id as id,
      CONCAT(s.first_name, ' ', s.middle_name, '. ', s.last_name) AS full_name,
      c.course_name AS department,
      'student' as user_type,
      a.plain_password as password
    FROM accounts a
    JOIN students s ON a.studentUser_id = s.studentUser_id
    JOIN courses c ON s.course_id = c.course_id
    ORDER BY s.last_name, s.first_name
  `;

  const teacherQuery = `
    SELECT 
      t.teacherUser_id as id,
      CONCAT(t.first_name, ' ', t.middle_name, '. ', t.last_name) AS full_name,
      d.department_name AS department,
      'teacher' as user_type,
      ta.plain_password as password
    FROM teachers t
    LEFT JOIN departments d ON t.department_id = d.department_id
    LEFT JOIN teacher_accounts ta ON t.teacher_id = ta.teacher_id
    ORDER BY t.last_name, t.first_name
  `;

  // Get student passwords
  db.query(studentQuery, (err, studentResults) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to fetch student passwords",
        error: err.message 
      });
    }

    // Get teacher passwords
    db.query(teacherQuery, (err, teacherResults) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: "Failed to fetch teacher passwords",
          error: err.message 
        });
      }

      // Combine both results
      const allUsers = [...studentResults, ...teacherResults];
      res.json(allUsers);
    });
  });
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});