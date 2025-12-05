# CI/CD Pipeline

## Overview

This project uses GitHub Actions for continuous integration and continuous deployment.

## Workflows

### CI Workflow (`ci.yml`)

Runs on every push and pull request to `main` and `develop` branches.

**Jobs:**

1. **Test Job**
   - Sets up PostgreSQL, Redis, and RabbitMQ services
   - Installs Python dependencies
   - Runs Django migrations
   - Executes test suite using Django's test framework

2. **Lint Job**
   - Checks code quality using flake8
   - Enforces consistent code style

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop`

## Configuration Files

### `.flake8`
Located in `backend/.flake8`, configures code linting rules:
- Max line length: 127 characters
- Excludes: migrations, settings, virtual environments
- Ignores specific rules for better Django compatibility

### `pytest.ini`
Located in `backend/pytest.ini`, configures test execution:
- Uses development settings
- Disables migrations during tests for speed
- Verbose output with short tracebacks

## Running Locally

### Run Tests
```bash
cd backend
python manage.py test
```

### Run Linting
```bash
cd backend
flake8 .
```

### Run Tests with Pytest (optional)
```bash
cd backend
pytest
```

## GitHub Actions Secrets

No secrets are currently required for CI. When adding CD:

- `GITHUB_TOKEN` - Automatically provided by GitHub Actions
- Add deployment-specific secrets as needed (e.g., `RENDER_API_KEY`, `RAILWAY_TOKEN`)

## Future Enhancements

- [ ] Add code coverage reporting
- [ ] Add security scanning (Safety, Bandit)
- [ ] Add CD workflow for automated deployments
- [ ] Add Docker image building and pushing
- [ ] Add staging environment deployment
