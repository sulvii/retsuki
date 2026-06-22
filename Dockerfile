FROM oven/bun:1.3
WORKDIR /usr/src/app

COPY package.json* ./
RUN bun install

COPY . .

USER bun

ENTRYPOINT ["sh", "-c", "bun run db:migrate && bun run src/index.ts"]