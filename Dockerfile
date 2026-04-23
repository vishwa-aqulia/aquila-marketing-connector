FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*

RUN printf '#!/bin/sh\nexec python3 "$@"\n' > /usr/local/bin/python && chmod +x /usr/local/bin/python

COPY dist ./dist
COPY package.json ./

RUN pip install "facebook-business>=24.0.1" "google-ads>=29.2.0" "google-analytics-data>=0.20.0" "google-api-python-client>=2.190.0" "google-auth>=2.48.0" "google-auth-oauthlib>=1.3.0" "google-cloud-bigquery>=3.40.1" "python-dotenv>=1.2.2" "requests>=2.32.5" --break-system-packages

COPY python ./python
COPY main.py ./main.py

EXPOSE 5000
ENV NODE_ENV=production

CMD ["node", "dist/index.cjs"]
