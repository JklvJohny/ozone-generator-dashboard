FROM node:20-alpine

WORKDIR /app

# Copy package descriptors 
COPY package*.json ./

# Install exact dependencies
RUN npm ci

# Copy the rest of the Next.js project
COPY . .

# Expose the standard Next.js port
EXPOSE 3000

# Start the dev server as explicitly requested
CMD ["npm", "run", "dev"]
