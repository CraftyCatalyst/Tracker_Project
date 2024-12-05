# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set build-time arguments
# ARG POSTGRES_USER
# ARG POSTGRES_PASSWORD
# ARG POSTGRES_DB
ARG FLASK_ENV

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
# ENV POSTGRES_USER=${POSTGRES_USER}
# ENV POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
# ENV POSTGRES_DB=${POSTGRES_DB}
ENV FLASK_ENV=${FLASK_ENV}

# Set the working directory in the container
WORKDIR /satisfactory_tracker

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    --no-install-recommends && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install pip requirements
COPY pip_requirements.txt /app/
RUN pip install --no-cache-dir -r pip_requirements.txt

# Copy the rest of the application code
COPY . /app/

# Expose the port the app runs on
EXPOSE 3000

# Run the application
CMD ["python", "run.py"]