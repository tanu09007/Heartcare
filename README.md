# HeartCare

HeartCare is a healthcare tracking web application for patients and doctors. Patients can record health measurements, review trends and history, and share wound photos. Doctors can review assigned patients' records and add clinical notes.

> **Important:** HeartCare is a project application, not a medical device or a substitute for professional medical advice. Do not use demo data for clinical decisions. Protect patient information and credentials; configure access controls and privacy safeguards before any real-world use.

## Features

### Patient

- Register and sign in as a patient.
- Record blood pressure, pulse (heart rate), and body weight together in one submission.
- View measurement history and daily trend charts.
- Upload and view wound photos, with optional notes, within Health History.
- View the latest measurements and wound-photo count on the dashboard.

### Doctor

- Register and sign in as a doctor.
- View patients assigned to the signed-in doctor.
- Review assigned patients' health records and wound photos.
- Add and review doctor notes.
- See a review alert when the latest recorded weight is at least 20 kg above the previous recorded weight. This comparison is based on consecutive records; it is not connected to an operation date.

## Technology

- **Frontend:** React, Vite, JavaScript, CSS
- **Backend:** Node.js, Express
- **Database:** MongoDB with Mongoose
- **Authentication:** JSON Web Tokens (JWT), bcrypt password hashing
- **Uploads:** Multer; image files are stored under `backend/uploads`

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- A MongoDB connection string (local MongoDB or MongoDB Atlas)

## Run locally

### 1. Configure the backend

Create `backend/.env` with your own development values:

```env
MONGO_URI=mongodb://127.0.0.1:27017/heartcare
JWT_SECRET=replace-with-a-long-random-secret
PORT=5000
```

For MongoDB Atlas, use the connection string supplied by your Atlas project instead of the local example. Ensure your network/IP access rules allow the development machine to connect. Never commit `.env` files or share database credentials.

The backend accepts browser requests from `http://localhost:5173` and `http://127.0.0.1:5173`.

### 2. Install dependencies

Open a terminal in the project root and install backend and frontend dependencies separately:

```sh
cd backend
npm install
```

In a second terminal:

```sh
cd frontend
npm install
```

### 3. Start the application

Start the backend from the `backend` directory:

```sh
npm run dev
```

Start the frontend from the `frontend` directory:

```sh
npm run dev
```

Open the Vite URL shown in the frontend terminal (normally `http://localhost:5173`).

## API overview

All API routes are prefixed with `/api`. Authenticated requests use:

```http
Authorization: Bearer <JWT>
```

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Create a patient or doctor account |
| `POST` | `/api/auth/login` | Public | Sign in and receive a JWT |
| `POST` | `/api/health/measurements` | Patient | Save entered measurements as one health record |
| `POST` | `/api/health/blood-pressure` | Patient | Save blood pressure |
| `POST` | `/api/health/heart-rate` | Patient | Save heart rate |
| `POST` | `/api/health/weight` | Patient | Save body weight |
| `GET` | `/api/health/history` | Patient | Read the signed-in patient's health history |
| `POST` | `/api/health/wound-photo` | Patient | Upload a wound photo and optional notes |
| `GET` | `/api/health/wound-photos` | Patient | List the signed-in patient's wound photos |
| `GET` | `/api/doctor/patients` | Doctor | List patients assigned to the signed-in doctor |
| `GET` | `/api/doctor/patients/:patientId/records` | Assigned doctor | Read an assigned patient's health records |
| `GET` | `/api/doctor/patients/:patientId/wound-photos` | Assigned doctor | List an assigned patient's wound photos |
| `POST` | `/api/doctor/patients/:patientId/notes` | Assigned doctor | Add a doctor note |
| `GET` | `/api/doctor/patients/:patientId/notes` | Assigned doctor | Read notes for an assigned patient |
| `GET` | `/api/profile/me` | Authenticated user | Read the signed-in user's profile |
| `PUT` | `/api/profile/me` | Authenticated user | Update the signed-in user's profile |

Wound uploads accept JPG, PNG, and WEBP images up to 5 MB. Image retrieval uses authenticated routes.

## Project structure

```text
backend/
  config/          MongoDB connection
  middleware/      JWT authentication middleware
  models/          User, health record, wound image, and doctor note models
  routes/          Authentication, health, doctor, and profile API routes
  uploads/         Uploaded wound images
  server.js        Express application entry point
frontend/
  public/          Static assets
  src/             React application and styles
  index.html       Vite HTML entry point
```

## Validation

Run the frontend lint and production build from `frontend`:

```sh
npm run lint
npm run build
```

The backend package does not currently define an automated test suite.

## Data and privacy

- Passwords are hashed before storage; JWTs are kept by the frontend for authenticated API requests.
- Use a dedicated development database and fictional records while evaluating the application.
- Do not put database credentials, JWT secrets, real patient information, or demo account passwords in source control.
- Uploaded wound images are stored on the backend host's filesystem. Configure appropriate retention, access controls, backups, and secure hosting before deployment.
