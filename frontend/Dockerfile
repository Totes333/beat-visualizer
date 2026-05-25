FROM node:20-slim

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

EXPOSE 5173

# Boot up the Vite dev server and expose it outside the container boundary
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]