
import { useCallback, useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5000/api";

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
  const [isRegister, setIsRegister] = useState(false);

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

      const body = isRegister
        ? {
            fullName,
            email,
            password,
            role,
            phone,
            age: age ? Number(age) : undefined,
            gender
          }
        : {
            email,
            password,
            role
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
      setActiveTab("overview");
      setMessage("Login successful!");

    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
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

  // =========================
  // SAVE BLOOD PRESSURE
  // =========================

  async function saveBloodPressure(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await apiRequest("/health/blood-pressure", {
        method: "POST",
        body: JSON.stringify({
          systolic,
          diastolic
        })
      });

      setSystolic("");
      setDiastolic("");

      setMessage("Blood pressure saved successfully!");

      await refreshHealthData();

    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // SAVE HEART RATE
  // =========================

  async function saveHeartRate(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await apiRequest("/health/heart-rate", {
        method: "POST",
        body: JSON.stringify({ heartRate })
      });

      setHeartRate("");

      setMessage("Heart rate saved successfully!");

      await refreshHealthData();

    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // SAVE WEIGHT
  // =========================

  async function saveWeight(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await apiRequest("/health/weight", {
        method: "POST",
        body: JSON.stringify({ weight })
      });

      setWeight("");

      setMessage("Weight saved successfully!");

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
      const data = await apiRequest("/health/doctor/patients");

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
        const data = await apiRequest("/health/doctor/patients");

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
          `/health/doctor/patients/${patient._id}/health-history`
        ),
        apiRequest(
          `/health/doctor/patients/${patient._id}/wound-photos`
        ),
        apiRequest(
          `/health/doctor/patients/${patient._id}/notes`
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
        `${API}/health/doctor/wound-photo/${item._id}/image`,
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
        `/health/doctor/patients/${selectedPatient._id}/notes`,
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
        `/health/doctor/patients/${selectedPatient._id}/notes`
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

  // =========================
  // LOGIN / REGISTER SCREEN
  // =========================

  if (!user || !token) {
    return (
      <div className="auth-container">
        <div className="auth-card">

          <h1>HeartCare ❤️</h1>
          <p>Your Health, Our Priority</p>

          {message && (
            <div className="message">
              {message}
            </div>
          )}

          <div className="role-selection">
            <button
              type="button"
              className={role === "patient" ? "selected" : ""}
              onClick={() => setRole("patient")}
            >
              Patient
            </button>

            <button
              type="button"
              className={role === "doctor" ? "selected" : ""}
              onClick={() => setRole("doctor")}
            >
              Doctor
            </button>
          </div>

          <h2>
            {isRegister
              ? "Create Account"
              : `${role === "doctor" ? "Doctor" : "Patient"} Login`}
          </h2>

          <form onSubmit={handleAuth}>

            {isRegister && (
              <>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />

                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />

                <input
                  type="number"
                  placeholder="Age"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  min="1"
                />

                <select
                  value={gender}
                  onChange={e => setGender(e.target.value)}
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
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />

            <button
              type="submit"
              className="primary-btn"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : isRegister
                  ? "Register"
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
                setIsRegister(!isRegister);
                setMessage("");
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

        <h2>❤️ HeartCare</h2>

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
                Measurements
              </button>

              <button
                className={activeTab === "wounds" ? "nav-active" : ""}
                onClick={() => setActiveTab("wounds")}
              >
                Wound Photos
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
                <h3>Heart Rate</h3>

                <h2>
                  {latestHR ? latestHR.heartRate : "--"}
                </h2>

                <p>BPM</p>
              </div>

              <div className="stat-card">
                <h3>Weight</h3>

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
                  onClick={() => setActiveTab("wounds")}
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
          <>
            <section className="content-card">
              <h2>Blood Pressure</h2>

              <form onSubmit={saveBloodPressure}>
                <input
                  type="number"
                  placeholder="Systolic (upper value)"
                  value={systolic}
                  onChange={e => setSystolic(e.target.value)}
                  required
                />

                <input
                  type="number"
                  placeholder="Diastolic (lower value)"
                  value={diastolic}
                  onChange={e => setDiastolic(e.target.value)}
                  required
                />

                <button className="primary-btn" disabled={loading}>
                  Save Blood Pressure
                </button>
              </form>
            </section>

            <section className="content-card">
              <h2>Heart Rate</h2>

              <form onSubmit={saveHeartRate}>
                <input
                  type="number"
                  placeholder="Heart Rate (BPM)"
                  value={heartRate}
                  onChange={e => setHeartRate(e.target.value)}
                  required
                />

                <button className="primary-btn" disabled={loading}>
                  Save Heart Rate
                </button>
              </form>
            </section>

            <section className="content-card">
              <h2>Weight</h2>

              <form onSubmit={saveWeight}>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Weight in kilograms"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  required
                />

                <button className="primary-btn" disabled={loading}>
                  Save Weight
                </button>
              </form>
            </section>
          </>
        )}

        {/* =====================
            PATIENT WOUND PHOTOS
        ====================== */}

        {user.role === "patient" && activeTab === "wounds" && (
          <>
            <section className="content-card">
              <h2>Upload Wound Photo</h2>

              <p>
                Upload a clear photo to share with your doctor.
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
                  Upload Photo
                </button>

              </form>
            </section>

            <section className="content-card">
              <h2>Your Wound Photos</h2>

              <div className="photo-grid">

                {photos.map(item => (
                  <div className="photo-card" key={item._id}>

                    <p>{item.notes || "No notes added"}</p>

                    <small>
                      {new Date(item.uploadedAt).toLocaleString()}
                    </small>

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
                <p>No wound photos uploaded yet.</p>
              )}

            </section>
          </>
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
                    <th>Blood Pressure</th>
                    <th>Heart Rate</th>
                    <th>Weight</th>
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

              {/* Patient health history */}

              <section className="content-card">

                <h2>Patient Health History</h2>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Blood Pressure</th>
                        <th>Heart Rate</th>
                        <th>Weight</th>
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

              </section>

              {/* Patient wound photos */}

              <section className="content-card">

                <h2>Patient Wound Photos</h2>

                <div className="photo-grid">

                  {doctorPhotos.map(item => (
                    <div className="photo-card" key={item._id}>

                      <p>{item.notes || "No notes added"}</p>

                      <small>
                        {new Date(item.uploadedAt).toLocaleString()}
                      </small>

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
                  <p>No wound photos uploaded.</p>
                )}

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

