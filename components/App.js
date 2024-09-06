import React, { useState } from "react";
import Login from "./login";
import Register from "./register";
import axios from 'axios';
import dynamic from "next/dynamic";
import styles from './App.module.css';

const PDFViewer = dynamic(() => import("./pdf-viewer"), {
  ssr: false
});

function App() {
  const [user, setUser] = useState(null);
  const [text, setText] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const updateText = (x)=>{setText(x)};
 
  // Login handler
  const handleLogin = (credentials) => {
    axios.post("http://localhost:5000/login", credentials)
      .then(response => {
        console.log("Login successful:", response.data);
        
        // Set session storage
        console.log(response.data.user);
        sessionStorage.setItem('text', JSON.stringify(response.data.text));
        sessionStorage.setItem('user', JSON.stringify(response.data.user));
        setUser(JSON.parse(sessionStorage.user));
        setText(JSON.parse(sessionStorage.text));
      })
      .catch(error => {
        console.error("Login error:", error);
        alert("Invalid credentials");
      });
  };

  // Register handler
  const handleRegister = (credentials) => {
    axios.post("http://localhost:5000/register", credentials)
      .then(response => {
        console.log("Registration successful:", response.data);
        setUser({ email: credentials.email });
      })
      .catch(error => {
        console.error("Registration error:", error);
        alert("Registration failed");
      });
  };

  const handleLogout = () => {
    setUser(null);
    setText(null);
    sessionStorage. removeItem('user');
    sessionStorage. removeItem('text');
    location.reload();
  };

  return (
    <div className={styles.app}>
      {user ||  sessionStorage.user ? (
        <div>
        
        <button onClick={handleLogout}>Logout</button>
        <PDFViewer user={sessionStorage.user ? JSON.parse(sessionStorage.user) : user} text={sessionStorage.text ? JSON.parse(sessionStorage.text) : text} updateText={updateText}/>;
        </div>
      ) : (
        <div>
          {isRegistering ? (
            <>
              <label className={styles.text1}> Benvenuto su DocUni,<br /></label>
              <label className={styles.text2}>uno strumento per lo studio di PDF.<br /></label>
              <br />
              <label className={styles.text3}> Registrati per continuare <br /></label>
              <br />

              <Register onRegister={handleRegister} />
              <br />
              <br />
              <p className={styles.control}>
                Hai già un account?{" "}
                <button onClick={() => setIsRegistering(false)}>Accedi</button>
              </p>
            </>
          ) : (
            <>
              <label className={styles.text1}> Benvenuto su DocUni,<br /></label>
              <label className={styles.text2}>uno strumento per lo studio di PDF.<br /></label>
              <br />
              <label className={styles.text3}> Accedi per continuare <br /></label>
              <br />
              
              <Login onLogin={handleLogin} />
              <br />
              <br />
              <p className={styles.control}>
                Non hai un account?{" "}
                <button onClick={() => setIsRegistering(true)}>Registrati</button>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
