FROM node:20

WORKDIR /app

RUN apt-get update && apt-get install -y \
  ffmpeg \
  libcairo2-dev \
  libjpeg-dev \
  libpango1.0-dev \
  libgif-dev \
  build-essential \
  g++

COPY package.json .

RUN npm install

COPY . .

CMD ["node", "render.js"]