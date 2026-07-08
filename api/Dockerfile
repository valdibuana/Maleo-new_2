FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
	&& apt-get upgrade -y \
	&& apt-get install -y --no-install-recommends tzdata openssl ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

ENV TZ=Asia/Jakarta

COPY package*.json ./
RUN npm ci

COPY . .

# Use project's Prisma CLI version (from node_modules) to generate client.
RUN npm exec prisma generate

RUN npm run build

EXPOSE 4000

CMD ["npm", "run", "start"]
