import React, { useState } from "react";
import styles from './register.module.css';

const Register = ({ onRegister }) => {
  const [input, setInput] = useState({ email: "", password: "", confirmPassword: "" });

  const handleInput = (e) => {
    const { name, value } = e.target;
    setInput({ ...input, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.password !== input.confirmPassword) {
      alert("Passwords do not match");
    } else if (input.email && input.password) {
      onRegister(input);
    } else {
      alert("Please fill out all fields");
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
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
      <div className={styles.form_control_password}>
        <label>Confirm Password:</label>
        <input
          type="password"
          name="confirmPassword"
          value={input.confirmPassword}
          onChange={handleInput}
          placeholder="Conferma la password"
        />
      </div>
      <button type="submit">Registrati</button>
    </form>
  );
};

export default Register;
