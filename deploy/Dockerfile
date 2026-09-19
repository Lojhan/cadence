FROM rust:1.92.0-bookworm AS wasm
WORKDIR /build
COPY Cargo.toml Cargo.lock rust-toolchain.toml ./
COPY crates ./crates
RUN rustup target add wasm32-unknown-unknown \
    && cargo install wasm-bindgen-cli --version 0.2.128 --locked \
    && cargo build --locked --release --target wasm32-unknown-unknown -p cadence-wasm \
    && wasm-bindgen target/wasm32-unknown-unknown/release/cadence_wasm.wasm --target web --out-dir /generated

FROM node:24.10.0-bookworm AS build
WORKDIR /build
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
COPY . .
COPY --from=wasm /generated ./packages/audio-engine/generated
RUN pnpm install --frozen-lockfile && pnpm --filter @cadence/web build

FROM node:24.10.0-bookworm-slim AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 AUTH_MODE=local \
    DATABASE_URL=file:/data/cadence.db PUBLIC_ORIGIN=http://localhost:3000
WORKDIR /app
RUN mkdir /data && chown node:node /data
COPY --from=build /build/apps/web/.output ./
USER node
EXPOSE 3000
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s CMD node -e 'require("node:http").get("http://localhost:3000/health",{headers:{host:new URL(process.env.PUBLIC_ORIGIN).host}},r=>{r.resume();process.exit(r.statusCode===200?0:1)}).on("error",()=>process.exit(1))'
CMD ["node", "server/index.mjs"]
