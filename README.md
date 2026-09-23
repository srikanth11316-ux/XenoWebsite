# XenoChat - Hangout App with Groups & Secure File Sharing

A full-stack chat application with group functionality and dangerous file upload protection.

## Features

- ✅ User registration and authentication (JWT)
- ✅ Email verification with 6-digit codes sent to Gmail
- ✅ Real-time chat with Socket.io
- ✅ Create and join groups
- ✅ Secure file upload with dangerous file blocking
- ✅ Responsive UI with modern dark design
- ✅ File type and size validation
- ✅ Protection against executable files, scripts, and other dangerous formats
- ✅ Phone number collection during registration
- ✅ User tracking dashboard

## Blocked File Types (Security)

The following dangerous file types are automatically blocked:
- Executables: `.exe`, `.dll`, `.bat`, `.cmd`, `.com`, `.pif`, `.scr`, `.msi`, `.msp`
- Scripts: `.vbs`, `.js`, `.jar`, `.ps1`, `.sh`, `.py`, `.rb`, `.pl`, `.php`, `.wsf`, `.hta`
- Web: `.asp`, `.aspx`, `.jsp`
- System: `.reg`, `.cpl`, `.msc`

Maximum file size: 50MB

Allowed file types:
- Images: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- Documents: `.pdf`, `.txt`, `.csv`
- Archives: `.zip`, `.rar`
- Videos: `.mp4`, `.webm`

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Email (Optional but Recommended)

Copy `.env.example` to `.env` and configure your Gmail credentials:

```bash
cp .env.example .env
```

Edit `.env` with your Gmail App Password:
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-digit-app-password
EMAIL_SERVICE=gmail
EMAIL_FROM=your-email@gmail.com
```

**Gmail Setup:**
1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password at https://myaccount.google.com/apppasswords
3. Use the 16-digit App Password as `EMAIL_PASS`

Without email configuration, verification codes will be shown in alerts.

### 3. Run the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

### 3. Open the Chat App

Open your browser and navigate to:
- Landing page: `http://localhost:3000/` or `file:///D:/XenoWebsite/index.html`
- Chat app: `http://localhost:3000/chat.html` or `file:///D:/XenoWebsite/chat.html`

## Usage

1. **Register**: Create an account with username, email, phone, and password
2. **Verify Email**: Check your Gmail for a 6-digit verification code and enter it in the app
3. **Login**: Sign in with your username and password
4. **Create a Group**: Click "Create Group" in the sidebar
5. **Join Groups**: Click on any public group to join
6. **Chat**: Send messages in real-time
7. **Share Files**: Click the attachment icon to upload safe files
8. **View Users**: Click "Users" in the header to see all registered accounts

## Project Structure

```
D:\XenoWebsite/
├── public/                 # Frontend for Cloudflare Pages
│   ├── index.html          # Landing page
│   ├── chat.html           # Chat application
│   ├── users.html          # User tracking dashboard
│   └── config.js           # Frontend configuration
├── backend/                # Backend for Render.com
│   ├── server.js           # Backend server
│   ├── package.json        # Dependencies
│   ├── render.yaml         # Render deployment config
│   └── xenochat.db         # SQLite database
├── server/                 # Local development backend
│   ├── server.js
│   ├── package.json
│   └── uploads/
├── DEPLOY.md               # Detailed deployment guide
├── deploy.ps1              # Deployment preparation script
└── README.md               # This file
```

## Security Features

- File extension validation
- MIME type checking
- File size limits (50MB max)
- Dangerous file type blocking
- JWT authentication
- SQL injection prevention with parameterized queries

## Deployment

See [DEPLOY.md](DEPLOY.md) for complete deployment instructions.

Quick summary:
1. **Backend**: Deploy `backend/` folder to Render.com
2. **Frontend**: Deploy `public/` folder to Cloudflare Pages
3. **Configure**: Set environment variables for backend URL and email

## Tech Stack

**Backend:**
- Node.js
- Express.js
- Socket.io (real-time communication)
- SQLite (database)
- JWT (authentication)
- Multer (file uploads)
- bcrypt (password hashing)

**Frontend:**
- Vanilla JavaScript
- Socket.io client
- Modern CSS with gradients and animations
- Responsive design

## Next Steps

- [ ] Deploy to Cloudflare Pages + Render.com (see DEPLOY.md)
- [ ] Add group admin/moderator features
- [ ] Add message history search
- [ ] Add user profiles with avatars
- [ ] Add group chat settings
- [ ] Implement end-to-end encryption
- [ ] Add push notifications
- [ ] Add file preview for images/videos
- [ ] Add online status indicators

## License

© 2026 XenoChat. All rights reserved.
