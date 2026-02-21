/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POCKETBASE_URL: string;
  readonly VITE_NOTION_API_KEY: string;
  readonly VITE_NOTION_DB_ID: string;
  readonly VITE_NOTION_ALLOWED_APP?: string;
}
