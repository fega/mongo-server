FROM mhart/alpine-node:14 

RUN npm i -g moser

cmd ["moser", "--mongo", "mongodb://localhost:27017"]
