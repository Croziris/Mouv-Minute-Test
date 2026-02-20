# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/a59fd989-1232-4653-b99d-49f19e8d996b

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/a59fd989-1232-4653-b99d-49f19e8d996b) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/a59fd989-1232-4653-b99d-49f19e8d996b) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## API proxy and deployment (VPS + Nginx)

The frontend uses same-origin API routes:

- `/api/pb/*` -> PocketBase
- `/api/notion/*` -> Notion (secret kept server-side)

This avoids browser CORS issues in dev and production.

### Environment variables

Client-side:

- `VITE_POCKETBASE_URL=/api/pb`
- `VITE_NOTION_PROXY_BASE_URL=/api/notion`

Server-side only:

- `POCKETBASE_TARGET_URL=https://your-pocketbase-instance`
- `NOTION_API_KEY=secret_xxx`
- `NOTION_DB_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- `NOTION_ALLOWED_APP=mouv minute`

### Production run

```bash
npm ci
npm run build
npm run start:prod
```

`start:prod` runs `vite preview` on `127.0.0.1:4173` with both API proxies enabled.

### Nginx reverse proxy example

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:4173;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Ready-to-copy templates are available in:

- `deploy/nginx/mouv-minute.conf.example`
- `deploy/systemd/mouv-minute.service.example`

For Notion publishing visibility:

- Status must be `Publie` (or checkbox equivalent)
- `Application` multi-select must contain `mouv minute` (or your `NOTION_ALLOWED_APP` value)
