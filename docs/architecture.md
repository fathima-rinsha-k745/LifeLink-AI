flowchart TD

    subgraph Client Layer
        A[User]
        B[React Frontend]
    end

    subgraph API Layer
        C[Django REST API]
        D[JWT Authentication]
        K[Donor Matching Engine]
    end

    subgraph AI Layer
        E[Google Gemini AI]
        F[Emergency Request Parsing]
    end

    subgraph Database Layer
        G[Blood Requests]
        H[AI Intake Logs]
        I[(Supabase PostgreSQL)]
    end

    subgraph Documentation Layer
        J[Swagger UI]
        L[Postman Documentation]
        M[MkDocs Site]
    end

    subgraph CI/CD Layer
        N[GitHub Actions]
    end

    A --> B
    B --> C
    C --> D
    C --> E
    E --> F
    F --> G
    G --> I
    F --> H
    H --> I
    G --> K
    K --> I
    K --> B

    J --> C
    L --> C
    M --> C
    N --> C