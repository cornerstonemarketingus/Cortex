FROM python:3.10-slim
WORKDIR /app
COPY . /app
RUN pip install --no-cache-dir flask
EXPOSE 5001
CMD ["python", "approval_api_v2.py"]
