# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory in the container
WORKDIR /app

# Set the working directory in the container
#WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    gnupg \
    lsb-release \
    npm \
    --no-install-recommends && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Node.js and npm
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add - && \
    echo "deb https://deb.nodesource.com/node_14.x $(lsb_release -sc) main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && apt-get install -y nodejs

# Verify Node.js and npm installation
# RUN node -v
# RUN npm -v

# Copy the rest of the application code
COPY . /app/

# Install pip requirements no cache
RUN pip install --no-cache-dir -r pip_requirements.txt

# Install npm dependencies
# Install npm dependencies from npm_requirements.txt
RUN xargs -a npm_requirements.txt npm install
#RUN npm install npm concurrently react-scripts react-router-dom react@18.2.0 react-dom@18.2.0 web-vitals axios @mui/material @emotion/react @emotion/styled @mui/icons-material @mui/lab @mui/x-tree-view
RUN npm install
RUN npm install concurrently --save-dev

# Build the React app
RUN npm run build

# Expose both ports
EXPOSE 3000
EXPOSE 5000

# Run the application
#CMD ["npm", "start"]