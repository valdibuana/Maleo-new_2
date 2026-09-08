FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
	&& apt-get upgrade -y \
	&& apt-get install -y --no-install-recommends tzdata ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

ENV TZ=Asia/Jakarta

ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Used by next.config.mjs rewrites() to proxy to the API container in Docker.
# Falls back to localhost for local development.
ARG API_INTERNAL_URL=http://localhost:4000
ENV API_INTERNAL_URL=${API_INTERNAL_URL}

COPY package*.json ./
RUN npm config set registry https://registry.npmjs.org/ \
    && npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm ci

COPY . .

RUN npm run build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "run", "start"]
