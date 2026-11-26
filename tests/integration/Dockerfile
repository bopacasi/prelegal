# Integration tests for the running stack. Run with scripts/test.sh.
FROM python:3.15-slim
ENV PYTHONDONTWRITEBYTECODE=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /tests
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY test_*.py ./
# test_backend_down.py needs the backend stopped; scripts/test.sh runs it separately.
CMD ["pytest", "-q", "--ignore=test_backend_down.py"]
