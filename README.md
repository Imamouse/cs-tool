CS Email Drafter — Shipping Operations Tool
A single-file HTML tool for CS shipping teams. Draft multilingual customer emails, track records, and export to Excel — no server, no install, runs entirely in the browser.

Built by Jc.


Features
Email Drafter — single order email with auto-language detection by store domain
Bulk Drafter — paste rows from Google Sheets, draft all emails at once
Records & Export — save every drafted email, export to .xlsx
Import Data — restore records from a previously exported Excel file
Analytics — issue breakdown by category, store, and month
Insights — key findings and recommended actions from your data
Settings — customize brand, emoji, sign-off, AI provider, tone, and custom instructions


Supported AI Providers
Provider
Free Tier
Google Gemini
✅ Free
Groq
✅ Free
OpenRouter
✅ Free models
Mistral
✅ Free tier
Cohere
✅ Free trial
OpenAI
❌ Paid
Anthropic Claude
❌ Paid
xAI Grok
❌ Paid
DeepSeek
✅ Very cheap
Together AI
✅ Free trial



Quick Start
Download cs-tool-generic.html
Open it in any browser (Chrome recommended)
Log in with the default password: default
Go to Settings → set your AI provider + API key → Save all settings
Start drafting emails

Change the default password in Settings before sharing with your team.


Deploying to Netlify
Host the tool online so your whole team can access it from any browser — no file sharing needed.
Step 1 — Push to GitHub
Create a new repository on github.com (can be private)
Upload cs-tool-generic.html to the repo root
Commit the file
Step 2 — Connect to Netlify
Go to netlify.com and sign up / log in (free)
Click Add new site → Import an existing project
Select GitHub and authorize Netlify
Pick your repository
Leave build settings blank (no build command needed — it's a plain HTML file)
Click Deploy site
Step 3 — Set your URL (optional)
In Netlify → Site settings → Domain management
Click Options → Edit site name → set something like jc-cs-tool
Your team accesses it at https://jc-cs-tool.netlify.app
Step 4 — Updating the tool
Any time you push a new version of cs-tool-generic.html to GitHub, Netlify redeploys automatically within ~30 seconds.


Data & Privacy
All records are stored in browser localStorage — data stays on the user's device
No data is sent to any server (except to your chosen AI provider for email drafting)
API keys are stored in localStorage and never leave the browser
Customer names are hidden by default in Records — password required to reveal


License
Internal tool — not for public distribution.

