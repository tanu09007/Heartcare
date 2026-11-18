
import { useCallback, useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5000/api";

function MetricTrendChart({ title, unit, dates, series }) {
  const width = 640;
  const height = 250;
  const padding = { top: 20, right: 18, bottom: 38, left: 48 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const values = series.flatMap(item => (
    dates.map(day => day[item.key]).filter(value => Number.isFinite(value))
  ));

  if (!dates.length || !values.length) {
    return (
      <section className="trend-card">
        <div className="trend-heading">
          <h3>{title}</h3>
          <span>{unit}</span>
        </div>
        <p className="trend-empty">No measurements recorded yet.</p>
      </section>
    );
  }

  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const range = dataMax - dataMin || Math.max(Math.abs(dataMin) * 0.1, 1);
  const min = Math.max(0, dataMin - range * 0.2);
  const max = dataMax + range * 0.2;
  const x = index => padding.left + (
    dates.length === 1 ? plotWidth / 2 : (index / (dates.length - 1)) * plotWidth
  );
  const y = value => padding.top + ((max - value) / (max - min)) * plotHeight;
  const yTicks = Array.from({ length: 5 }, (_, index) => (
    max - ((max - min) * index) / 4
  ));

  return (
    <section className="trend-card">
      <div className="trend-heading">
        <h3>{title}</h3>
        <span>{unit}</span>
      </div>
      <div className="trend-legend">
        {series.map(item => (
          <span key={item.key}>
            <i style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <svg
        className="trend-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${title} daily trend in ${unit}`}
      >
        {yTicks.map((tick, index) => {
          const tickY = padding.top + (index / 4) * plotHeight;
          return (
            <g key={index}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={tickY}
                y2={tickY}
                className="chart-gridline"
              />
              <text x={padding.left - 9} y={tickY + 4} className="chart-axis-label" textAnchor="end">
                {tick.toFixed(0)}
              </text>
            </g>
          );
        })}
        {series.map(item => {
          let drawing = false;
          const path = dates.map((day, index) => {
            const value = day[item.key];
            if (!Number.isFinite(value)) {
              drawing = false;
              return "";
            }
            const command = drawing ? "L" : "M";
            drawing = true;
            return `${command}${x(index)},${y(value)}`;
          }).join(" ");

          return (
            <g key={item.key}>
              <path d={path} fill="none" stroke={item.color} className="chart-line" />
              {dates.map((day, index) => (
                Number.isFinite(day[item.key]) && (
                  <circle
                    key={day.date}
                    cx={x(index)}
                    cy={y(day[item.key])}
                    r="4"
                    fill={item.color}
                  >
                    <title>{`${day.label}: ${day[item.key]} ${unit}`}</title>
                  </circle>
                )
              ))}
            </g>
          );
        })}
        {dates.map((day, index) => (
          <text
            key={day.date}
            x={x(index)}
            y={height - 12}
            className="chart-axis-label"
            textAnchor="middle"
          >
            {day.label}
          </text>
        ))}
      </svg>
    </section>
  );
}

function App() {
  // =========================
  // AUTHENTICATION
  // =========================

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(
    () => localStorage.getItem("token") || ""
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [role, setRole] = useState("patient");
  const [registrationRole, setRegistrationRole] = useState("patient");
  const [isRegister, setIsRegister] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // =========================
  // DASHBOARD
  // =========================

  const [activeTab, setActiveTab] = useState("overview");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // =========================
  // PATIENT HEALTH DATA
  // =========================

  const [records, setRecords] = useState([]);
  const [photos, setPhotos] = useState([]);

  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [weight, setWeight] = useState("");

  // =========================
  // WOUND PHOTOS
  // =========================

  const [photo, setPhoto] = useState(null);
  const [photoNotes, setPhotoNotes] = useState("");
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState("");

  // =========================
  // DOCTOR DASHBOARD
  // =========================

  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [doctorRecords, setDoctorRecords] = useState([]);
  const [doctorPhotos, setDoctorPhotos] = useState([]);
  const [doctorNotes, setDoctorNotes] = useState([]);
  const [newNote, setNewNote] = useState("");

  // =========================
  // API REQUEST
  // =========================

  const apiRequest = useCallback(async (endpoint, options = {}) => {
    const response = await fetch(`${API}${endpoint}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
        ...options.headers
      }
    });

    const contentType = response.headers.get("content-type") || "";

    const data = contentType.includes("application/json")
      ? await response.json()
      : null;

    if (!response.ok) {
      throw new Error(data?.message || "Something went wrong.");
    }

    return data;
  }, [token]);

  // =========================
  // AUTHENTICATION HANDLER
  // =========================

  async function handleAuth(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const endpoint = isRegister
        ? "/auth/register"
        : "/auth/login";
      const selectedRole = isRegister ? registrationRole : role;

      const body = isRegister
        ? {
            fullName,
            email,
            password,
            role: selectedRole,
            phone,
            age: age ? Number(age) : undefined,
            gender
          }
        : {
            email,
            password,
            role: selectedRole
          };

      const response = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed.");
      }

      if (isRegister) {
        if (data.user?.role !== selectedRole) {
          throw new Error("The server did not confirm the selected account role. Please try again.");
        }

        setRole(selectedRole);
        setIsRegister(false);
        setPassword("");
        setMessage(`${selectedRole === "patient" ? "Patient" : "Doctor"} account created. Please log in.`);
        return;
      }

      if (!data.token || !data.user) {
        throw new Error("Invalid server response.");
      }

      if (data.user.role !== role) {
        throw new Error("Please select the correct login role.");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setToken(data.token);
      setUser(data.user);
      setShowLanding(false);
      setActiveTab("overview");

    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  function openAuth(register = false) {
    if (register) {
      setRegistrationRole(role);
    }

    setIsRegister(register);
    setShowLanding(false);
    setMessage("");
  }

  // =========================
  // LOGOUT
  // =========================

  function handleLogout() {
    if (selectedPhotoUrl) {
      URL.revokeObjectURL(selectedPhotoUrl);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setToken("");
    setUser(null);
    setShowLanding(true);
    setActiveTab("overview");

    setRecords([]);
    setPhotos([]);

    setPatients([]);
    setSelectedPatient(null);
    setDoctorRecords([]);
    setDoctorPhotos([]);
    setDoctorNotes([]);

    setSelectedPhotoUrl("");
    setNewNote("");
    setMessage("");
  }

  // =========================
  // PATIENT HEALTH DATA
  // =========================

  const refreshHealthData = useCallback(async () => {
    try {
      const [historyData, photoData] = await Promise.all([
        apiRequest("/health/history"),
        apiRequest("/health/wound-photos")
      ]);

      setRecords(historyData.records || []);
      setPhotos(photoData.photos || []);

    } catch (error) {
      setMessage(error.message);
    }
  }, [apiRequest]);

  // Load patient data after login
  useEffect(() => {
    if (!token || user?.role !== "patient") return;

    let cancelled = false;

    async function loadData() {
      try {
        const [historyData, photoData] = await Promise.all([
          apiRequest("/health/history"),
          apiRequest("/health/wound-photos")
        ]);

        if (!cancelled) {
          setRecords(historyData.records || []);
          setPhotos(photoData.photos || []);
        }

      } catch (error) {
        if (!cancelled) {
          setMessage(error.message);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [token, user?.role, apiRequest]);

  // Save readings entered together as one health record.
  async function saveMeasurements(event) {
    event.preventDefault();
    const measurements = {};

    if (systolic || diastolic) {
      if (!systolic || !diastolic) {
        setMessage("Enter both systolic and diastolic blood pressure values.");
        return;
      }

      measurements.systolic = systolic;
      measurements.diastolic = diastolic;
    }

    if (heartRate) {
      measurements.heartRate = heartRate;
    }

    if (weight) {
      measurements.weight = weight;
    }

    if (Object.keys(measurements).length === 0) {
      setMessage("Enter at least one measurement to continue.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      await apiRequest("/health/measurements", {
        method: "POST",
        body: JSON.stringify(measurements)
      });

      setSystolic("");
      setDiastolic("");
      setHeartRate("");
      setWeight("");
      setMessage("Measurements saved successfully.");
      await refreshHealthData();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // UPLOAD WOUND PHOTO
  // =========================

  async function uploadWoundPhoto(event) {
    event.preventDefault();

    if (!photo) {
      setMessage("Please select a wound photo.");
      return;
    }

    const formData = new FormData();

    formData.append("photo", photo);
    formData.append("notes", photoNotes);

    setLoading(true);
    setMessage("");

    try {
      await apiRequest("/health/wound-photo", {
        method: "POST",
        body: formData
      });

      setPhoto(null);
      setPhotoNotes("");

      event.target.reset();

      setMessage("Wound photo uploaded successfully!");

      await refreshHealthData();

    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // CLOSE WOUND PHOTO
  // =========================

  function closeWoundPhoto() {
    setSelectedPhotoUrl(previous => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }

      return "";
    });
  }

  // =========================
  // PATIENT VIEWS OWN PHOTO
  // =========================

  async function viewWoundPhoto(item) {
    try {
      const response = await fetch(
        `${API}/health/wound-photo/${item._id}/image`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error("Unable to display wound photo.");
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);

      setSelectedPhotoUrl(previous => {
        if (previous) URL.revokeObjectURL(previous);
        return imageUrl;
      });

    } catch (error) {
      setMessage(error.message);
    }
  }

  // =========================
  // DOCTOR PATIENT LIST
  // =========================

  const loadPatients = useCallback(async () => {
    try {
      const data = await apiRequest("/doctor/patients");

      setPatients(data.patients || []);

    } catch (error) {
      setMessage(error.message);
    }
  }, [apiRequest]);

  // Load patients after doctor login
  useEffect(() => {
    if (!token || user?.role !== "doctor") return;

    let cancelled = false;

    async function loadData() {
      try {
        const data = await apiRequest("/doctor/patients");

        if (!cancelled) {
          setPatients(data.patients || []);
        }

      } catch (error) {
        if (!cancelled) {
          setMessage(error.message);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [token, user?.role, apiRequest]);

  // =========================
  // DOCTOR PATIENT DETAILS
  // =========================

  async function loadPatientDetails(patient) {
    setSelectedPatient(patient);
    setActiveTab("patient-details");

    setDoctorRecords([]);
    setDoctorPhotos([]);
    setDoctorNotes([]);

    setMessage("");

    try {
      const [history, woundData, noteData] = await Promise.all([
        apiRequest(
          `/doctor/patients/${patient._id}/records`
        ),
        apiRequest(
          `/doctor/patients/${patient._id}/wound-photos`
        ),
        apiRequest(
          `/doctor/patients/${patient._id}/notes`
        )
      ]);

      setDoctorRecords(history.records || []);
      setDoctorPhotos(woundData.photos || []);
      setDoctorNotes(noteData.notes || []);

    } catch (error) {
      setMessage(error.message);
    }
  }

  // =========================
  // DOCTOR VIEWS WOUND PHOTO
  // =========================

  async function viewDoctorWoundPhoto(item) {
    try {
      const response = await fetch(
        `${API}/doctor/wound-photo/${item._id}/image`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error("Unable to display wound photo.");
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);

      setSelectedPhotoUrl(previous => {
        if (previous) URL.revokeObjectURL(previous);
        return imageUrl;
      });

    } catch (error) {
      setMessage(error.message);
    }
  }

  // =========================
  // DOCTOR ADDS NOTE
  // =========================

  async function saveDoctorNote(event) {
    event.preventDefault();

    if (!selectedPatient || !newNote.trim()) {
      setMessage("Please enter a doctor note.");
      return;
    }

    setLoading(true);

    try {
      await apiRequest(
        `/doctor/patients/${selectedPatient._id}/notes`,
        {
          method: "POST",
          body: JSON.stringify({
            note: newNote
          })
        }
      );

      setNewNote("");
      setMessage("Doctor note saved successfully!");

      const data = await apiRequest(
        `/doctor/patients/${selectedPatient._id}/notes`
      );

      setDoctorNotes(data.notes || []);

    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // LATEST HEALTH VALUES
  // =========================

  const latestBP = records.find(
    record => record.bloodPressure
  );

  const latestHR = records.find(
    record => record.heartRate != null
  );

  const latestWeight = records.find(
    record => record.weight != null
  );

  const dailyMeasurementMap = new Map();
  records.forEach(record => {
    if (!record.recordedAt) return;
    const recordedDate = new Date(record.recordedAt);
    if (Number.isNaN(recordedDate.getTime())) return;

    const date = [
      recordedDate.getFullYear(),
      String(recordedDate.getMonth() + 1).padStart(2, "0"),
      String(recordedDate.getDate()).padStart(2, "0")
    ].join("-");
    const day = dailyMeasurementMap.get(date) || {
      date,
      timestamp: recordedDate.getTime(),
      systolicValues: [],
      diastolicValues: [],
      heartRateValues: [],
      weightValues: []
    };

    if (record.bloodPressure) {
      if (Number.isFinite(record.bloodPressure.systolic)) {
        day.systolicValues.push(record.bloodPressure.systolic);
      }
      if (Number.isFinite(record.bloodPressure.diastolic)) {
        day.diastolicValues.push(record.bloodPressure.diastolic);
      }
    }
    if (Number.isFinite(record.heartRate)) day.heartRateValues.push(record.heartRate);
    if (Number.isFinite(record.weight)) day.weightValues.push(record.weight);
    dailyMeasurementMap.set(date, day);
  });

  const dailyMeasurements = Array.from(dailyMeasurementMap.values())
    .sort((first, second) => first.timestamp - second.timestamp)
    .slice(-7)
    .map(day => {
      const average = values => values.length
        ? values.reduce((total, value) => total + value, 0) / values.length
        : null;
      return {
        date: day.date,
        label: new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric"
        }),
        systolic: average(day.systolicValues),
        diastolic: average(day.diastolicValues),
        heartRate: average(day.heartRateValues),
        weight: average(day.weightValues)
      };
    });

  const weightRecords = doctorRecords
    .filter(record => record.weight != null)
    .sort((first, second) => (
      new Date(first.recordedAt) - new Date(second.recordedAt)
    ));
  const latestWeightRecord = weightRecords[weightRecords.length - 1];
  const previousWeightRecord = weightRecords[weightRecords.length - 2];
  const latestWeightIncrease = latestWeightRecord && previousWeightRecord
    ? latestWeightRecord.weight - previousWeightRecord.weight
    : 0;
  const hasWeightAlert = latestWeightIncrease >= 20;

  // =========================
  // LOGIN / REGISTER SCREEN
  // =========================

  if (!user || !token) {
    if (showLanding) {
      return (
        <div className="landing-page">
          <header className="landing-header">
            <a className="brand-lockup" href="#home" aria-label="HeartCare home">
              <span className="brand-mark" aria-hidden="true">+</span>
              <span>HeartCare</span>
            </a>
            <nav aria-label="Main navigation">
              <a href="#care-tools">Care tools</a>
              <button className="button button-outline" onClick={() => openAuth(false)}>
                Sign in
              </button>
              <button className="button button-primary" onClick={() => openAuth(true)}>
                Get started
              </button>
            </nav>
          </header>

          <main id="home">
            <section className="landing-hero">
              <div className="hero-copy">
                <span className="eyebrow"><span aria-hidden="true">●</span> Care, connected</span>
                <h1>Better health tracking starts with a clearer picture.</h1>
                <p>
                  Keep your health measurements, wound updates, and care-team
                  notes together in one secure place.
                </p>
                <div className="hero-actions">
                  <button className="button button-primary" onClick={() => openAuth(true)}>
                    Create your account <span aria-hidden="true">→</span>
                  </button>
                  <button className="button button-text" onClick={() => openAuth(false)}>
                    Sign in to HeartCare
                  </button>
                </div>
                <div className="hero-assurance">
                  <span className="assurance-icon" aria-hidden="true">✓</span>
                  Designed for patients and care teams
                </div>
              </div>

              <div className="hero-visual" aria-label="HeartCare health overview preview">
                <div className="preview-card">
                  <div className="preview-heading">
                    <span className="preview-icon" aria-hidden="true">♥</span>
                    <div><strong>Health overview</strong><small>Your measurements, in one view</small></div>
                    <span className="status-dot" aria-label="Up to date" />
                  </div>
                  <div className="preview-metrics">
                    <div><span>Blood pressure</span><strong>— / — <small>mmHg</small></strong></div>
                    <div><span>Pulse</span><strong>— <small>bpm</small></strong></div>
                    <div><span>Body weight</span><strong>— <small>kg</small></strong></div>
                  </div>
                  <div className="preview-footer"><span aria-hidden="true">↗</span> Your care, clearly organized</div>
                </div>
                <div className="hero-orbit hero-orbit-one" />
                <div className="hero-orbit hero-orbit-two" />
              </div>
            </section>

            <section className="landing-features" id="care-tools">
              <div className="section-heading">
                <span className="eyebrow">One connected care space</span>
                <h2>Stay informed. Share what matters.</h2>
                <p>Simple tools support the care you already receive.</p>
              </div>
              <div className="feature-grid">
                <article className="feature-card">
                  <span className="feature-icon" aria-hidden="true">⌁</span>
                  <h3>Track key measurements</h3>
                  <p>Record blood pressure, pulse, and body weight, then review your history.</p>
                </article>
                <article className="feature-card">
                  <span className="feature-icon" aria-hidden="true">▧</span>
                  <h3>Share care updates</h3>
                  <p>Upload wound photos and notes for your care team to review.</p>
                </article>
                <article className="feature-card">
                  <span className="feature-icon" aria-hidden="true">✚</span>
                  <h3>Keep notes in context</h3>
                  <p>Doctors can review patient records and add notes in the dashboard.</p>
                </article>
              </div>
            </section>
          </main>
          <footer className="landing-footer">
            <a className="brand-lockup" href="#home"><span className="brand-mark" aria-hidden="true">+</span><span>HeartCare</span></a>
            <span>Supporting more connected care.</span>
          </footer>
        </div>
      );
    }

    return (
      <div className="auth-container">
        <div className="auth-card">
          <button className="back-link" type="button" onClick={() => {
            setShowLanding(true);
            setMessage("");
          }}>
            <span aria-hidden="true">←</span> Back to home
          </button>
          <div className="auth-brand"><span className="brand-mark" aria-hidden="true">+</span></div>
          <h1>Welcome to HeartCare</h1>
          <p className="auth-intro">Your health, thoughtfully connected.</p>

          {message && (
            <div className="message">
              {message}
            </div>
          )}

          <p className="role-selection-label">
            {isRegister ? "Create account as" : "Sign in as"}
          </p>
          <div className="role-selection" aria-label={isRegister ? "Account type" : "Login type"}>
            <button
              type="button"
              className={(isRegister ? registrationRole : role) === "patient" ? "selected" : ""}
              onClick={() => {
                if (isRegister) {
                  setRegistrationRole("patient");
                } else {
                  setRole("patient");
                }
              }}
              aria-pressed={(isRegister ? registrationRole : role) === "patient"}
            >
              Patient
            </button>

            <button
              type="button"
              className={(isRegister ? registrationRole : role) === "doctor" ? "selected" : ""}
              onClick={() => {
                if (isRegister) {
                  setRegistrationRole("doctor");
                } else {
                  setRole("doctor");
                }
              }}
              aria-pressed={(isRegister ? registrationRole : role) === "doctor"}
            >
              Doctor
            </button>
          </div>

          <h2>
            {isRegister
              ? `Create ${registrationRole === "doctor" ? "Doctor" : "Patient"} Account`
              : `${role === "doctor" ? "Doctor" : "Patient"} Login`}
          </h2>

          <form onSubmit={handleAuth}>

            {isRegister && (
              <>
                <input
                  type="text"
                  placeholder="Full Name"
                  aria-label="Full name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />

                <input
                  type="tel"
                  placeholder="Phone Number"
                  aria-label="Phone number"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />

                <input
                  type="number"
                  placeholder="Age"
                  aria-label="Age"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  min="1"
                />

                <select
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                  aria-label="Gender"
                >
                  <option value="">Select Gender</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </>
            )}

            <input
              type="email"
              placeholder="Email Address"
              aria-label="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                aria-label="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(value => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button
              type="submit"
              className="primary-btn"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : isRegister
                  ? `Create ${registrationRole === "doctor" ? "Doctor" : "Patient"} Account`
                  : "Login"}
            </button>

          </form>

          <p className="auth-switch">
            {isRegister
              ? "Already have an account?"
              : "Don't have an account?"}

            <button
              type="button"
              onClick={() => {
                if (isRegister) {
                  setRole(registrationRole);
                  setIsRegister(false);
                } else {
                  setRegistrationRole(role);
                  setIsRegister(true);
                }
                setMessage("");
                setPassword("");
              }}
            >
              {isRegister ? "Login" : "Register"}
            </button>
          </p>

        </div>
      </div>
    );
  }

  // =========================
  // MAIN DASHBOARD
  // =========================

  return (
    <div className="dashboard-container">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <h2 className="sidebar-logo">
          <span className="brand-mark" aria-hidden="true">+</span>
          HeartCare
        </h2>

        <div className="user-info">
          <h3>{user.fullName}</h3>
          <p>{user.role}</p>
        </div>

        <nav>

          <button
            className={activeTab === "overview" ? "nav-active" : ""}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>

          {user.role === "patient" && (
            <>
              <button
                className={activeTab === "measurements" ? "nav-active" : ""}
                onClick={() => setActiveTab("measurements")}
              >
                Medication records
              </button>

              <button
                className={activeTab === "history" ? "nav-active" : ""}
                onClick={() => setActiveTab("history")}
              >
                Health History
              </button>
            </>
          )}

          {user.role === "doctor" && (
            <button
              className={activeTab === "patients" ? "nav-active" : ""}
              onClick={() => {
                setActiveTab("patients");
                loadPatients();
              }}
            >
              My Patients
            </button>
          )}

          <button onClick={handleLogout}>
            Logout
          </button>

        </nav>
      </aside>

      {/* MAIN CONTENT */}

      <main className="dashboard-main">

        <header className="dashboard-header">
          <div>
            <h1>
              {user.role === "doctor"
                ? "Doctor Dashboard"
                : "Patient Dashboard"}
            </h1>

            <p>Welcome, {user.fullName}</p>
          </div>
        </header>

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        {/* =====================
            PATIENT OVERVIEW
        ====================== */}

        {user.role === "patient" && activeTab === "overview" && (
          <>
            <section className="content-card">
              <h2>Hello, {user.fullName}!</h2>

              <p>
                Monitor your health and keep your doctor updated
                from home.
              </p>
            </section>

            <div className="stats-grid">

              <div className="stat-card">
                <h3>Blood Pressure</h3>

                <h2>
                  {latestBP
                    ? `${latestBP.bloodPressure.systolic}/${latestBP.bloodPressure.diastolic}`
                    : "--"}
                </h2>

                <p>mmHg</p>
              </div>

              <div className="stat-card">
                <h3>Pulse</h3>

                <h2>
                  {latestHR ? latestHR.heartRate : "--"}
                </h2>

                <p>BPM</p>
              </div>

              <div className="stat-card">
                <h3>Body weight</h3>

                <h2>
                  {latestWeight ? latestWeight.weight : "--"}
                </h2>

                <p>kg</p>
              </div>

              <div className="stat-card">
                <h3>Wound Photos</h3>
                <h2>{photos.length}</h2>
                <p>Uploaded photos</p>
              </div>

            </div>

            <section className="trends-section" aria-labelledby="daily-trends-title">
              <div className="trends-section-heading">
                <div>
                  <span className="eyebrow">Your health over time</span>
                  <h2 id="daily-trends-title">Daily measurement trends</h2>
                </div>
                <p>Daily averages from your recorded measurements</p>
              </div>
              <div className="trend-grid">
                <MetricTrendChart
                  title="Blood pressure"
                  unit="mmHg"
                  dates={dailyMeasurements}
                  series={[
                    { key: "systolic", label: "Systolic", color: "#2563eb" },
                    { key: "diastolic", label: "Diastolic", color: "#0d9488" }
                  ]}
                />
                <MetricTrendChart
                  title="Body weight"
                  unit="kg"
                  dates={dailyMeasurements}
                  series={[
                    { key: "weight", label: "Weight", color: "#2563eb" }
                  ]}
                />
                <MetricTrendChart
                  title="Pulse"
                  unit="bpm"
                  dates={dailyMeasurements}
                  series={[
                    { key: "heartRate", label: "Heart rate", color: "#0d9488" }
                  ]}
                />
              </div>
            </section>

            <section className="content-card">
              <h3>Quick Actions</h3>

              <div className="quick-actions">

                <button
                  className="primary-btn"
                  onClick={() => setActiveTab("measurements")}
                >
                  Add Measurements
                </button>

                <button
                  className="primary-btn"
                  onClick={() => setActiveTab("history")}
                >
                  Upload Wound Photo
                </button>

                <button
                  className="primary-btn"
                  onClick={() => setActiveTab("history")}
                >
                  View Health History
                </button>

              </div>
            </section>
          </>
        )}

        {/* =====================
            PATIENT MEASUREMENTS
        ====================== */}

        {user.role === "patient" && activeTab === "measurements" && (
          <section className="content-card measurement-card">
            <div className="card-heading">
              <div>
                <span className="eyebrow">Health record</span>
                <h2>Record measurements</h2>
                <p className="section-description">
                  Add one or more readings. Each reading is saved with its own date and time.
                </p>
              </div>
            </div>

            <form className="measurement-form" onSubmit={saveMeasurements}>
              <div className="measurement-fields">
                <fieldset className="measurement-field">
                  <legend>Blood pressure <span>mmHg</span></legend>
                  <p>Enter systolic and diastolic values together.</p>
                  <div className="input-pair">
                    <label>
                      <span>Systolic</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        placeholder="e.g. 120"
                        value={systolic}
                        onChange={e => setSystolic(e.target.value)}
                        aria-label="Systolic blood pressure in millimeters of mercury"
                      />
                    </label>
                    <label>
                      <span>Diastolic</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        placeholder="e.g. 80"
                        value={diastolic}
                        onChange={e => setDiastolic(e.target.value)}
                        aria-label="Diastolic blood pressure in millimeters of mercury"
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset className="measurement-field">
                  <legend>Pulse <span>bpm</span></legend>
                  <p>Also known as heart rate.</p>
                  <label>
                    <span>Beats per minute</span>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      step="1"
                      inputMode="numeric"
                      placeholder="e.g. 72"
                      value={heartRate}
                      onChange={e => setHeartRate(e.target.value)}
                      aria-label="Pulse in beats per minute"
                    />
                  </label>
                </fieldset>

                <fieldset className="measurement-field">
                  <legend>Body weight <span>kg</span></legend>
                  <p>Enter your weight in kilograms.</p>
                  <label>
                    <span>Weight</span>
                    <input
                      type="number"
                      min="0.1"
                      max="500"
                      step="0.1"
                      inputMode="decimal"
                      placeholder="e.g. 68.5"
                      value={weight}
                      onChange={e => setWeight(e.target.value)}
                      aria-label="Body weight in kilograms"
                    />
                  </label>
                </fieldset>
              </div>

              <div className="measurement-submit">
                <p>Readings are added to your health history for your care team to review.</p>
                <button className="button button-primary" disabled={loading}>
                  {loading ? "Saving measurements..." : "Save measurements"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* =====================
            PATIENT HEALTH HISTORY
        ====================== */}

        {user.role === "patient" && activeTab === "history" && (
          <section className="content-card">

            <h2>Health History</h2>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Blood pressure (mmHg)</th>
                    <th>Pulse (bpm)</th>
                    <th>Body weight (kg)</th>
                  </tr>
                </thead>

                <tbody>
                  {records.map(record => (
                    <tr key={record._id}>

                      <td>
                        {new Date(record.recordedAt).toLocaleString()}
                      </td>

                      <td>
                        {record.bloodPressure
                          ? `${record.bloodPressure.systolic}/${record.bloodPressure.diastolic}`
                          : "--"}
                      </td>

                      <td>{record.heartRate ?? "--"}</td>
                      <td>{record.weight ?? "--"}</td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {records.length === 0 && (
              <p>No health records available.</p>
            )}

            <div className="wound-history-block">
              <h3>Wound photos</h3>
              <p className="section-description">
                Upload wound updates and review the photos you have shared with your doctor.
              </p>

              <form onSubmit={uploadWoundPhoto}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={e => setPhoto(e.target.files[0] || null)}
                  required
                />

                <textarea
                  placeholder="Add notes about the wound (optional)"
                  value={photoNotes}
                  onChange={e => setPhotoNotes(e.target.value)}
                  maxLength={1000}
                />

                <button className="primary-btn" disabled={loading}>
                  {loading ? "Uploading photo..." : "Upload wound photo"}
                </button>
              </form>

              <div className="photo-grid wound-photo-grid">
                {photos.map(item => (
                  <div className="photo-card" key={item._id}>
                    <p>{item.notes || "No notes added"}</p>
                    <small>{new Date(item.uploadedAt).toLocaleString()}</small>
                    <button
                      className="view-photo-btn"
                      onClick={() => viewWoundPhoto(item)}
                    >
                      View Photo
                    </button>
                  </div>
                ))}
              </div>

              {photos.length === 0 && (
                <p className="empty-photos-message">No wound photos uploaded yet.</p>
              )}
            </div>

          </section>
        )}

        {/* =====================
            DOCTOR OVERVIEW
        ====================== */}

        {user.role === "doctor" && activeTab === "overview" && (
          <section className="content-card">

            <h2>Welcome,  {user.fullName}</h2>

            <p>
              Manage your patients and review their health records.
            </p>

            <div className="stats-grid">
              <div className="stat-card">
                <h3>Registered Patients</h3>
                <h2>{patients.length}</h2>
              </div>
            </div>

            <button
              className="primary-btn"
              onClick={() => {
                setActiveTab("patients");
                loadPatients();
              }}
            >
              View Patients
            </button>

          </section>
        )}

        {/* =====================
            DOCTOR PATIENT LIST
        ====================== */}

        {user.role === "doctor" && activeTab === "patients" && (
          <section className="content-card">

            <h2>Registered Patients</h2>

            <div className="patient-list">

              {patients.map(patient => (
                <div className="patient-card" key={patient._id}>

                  <h3>{patient.fullName}</h3>

                  <p>Email: {patient.email}</p>
                  <p>Phone: {patient.phone || "--"}</p>
                  <p>Age: {patient.age || "--"}</p>

                  <button
                    className="primary-btn"
                    onClick={() => loadPatientDetails(patient)}
                  >
                    View Health Records
                  </button>

                </div>
              ))}

            </div>

            {patients.length === 0 && (
              <p>No registered patients found.</p>
            )}

          </section>
        )}

        {/* =====================
            DOCTOR PATIENT DETAILS
        ====================== */}

        {user.role === "doctor" &&
          activeTab === "patient-details" &&
          selectedPatient && (
            <>

              {/* Patient information */}

              <section className="content-card">

                <button
                  className="text-btn"
                  onClick={() => setActiveTab("patients")}
                >
                  ← Back to Patients
                </button>

                <h2>{selectedPatient.fullName}</h2>

                <p>Email: {selectedPatient.email}</p>
                <p>Phone: {selectedPatient.phone || "--"}</p>
                <p>Age: {selectedPatient.age || "--"}</p>
                <p>Gender: {selectedPatient.gender || "--"}</p>

              </section>

              {hasWeightAlert && (
                <div className="clinical-alert" role="status">
                  <span className="alert-icon" aria-hidden="true">!</span>
                  <div>
                    <strong>Significant weight increase for review</strong>
                    <p>
                      Body weight increased by {latestWeightIncrease.toFixed(1)} kg
                      between the two most recent recorded readings
                      {latestWeightRecord?.recordedAt
                        ? ` (${new Date(previousWeightRecord.recordedAt).toLocaleDateString()} to ${new Date(latestWeightRecord.recordedAt).toLocaleDateString()})`
                        : ""}. This comparison is based on recent measurements and is not linked to an operation date. Please review with the patient.
                    </p>
                  </div>
                </div>
              )}

              {/* Patient health history */}

              <section className="content-card">

                <h2>Patient Health History</h2>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Blood pressure (mmHg)</th>
                        <th>Pulse (bpm)</th>
                        <th>Body weight (kg)</th>
                      </tr>
                    </thead>

                    <tbody>
                      {doctorRecords.map(record => (
                        <tr key={record._id}>

                          <td>
                            {new Date(record.recordedAt).toLocaleString()}
                          </td>

                          <td>
                            {record.bloodPressure
                              ? `${record.bloodPressure.systolic}/${record.bloodPressure.diastolic}`
                              : "--"}
                          </td>

                          <td>{record.heartRate ?? "--"}</td>
                          <td>{record.weight ?? "--"}</td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {doctorRecords.length === 0 && (
                  <p>No health records available.</p>
                )}

                <div className="wound-history-block">
                  <h3>Wound photos</h3>
                  <div className="photo-grid wound-photo-grid">
                  {doctorPhotos.map(item => (
                    <div className="photo-card" key={item._id}>
                      <p>{item.notes || "No notes added"}</p>
                      <small>{new Date(item.uploadedAt).toLocaleString()}</small>
                      <button
                        className="view-photo-btn"
                        onClick={() => viewDoctorWoundPhoto(item)}
                      >
                        View Photo
                      </button>
                    </div>
                  ))}
                  </div>
                  {doctorPhotos.length === 0 && (
                    <p className="empty-photos-message">No wound photos uploaded.</p>
                  )}
                </div>
              </section>

              {/* Doctor notes */}

              <section className="content-card">

                <h2>Add Doctor Note</h2>

                <form onSubmit={saveDoctorNote}>

                  <textarea
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="Enter your medical observation..."
                    maxLength={3000}
                    required
                  />

                  <button
                    className="primary-btn"
                    disabled={loading}
                  >
                    Save Note
                  </button>

                </form>

                <h3 className="subheading">Previous Notes</h3>

                {doctorNotes.map(item => (
                  <div className="doctor-note-card" key={item._id}>

                    <p>{item.note}</p>

                    <small>
                      Dr. {item.doctorId?.fullName || "Doctor"} ·{" "}
                      {new Date(item.createdAt).toLocaleString()}
                    </small>

                  </div>
                ))}

                {doctorNotes.length === 0 && (
                  <p>No doctor notes yet.</p>
                )}

              </section>

            </>
          )}

        {/* =====================
            PHOTO MODAL
        ====================== */}

        {selectedPhotoUrl && (
          <div
            className="photo-modal"
            onClick={closeWoundPhoto}
          >

            <div
              className="photo-modal-content"
              onClick={event => event.stopPropagation()}
            >

              <button
                className="close-photo"
                onClick={closeWoundPhoto}
              >
                ×
              </button>

              <h3>Wound Photo</h3>

              <img
                src={selectedPhotoUrl}
                alt="Patient wound"
              />

            </div>

          </div>
        )}

      </main>
    </div>
  );
}

export default App;

