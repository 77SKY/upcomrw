const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'upcomrw-tutoring-secret-key-2026';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tutoring_db',
};

let pool;

app.use(cors());
app.use(express.json());

async function initDB() {
  pool = await mysql.createPool(DB_CONFIG);

  const [rows] = await pool.query("SELECT id FROM users WHERE email = 'admin@upcomrw.com'");
  if (rows.length === 0) {
    const hashed = bcrypt.hashSync('olivier@123', 10);
    await pool.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', ['Admin', 'admin@upcomrw.com', hashed, 'admin']);
    console.log('Default admin user created');
  }

  const [cols] = await pool.query("SHOW COLUMNS FROM notifications LIKE 'target_user_id'");
  if (cols.length === 0) {
    await pool.query('ALTER TABLE notifications ADD COLUMN target_user_id INT NULL AFTER user_id');
    await pool.query('ALTER TABLE notifications ADD FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notification_reads (
      user_id INT NOT NULL,
      notification_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, notification_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS report_replies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      report_id INT NOT NULL,
      admin_id INT NOT NULL,
      reply TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query("UPDATE users SET role = 'tutor' WHERE role = 'teacher'");
  await pool.query("ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'tutor') DEFAULT 'user'").catch(() => {});

  const [statusCol] = await pool.query("SHOW COLUMNS FROM users LIKE 'status'");
  if (statusCol.length === 0) {
    await pool.query("ALTER TABLE users ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active' AFTER role");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tutor_id INT NOT NULL,
      learner_id INT NOT NULL,
      session_date DATETIME NOT NULL,
      duration INT DEFAULT 60,
      subject VARCHAR(255) NOT NULL,
      notes TEXT,
      status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tutor_id) REFERENCES tutors(id) ON DELETE CASCADE,
      FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE
    )
  `);

  console.log('MySQL connected');
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ error: 'Invalid token' });
  }
}

async function checkUserActive(req, res, next) {
  try {
    const [[user]] = await pool.query('SELECT status FROM users WHERE id = ?', [req.user.id]);
    if (!user || user.status === 'inactive') {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact support for assistance.', deactivated: true, contact: { phone: '0790647563', email: 'upcomrw@gmail.com' } });
    }
    next();
  } catch {
    next();
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

function tutorOrAdminOnly(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'tutor') return res.status(403).json({ error: 'Tutor or admin access required' });
  next();
}

// ── Auth Routes ──────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });

    const userRole = role === 'tutor' ? 'tutor' : 'user';
    if (!['user', 'tutor'].includes(userRole)) return res.status(400).json({ error: 'Invalid role' });

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email already registered' });

    const hashed = bcrypt.hashSync(password, 10);
    const [result] = await pool.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hashed, userRole]);

    const token = jwt.sign({ id: result.insertId, name, email, role: userRole }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: result.insertId, name, email, role: userRole } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'All fields are required' });

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(400).json({ error: 'Invalid credentials' });

    const user = rows[0];
    if (!bcrypt.compareSync(password, user.password)) return res.status(400).json({ error: 'Invalid credentials' });

    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact support for assistance.', deactivated: true, contact: { phone: '0790647563', email: 'upcomrw@gmail.com' } });
    }

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, role, status, created_at FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    if (rows[0].status === 'inactive') {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact support for assistance.', deactivated: true, contact: { phone: '0790647563', email: 'upcomrw@gmail.com' } });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/auth/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both fields are required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

    const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    if (!bcrypt.compareSync(currentPassword, rows[0].password)) return res.status(400).json({ error: 'Current password is incorrect' });

    const hashed = bcrypt.hashSync(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Reports ──────────────────────────────────────

app.post('/api/reports', authenticateToken, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) return res.status(400).json({ error: 'Title and description are required' });

    const [result] = await pool.query('INSERT INTO reports (user_id, title, description) VALUES (?, ?, ?)', [req.user.id, title, description]);
    res.json({ id: result.insertId, title, description, status: 'pending' });
  } catch (err) {
    console.error('Create report error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/reports', authenticateToken, async (req, res) => {
  try {
    let reports;
    if (req.user.role === 'admin') {
      [reports] = await pool.query(`
        SELECT r.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
        FROM reports r JOIN users u ON r.user_id = u.id
        ORDER BY r.created_at DESC
      `);
    } else {
      [reports] = await pool.query('SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    }

    for (const r of reports) {
      const [replies] = await pool.query(`
        SELECT rr.*, u.name AS admin_name
        FROM report_replies rr JOIN users u ON rr.admin_id = u.id
        WHERE rr.report_id = ? ORDER BY rr.created_at ASC
      `, [r.id]);
      r.replies = replies;
    }

    res.json(reports);
  } catch (err) {
    console.error('Get reports error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/reports/:id/reply', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply) return res.status(400).json({ error: 'Reply is required' });

    const [report] = await pool.query('SELECT id, user_id, title FROM reports WHERE id = ?', [req.params.id]);
    if (report.length === 0) return res.status(404).json({ error: 'Report not found' });

    const [result] = await pool.query('INSERT INTO report_replies (report_id, admin_id, reply) VALUES (?, ?, ?)', [req.params.id, req.user.id, reply]);

    await pool.query(
      'INSERT INTO notifications (user_id, target_user_id, title, message) VALUES (?, ?, ?, ?)',
      [req.user.id, report[0].user_id, `Reply on your report: ${report[0].title}`, reply]
    );

    res.json({ id: result.insertId, reply, admin_name: req.user.name });
  } catch (err) {
    console.error('Report reply error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.route('/api/reports/:id')
  .put(authenticateToken, adminOnly, async (req, res) => {
    try {
      const { status } = req.body;
      if (!['pending', 'in_progress', 'resolved'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
      await pool.query('UPDATE reports SET status = ? WHERE id = ?', [status, req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  })
  .delete(authenticateToken, async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT user_id FROM reports WHERE id = ?', [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Report not found' });
      if (req.user.role !== 'admin' && rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
      await pool.query('DELETE FROM reports WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      console.error('Delete report error:', err);
      res.status(500).json({ error: err.message || 'Server error' });
    }
  });

// ── Notifications ────────────────────────────────

app.post('/api/notifications', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { title, message, target_user_id } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'Title and message are required' });

    const [result] = await pool.query(
      'INSERT INTO notifications (user_id, title, message, target_user_id) VALUES (?, ?, ?, ?)',
      [req.user.id, title, message, target_user_id || null]
    );
    res.json({ id: result.insertId, title, message, target_user_id: target_user_id || null, is_read: 0 });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    let notifications;
    if (req.user.role === 'admin') {
      [notifications] = await pool.query(`
        SELECT n.*, u.name AS user_name, u.email AS user_email, u.role AS user_role,
          CASE WHEN n.target_user_id IS NULL THEN 'broadcast' ELSE 'targeted' END AS notif_type,
          (SELECT COUNT(*) FROM notification_reads WHERE notification_id = n.id) AS read_count
        FROM notifications n JOIN users u ON n.user_id = u.id
        ORDER BY n.created_at DESC
      `);
    } else {
      [notifications] = await pool.query(`
        SELECT n.*, u.name AS user_name,
          CASE WHEN nr.user_id IS NOT NULL THEN 1 ELSE n.is_read END AS is_read
        FROM notifications n
        JOIN users u ON n.user_id = u.id
        LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
        WHERE (n.target_user_id IS NULL)
           OR (n.target_user_id = ?)
           OR (n.user_id = ?)
        ORDER BY n.created_at DESC
      `, [req.user.id, req.user.id, req.user.id]);
    }

    for (const n of notifications) {
      const [replies] = await pool.query(`
        SELECT nr.*, u.name AS admin_name
        FROM notification_replies nr JOIN users u ON nr.admin_id = u.id
        WHERE nr.notification_id = ? ORDER BY nr.created_at ASC
      `, [n.id]);
      n.replies = replies;
    }

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const [notifs] = await pool.query('SELECT * FROM notifications WHERE id = ?', [req.params.id]);
    if (notifs.length === 0) return res.status(404).json({ error: 'Notification not found' });

    await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND (user_id = ? OR target_user_id = ?)', [req.params.id, req.user.id, req.user.id]);
    await pool.query('INSERT IGNORE INTO notification_reads (user_id, notification_id) VALUES (?, ?)', [req.user.id, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    let unreadNotifications = 0;
    let pendingReports = 0;

    if (req.user.role === 'admin') {
      const [[{ count: nr }]] = await pool.query("SELECT COUNT(*) AS count FROM reports WHERE status != 'resolved'");
      pendingReports = nr;
    } else {
      const [[{ count: unr }]] = await pool.query(`
        SELECT COUNT(*) AS count FROM notifications n
        LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
        WHERE (n.target_user_id IS NULL OR n.target_user_id = ? OR n.user_id = ?)
          AND nr.user_id IS NULL
          AND n.is_read = 0
      `, [req.user.id, req.user.id, req.user.id]);
      unreadNotifications = unr;

      const [[{ count: pr }]] = await pool.query("SELECT COUNT(*) AS count FROM reports WHERE user_id = ? AND status != 'resolved'", [req.user.id]);
      pendingReports = pr;
    }

    res.json({ unreadNotifications, pendingReports });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/notifications/:id/reply', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply) return res.status(400).json({ error: 'Reply is required' });

    const [result] = await pool.query('INSERT INTO notification_replies (notification_id, admin_id, reply) VALUES (?, ?, ?)', [req.params.id, req.user.id, reply]);
    res.json({ id: result.insertId, reply, admin_name: req.user.name });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.route('/api/notifications/:id')
  .delete(authenticateToken, async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT user_id, target_user_id FROM notifications WHERE id = ?', [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Notification not found' });
      const n = rows[0];
      const isAdmin = req.user.role === 'admin';
      const isCreator = n.user_id === req.user.id;
      const isTarget = n.target_user_id !== null && n.target_user_id === req.user.id;
      const isBroadcast = n.target_user_id === null;
      if (!isAdmin && !isCreator && !isTarget && !isBroadcast) return res.status(403).json({ error: 'Not authorized' });
      await pool.query('DELETE FROM notifications WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      console.error('Delete notification error:', err);
      res.status(500).json({ error: err.message || 'Server error' });
    }
  });

// ── Tutors ───────────────────────────────────────

app.get('/api/tutors', authenticateToken, async (req, res) => {
  try {
    let tutors;
    if (req.user.role === 'admin') {
      [tutors] = await pool.query('SELECT * FROM tutors ORDER BY created_at DESC');
    } else {
      [tutors] = await pool.query("SELECT * FROM tutors WHERE status = 'active' ORDER BY created_at DESC");
    }
    res.json(tutors);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/tutors', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { name, email, phone, subject, experience, bio } = req.body;
    if (!name || !email || !subject) return res.status(400).json({ error: 'Name, email, and subject are required' });

    const [existing] = await pool.query('SELECT id FROM tutors WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email already exists' });

    const [result] = await pool.query(
      'INSERT INTO tutors (name, email, phone, subject, experience, bio) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, phone || '', subject, experience || 0, bio || '']
    );
    res.json({ id: result.insertId, name, email, phone, subject, experience, bio, status: 'active' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/tutors/:id', authenticateToken, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'admin') {
      [rows] = await pool.query('SELECT * FROM tutors WHERE id = ?', [req.params.id]);
    } else {
      [rows] = await pool.query("SELECT * FROM tutors WHERE id = ? AND status = 'active'", [req.params.id]);
    }
    if (rows.length === 0) return res.status(404).json({ error: 'Tutor not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/tutors/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { name, email, phone, subject, experience, bio, status } = req.body;
    if (!name || !email || !subject) return res.status(400).json({ error: 'Name, email, and subject are required' });
    if (status && !['active', 'inactive'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

    await pool.query(
      'UPDATE tutors SET name = ?, email = ?, phone = ?, subject = ?, experience = ?, bio = ?, status = COALESCE(?, status) WHERE id = ?',
      [name, email, phone || '', subject, experience || 0, bio || '', status || null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/tutors/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM tutors WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Learners ─────────────────────────────────────

app.get('/api/learners', authenticateToken, async (req, res) => {
  try {
    let learners;
    if (req.user.role === 'admin') {
      [learners] = await pool.query('SELECT * FROM learners ORDER BY created_at DESC');
    } else {
      [learners] = await pool.query("SELECT * FROM learners WHERE status = 'active' ORDER BY created_at DESC");
    }
    res.json(learners);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/learners', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { name, email, phone, grade, subject_interest } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

    const [existing] = await pool.query('SELECT id FROM learners WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email already exists' });

    const [result] = await pool.query(
      'INSERT INTO learners (name, email, phone, grade, subject_interest) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone || '', grade || '', subject_interest || '']
    );
    res.json({ id: result.insertId, name, email, phone, grade, subject_interest, status: 'active' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/learners/:id', authenticateToken, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'admin') {
      [rows] = await pool.query('SELECT * FROM learners WHERE id = ?', [req.params.id]);
    } else {
      [rows] = await pool.query("SELECT * FROM learners WHERE id = ? AND status = 'active'", [req.params.id]);
    }
    if (rows.length === 0) return res.status(404).json({ error: 'Learner not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/learners/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { name, email, phone, grade, subject_interest, status } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
    if (status && !['active', 'inactive'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

    await pool.query(
      'UPDATE learners SET name = ?, email = ?, phone = ?, grade = ?, subject_interest = ?, status = COALESCE(?, status) WHERE id = ?',
      [name, email, phone || '', grade || '', subject_interest || '', status || null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/learners/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM learners WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Sessions ─────────────────────────────────────

app.get('/api/sessions', authenticateToken, async (req, res) => {
  try {
    const [sessions] = await pool.query(`
      SELECT s.*, t.name AS tutor_name, t.subject AS tutor_subject, l.name AS learner_name, l.grade AS learner_grade
      FROM sessions s
      JOIN tutors t ON s.tutor_id = t.id
      JOIN learners l ON s.learner_id = l.id
      ORDER BY s.session_date DESC
    `);
    res.json(sessions);
  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/sessions', authenticateToken, tutorOrAdminOnly, async (req, res) => {
  try {
    const { tutor_id, learner_id, session_date, duration, subject, notes } = req.body;
    if (!tutor_id || !learner_id || !session_date || !subject) return res.status(400).json({ error: 'Tutor, learner, date, and subject are required' });

    const [result] = await pool.query(
      'INSERT INTO sessions (tutor_id, learner_id, session_date, duration, subject, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [tutor_id, learner_id, session_date, duration || 60, subject, notes || '']
    );
    res.json({ id: result.insertId, tutor_id, learner_id, session_date, duration: duration || 60, subject, notes: notes || '', status: 'scheduled' });
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/sessions/:id', authenticateToken, tutorOrAdminOnly, async (req, res) => {
  try {
    const { tutor_id, learner_id, session_date, duration, subject, notes, status } = req.body;
    if (status && !['scheduled', 'completed', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

    await pool.query(
      'UPDATE sessions SET tutor_id = ?, learner_id = ?, session_date = ?, duration = ?, subject = ?, notes = ?, status = COALESCE(?, status) WHERE id = ?',
      [tutor_id, learner_id, session_date, duration, subject, notes || '', status || null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update session error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/sessions/:id', authenticateToken, tutorOrAdminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM sessions WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete session error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Admin User Management ────────────────────────

app.get('/api/admin/users', authenticateToken, adminOnly, async (req, res) => {
  try {
    const [users] = await pool.query("SELECT id, name, email, role, status, created_at FROM users WHERE role != 'admin' ORDER BY created_at DESC");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/admin/users/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { name, email, role, status } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
    if (role && !['user', 'tutor'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    if (status && !['active', 'inactive'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const [[target]] = await pool.query('SELECT role FROM users WHERE id = ?', [req.params.id]);
    if (!target || target.role === 'admin') return res.status(403).json({ error: 'Cannot modify admin users' });

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.params.id]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email already in use' });

    await pool.query('UPDATE users SET name = ?, email = ?, role = COALESCE(?, role), status = COALESCE(?, status) WHERE id = ?',
      [name, email, role || null, status || null, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });

    const [[target]] = await pool.query('SELECT role FROM users WHERE id = ?', [req.params.id]);
    if (!target || target.role === 'admin') return res.status(403).json({ error: 'Cannot delete admin users' });

    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Admin Stats ──────────────────────────────────

app.get('/api/admin/stats', authenticateToken, adminOnly, async (req, res) => {
  try {
    const [[totalUsers]] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role IN ('user', 'tutor')");
    const [[totalReports]] = await pool.query('SELECT COUNT(*) AS count FROM reports');
    const [[pendingReports]] = await pool.query("SELECT COUNT(*) AS count FROM reports WHERE status = 'pending'");
    const [[totalNotifications]] = await pool.query('SELECT COUNT(*) AS count FROM notifications');
    const [[totalTutors]] = await pool.query('SELECT COUNT(*) AS count FROM tutors');
    const [[activeTutors]] = await pool.query("SELECT COUNT(*) AS count FROM tutors WHERE status = 'active'");
    const [[totalLearners]] = await pool.query('SELECT COUNT(*) AS count FROM learners');
    const [[activeLearners]] = await pool.query("SELECT COUNT(*) AS count FROM learners WHERE status = 'active'");
    const [[totalSessions]] = await pool.query('SELECT COUNT(*) AS count FROM sessions');
    const [[scheduledSessions]] = await pool.query("SELECT COUNT(*) AS count FROM sessions WHERE status = 'scheduled'");

    res.json({
      totalUsers: totalUsers.count,
      totalReports: totalReports.count,
      pendingReports: pendingReports.count,
      totalNotifications: totalNotifications.count,
      totalTutors: totalTutors.count,
      activeTutors: activeTutors.count,
      totalLearners: totalLearners.count,
      activeLearners: activeLearners.count,
      totalSessions: totalSessions.count,
      scheduledSessions: scheduledSessions.count,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Start ────────────────────────────────────────

initDB()
  .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
  .catch(err => {
    console.error('MySQL connection failed:', err.message);
    console.error('Make sure MySQL is running and the database "tutoring_db" exists.');
    console.error('Run: mysql -u root < backend/tutoring.sql');
    process.exit(1);
  });
