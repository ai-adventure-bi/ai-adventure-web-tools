FROM python:3.12-slim
WORKDIR /app
COPY server/requirements.txt /app/server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt
COPY server /app/server
COPY app/seismic-model.json /app/app/seismic-model.json
ENV HEYOTTO_SECURE_COOKIE=1
EXPOSE 8080
CMD ["sh", "-c", "python server/quake_api.py --host 0.0.0.0 --port ${PORT:-8080}"]
