# 公式の軽量Node.jsイメージを使用
FROM docker.io/library/node:22-slim

# 最新のChrome開発パッケージと主要なフォントをインストール
RUN apt-get update \
    && apt-get install -y wget gnupg sshpass\
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] https://dl-ssl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros fonts-kacst fonts-freefont-ttf libxss1 dbus dbus-x11 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r pptruser && useradd -rm -g pptruser -G audio,video pptruser

# 作業ディレクトリを設定
WORKDIR /home/pptruser

# Puppeteerとreadline-syncをインストール
RUN npm install puppeteer puppeteer-core readline-sync \
    && npx puppeteer install

# 非特権ユーザーとして実行
USER pptruser

# ローカルファイルをコンテナにコピー
COPY . .

# スクリプトを実行
CMD ["node", "index.js"]
