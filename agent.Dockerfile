# Use a lightweight Python image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory in the container
WORKDIR /app

# Copy dependency definition
COPY requirements.txt /app/

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire engine directory and src/ai directory
COPY engine/ /app/engine/
COPY src/ /app/src/

# Create a workspace directory for mounting
RUN mkdir -p /workspace
WORKDIR /workspace

# Default command matches what runInDocker expects:
# python /app/engine/run_agent.py --agent ...
# But since we override the command in spawn, we just set a default entrypoint
ENTRYPOINT ["python", "/app/engine/run_agent.py"]
