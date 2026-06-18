# 🤝 Contributing to LifeLink AI

<div align="center">

![Contributing](https://img.shields.io/badge/Contributions-Welcome-7C3AED?style=for-the-badge&logo=github&logoColor=white)
![PRs](https://img.shields.io/badge/PRs-Welcome-3ECF8E?style=for-the-badge&logo=git&logoColor=white)
![Code of Conduct](https://img.shields.io/badge/Code_of_Conduct-Enforced-EA4335?style=for-the-badge&logo=github&logoColor=white)

**Thank you for your interest in contributing to LifeLink AI!**
Every contribution — big or small — helps save lives. 🩸

</div>

---

## 📋 Table of Contents

- [Welcome](#-welcome)
- [Project Overview](#-project-overview)
- [Fork the Repository](#-fork-the-repository)
- [Clone the Repository](#-clone-the-repository)
- [Environment Setup](#-environment-setup)
- [Installing Dependencies](#-installing-dependencies)
- [Running the Project Locally](#-running-the-project-locally)
- [Running Tests](#-running-tests)
- [Branch Naming Conventions](#-branch-naming-conventions)
- [Commit Message Guidelines](#-commit-message-guidelines)
- [Pull Request Process](#-pull-request-process)
- [Coding Standards](#-coding-standards--best-practices)
- [Documentation Requirements](#-documentation-requirements)
- [Reporting Bugs](#-reporting-bugs)
- [Suggesting New Features](#-suggesting-new-features)
- [Code Review Expectations](#-code-review-expectations)
- [Community Guidelines](#-community-guidelines)
- [Contributors](#-contributors)

---

## 👋 Welcome

Welcome to **LifeLink AI** — an open platform built to connect blood donors with emergency recipients using the power of artificial intelligence. Whether you're fixing a typo, improving a feature, writing tests, or building something new, your contribution matters.

This guide will walk you through everything you need to get started — from forking the repository to getting your pull request merged. Please read it carefully before making your first contribution.

> 💡 **New to open source?** No worries. Start with issues labeled [`good first issue`](https://github.com/fathima-rinsha-k745/LifeLink-AI/issues?q=label%3A%22good+first+issue%22) or [`help wanted`](https://github.com/fathima-rinsha-k745/LifeLink-AI/issues?q=label%3A%22help+wanted%22).

---

## 🌟 Project Overview

| Field | Details |
|---|---|
| **Project** | LifeLink AI |
| **Description** | AI-Powered Blood Donor Matching & Emergency Response Platform |
| **Backend** | Python, Django, Django REST Framework |
| **Database** | Supabase PostgreSQL |
| **AI Integration** | Google Gemini AI |
| **Authentication** | JWT via `djangorestframework-simplejwt` |
| **API Docs** | Swagger (`drf-spectacular`), Postman, MkDocs |
| **Version Control** | Git & GitHub |
| **CI/CD** | GitHub Actions |

**Repository:** https://github.com/fathima-rinsha-k745/LifeLink-AI

---

## 🍴 Fork the Repository

Forking creates your own copy of the project under your GitHub account, where you can freely make changes without affecting the original.

1. Visit the repository: [LifeLink-AI](https://github.com/fathima-rinsha-k745/LifeLink-AI)
2. Click the **Fork** button in the top-right corner
3. Select your GitHub account as the destination
4. Wait for GitHub to create your fork

Your fork will be available at:
```
https://github.com/<your-username>/LifeLink-AI
```

---

## 📥 Clone the Repository

After forking, clone your copy to your local machine:

```bash
# Clone your fork
git clone https://github.com/<your-username>/LifeLink-AI.git

# Navigate into the project directory
cd LifeLink-AI
```

Set the original repository as the `upstream` remote so you can pull in future updates:

```bash
git remote add upstream https://github.com/fathima-rinsha-k745/LifeLink-AI.git

# Verify your remotes
git remote -v
# origin    https://github.com/<your-username>/LifeLink-AI.git (fetch)
# origin    https://github.com/<your-username>/LifeLink-AI.git (push)
# upstream  https://github.com/fathima-rinsha-k745/LifeLink-AI.git (fetch)
# upstream  https://github.com/fathima-rinsha-k745/LifeLink-AI.git (push)
```

---

## ⚙️ Environment Setup

### Prerequisites

Ensure the following are installed on your system:

| Tool | Minimum Version | Download |
|---|---|---|
| Python | 3.11+ | [python.org](https://python.org) |
| pip | Latest | Bundled with Python |
| Git | 2.x+ | [git-scm.com](https://git-scm.com) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| PostgreSQL client | — | Via Supabase (cloud) |

### Create a Virtual Environment

```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment
python -m venv venv

# Activate it
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows (Command Prompt)
# venv\Scripts\Activate.ps1     # Windows (PowerShell)
```

### Configure Environment Variables

Create a `.env` file inside the `backend/` directory:

```bash
cp .env.example .env
```

Then fill in your values:

```env
# Django
SECRET_KEY=your_django_secret_key_here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Supabase PostgreSQL
SUPABASE_DB_NAME=your_database_name
SUPABASE_DB_USER=your_database_user
SUPABASE_DB_PASSWORD=your_database_password
SUPABASE_DB_HOST=your_supabase_host_url
SUPABASE_DB_PORT=5432

# Google Gemini AI
GEMINI_API_KEY=your_google_gemini_api_key

# JWT
JWT_ACCESS_TOKEN_LIFETIME=60      # minutes
JWT_REFRESH_TOKEN_LIFETIME=1      # days
```

> ⚠️ **Never commit your `.env` file.** It is already listed in `.gitignore`. If you accidentally expose credentials, rotate them immediately.

---

## 📦 Installing Dependencies

### Backend

```bash
# Make sure your virtual environment is active
pip install -r requirements.txt
```

### Frontend

```bash
cd ../frontend
npm install
```

---

## ▶️ Running the Project Locally

### Backend

```bash
cd backend

# Apply database migrations
python manage.py migrate

# (Optional) Create a superuser for the admin panel
python manage.py createsuperuser

# Start the development server
python manage.py runserver
```

| Endpoint | URL |
|---|---|
| API root | http://127.0.0.1:8000/api/ |
| Admin panel | http://127.0.0.1:8000/admin/ |
| Swagger UI | http://127.0.0.1:8000/api/schema/swagger-ui/ |
| ReDoc | http://127.0.0.1:8000/api/schema/redoc/ |

### Frontend

```bash
cd frontend
npm start
```

Frontend available at: **http://localhost:3000/**

---

## 🧪 Running Tests

All contributions must pass existing tests. Write new tests for any feature or bug fix you introduce.

```bash
cd backend

# Run all tests
python manage.py test

# Run tests for a specific app
python manage.py test donors
python manage.py test blood_requests
python manage.py test ai_intake
python manage.py test authentication

# Run with detailed output
python manage.py test --verbosity=2

# Run with coverage report
pip install coverage
coverage run manage.py test
coverage report
coverage html        # Open htmlcov/index.html in your browser
```

> ✅ **Target:** Maintain a test coverage of **80% or above**. PRs that significantly reduce coverage will be asked to include additional tests.

---

## 🌿 Branch Naming Conventions

Always create a new branch from the latest `main`. Never work directly on `main` or `develop`.

```bash
# Sync with upstream before branching
git fetch upstream
git checkout main
git merge upstream/main

# Create your branch
git checkout -b <type>/<short-description>
```

### Branch name format

```
<type>/<short-description>
```

| Type | When to use | Example |
|---|---|---|
| `feature/` | New feature or enhancement | `feature/sms-donor-alerts` |
| `fix/` | Bug fix | `fix/ai-intake-validation-error` |
| `docs/` | Documentation changes only | `docs/update-api-endpoints` |
| `refactor/` | Code restructuring, no behavior change | `refactor/donor-matching-logic` |
| `test/` | Adding or fixing tests | `test/ai-intake-coverage` |
| `chore/` | Dependency updates, configs, CI | `chore/upgrade-django-5` |
| `hotfix/` | Critical production fix | `hotfix/jwt-token-expiry` |

---

## 📝 Commit Message Guidelines

This project follows the **Conventional Commits** specification.

### Format

```
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes only |
| `style` | Formatting, whitespace — no logic change |
| `refactor` | Code change that is not a fix or feature |
| `test` | Adding or updating tests |
| `chore` | Build process, dependency updates, CI config |
| `perf` | Performance improvement |

### Examples

```bash
# Good commit messages
git commit -m "feat(ai-intake): add Malayalam language support for Gemini AI parser"
git commit -m "fix(donors): resolve blood group compatibility filter returning empty results"
git commit -m "docs(readme): add architecture diagram to README"
git commit -m "test(auth): add unit tests for JWT token refresh endpoint"
git commit -m "chore(deps): upgrade djangorestframework to 3.15.1"

# Bad commit messages — avoid these
git commit -m "fixed stuff"
git commit -m "WIP"
git commit -m "changes"
git commit -m "update"
```

> 💡 Keep the summary line under **72 characters**. Use the body to explain *why*, not *what*.

---

## 🔃 Pull Request Process

### Before Submitting

- [ ] Your branch is up to date with `upstream/main`
- [ ] All existing tests pass (`python manage.py test`)
- [ ] New tests are written for your changes
- [ ] Code follows the project's style guide (PEP 8 / ESLint)
- [ ] Docstrings added to all new models, views, and serializers
- [ ] No `.env` or secrets are committed
- [ ] The PR description clearly explains the change

### Submitting

1. Push your branch to your fork:

```bash
git push origin feature/your-feature-name
```

2. Go to the original repository on GitHub
3. Click **Compare & pull request**
4. Fill in the PR template completely:
   - **Title:** Follow the same convention as commit messages
   - **Description:** What does this PR do? Why is it needed?
   - **Screenshots:** Include before/after for UI changes
   - **Related issues:** Reference with `Closes #123` or `Fixes #456`
5. Request a review from the maintainer
6. Do not merge your own PR — wait for approval

### PR Title Format

```
feat(scope): short description of change
fix(scope): short description of fix
```

### After Review

- Address all review comments with new commits (do not force-push unless asked)
- Once approved, the maintainer will squash-merge your PR

---

## 🧹 Coding Standards & Best Practices

### Python / Django

- Follow **PEP 8** style guide
- Use **4 spaces** for indentation (no tabs)
- Maximum line length: **100 characters**
- Use `snake_case` for variables, functions, and file names
- Use `PascalCase` for class names
- All functions and classes must have **docstrings**
- Avoid bare `except:` — always catch specific exceptions
- Use Django's ORM — avoid raw SQL unless absolutely necessary
- Keep views thin; business logic belongs in services or model methods

```python
# ✅ Good
def get_matching_donors(blood_group: str, city: str) -> QuerySet:
    """
    Return available donors matching the given blood group and city.

    Args:
        blood_group (str): Required blood group (e.g., 'O+').
        city (str): City where the donor should be located.

    Returns:
        QuerySet: Filtered donor queryset ordered by last donation date.
    """
    return Donor.objects.filter(
        blood_group=blood_group,
        city__iexact=city,
        is_available=True
    ).order_by('last_donation_date')


# ❌ Bad
def get_donors(bg, c):
    return Donor.objects.filter(blood_group=bg, city=c)
```

### JavaScript / React

- Follow **ESLint** rules configured in the project
- Use `camelCase` for variables and functions
- Use `PascalCase` for React components
- Prefer functional components with hooks over class components
- Always handle loading and error states in API calls

### General

- Write **self-documenting code** — variable names should explain intent
- Avoid magic numbers; use named constants
- Keep functions small and focused (single responsibility)
- Remove all `print()` / `console.log()` debug statements before committing
- Never hardcode credentials, API keys, or environment-specific values

---

## 📖 Documentation Requirements

Every contribution that changes or adds functionality must include corresponding documentation updates.

### Required for all PRs

- **Docstrings** on all new or modified models, views, serializers, and utility functions
- **Inline comments** for complex logic that isn't self-evident
- **README update** if the change affects setup, environment variables, or available endpoints

### Docstring format (Google style)

```python
class BloodRequest(models.Model):
    """
    Represents an emergency blood request submitted by a user.

    Attributes:
        patient_name (str): Full name of the patient.
        blood_group (str): Required blood group (e.g., 'O+', 'AB-').
        hospital (str): Name of the hospital where blood is needed.
        city (str): City of the hospital.
        urgency_level (str): One of 'low', 'medium', 'high', 'critical'.
        contact (str): Primary contact number for the requester.
        is_fulfilled (bool): True once a donor has been confirmed.
        created_at (datetime): Timestamp when the request was created.
    """
```

### API documentation

- All new endpoints must be described using `drf-spectacular` decorators (`@extend_schema`)
- Update the Postman collection and export the latest version to `docs/postman/`
- Update MkDocs pages under `docs/` if user-facing documentation is affected

---

## 🐛 Reporting Bugs

Found a bug? Please report it — you're helping make LifeLink AI better!

1. **Search first:** Check [existing issues](https://github.com/fathima-rinsha-k745/LifeLink-AI/issues) to avoid duplicates
2. **Open a new issue** using the Bug Report template
3. Include the following information:

```markdown
**Bug Summary**
A clear, concise description of the bug.

**Steps to Reproduce**
1. Go to '...'
2. Send request to '...'
3. See error

**Expected Behaviour**
What should happen.

**Actual Behaviour**
What actually happens.

**Screenshots / Logs**
Paste error logs or screenshots here.

**Environment**
- OS: [e.g. Ubuntu 22.04 / Windows 11]
- Python version: [e.g. 3.11.4]
- Django version: [e.g. 4.2.7]
- Browser (if frontend): [e.g. Chrome 124]
```

> 🔒 **Security vulnerabilities** should NOT be reported as public issues. Email the maintainer directly at **fathimarinshawork@gmail.com** with the subject line `[SECURITY] LifeLink AI`.

---

## 💡 Suggesting New Features

Have an idea that would make LifeLink AI better? We'd love to hear it!

1. **Search first:** Check [existing feature requests](https://github.com/fathima-rinsha-k745/LifeLink-AI/issues?q=label%3Aenhancement) to avoid duplicates
2. **Open a new issue** using the Feature Request template
3. Include the following:

```markdown
**Feature Summary**
A clear description of the feature you're proposing.

**Problem it Solves**
What problem does this address? Who benefits?

**Proposed Solution**
Describe how you envision this working.

**Alternatives Considered**
Any other approaches you thought of.

**Additional Context**
Mockups, references, or related issues.
```

> 💬 Features are discussed in the issue before implementation begins. Please wait for maintainer feedback before opening a PR for a new feature.

---

## 🔍 Code Review Expectations

### As a contributor

- Respond to review comments within **3 business days**
- Be open to feedback — reviews are about the code, not the person
- Explain your reasoning if you disagree with a suggestion
- Mark resolved conversations as resolved once addressed

### As a reviewer

- Be respectful, specific, and constructive
- Suggest improvements with examples where possible
- Distinguish between blocking issues and optional suggestions (use `nit:` prefix for minor style notes)
- Approve only when all blocking comments are resolved

### Review checklist

- [ ] Code is readable and well-structured
- [ ] Logic is correct and edge cases are handled
- [ ] Tests are present and meaningful
- [ ] Docstrings are complete and accurate
- [ ] No hardcoded secrets or debug code
- [ ] API changes are documented in Swagger and Postman
- [ ] No unnecessary dependencies added

---

## 🤝 Community Guidelines

We are committed to making LifeLink AI a welcoming and inclusive community for everyone.

### Be kind and respectful

- Use welcoming and inclusive language
- Respect differing viewpoints and experiences
- Accept constructive criticism graciously
- Focus on what is best for the community and the project

### Be professional

- Stay on topic in issues and PRs
- Do not spam, self-promote, or use the project for unrelated purposes
- Do not share anyone's personal information without their consent

### Zero tolerance for

- Harassment, discrimination, or hate speech of any kind
- Trolling or personal attacks
- Deliberate intimidation or threats

Violations may result in removal from the project. Please report concerns to **fathimarinshawork@gmail.com**.

This project is governed by the principles of the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

---

## 🌟 Contributors

A heartfelt thank you to everyone who has contributed to LifeLink AI — whether through code, documentation, bug reports, ideas, or feedback. Every contribution, no matter how small, brings us closer to the mission of saving lives through technology.

<div align="center">

[![Contributors](https://contrib.rocks/image?repo=fathima-rinsha-k745/LifeLink-AI)](https://github.com/fathima-rinsha-k745/LifeLink-AI/graphs/contributors)

</div>

Want to see your face here? [Make your first contribution](#-fork-the-repository) today!

---

<div align="center">

Built with ❤️ by [Fathima Rinsha K](https://github.com/fathima-rinsha-k745) and the LifeLink AI community

🩸 *Every contribution helps save a life.*

</div>