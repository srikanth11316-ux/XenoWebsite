# XenoChat Deployment Guide

## Prerequisites
- A GitHub account
- A Cloudflare account
- A Render.com account (or Railway.app)

## Step 1: Deploy Backend to Render.com

1. Push your code to GitHub (include the `backend/` folder)
2. Go to https://render.com and sign up
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: xenochat-backend
   - **Runtime**: Node
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Plan**: Free
6. Add Environment Variables:
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = (any random string)
   - `FRONTEND_URL` = (your Cloudflare Pages URL, e.g., `https://xenochat.pages.dev`)
   - `EMAIL_USER` = (your Gmail for verification)
   - `EMAIL_PASS` = (your Gmail app password)
   - `EMAIL_SERVICE` = `gmail`
7. Add Disk:
   - Name: `xenochat-data`
   - Mount Path: `/opt/render/project/src/backend/data`
   - Size: 1 GB
8. Click "Create Web Service"
9. Wait for deployment to complete
10. Copy your backend URL (e.g., `https://xenochat-backend.onrender.com`)

## Step 2: Deploy Frontend to Cloudflare Pages

1. Go to https://pages.cloudflare.com and sign up
2. Click "Create a project"
3. Connect your GitHub repository
4. Configure:
   - **Production branch**: main (or master)
   - **Build command**: (leave empty, or use `echo 'No build needed'`)
   - **Build output directory**: `public`
5. Add Environment Variable:
   - `VITE_API_URL` = (your Render backend URL from Step 1)
6. Click "Save and Deploy"
7. Wait for deployment
8. Your site will be live at `https://xenochat.pages.dev` or your custom domain

## Step 3: Connect Custom Domain (Optional)

### Option A: Use Cloudflare's free subdomain
- Already provided: `https://xenochat.pages.dev`

### Option B: Use a free domain from Freenom
1. Go to https://freenom.com and register a free `.tk` domain
2. In Cloudflare Pages, go to "Custom domains"
3. Add your domain
4. Update nameservers at Freenom to Cloudflare's nameservers

### Option C: Use Cloudflare Dashboard
1. Buy a domain from Cloudflare (starting at ~$1/month)
2. Connect it to your Pages project

## Step 4: Update Backend CORS

After deploying frontend, update your Render backend environment variable:
- `FRONTEND_URL` = `https://your-frontend-url.pages.dev`

Then restart the backend service on Render.

## Step 5: Test

1. Visit your Cloudflare Pages URL
2. Try signing up
3. Check email for verification code
4. Login and test chat

## Important Notes

- **Database**: SQLite database is stored on Render's disk. If the app hasn't received traffic in a while, Render free tier may spin down, but data persists.
- **File Uploads**: Uploaded files are stored locally on Render's disk. For production, consider using S3 or Cloudflare R2.
- **Email**: Make sure to use a Gmail App Password, not your regular password.
- **Socket.io**: Works on Render's free tier but may have connection issues if the app is cold-starting.

## Troubleshooting

- **CORS errors**: Make sure `FRONTEND_URL` in Render matches your Cloudflare Pages URL exactly
- **Email not sending**: Check Gmail App Password setup
- **Database errors**: Make sure the disk is mounted at the correct path in Render
- **Socket.io disconnects**: Free tier spins down after 15 minutes of inactivity
