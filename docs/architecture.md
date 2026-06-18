flowchart TD

    A[User / Hospital Staff] --> B[React Frontend]

    B --> C[Django REST API]

    C --> D[JWT Authentication]

    C --> E[Gemini AI Service]

    E --> F[Extract Structured Data]

    F --> G[Validation Layer]

    G --> H[Blood Request Storage]

    H --> I[(Supabase PostgreSQL)]

    G --> J[AI Intake Logs]

    J --> I

    H --> K[Donor Matching Engine]

    K --> L[Donor Database]

    L --> I

    K --> M[Matched Donors]

    M --> C

    C --> B

    N[Swagger Documentation] --> C
    O[Postman Collection] --> C
    P[MkDocs Documentation] --> C

    Q[GitHub Actions CI/CD] --> C