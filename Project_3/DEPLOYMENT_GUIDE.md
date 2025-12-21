# Production Deployment Guide - OpenAI Agents SDK Migration

**Date**: December 21, 2025
**Version**: 1.0.0
**Target**: Production deployment of multi-agent SDK system

---

## 📋 Pre-Deployment Checklist

### Environment Requirements

- [ ] Python 3.10+ installed on production servers
- [ ] All dependencies from `requirements.txt` installed
- [ ] Redis server available (optional but recommended)
- [ ] Environment variables configured
- [ ] SSL certificates configured (for HTTPS)
- [ ] Firewall rules updated

### API Keys & Credentials

- [ ] `OPENAI_API_KEY` configured and valid
- [ ] `NOTION_API_KEY` configured (if using Notion)
- [ ] `SLACK_BOT_TOKEN` configured (if using Slack)
- [ ] `SLACK_SIGNING_SECRET` configured (if using Slack)
- [ ] `REDIS_URL` configured (if using Redis)

### Testing

- [ ] All unit tests passing (`pytest tests/`)
- [ ] Integration tests passing (`pytest tests/test_sdk_integration.py`)
- [ ] Performance benchmarks acceptable (`python scripts/benchmark_performance.py`)
- [ ] Backward compatibility validated (`python scripts/validate_compatibility.py`)

### Documentation

- [ ] README.md updated with latest features
- [ ] API documentation current
- [ ] Runbook created for on-call team
- [ ] Rollback plan documented

---

## 🚀 Deployment Strategies

### Strategy 1: Blue-Green Deployment (Recommended)

**Best for**: Production environments with high availability requirements

**Steps:**

1. **Prepare Green Environment**
   ```bash
   # Clone production to green environment
   # Install Python 3.10+
   python3.10 --version  # Verify: 3.10 or higher

   # Install dependencies
   pip install -r requirements.txt

   # Configure environment
   cp .env.production .env
   # Edit .env: USE_SDK_AGENT=true
   ```

2. **Run Pre-Deployment Tests**
   ```bash
   # Run full test suite
   pytest tests/ -v

   # Run integration tests
   pytest tests/test_sdk_integration.py -v

   # Run performance benchmarks
   python scripts/benchmark_performance.py --iterations 10

   # Validate compatibility
   python scripts/validate_compatibility.py
   ```

3. **Deploy to Green**
   ```bash
   # Start server in green environment
   gunicorn server:app --workers 4 --bind 0.0.0.0:5001

   # Health check
   curl http://green-server:5001/health
   ```

4. **Smoke Testing**
   ```bash
   # Test CLI
   python main.py data/sample_leads.csv --no-slack

   # Test API
   curl -X POST http://green-server:5001/process \
     -H "Content-Type: application/json" \
     -d '{"leads":[{"email":"test@example.com","name":"Test","company":"Co"}]}'

   # Test Slack integration (if applicable)
   # Send test message in Slack channel
   ```

5. **Switch Traffic**
   ```bash
   # Update load balancer to point to green
   # Monitor for errors

   # If successful, green becomes blue
   # Keep old blue for 24h in case of rollback
   ```

### Strategy 2: Rolling Deployment

**Best for**: Multi-server deployments with gradual rollout

**Steps:**

1. **Deploy to 10% of servers**
   ```bash
   # Deploy to canary servers (10% of fleet)
   # Monitor metrics: latency, error rate, memory
   ```

2. **Monitor Canary**
   ```bash
   # Watch logs
   tail -f /var/log/app/server.log | grep ERROR

   # Check metrics
   # - Response time < 5s
   # - Error rate < 1%
   # - Memory usage stable
   ```

3. **Gradual Rollout**
   ```bash
   # If canary stable for 2 hours:
   # - Deploy to 25% of servers
   # - Monitor for 1 hour
   # - Deploy to 50% of servers
   # - Monitor for 1 hour
   # - Deploy to 100% of servers
   ```

### Strategy 3: Feature Flag Rollout

**Best for**: Deploying code without activating new features

**Steps:**

1. **Deploy with SDK Disabled**
   ```bash
   # Set in .env
   USE_SDK_AGENT=false

   # Deploy to all servers
   # Existing functionality continues unchanged
   ```

2. **Enable for Subset**
   ```bash
   # Enable SDK for internal testing
   # Update environment on specific servers:
   USE_SDK_AGENT=true

   # Monitor closely
   ```

3. **Gradual Activation**
   ```bash
   # Enable for 10% of requests
   # Enable for 50% of requests
   # Enable for 100% of requests
   ```

---

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:5000/health')"

# Start server
CMD ["gunicorn", "server:app", "--workers", "4", "--bind", "0.0.0.0:5000", "--timeout", "120"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - NOTION_API_KEY=${NOTION_API_KEY}
      - REDIS_URL=redis://redis:6379
      - USE_SDK_AGENT=true
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

volumes:
  redis_data:
```

### Deploy with Docker

```bash
# Build image
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f app

# Health check
curl http://localhost:5000/health

# Scale workers
docker-compose up -d --scale app=4
```

---

## ☁️ Cloud Platform Deployment

### AWS Elastic Beanstalk

```bash
# Initialize EB
eb init -p python-3.10 project3-lead-processor

# Create environment
eb create production-env \
  --instance-type t3.medium \
  --envvars OPENAI_API_KEY=$OPENAI_API_KEY,USE_SDK_AGENT=true

# Deploy
eb deploy

# Monitor
eb health
eb logs
```

### Heroku

```bash
# Create app
heroku create project3-lead-processor

# Set Python version
echo "python-3.10" > runtime.txt

# Configure buildpack
heroku buildpacks:set heroku/python

# Set environment variables
heroku config:set OPENAI_API_KEY=$OPENAI_API_KEY
heroku config:set USE_SDK_AGENT=true

# Add Redis
heroku addons:create heroku-redis:mini

# Deploy
git push heroku main

# Monitor
heroku logs --tail
```

### Google Cloud Run

```bash
# Build container
gcloud builds submit --tag gcr.io/PROJECT_ID/project3-app

# Deploy
gcloud run deploy project3-app \
  --image gcr.io/PROJECT_ID/project3-app \
  --platform managed \
  --region us-central1 \
  --set-env-vars USE_SDK_AGENT=true

# Monitor
gcloud run logs tail
```

---

## 🔒 Security Hardening

### Environment Variables

```bash
# NEVER commit .env to git
echo ".env" >> .gitignore

# Use secrets management
# AWS: AWS Secrets Manager
# Google: Google Secret Manager
# Azure: Azure Key Vault
# Heroku: Heroku Config Vars
```

### HTTPS/SSL

```bash
# Using Nginx as reverse proxy
server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Rate Limiting

```python
# Install: pip install flask-limiter
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

@app.route("/process", methods=["POST"])
@limiter.limit("10 per minute")
def process_leads():
    # ...
```

---

## 📊 Monitoring & Logging

### Application Monitoring

**Recommended Tools:**
- Datadog
- New Relic
- Sentry
- Prometheus + Grafana

**Key Metrics to Monitor:**

1. **Performance**
   - Request latency (p50, p95, p99)
   - Throughput (requests/second)
   - Error rate

2. **Resources**
   - CPU usage
   - Memory usage
   - Redis connections
   - OpenAI API quota

3. **Business Metrics**
   - Leads processed per hour
   - Validation success rate
   - Notion sync success rate

### Logging Configuration

```python
# server.py
import logging
from logging.handlers import RotatingFileHandler

# Configure logging
if not app.debug:
    file_handler = RotatingFileHandler(
        'logs/app.log',
        maxBytes=10240000,
        backupCount=10
    )
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)

    app.logger.setLevel(logging.INFO)
    app.logger.info('Lead Processor startup')
```

### Centralized Logging

```bash
# Ship logs to centralized service
# Options: CloudWatch, Splunk, ELK Stack

# Example: CloudWatch Logs
pip install watchtower

# In server.py:
import watchtower
handler = watchtower.CloudWatchLogHandler()
app.logger.addHandler(handler)
```

---

## 🔄 Rollback Procedures

### Immediate Rollback (< 5 minutes)

**If critical issues detected:**

```bash
# Option 1: Feature flag rollback
# Set environment variable:
USE_SDK_AGENT=false

# Restart servers
systemctl restart app
# OR
docker-compose restart app
# OR
heroku restart

# Verify
curl http://api.example.com/health
```

**Expected Result:**
- System reverts to legacy agent
- All existing functionality preserved
- Zero data loss

### Blue-Green Rollback

```bash
# Switch load balancer back to blue environment
# (previous stable version)

# Monitor for stability

# Keep green for investigation
```

### Docker Rollback

```bash
# List recent images
docker images

# Roll back to previous image
docker tag project3:previous project3:latest
docker-compose up -d

# Or roll back entire stack
docker-compose down
git checkout <previous-commit>
docker-compose up -d
```

---

## 🧪 Post-Deployment Validation

### Smoke Tests

```bash
# 1. Health check
curl http://api.example.com/health
# Expected: {"status": "healthy", ...}

# 2. Process single lead
curl -X POST http://api.example.com/process \
  -H "Content-Type: application/json" \
  -d '{"leads":[{"email":"test@example.com","name":"Test","company":"Co"}]}'
# Expected: 200 OK with results

# 3. Process CSV
curl -X POST http://api.example.com/process/csv \
  -F "file=@data/sample_leads.csv"
# Expected: 200 OK with processing results

# 4. Slack integration (if configured)
# Send: "add lead: test@example.com Test User, Test Co"
# Expected: Bot response with lead classification

# 5. Conversational mode (if SDK enabled)
# Send: "How many leads today?"
# Expected: Bot response with statistics
```

### Monitoring Checklist (First 24 Hours)

- [ ] Error rate < 1%
- [ ] Response time < 5s (95th percentile)
- [ ] Memory usage stable
- [ ] No Redis connection errors
- [ ] OpenAI API calls within quota
- [ ] Notion sync success rate > 95%
- [ ] Slack notifications working

---

## 📞 Incident Response

### Severity Levels

**P0 - Critical**
- Service completely down
- Data loss occurring
- Response: Immediate rollback

**P1 - High**
- Partial service degradation
- High error rate (>10%)
- Response: Investigate + rollback if not fixed in 30min

**P2 - Medium**
- Minor feature not working
- Performance degradation
- Response: Fix in next deploy

### Escalation Path

1. **On-call engineer** - First responder
2. **Engineering lead** - If not resolved in 30min
3. **CTO** - If customer-facing impact

### Runbook

**Symptom: High error rate**
```bash
# Check logs
tail -f logs/app.log | grep ERROR

# Check Redis connection
redis-cli ping

# Check OpenAI API quota
# Review API dashboard

# If Redis issue: restart Redis
# If OpenAI quota: reduce rate
# If unknown: rollback
```

**Symptom: Slow response times**
```bash
# Check resource usage
top
free -h

# Check OpenAI API latency
# Review API logs

# Scale up workers if needed
gunicorn --workers 8 ...

# Or rollback if persistent
```

---

## 📚 Additional Resources

- [README.md](./README.md) - Project overview
- [PHASE3_COMPLETION_SUMMARY.md](./PHASE3_COMPLETION_SUMMARY.md) - Integration details
- [PHASE4_COMPLETION_SUMMARY.md](./PHASE4_COMPLETION_SUMMARY.md) - Conversational mode
- [PHASE3_TESTING.md](./PHASE3_TESTING.md) - Testing guide

---

## ✅ Deployment Sign-Off

**Before marking deployment complete, verify:**

- [ ] All smoke tests passing
- [ ] Monitoring dashboards showing healthy metrics
- [ ] On-call team briefed
- [ ] Rollback plan tested and ready
- [ ] Documentation updated
- [ ] Stakeholders notified

**Deployment Approval:**
- Engineer: _______________
- Lead: _______________
- Date: _______________

---

**Last Updated**: December 21, 2025
**Version**: 1.0.0
