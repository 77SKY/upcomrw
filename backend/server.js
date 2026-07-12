const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'upcomrw-tutoring-secret-key-2026';

const dbUrl = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace(/&?channel_binding=require&?/g, '').replace(/\?$/, '')
  : undefined;

const poolConfig = dbUrl
  ? { connectionString: dbUrl, ssl: { rejectUnauthorized: false } }
  : { host: process.env.DB_HOST || 'localhost', user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'tutoring_db', port: process.env.DB_PORT || 5432, ssl: false };

const pool = new Pool(poolConfig);

app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true
}));
app.use(express.json());

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'tutor')),
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@olivier.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Olivier0790647563';

  await pool.query("DELETE FROM users WHERE email = 'admin@upcomrw.com'");

  const { rows: existingAdmin } = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
  if (existingAdmin.length === 0) {
    const hashed = bcrypt.hashSync(adminPassword, 10);
    await pool.query('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)', ['Admin', adminEmail, hashed, 'admin']);
    console.log('Default admin user created');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_user_id INT REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notification_reads (
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      notification_id INT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (user_id, notification_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS report_replies (
      id SERIAL PRIMARY KEY,
      report_id INT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      admin_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reply TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notification_replies (
      id SERIAL PRIMARY KEY,
      notification_id INT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
      admin_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reply TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tutors (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(50),
      subject VARCHAR(255) NOT NULL,
      experience INT DEFAULT 0,
      bio TEXT,
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS learners (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(50),
      grade VARCHAR(100),
      subject_interest VARCHAR(255),
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      tutor_id INT NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
      learner_id INT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
      session_date TIMESTAMP NOT NULL,
      duration INT DEFAULT 60,
      subject VARCHAR(255) NOT NULL,
      notes TEXT,
      status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  console.log('PostgreSQL connected');
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
    const { rows } = await pool.query('SELECT status FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];
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

    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email already registered' });

    const hashed = bcrypt.hashSync(password, 10);
    const { rows: result } = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, email, hashed, userRole]
    );

    const token = jwt.sign({ id: result[0].id, name, email, role: userRole }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: result[0].id, name, email, role: userRole } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'All fields are required' });

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
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
    const { rows } = await pool.query('SELECT id, name, email, role, status, created_at FROM users WHERE id = $1', [req.user.id]);
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

    const { rows } = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    if (!bcrypt.compareSync(currentPassword, rows[0].password)) return res.status(400).json({ error: 'Current password is incorrect' });

    const hashed = bcrypt.hashSync(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);
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

    const { rows } = await pool.query(
      'INSERT INTO reports (user_id, title, description) VALUES ($1, $2, $3) RETURNING id, status',
      [req.user.id, title, description]
    );
    res.json({ id: rows[0].id, title, description, status: rows[0].status });
  } catch (err) {
    console.error('Create report error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/reports', authenticateToken, async (req, res) => {
  try {
    let reports;
    if (req.user.role === 'admin') {
      const { rows } = await pool.query(`
        SELECT r.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
        FROM reports r JOIN users u ON r.user_id = u.id
        ORDER BY r.created_at DESC
      `);
      reports = rows;
    } else {
      const { rows } = await pool.query('SELECT * FROM reports WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
      reports = rows;
    }

    for (const r of reports) {
      const { rows: replies } = await pool.query(`
        SELECT rr.*, u.name AS admin_name
        FROM report_replies rr JOIN users u ON rr.admin_id = u.id
        WHERE rr.report_id = $1 ORDER BY rr.created_at ASC
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

    const { rows: report } = await pool.query('SELECT id, user_id, title FROM reports WHERE id = $1', [req.params.id]);
    if (report.length === 0) return res.status(404).json({ error: 'Report not found' });

    const { rows: result } = await pool.query(
      'INSERT INTO report_replies (report_id, admin_id, reply) VALUES ($1, $2, $3) RETURNING id',
      [req.params.id, req.user.id, reply]
    );

    await pool.query(
      'INSERT INTO notifications (user_id, target_user_id, title, message) VALUES ($1, $2, $3, $4)',
      [req.user.id, report[0].user_id, `Reply on your report: ${report[0].title}`, reply]
    );

    res.json({ id: result[0].id, reply, admin_name: req.user.name });
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
      await pool.query('UPDATE reports SET status = $1 WHERE id = $2', [status, req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  })
  .delete(authenticateToken, async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT user_id FROM reports WHERE id = $1', [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Report not found' });
      if (req.user.role !== 'admin' && rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
      await pool.query('DELETE FROM reports WHERE id = $1', [req.params.id]);
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

    const { rows } = await pool.query(
      'INSERT INTO notifications (user_id, title, message, target_user_id) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.user.id, title, message, target_user_id || null]
    );
    res.json({ id: rows[0].id, title, message, target_user_id: target_user_id || null, is_read: false });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    let notifications;
    if (req.user.role === 'admin') {
      const { rows } = await pool.query(`
        SELECT n.*, u.name AS user_name, u.email AS user_email, u.role AS user_role,
          CASE WHEN n.target_user_id IS NULL THEN 'broadcast' ELSE 'targeted' END AS notif_type,
          (SELECT COUNT(*) FROM notification_reads WHERE notification_id = n.id) AS read_count
        FROM notifications n JOIN users u ON n.user_id = u.id
        ORDER BY n.created_at DESC
      `);
      notifications = rows;
    } else {
      const { rows } = await pool.query(`
        SELECT n.*, u.name AS user_name,
          CASE WHEN nr.user_id IS NOT NULL THEN TRUE ELSE n.is_read END AS is_read
        FROM notifications n
        JOIN users u ON n.user_id = u.id
        LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = $1
        WHERE (n.target_user_id IS NULL)
           OR (n.target_user_id = $1)
           OR (n.user_id = $1)
        ORDER BY n.created_at DESC
      `, [req.user.id]);
      notifications = rows;
    }

    for (const n of notifications) {
      const { rows: replies } = await pool.query(`
        SELECT nr.*, u.name AS admin_name
        FROM notification_replies nr JOIN users u ON nr.admin_id = u.id
        WHERE nr.notification_id = $1 ORDER BY nr.created_at ASC
      `, [n.id]);
      n.replies = replies;
    }

    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { rows: notifs } = await pool.query('SELECT * FROM notifications WHERE id = $1', [req.params.id]);
    if (notifs.length === 0) return res.status(404).json({ error: 'Notification not found' });

    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND (user_id = $2 OR target_user_id = $2)', [req.params.id, req.user.id]);
    await pool.query('INSERT INTO notification_reads (user_id, notification_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, req.params.id]);
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
      const { rows } = await pool.query("SELECT COUNT(*) AS count FROM reports WHERE status != 'resolved'");
      pendingReports = parseInt(rows[0].count);
    } else {
      const { rows: unr } = await pool.query(`
        SELECT COUNT(*) AS count FROM notifications n
        LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = $1
        WHERE (n.target_user_id IS NULL OR n.target_user_id = $1 OR n.user_id = $1)
          AND nr.user_id IS NULL
          AND n.is_read = FALSE
      `, [req.user.id]);
      unreadNotifications = parseInt(unr[0].count);

      const { rows: pr } = await pool.query("SELECT COUNT(*) AS count FROM reports WHERE user_id = $1 AND status != 'resolved'", [req.user.id]);
      pendingReports = parseInt(pr[0].count);
    }

    res.json({ unreadNotifications, pendingReports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/notifications/:id/reply', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply) return res.status(400).json({ error: 'Reply is required' });

    const { rows } = await pool.query(
      'INSERT INTO notification_replies (notification_id, admin_id, reply) VALUES ($1, $2, $3) RETURNING id',
      [req.params.id, req.user.id, reply]
    );
    res.json({ id: rows[0].id, reply, admin_name: req.user.name });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.route('/api/notifications/:id')
  .delete(authenticateToken, async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT user_id, target_user_id FROM notifications WHERE id = $1', [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Notification not found' });
      const n = rows[0];
      const isAdmin = req.user.role === 'admin';
      const isCreator = n.user_id === req.user.id;
      const isTarget = n.target_user_id !== null && n.target_user_id === req.user.id;
      const isBroadcast = n.target_user_id === null;
      if (!isAdmin && !isCreator && !isTarget && !isBroadcast) return res.status(403).json({ error: 'Not authorized' });
      await pool.query('DELETE FROM notifications WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      console.error('Delete notification error:', err);
      res.status(500).json({ error: err.message || 'Server error' });
    }
  });

// ── Tutors ───────────────────────────────────────

app.get('/api/tutors', authenticateToken, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'admin') {
      result = await pool.query('SELECT * FROM tutors ORDER BY created_at DESC');
    } else {
      result = await pool.query("SELECT * FROM tutors WHERE status = 'active' ORDER BY created_at DESC");
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/tutors', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { name, email, phone, subject, experience, bio } = req.body;
    if (!name || !email || !subject) return res.status(400).json({ error: 'Name, email, and subject are required' });

    const { rows: existing } = await pool.query('SELECT id FROM tutors WHERE email = $1', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email already exists' });

    const { rows } = await pool.query(
      'INSERT INTO tutors (name, email, phone, subject, experience, bio) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [name, email, phone || '', subject, experience || 0, bio || '']
    );
    res.json({ id: rows[0].id, name, email, phone, subject, experience, bio, status: 'active' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/tutors/:id', authenticateToken, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'admin') {
      result = await pool.query('SELECT * FROM tutors WHERE id = $1', [req.params.id]);
    } else {
      result = await pool.query("SELECT * FROM tutors WHERE id = $1 AND status = 'active'", [req.params.id]);
    }
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tutor not found' });
    res.json(result.rows[0]);
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
      'UPDATE tutors SET name = $1, email = $2, phone = $3, subject = $4, experience = $5, bio = $6, status = COALESCE($7, status) WHERE id = $8',
      [name, email, phone || '', subject, experience || 0, bio || '', status || null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/tutors/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM tutors WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Learners ─────────────────────────────────────

app.get('/api/learners', authenticateToken, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'admin') {
      result = await pool.query('SELECT * FROM learners ORDER BY created_at DESC');
    } else {
      result = await pool.query("SELECT * FROM learners WHERE status = 'active' ORDER BY created_at DESC");
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/learners', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { name, email, phone, grade, subject_interest } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

    const { rows: existing } = await pool.query('SELECT id FROM learners WHERE email = $1', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email already exists' });

    const { rows } = await pool.query(
      'INSERT INTO learners (name, email, phone, grade, subject_interest) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [name, email, phone || '', grade || '', subject_interest || '']
    );
    res.json({ id: rows[0].id, name, email, phone, grade, subject_interest, status: 'active' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/learners/:id', authenticateToken, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'admin') {
      result = await pool.query('SELECT * FROM learners WHERE id = $1', [req.params.id]);
    } else {
      result = await pool.query("SELECT * FROM learners WHERE id = $1 AND status = 'active'", [req.params.id]);
    }
    if (result.rows.length === 0) return res.status(404).json({ error: 'Learner not found' });
    res.json(result.rows[0]);
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
      'UPDATE learners SET name = $1, email = $2, phone = $3, grade = $4, subject_interest = $5, status = COALESCE($6, status) WHERE id = $7',
      [name, email, phone || '', grade || '', subject_interest || '', status || null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/learners/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM learners WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Sessions ─────────────────────────────────────

app.get('/api/sessions', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*, t.name AS tutor_name, t.subject AS tutor_subject, l.name AS learner_name, l.grade AS learner_grade
      FROM sessions s
      JOIN tutors t ON s.tutor_id = t.id
      JOIN learners l ON s.learner_id = l.id
      ORDER BY s.session_date DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/sessions', authenticateToken, tutorOrAdminOnly, async (req, res) => {
  try {
    const { tutor_id, learner_id, session_date, duration, subject, notes } = req.body;
    if (!tutor_id || !learner_id || !session_date || !subject) return res.status(400).json({ error: 'Tutor, learner, date, and subject are required' });

    const { rows } = await pool.query(
      'INSERT INTO sessions (tutor_id, learner_id, session_date, duration, subject, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, status',
      [tutor_id, learner_id, session_date, duration || 60, subject, notes || '']
    );
    res.json({ id: rows[0].id, tutor_id, learner_id, session_date, duration: duration || 60, subject, notes: notes || '', status: rows[0].status });
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
      'UPDATE sessions SET tutor_id = $1, learner_id = $2, session_date = $3, duration = $4, subject = $5, notes = $6, status = COALESCE($7, status) WHERE id = $8',
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
    await pool.query('DELETE FROM sessions WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete session error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Admin User Management ────────────────────────

app.get('/api/admin/users', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, name, email, role, status, created_at FROM users WHERE role != 'admin' ORDER BY created_at DESC");
    res.json(rows);
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

    const { rows: targets } = await pool.query('SELECT role FROM users WHERE id = $1', [req.params.id]);
    if (targets.length === 0 || targets[0].role === 'admin') return res.status(403).json({ error: 'Cannot modify admin users' });

    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, req.params.id]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email already in use' });

    await pool.query('UPDATE users SET name = $1, email = $2, role = COALESCE($3, role), status = COALESCE($4, status) WHERE id = $5',
      [name, email, role || null, status || null, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });

    const { rows: targets } = await pool.query('SELECT role FROM users WHERE id = $1', [req.params.id]);
    if (targets.length === 0 || targets[0].role === 'admin') return res.status(403).json({ error: 'Cannot delete admin users' });

    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Admin Stats ──────────────────────────────────

app.get('/api/admin/stats', authenticateToken, adminOnly, async (req, res) => {
  try {
    const [totalUsers, totalReports, pendingReports, totalNotifications, totalTutors, activeTutors, totalLearners, activeLearners, totalSessions, scheduledSessions] = await Promise.all([
      pool.query("SELECT COUNT(*) AS count FROM users WHERE role IN ('user', 'tutor')"),
      pool.query('SELECT COUNT(*) AS count FROM reports'),
      pool.query("SELECT COUNT(*) AS count FROM reports WHERE status = 'pending'"),
      pool.query('SELECT COUNT(*) AS count FROM notifications'),
      pool.query('SELECT COUNT(*) AS count FROM tutors'),
      pool.query("SELECT COUNT(*) AS count FROM tutors WHERE status = 'active'"),
      pool.query('SELECT COUNT(*) AS count FROM learners'),
      pool.query("SELECT COUNT(*) AS count FROM learners WHERE status = 'active'"),
      pool.query('SELECT COUNT(*) AS count FROM sessions'),
      pool.query("SELECT COUNT(*) AS count FROM sessions WHERE status = 'scheduled'"),
    ]);

    res.json({
      totalUsers: parseInt(totalUsers.rows[0].count),
      totalReports: parseInt(totalReports.rows[0].count),
      pendingReports: parseInt(pendingReports.rows[0].count),
      totalNotifications: parseInt(totalNotifications.rows[0].count),
      totalTutors: parseInt(totalTutors.rows[0].count),
      activeTutors: parseInt(activeTutors.rows[0].count),
      totalLearners: parseInt(totalLearners.rows[0].count),
      activeLearners: parseInt(activeLearners.rows[0].count),
      totalSessions: parseInt(totalSessions.rows[0].count),
      scheduledSessions: parseInt(scheduledSessions.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Start ────────────────────────────────────────

let dbInitDone = false;
let dbInitPromise = null;

function ensureDB() {
  if (dbInitDone) return Promise.resolve();
  if (!dbInitPromise) {
    dbInitPromise = initDB()
      .then(() => { dbInitDone = true; })
      .catch(err => { console.error('DB init failed:', err.message); dbInitPromise = null; throw err; });
  }
  return dbInitPromise;
}

app.use((req, res, next) => {
  if (!process.env.DATABASE_URL || dbInitDone) return next();
  ensureDB().then(() => next()).catch(err => {
    console.error('DB middleware error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Database not ready' });
  });
});

const path = require('path');
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
const fs = require('fs');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.get('/health', (req, res) => res.json({ status: 'ok' }));

if (require.main === module) {
  initDB()
    .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
    .catch(err => {
      console.error('PostgreSQL connection failed:', err.message);
      process.exit(1);
    });
}

module.exports = app;
