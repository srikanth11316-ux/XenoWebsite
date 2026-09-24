const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const FRONTEND_URL = process.env.FRONTEND_URL || '';
const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL || '*',
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'xenochat-secret-key-2026';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'gmail';
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER;

let transporter = null;
if (EMAIL_USER && EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: EMAIL_SERVICE,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });
}

app.use(cors({
  origin: FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, '..')));

const db = new Database(path.join(DATA_DIR, 'xenochat.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    verification_code TEXT,
    is_verified INTEGER DEFAULT 0,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(group_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    content TEXT,
    file_url TEXT,
    file_type TEXT,
    file_size INTEGER,
    is_safe INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (group_id) REFERENCES groups(id)
  );
`);

try {
  db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE users ADD COLUMN verification_code TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0');
} catch (e) {}

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

const DANGEROUS_EXTENSIONS = [
  '.exe', '.dll', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
  '.jar', '.ps1', '.sh', '.php', '.py', '.rb', '.pl', '.asp', '.aspx',
  '.jsp', '.msi', '.msp', '.reg', '.wsf', '.hta', '.cpl', '.msc'
];

const DANGEROUS_MIME_TYPES = [
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-sh',
  'application/x-python',
  'application/x-php',
  'application/javascript',
  'text/javascript',
  'application/octet-stream'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return cb(new Error(`File type .${ext.slice(1)} is not allowed for security reasons`), false);
  }

  if (DANGEROUS_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`File type ${file.mimetype} is not allowed for security reasons`), false);
  }

  cb(null, true);
};

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: fileFilter
});

async function sendVerificationEmail(toEmail, username, code) {
  if (!transporter) {
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"XenoChat" <${EMAIL_FROM}>`,
      to: toEmail,
      subject: 'Verify your XenoChat account',
      text: `Hi ${username},\n\nYour XenoChat verification code is: ${code}\n\nThis code will expire in 15 minutes.\n\nIf you didn't create an account, please ignore this email.`,
      html: `<p>Hi <strong>${username}</strong>,</p><p>Your XenoChat verification code is:</p><h2 style="color:#667eea;">${code}</h2><p>This code will expire in 15 minutes.</p><p>If you didn't create an account, please ignore this email.</p>`
    });

    return true;
  } catch (err) {
    console.error('Failed to send verification email:', err.message);
    return false;
  }
}

app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUsername = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

    if (existingUsername && existingEmail) {
      return res.status(400).json({ error: 'Both username and email already exist' });
    }
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already exists', field: 'username' });
    }
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists', field: 'email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const result = db.prepare(
      'INSERT INTO users (username, email, password, phone, verification_code, is_verified) VALUES (?, ?, ?, ?, ?, 0)'
    ).run(username, email, hashedPassword, phone || null, verificationCode);

    await sendVerificationEmail(email, username, verificationCode);

    res.status(201).json({
      message: 'Account created. Please verify your account.',
      user: { id: result.lastInsertRowid, username, email, phone },
      verificationCode: transporter ? undefined : verificationCode
    });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT') {
      if (err.message.includes('users.email')) {
        return res.status(400).json({ error: 'Email already exists', field: 'email' });
      }
      if (err.message.includes('users.username')) {
        return res.status(400).json({ error: 'Username already exists', field: 'username' });
      }
    }
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.get('/api/users', (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, email, phone, is_verified, created_at FROM users').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/verify', (req, res) => {
  try {
    const { username, code } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.is_verified) {
      return res.status(400).json({ error: 'Account already verified' });
    }

    if (user.verification_code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    db.prepare('UPDATE users SET is_verified = 1, verification_code = NULL WHERE id = ?').run(user.id);

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, phone: user.phone }
    });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

app.post('/api/resend-code', async (req, res) => {
  try {
    const { username } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.is_verified) {
      return res.status(400).json({ error: 'Account already verified' });
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    db.prepare('UPDATE users SET verification_code = ? WHERE id = ?').run(newCode, user.id);

    await sendVerificationEmail(user.email, user.username, newCode);

    res.json({ message: 'New verification code sent', verificationCode: transporter ? undefined : newCode });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend code' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please verify your account first', needsVerification: true, username });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, phone: user.phone }
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/groups', authMiddleware, (req, res) => {
  try {
    const groups = db.prepare(`
      SELECT g.*, u.username as creator_name,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
      FROM groups g
      JOIN users u ON g.created_by = u.id
      ORDER BY g.created_at DESC
    `).all();

    const userGroups = db.prepare(`
      SELECT g.*, u.username as creator_name,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
      FROM groups g
      JOIN users u ON g.created_by = u.id
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = ?
      ORDER BY g.created_at DESC
    `).all(req.user.id);

    res.json({ public_groups: groups, user_groups: userGroups });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

app.post('/api/groups', authMiddleware, (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const result = db.prepare(
      'INSERT INTO groups (name, description, created_by) VALUES (?, ?, ?)'
    ).run(name, description || '', req.user.id);

    db.prepare(
      'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)'
    ).run(result.lastInsertRowid, req.user.id);

    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create group' });
  }
});

app.post('/api/groups/:id/join', authMiddleware, (req, res) => {
  try {
    const groupId = req.params.id;
    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    db.prepare(
      'INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)'
    ).run(groupId, req.user.id);

    res.json({ message: 'Joined group successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join group' });
  }
});

app.get('/api/groups/:id/messages', authMiddleware, (req, res) => {
  try {
    const groupId = req.params.id;
    const isMember = db.prepare(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?'
    ).get(groupId, req.user.id);

    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const messages = db.prepare(`
      SELECT m.*, u.username as sender_name, u.avatar as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.group_id = ?
      ORDER BY m.created_at ASC
    `).all(groupId);

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const fileSize = req.file.size;

    res.json({
      url: fileUrl,
      filename: req.file.originalname,
      size: fileSize,
      mimetype: req.file.mimetype
    });
  } catch (err) {
    if (err.message && err.message.includes('not allowed')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'File upload failed' });
  }
});

const connectedUsers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('No token provided'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.username}`);

  connectedUsers.set(socket.user.id, {
    socketId: socket.id,
    username: socket.user.username
  });

  socket.on('join_group', (groupId) => {
    socket.join(`group_${groupId}`);
    console.log(`${socket.user.username} joined group ${groupId}`);
  });

  socket.on('leave_group', (groupId) => {
    socket.leave(`group_${groupId}`);
  });

  socket.on('send_message', (data) => {
    const { group_id, content, file_url, file_type, file_size } = data;

    if (!group_id || (!content && !file_url)) {
      return;
    }

    const isMember = db.prepare(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?'
    ).get(group_id, socket.user.id);

    if (!isMember) {
      return;
    }

    const result = db.prepare(`
      INSERT INTO messages (sender_id, group_id, content, file_url, file_type, file_size, is_safe)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(socket.user.id, group_id, content || '', file_url || null, file_type || null, file_size || null);

    const message = db.prepare(`
      SELECT m.*, u.username as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `).get(result.lastInsertRowid);

    io.to(`group_${group_id}`).emit('new_message', message);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.username}`);
    connectedUsers.delete(socket.user.id);
  });
});

server.listen(PORT, () => {
  console.log(`XenoChat server running on port ${PORT}`);
  console.log(`Upload directory: ${UPLOAD_DIR}`);
});
