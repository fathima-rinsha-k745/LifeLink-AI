
# 🩸 LifeLink AI


> **AI-Powered Blood Donor Matching & Emergency Response Platform**

LifeLink AI is an intelligent healthcare platform designed to reduce the time required to find compatible blood donors during medical emergencies. By combining Artificial Intelligence with automated donor matching and real-time notifications, the platform enables hospitals, patients, and coordinators to manage emergency blood requests quickly and efficiently.

---

## 📖 Project Overview

LifeLink AI enables requesters to submit emergency blood requests using **natural language** through **text or voice** in both **English and Malayalam**. Google Gemini AI analyzes the request, extracts structured information, and automatically creates a blood request.
The system intelligently searches the donor database, ranks compatible donors based on multiple criteria, and sends notifications until a donor accepts the request. Coordinators can monitor the complete workflow through a centralized dashboard.

---

## 🎯 Project Objectives

- Reduce emergency response time through AI-powered automation.
- Automate blood donor matching.
- Support multilingual emergency requests.
- Provide voice-based emergency reporting.
- Improve donor communication through automated notifications.
- Track blood requests in real time.
- Build an intelligent healthcare platform using Artificial Intelligence.

---

##  User Roles

### 👤 Requester

- Submit emergency blood requests
- Voice and text input
- English & Malayalam support
- Blood-related AI Assistant
- Track live request status

---

### 🩸 Donor

- Register and Login
- Manage donor profile
- Update availability
- Receive emergency notifications
- Accept or Reject donation requests
- AI Assistant for blood donation queries

---

### 👨‍⚕️ Coordinator

- Manage donors
- Manage blood requests
- Monitor emergency workflow
- View AI Activity Logs
- Dashboard Analytics
- AI Assistant

---

## ✨ Core Features

### 🤖 AI Emergency Request Processing

- Natural Language Processing
- Voice Input Support
- English & Malayalam
- Automatic Blood Request Generation
- Structured Data Extraction

---

### 🩸 Intelligent Donor Matching

The AI ranks donors based on:

- Blood Group Compatibility
- Current Availability
- Nearest Location
- Last Donation Date

---

### 🔔 Automated Notification Workflow

- Notify the best matched donor
- Accept / Reject options
- Automatic timeout handling
- Notify the next suitable donor if required
- Live request status updates

---

### 📊 Dashboards

Separate dashboards for:

- Requester
- Donor
- Coordinator

---

### 💬 AI Blood Assistant

Users can ask questions such as:

- Which blood groups are compatible?
- Blood donation eligibility
- Available donors
- General blood donation guidance
- Platform-related queries

---

### 📑 AI Activity Logs

- AI request history
- Prompt tracking
- AI responses
- Confidence scores
- Processing logs

---

## 🤖 AI Workflow

```text
Requester

        │
        ▼

Voice / Text Input
(English / Malayalam)

        │
        ▼

Google Gemini AI

        │
        ▼

Extract Emergency Details

        │
        ▼

Generate Blood Request

        │
        ▼

Find Compatible Donors

        │
        ▼

Rank Donors

(Blood Group
Availability
Distance
Last Donation Date)

        │
        ▼

Send Notification

        │
        ▼

Donor Accepts?

     Yes          No / Timeout
      │               │
      ▼               ▼

Request       Notify Next
Completed   Suitable Donor
```

---

## 🏗️ System Architecture

```text
Requester
      │
      ▼
Voice / Text Input
      │
      ▼
Gemini AI
      │
      ▼
Information Extraction
      │
      ▼
Blood Request Creation
      │
      ▼
Donor Matching Engine
      │
      ▼
Notification Service
      │
      ▼
Donor Dashboard
      │
      ▼
Coordinator Dashboard
```

---

## 🗄️ Database Design

#### Main Tables

- Users
- Donors
- Blood Requests
- Notifications
- AI Intake Logs

#### Relationships

Requester
→ Blood Request

Blood Request
→ Notifications

Notifications
→ Donors

Blood Request
→ AI Intake Logs

---

## ⚙️ Technology Stack

#### Frontend

- React
- TypeScript
- Tailwind CSS
- Framer Motion
- Axios

#### Backend

- Python
- Django
- Django REST Framework

#### Database

- PostgreSQL
- Supabase

#### Artificial Intelligence

- Google Gemini API

#### Authentication

- JWT Authentication

#### Deployment

- Railway

#### Documentation

- Swagger
- MkDocs

#### Testing

- Pytest
- Coverage.py
- GitHub Actions

---

## 📚 API Documentation

Swagger UI

```text
/api/schema/swagger-ui/
```

Example Endpoints

```http
POST /api/register/
POST /api/login/
POST /api/ai-chat/
GET  /api/donors/
POST /api/blood-requests/
GET  /api/ai-logs/
```

---

## 📸 Project Screenshots


### Landing Page
![Landing Page](images/landing-page.png)

### Request portal
![ Request portal](images/request-portal.png)

### Live status
![Live status](images/live_status.png)

### Donor registration
![Donor registration](images/donor_registration.png)

### Donor's profile
![Donor profile](images/donor_profile.png)

### Emergency alerts for Donors
![emergency alerts](images/donor-dashboard.png)

### Donor AI assistant
![donor ai assistant](images/donor_ai_chat.png)

### Coordinator login
![coordinator login](images/coordinator_login.png)

### Coordinator dashboard
![coordinator dashboard](images/coordinator_dashbord.png)

### Coordinator's AI assistant
![Coordinator's AI assistant](images/coordinator_ai_assistant.png)

### Ai Logs
![AI logs](images/Ai_logs.png)ew

---

## 🧪 Testing

Run all tests:

```bash
pytest
```

Generate coverage report:

```bash
coverage run -m pytest
coverage report
coverage html
```

GitHub Actions automatically executes all tests on every push and pull request.

---

## 🚀 Deployment

| Component | Platform |
|-----------|----------|
| Frontend | Railway |
| Backend | Railway |
| Database | Supabase PostgreSQL |
| AI Service | Google Gemini API |

---

## 🔮 Future Enhancements

- Mobile Application
- SMS Notifications
- Email Notifications
- WhatsApp Integration
- GPS-based Donor Tracking
- Hospital Integration
- Blood Bank Integration
- Predictive AI Donor Recommendation

---

## 👩‍💻 Developer

**Fathima Rinsha K**

**Python Django & AI Developer Intern**

**ZLAQA AI Labs Pvt. Ltd.**

---

### 📄 License

This project was developed as part of the internship program at **ZLAQA AI Labs Pvt. Ltd.** for educational and demonstration purposes.