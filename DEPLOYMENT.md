# ELEDA 2026 DIGITAL VOTING ARENA — Online Deployment Guide (GitHub + Vercel)

Follow these simple steps to put your election platform online on **Vercel** via **GitHub**.

---

## Step 1: Create a New GitHub Repository

1. Log in to [GitHub](https://github.com)
2. Go to **[https://github.com/new](https://github.com/new)**
3. Name your repository (e.g. `eleda-2026-voting` or `eleda`)
4. Choose **Public** or **Private**
5. **Do NOT** check "Add a README file", ".gitignore", or "license" (we already have all of these committed locally!)
6. Click **Create repository**

---

## Step 2: Push Local Code to GitHub

Copy and run these commands in PowerShell in your project folder (`C:\Users\UK USER\Downloads\eleda`):

```powershell
# Replace <YOUR-USERNAME> and <YOUR-REPO> with your GitHub details
git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO>.git
git push -u origin main
```

*(If prompted, sign in to your GitHub account in the browser pop-up).*

---

## Step 3: Deploy to Vercel

1. Go to **[https://vercel.com/new](https://vercel.com/new)** (log in or sign up with GitHub)
2. Under **"Import Git Repository"**, find your new `eleda-2026-voting` repository and click **Import**
3. In the **Configure Project** screen:
   - **Framework Preset**: Next.js (automatically detected)
   - **Root Directory**: `./` (leave default)
4. Expand **Environment Variables** and add these two:
   | Key | Value |
   |---|---|
   | `ELECTION_SECRET` | `eleda-2026-super-secure-cryptographic-master-key-xyz987` *(or any 32+ character random string)* |
   | `SESSION_SECRET` | `eleda-2026-session-jwt-auth-secret-key-12345` *(or any 32+ character random string)* |
5. Click **Deploy** 🚀

Vercel will build the app and give you a live production URL (e.g. `https://eleda-2026-voting.vercel.app`) in ~60 seconds!

---

## Step 4: Share with Participants

Once deployed, copy your live Vercel URL and share it with participants:
- Participants simply visit the URL on their phone, tablet, or laptop.
- No registration is required.
- Their device will be automatically detected and they can cast their vote immediately.
- Each device can only vote once.
- Live results and winner announcements will be synchronized in real time.
