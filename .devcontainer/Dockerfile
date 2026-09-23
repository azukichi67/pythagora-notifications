# バージョンは .node-version と必ず揃える
FROM node:24.21.0-slim

# pnpm のバージョンは package.json の packageManager で固定される
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable pnpm

RUN apt-get update && apt-get install -y sudo git procps curl \
    && rm -rf /var/lib/apt/lists/*

# node_modules の volume はワークスペース配下にマウントされ、イメージ側で
# 所有者を用意できない。postCreateCommand で chown するために sudo を許可する
RUN echo "node ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/node \
    && chmod 0440 /etc/sudoers.d/node

# named volume のマウント先。事前に作らないと root 所有になる
RUN mkdir -p /home/node/.claude /home/node/.pnpm-store /home/node/.config/gh \
    && chown -R node:node /home/node/.claude /home/node/.pnpm-store /home/node/.config
