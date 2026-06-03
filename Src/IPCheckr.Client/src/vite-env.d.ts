/// <reference types="vite/client" />

declare const __APP_VERSION__: string
declare const __GIT_REPO_URL__: string

interface ImportMetaEnv {
	readonly VITE_DEMO_MODE?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}