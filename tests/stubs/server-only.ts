// `server-only` throws when imported outside a React Server Component
// bundle. Vitest runs plain Node, so it is aliased to this no-op — the
// guard is a build-time contract, not something the tests need to enforce.
export {};
