# 🩸 LifeLink AI

AI-powered Blood Donor Matching and Emergency Response Platform

---

## 📖 Project Overview

LifeLink AI is an intelligent blood donor management platform designed to connect blood donors and recipients during emergency situations. The system leverages Artificial Intelligence to process emergency blood requests written in natural language and automatically convert them into structured data for donor matching.

The platform aims to reduce response time during medical emergencies and improve donor discovery through AI-assisted workflows.

---

## 🎯 Project Objectives

* Simplify emergency blood request creation
* Automate information extraction using AI
* Improve donor matching efficiency
* Maintain secure and structured donor records
* Provide API-driven healthcare support services

---

## ✨ Core Features

### 👤 User Management

* User Registration
* Secure Login & Authentication
* JWT Token-Based Access Control

### 🩸 Donor Management

* Donor Registration
* Blood Group Management
* Availability Tracking
* Location-Based Search

### 📋 Blood Request Management

* Create Blood Requests
* View Request Details
* Emergency Priority Handling

### 🤖 AI Emergency Intake

* Google Gemini AI Integration
* Natural Language Processing
* Automatic Data Extraction
* Structured JSON Generation
* Confidence Score Tracking

### 🔍 Donor Matching

* Blood Group Compatibility Checking
* Availability Filtering
* City-Based Matching
* Ranked Donor Recommendations

---

## 🏗️ System Architecture

```text
User
  ↓
Emergency Request
  ↓
Gemini AI Processing
  ↓
Structured Data Extraction
  ↓
Validation Layer
  ↓
Blood Request Storage
  ↓
AI Audit Logging
  ↓
Donor Matching Engine
  ↓
API Response
```

---

## ⚙️ Technology Stack

### Backend

* Python
* Django
* Django REST Framework

### Database

* Supabase PostgreSQL

### Artificial Intelligence

* Google Gemini API

### Tools

* Git
* GitHub
* Postman
* Swagger (drf-spectacular)
* GitHub Actions
* MkDocs

---

## 🤖 AI Workflow

### Input

Emergency request entered in natural language.

Example:

"Patient Rajan needs 2 units of O negative blood urgently at Thrissur Medical College Hospital."

### Processing

Gemini AI extracts:

* Patient Name
* Blood Group
* Hospital
* City
* Urgency
* Contact Information

### Output

Structured JSON data is generated and validated before being stored in the database.

---

## 📚 API Documentation

Swagger UI:

```text
/api/schema/swagger-ui/
```

Local URL:

```text
http://127.0.0.1:8000/api/schema/swagger-ui/
```

---

## 🧪 Testing

Run all tests:

```bash
pytest
```

GitHub Actions automatically executes tests for every push and pull request.

---

## 🚀 Future Enhancements

* Real-time donor notifications
* Hospital dashboard integration
* Multi-language support
* SMS and Email alerts
* AI-powered donor prioritization
* Mobile application support

---

## 👩‍💻 Author

**Fathima Rinsha K**

Python Django & AI Developer Intern

ZLAQA AI Labs Pvt. Ltd.
