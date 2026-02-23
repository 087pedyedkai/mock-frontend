"use client";
import { useState, useEffect } from "react";

export default function Home() {
  // --- 1. States สำหรับข้อมูลหลัก ---
  const [token, setToken] = useState("");
  const [role, setRole] = useState(""); //
  const [equipments, setEquipments] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [myProfile, setMyProfile] = useState({ name: "", department: "" });

  // --- 2. States สำหรับ Forms & UI ---
  const [authForm, setAuthForm] = useState({ userId: "", password: "", name: "", department: "" });
  const [eqForm, setEqForm] = useState({ name: "", serialNumber: "", imageUrl: "", note: "", category: "General" });
  const [isRegistering, setIsRegistering] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editingEqId, setEditingEqId] = useState(null);

  // --- 3. ระบบจดจำ Login (Persistence) ---
  useEffect(() => {
    const savedToken = localStorage.getItem("mju_token"); //
    if (savedToken) {
      setToken(savedToken);
      const payload = JSON.parse(atob(savedToken.split('.')[1]));
      setRole(payload.role);
    }
    fetchEquipments();
  }, []);

  useEffect(() => {
    if (token) {
      refreshData();
      fetchMyProfile();
    }
  }, [token, role]);

  const refreshData = () => {
    fetchEquipments();
    if (token) {
      fetchMyBookings();
      if (role === 'Admin') fetchAllBookings();
    }
  };

  // --- 4. ฟังก์ชันจัดการ User & Profile ---
  const handleLogin = async () => {
    const res = await fetch("http://localhost:3000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: authForm.userId, password: authForm.password }),
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("mju_token", data.access_token);
      setToken(data.access_token);
      const payload = JSON.parse(atob(data.access_token.split('.')[1]));
      setRole(payload.role);
    } else { alert(data.message); }
  };

  const fetchMyProfile = async () => {
    const res = await fetch("http://localhost:3000/users/me", {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (res.ok) setMyProfile(await res.json());
  };

  const handleSaveProfile = async () => {
    const res = await fetch("http://localhost:3000/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(myProfile),
    });
    if (res.ok) { alert("อัปเดตโปรไฟล์สำเร็จ"); setIsEditingProfile(false); refreshData(); }
  };

  // --- 5. ฟังก์ชันจัดการอุปกรณ์ (Admin) ---
  const handleFileUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch("http://localhost:3000/equipments/upload", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (res.ok) { setEqForm({ ...eqForm, imageUrl: data.imageUrl }); alert("อัปโหลดรูปสำเร็จ!"); }
  };

  const addOrUpdateEquipment = async () => {
    const url = editingEqId ? `http://localhost:3000/equipments/${editingEqId}` : "http://localhost:3000/equipments";
    const res = await fetch(url, {
      method: editingEqId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(eqForm),
    });
    if (res.ok) {
      alert(editingEqId ? "แก้ไขสำเร็จ" : "เพิ่มสำเร็จ");
      setEditingEqId(null);
      setEqForm({ name: "", serialNumber: "", imageUrl: "", note: "", category: "General" });
      refreshData();
    }
  };

  const toggleDisabled = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Disabled" ? "Available" : "Disabled"; //
    await fetch(`http://localhost:3000/equipments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    refreshData();
  };

  // --- 6. ฟังก์ชันการจอง ---
  const borrowItem = async (eqId: string) => {
    const res = await fetch("http://localhost:3000/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ equipmentId: eqId, borrowDate: new Date().toISOString().split('T')[0] }),
    });
    if (res.ok) refreshData();
  };

  const updateBookingStatus = async (id: string, status: string) => {
    await fetch(`http://localhost:3000/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    refreshData();
  };

  // --- 7. Helpers ---
  const fetchEquipments = () => fetch("http://localhost:3000/equipments").then(res => res.json()).then(setEquipments);
  const fetchMyBookings = () => fetch("http://localhost:3000/bookings/me", { headers: { "Authorization": `Bearer ${token}` } }).then(res => res.json()).then(setMyBookings);
  const fetchAllBookings = () => fetch("http://localhost:3000/bookings", { headers: { "Authorization": `Bearer ${token}` } }).then(res => res.json()).then(setAllBookings);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif", color: "#333", backgroundColor: "white", minHeight: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #0070f3", paddingBottom: "10px" }}>
        <h1 style={{ color: "#0070f3", margin: 0 }}>MJU Equipment System</h1>
        {token && <button onClick={() => { localStorage.removeItem("mju_token"); setToken(""); }} style={{ background: "#ff4d4f", color: "white", border: "none", padding: "8px 20px", borderRadius: "5px", cursor: "pointer" }}>Logout</button>}
      </header>

      {!token ? (
        <div style={{ marginTop: "50px", textAlign: "center", border: "1px solid #ddd", padding: "40px", borderRadius: "10px", backgroundColor: "#fcfcfc" }}>
          <h2>{isRegistering ? "Register Student" : "Login"}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "320px", margin: "0 auto" }}>
            {isRegistering && (
              <>
                <input placeholder="Full Name" onChange={e => setAuthForm({...authForm, name: e.target.value})} style={{padding: "10px", border: "1px solid #ccc", borderRadius: "4px"}} />
                <input placeholder="Department" onChange={e => setAuthForm({...authForm, department: e.target.value})} style={{padding: "10px", border: "1px solid #ccc", borderRadius: "4px"}} />
              </>
            )}
            <input placeholder="Student ID" onChange={e => setAuthForm({...authForm, userId: e.target.value})} style={{padding: "10px", border: "1px solid #ccc", borderRadius: "4px"}} />
            <input type="password" placeholder="Password" onChange={e => setAuthForm({...authForm, password: e.target.value})} style={{padding: "10px", border: "1px solid #ccc", borderRadius: "4px"}} />
            <button onClick={isRegistering ? async () => {
              const res = await fetch("http://localhost:3000/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(authForm) });
              if (res.ok) { alert("สมัครสำเร็จ!"); setIsRegistering(false); }
            } : handleLogin} style={{ padding: "12px", background: "#0070f3", color: "white", border: "none", borderRadius: "5px", fontWeight: "bold", cursor: "pointer" }}>
              {isRegistering ? "Create Account" : "Sign In"}
            </button>
            <p onClick={() => setIsRegistering(!isRegistering)} style={{ color: "blue", cursor: "pointer", fontSize: "14px" }}>
              {isRegistering ? "Already have an account? Login" : "No account? Register here"}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: "20px" }}>
          {/* Section: Profile Management */}
          <section style={{ background: "#f0f7ff", padding: "20px", borderRadius: "10px", marginBottom: "30px", border: "1px solid #cce5ff" }}>
            <h3 style={{ marginTop: 0 }}>👤 My Profile ({role})</h3>
            {!isEditingProfile ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ margin: 0 }}><b>Name:</b> {myProfile.name || "Not set"} | <b>Dept:</b> {myProfile.department || "Not set"}</p>
                <button onClick={() => setIsEditingProfile(true)} style={{ background: "#0070f3", color: "white", border: "none", padding: "8px 15px", borderRadius: "4px", cursor: "pointer" }}>Edit Profile</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "10px" }}>
                <input value={myProfile.name} onChange={e => setMyProfile({...myProfile, name: e.target.value})} placeholder="New Name" style={{padding: "5px"}} />
                <input value={myProfile.department} onChange={e => setMyProfile({...myProfile, department: e.target.value})} placeholder="New Dept" style={{padding: "5px"}} />
                <button onClick={handleSaveProfile} style={{ background: "green", color: "white", border: "none", padding: "5px 15px", borderRadius: "4px" }}>Save</button>
                <button onClick={() => setIsEditingProfile(false)} style={{ background: "gray", color: "white", border: "none", padding: "5px 15px", borderRadius: "4px" }}>Cancel</button>
              </div>
            )}
          </section>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "30px" }}>
            {/* Column: Equipments */}
            <section>
              <h3 style={{ display: "flex", justifyContent: "space-between" }}>📦 Equipments <button onClick={refreshData} style={{ fontSize: "12px", cursor: "pointer" }}>🔄 Refresh</button></h3>
              
              {role === "Admin" && (
                <div style={{ border: "2px dashed #0070f3", padding: "15px", borderRadius: "8px", marginBottom: "20px", backgroundColor: "#fdfdfd" }}>
                  <h4 style={{ marginTop: 0 }}>{editingEqId ? "✏️ Edit Item" : "+ Add New Equipment"}</h4>
                  <input placeholder="Item Name" value={eqForm.name} onChange={e => setEqForm({...eqForm, name: e.target.value})} style={{ display: "block", marginBottom: "8px", width: "95%", padding: "8px" }} />
                  <input placeholder="Serial Number" value={eqForm.serialNumber} onChange={e => setEqForm({...eqForm, serialNumber: e.target.value})} style={{ display: "block", marginBottom: "8px", width: "95%", padding: "8px" }} />
                  <input placeholder="Note (Optional)" value={eqForm.note} onChange={e => setEqForm({...eqForm, note: e.target.value})} style={{ display: "block", marginBottom: "8px", width: "95%", padding: "8px" }} />
                  <label style={{fontSize: "12px", display: "block", marginBottom: "5px"}}>Upload Image:</label>
                  <input type="file" onChange={handleFileUpload} style={{ marginBottom: "15px" }} />
                  <div>
                    <button onClick={addOrUpdateEquipment} style={{ background: "green", color: "white", border: "none", padding: "10px 25px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>{editingEqId ? "Update" : "Save Item"}</button>
                    {editingEqId && <button onClick={() => { setEditingEqId(null); setEqForm({name:"", serialNumber:"", imageUrl:"", note:"", category:"General"}); }} style={{ marginLeft: "10px", padding: "10px", borderRadius: "4px", border: "1px solid #ccc" }}>Cancel</button>}
                  </div>
                </div>
              )}

              {equipments.map((eq: any) => (
                <div key={eq._id} style={{ display: "flex", gap: "15px", padding: "15px", borderBottom: "1px solid #eee", opacity: eq.status === "Disabled" ? 0.6 : 1 }}>
                  <img src={eq.imageUrl || "https://via.placeholder.com/80"} style={{ width: "90px", height: "90px", objectFit: "cover", borderRadius: "8px", border: "1px solid #ddd", filter: eq.status === "Disabled" ? "grayscale(100%)" : "none" }} />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0 }}>{eq.name} (<span style={{ color: eq.status === "Available" ? "green" : eq.status === "Disabled" ? "#faad14" : "red" }}>{eq.status}</span>)</h4>
                    <p style={{ margin: "5px 0", fontSize: "12px", color: "gray" }}>S/N: {eq.serialNumber}</p>
                    {eq.note && <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#d4380d", background: "#fff2e8", padding: "2px 5px", display: "inline-block", borderRadius: "3px" }}>⚠️ {eq.note}</p>}
                    
                    <div style={{ marginTop: "5px", display: "flex", gap: "8px" }}>
                      {eq.status === "Available" && <button onClick={() => borrowItem(eq._id)} style={{ background: "#0070f3", color: "white", border: "none", padding: "6px 15px", borderRadius: "4px", cursor: "pointer" }}>Borrow</button>}
                      {eq.status === "Disabled" && <span style={{fontSize: "12px", color: "gray", fontStyle: "italic"}}>Currently Unavailable</span>}
                      
                      {role === "Admin" && (
                        <>
                          <button onClick={() => toggleDisabled(eq._id, eq.status)} style={{ background: eq.status === "Disabled" ? "#52c41a" : "#faad14", color: "white", border: "none", padding: "6px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>{eq.status === "Disabled" ? "Enable" : "Disable"}</button>
                          <button onClick={() => { setEditingEqId(eq._id); setEqForm({name: eq.name, serialNumber: eq.serialNumber, imageUrl: eq.imageUrl, note: eq.note, category: eq.category}); }} style={{ padding: "5px 10px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "12px", cursor: "pointer" }}>Edit</button>
                          <button onClick={async () => { if(confirm("Delete this item?")) { await fetch(`http://localhost:3000/equipments/${eq._id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } }); refreshData(); } }} style={{ color: "#ff4d4f", border: "none", background: "none", cursor: "pointer", fontSize: "12px" }}>Delete</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {/* Column: Logs & Bookings */}
            <section>
              <h3>{role === "Admin" ? "🚨 Admin Logs" : "📜 My Bookings"}</h3>
              {(role === "Admin" ? allBookings : myBookings).map((b: any) => (
                <div key={b._id} style={{ border: "1px solid #eee", padding: "15px", borderRadius: "8px", marginBottom: "15px", backgroundColor: b.status === "Pending" ? "#fffbe6" : "white", borderLeft: b.status === "Pending" ? "5px solid orange" : "1px solid #eee" }}>
                  <p style={{ margin: 0 }}><b>{b.equipment?.name}</b> {role === "Admin" && <span style={{fontSize: "12px", color: "#666"}}>(By: {b.user?.name || 'Unknown'})</span>}</p>
                  <p style={{ margin: "5px 0", fontSize: "14px" }}>Status: <span style={{ color: b.status === "Pending" ? "orange" : b.status === "Approved" ? "#1890ff" : "green", fontWeight: "bold" }}>{b.status}</span></p>
                  
                  <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                    {b.status === "Pending" && <button onClick={async () => { await fetch(`http://localhost:3000/bookings/${b._id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } }); refreshData(); }} style={{ background: "#ff4d4f", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}>Cancel Booking</button>}
                    
                    {role === "Admin" && (
                      <>
                        {b.status === "Pending" && <button onClick={() => updateBookingStatus(b._id, "Approved")} style={{ background: "#1890ff", color: "white", border: "none", padding: "6px 15px", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}>Approve (Pick up)</button>}
                        {b.status === "Approved" && <button onClick={() => updateBookingStatus(b._id, "Returned")} style={{ background: "#52c41a", color: "white", border: "none", padding: "6px 15px", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}>Return (Check in)</button>}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}