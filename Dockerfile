FROM node:16-buster
WORKDIR /data
RUN apt update && apt install -y libgmp-dev nlohmann-json3-dev nasm g++
RUN rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json /data
COPY dist /data/dist
RUN npm install .
ENTRYPOINT ["node", "./dist/cli.js"]
CMD ["--version"]
