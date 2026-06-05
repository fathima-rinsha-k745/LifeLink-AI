# LifeLink AI – Intelligent Blood Donor Matching & Emergency Response Platform

## Problem Statement

During medical emergencies, patients often struggle to find blood donors quickly. Traditional methods rely on personal networks and social media, causing delays. LifeLink AI aims to provide a smart platform that matches donors and recipients efficiently using AI-powered recommendations and urgency analysis.

## Target Users

* Blood Donors
* Patients and Recipients
* Hospitals
* Blood Banks
* Administrators

## MVP Features

### 1. User Registration & Login

Users can create accounts and securely log in.

### 2. Donor Profile Management

Donors can register their blood group, location, and availability.

### 3. Blood Request Creation

Recipients can create emergency blood requests.

### 4. AI-Based Donor Matching

The system recommends suitable donors based on blood group and location.

### 5. Emergency Notification Generator

AI generates emergency request messages for rapid sharing.

## Tech Stack

### Backend

* Python
* Django REST Framework

### Database

* Supabase PostgreSQL

### Authentication

* JWT Authentication

### AI Integration

* OpenAI API / Claude API

### Documentation

* Swagger/OpenAPI

### Deployment

* Railway

## Data Model Sketch

### Users

* id
* name
* email
* phone
* password

### Donors

* id
* user_id
* blood_group
* location
* availability_status

### BloodRequests

* id
* requester_id
* blood_group
* units_required
* hospital_name
* urgency_level
* status

### Matches

* id
* request_id
* donor_id
* match_score

## Relationships

User → Donor (1:1)

User → BloodRequest (1:M)

BloodRequest → Matches (1:M)

Donor → Matches (1:M)
