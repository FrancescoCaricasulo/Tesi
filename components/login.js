import React, { useState } from "react";
import styles from './login.module.css';

const Login = ({ onLogin }) => {
  const [input, setInput] = useState({ email: "", password: "" });

  const handleInput = (e) => {
    const { name, value } = e.target;
    setInput({ ...input, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.email && input.password) {
      onLogin(input);
    } else {
      alert("Please enter both email and password");
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} >
      <div className={styles.form_control_email}>
        <label>Email:</label>
        <input
          type="email"
          name="email"
          value={input.email}
          onChange={handleInput}
          placeholder="Inserisci l'Email"
        />
      </div>
      <div className={styles.form_control_password}>
        <label>Password:</label>
        <input
          type="password"
          name="password"
          value={input.password}
          onChange={handleInput}
          placeholder="inserisci la password"
        />
      </div>
      <button type="submit">Accedi</button>
    </form>
  );
};

export default Login;
