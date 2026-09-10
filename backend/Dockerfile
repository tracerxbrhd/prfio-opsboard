FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
COPY requirements.txt /tmp/requirements.txt
RUN pip install -r /tmp/requirements.txt && useradd --create-home --uid 10001 app
COPY --chown=app:app backend/ /app/
COPY --chown=app:app deploy/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh && mkdir -p /app/staticfiles && chown -R app:app /app
USER app
EXPOSE 8000
ENTRYPOINT ["/app/entrypoint.sh"]
