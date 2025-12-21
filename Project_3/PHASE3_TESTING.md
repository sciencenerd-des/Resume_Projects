# Phase 3 Testing & Deployment Guide

## Overview

Phase 3 (Integration & Compatibility) is **code-complete** and tested in Python 3.9 environment with automatic fallback to legacy agent.

## Current Status

✅ **Implementation Complete**
- Legacy adapter created and tested
- server.py updated with feature flag and conditional imports
- main.py updated with feature flag and conditional imports
- .env.example updated with USE_SDK_AGENT flag
- README.md updated with rollback instructions
- Unit tests created for legacy adapter
- Validation script created
- Enhanced SDK orchestrator result parsing implemented

✅ **Python 3.9 Compatibility**
- Automatic fallback to legacy agent when SDK import fails
- Graceful error handling with user-friendly warnings
- Both main.py and server.py support conditional imports

⏳ **Requires Python 3.10+ Environment for SDK Testing**
- OpenAI Agents SDK v0.6.4 requires Python 3.10+
- Uses union type syntax (`type | None`) not available in Python 3.9
- Full SDK testing pending environment upgrade

## Testing Checklist

### ✅ Completed in Python 3.9

- [x] Legacy agent imports successfully
- [x] Legacy agent processes leads correctly
- [x] Feature flag `USE_SDK_AGENT=false` works correctly
- [x] Feature flag `USE_SDK_AGENT=true` falls back to legacy in Python 3.9
- [x] Automatic fallback with warning message
- [x] main.py works with both flags
- [x] Legacy adapter unit tests created
- [x] Validation script created (runnable in Python 3.10+)

### ⏳ Pending in Python 3.10+ Environment

#### SDK Agent Testing

- [ ] SDK agent imports successfully in Python 3.10+
- [ ] SDK orchestrator creates all 6 specialized agents
- [ ] SDK agent processes sample CSV file
- [ ] SDK result parsing extracts all legacy format fields:
  - [ ] status
  - [ ] csv_path
  - [ ] steps
  - [ ] valid_leads, invalid_leads, validation_errors
  - [ ] scored_leads, score_stats
  - [ ] notion_results
  - [ ] report
- [ ] Legacy adapter converts SDK results correctly
- [ ] Feature flag `USE_SDK_AGENT=true` uses SDK agent

#### Integration Testing

- [ ] **CLI Testing** (`main.py`):
  - [ ] `python main.py data/sample_leads.csv` works with SDK
  - [ ] `--export-csv` flag produces same CSV structure
  - [ ] `--export-pdf` flag produces same PDF structure
  - [ ] `--quiet` flag works
  - [ ] `--no-slack` flag works
  - [ ] `--enable-ai` flag works

- [ ] **Server Testing** (`server.py`):
  - [ ] `POST /process` with JSON payload
  - [ ] `POST /process/csv` with file upload
  - [ ] `POST /slack/command` slash command
  - [ ] `POST /slack/events` with "add lead:" trigger
  - [ ] `POST /slack/events` with "add leads:" file trigger
  - [ ] `POST /slack/events` with file_shared event

- [ ] **Backward Compatibility**:
  - [ ] Run `scripts/validate_compatibility.py`
  - [ ] Compare legacy vs SDK results field-by-field
  - [ ] Verify identical lead counts
  - [ ] Verify identical score distributions
  - [ ] Verify identical report format

#### Performance Testing

- [ ] Measure SDK pipeline latency vs legacy
- [ ] Monitor API call counts (should be similar)
- [ ] Track memory usage
- [ ] Verify no significant regression (target: <20% increase)

## Environment Setup for Python 3.10+ Testing

### Option 1: Upgrade Current Environment

```bash
# Check current Python version
python --version

# If 3.9, upgrade to 3.10+
# macOS (using Homebrew):
brew install python@3.10

# Create new virtual environment with Python 3.10
python3.10 -m venv .venv310
source .venv310/bin/activate

# Install dependencies
pip install -r requirements.txt

# Verify SDK imports
python -c "from agents import Agent; print('✅ SDK imports successfully')"
```

### Option 2: Use Docker

```bash
# Create Dockerfile
cat > Dockerfile.test <<EOF
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD ["python", "main.py", "data/sample_leads.csv"]
EOF

# Build and test
docker build -f Dockerfile.test -t project3-test .
docker run --env-file .env project3-test
```

### Option 3: Use pyenv

```bash
# Install Python 3.10
pyenv install 3.10.15

# Set local Python version
cd Project_3
pyenv local 3.10.15

# Create new virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Test Execution

### 1. Unit Tests

```bash
# Run legacy adapter tests
pytest tests/test_legacy_adapter.py -v

# Run all tests
pytest -v

# With coverage
pytest --cov=src tests/
```

### 2. Compatibility Validation

```bash
# Run validation script (requires Python 3.10+)
python scripts/validate_compatibility.py

# Expected output:
# ✅ VALIDATION PASSED - Results match perfectly!
```

### 3. CLI Testing

```bash
# Test with SDK agent (Python 3.10+)
USE_SDK_AGENT=true python main.py data/sample_leads.csv

# Test with legacy agent
USE_SDK_AGENT=false python main.py data/sample_leads.csv

# Compare outputs (should be identical except for timing)
```

### 4. Server Testing

```bash
# Start server (Python 3.10+)
python server.py

# In another terminal, test endpoints:

# Test JSON processing
curl -X POST http://localhost:5000/process \
  -H "Content-Type: application/json" \
  -d '{"leads":[{"email":"test@example.com","name":"Test User","company":"Test Co"}]}'

# Test CSV upload
curl -X POST http://localhost:5000/process/csv \
  -F "file=@data/sample_leads.csv"
```

## Known Issues

### Python 3.9 Environment

❌ **Issue**: Cannot run SDK agents in Python 3.9
- **Root Cause**: OpenAI Agents SDK v0.6.4 uses Python 3.10+ union type syntax
- **Impact**: SDK agent cannot be tested until Python upgrade
- **Workaround**: Automatic fallback to legacy agent with warning message
- **Status**: By design - system gracefully handles this

✅ **Mitigation**: Feature flag allows instant rollback
- Set `USE_SDK_AGENT=false` to use legacy agent
- No code changes required
- Both main.py and server.py support this

### Import Order

✅ **Fixed**: SDK imports are now conditional
- Only imported if `USE_SDK_AGENT=true`
- Wrapped in try/except to catch TypeError and ImportError
- Automatic fallback with user-friendly warning

## Rollback Procedure

If issues arise in production with SDK agent:

1. **Immediate Rollback** (no code changes):
   ```bash
   # Set environment variable
   export USE_SDK_AGENT=false

   # Or in .env file:
   USE_SDK_AGENT=false

   # Restart server
   kill -HUP $SERVER_PID  # or restart process
   ```

2. **Verify Rollback**:
   ```bash
   # Check logs for confirmation
   # Expected: "[DEBUG] Creating legacy agent (USE_SDK_AGENT=false)"
   ```

3. **Test Legacy Agent**:
   ```bash
   # Verify leads still process correctly
   python main.py data/sample_leads.csv --quiet
   ```

## Deployment Recommendations

### Staging Deployment

1. Deploy to staging with `USE_SDK_AGENT=false` first
2. Verify all existing functionality works
3. Upgrade Python to 3.10+ on staging
4. Enable SDK with `USE_SDK_AGENT=true`
5. Run full test suite
6. Monitor for 24 hours

### Production Deployment

**Option A: Safe Rollout** (Recommended)
1. Deploy code with `USE_SDK_AGENT=false` (legacy agent)
2. Monitor for 48 hours to ensure no regressions
3. Upgrade Python to 3.10+ during maintenance window
4. Enable SDK with `USE_SDK_AGENT=true`
5. Monitor closely for 72 hours
6. Keep rollback plan ready

**Option B: All-at-Once**
1. Schedule maintenance window
2. Upgrade Python to 3.10+
3. Deploy code with `USE_SDK_AGENT=true`
4. Run integration tests
5. Monitor for issues
6. Rollback to `USE_SDK_AGENT=false` if needed

## Success Criteria

Phase 3 is considered **successfully deployed** when:

- ✅ All unit tests pass in Python 3.10+
- ✅ `scripts/validate_compatibility.py` shows 100% match
- ✅ All CLI commands produce identical results to legacy
- ✅ All server endpoints return identical responses to legacy
- ✅ Performance is within 20% of legacy
- ✅ Rollback flag works instantly
- ✅ No breaking changes for existing integrations

## Next Steps

### Immediate (Before Phase 4)

1. **Upgrade to Python 3.10+** in development environment
2. **Run full test suite** with SDK enabled
3. **Fix any issues** discovered during testing
4. **Document performance benchmarks**
5. **Deploy to staging** for validation

### Future (Phase 4)

- Implement Slack Sessions (Conversational Mode)
- Add Redis session storage
- Enable multi-turn conversations
- Add conversational detection to server.py

## Contact

For issues or questions about Phase 3:
- Check TROUBLESHOOTING.md for common issues
- Review server logs for error details
- Test with `USE_SDK_AGENT=false` to isolate SDK issues
