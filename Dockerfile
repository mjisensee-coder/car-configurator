# --- Build stage ---
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# `standalone` emits a self-contained server bundle with only the modules
# actually imported, so the runtime image does not need node_modules.
ENV NEXT_OUTPUT=standalone
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Runtime stage ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV NEXT_TELEMETRY_DISABLED=1

# The standalone bundle carries its own minimal node_modules; `static` and
# `public` are served from disk and are not part of it.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Schema and seed scripts ship too, so a deploy can run `npm run db:schema`
# and `npm run db:seed` against the attached Postgres service.
COPY --from=build /app/db ./db
COPY --from=build /app/src/data ./src/data

EXPOSE 8080
CMD ["node", "server.js"]
