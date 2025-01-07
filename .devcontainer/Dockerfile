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
    default-libmysqlclient-dev \
    --no-install-recommends && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Node.js and npm
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add - && \
    echo "deb https://deb.nodesource.com/node_14.x $(lsb_release -sc) main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && apt-get install -y nodejs

# Copy the rest of the application code
COPY . /app/

# Install pip requirements with no cache
RUN pip install --no-cache-dir -r /app/pip_requirements.txt

# Install npm dependencies
RUN xargs -a /app/npm_requirements.txt npm install

#TODO: Commenting out the below lines to see if it works without them
# RUN npm install
# RUN npm install concurrently --save-dev

# Make the entrypoint script executable
RUN chmod +x /app/entrypoint.sh

# Build the React app
RUN npm run build

# Expose both ports
EXPOSE 3000
EXPOSE 5000
