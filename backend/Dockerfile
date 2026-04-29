FROM python:3.11-slim

WORKDIR /app

# Install dependencies first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the actual application code
COPY . .

# Expose the precise port required
EXPOSE 8000

# Start Uvicorn bound universally
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
