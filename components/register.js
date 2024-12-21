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
    <form className="d-flex align-items-center flex-column mt-3" onSubmit={handleSubmit}>
      <div className="mb-3 d-flex flex-column" style={{ width: '40%'}}>
        <label className="form-label">Email:</label>
        <input
          type="email"
          className="form-control"
          name="email"
          value={input.email}
          onChange={handleInput}
          placeholder="Inserisci l'Email"
        />
      </div>
      <div className="mb-3 d-flex flex-column" style={{ width: '40%'}}>
        <label className="form-label">Password:</label>
        <input
          type="password"
          className="form-control"
          name="password"
          value={input.password}
          onChange={handleInput}
          placeholder="inserisci la password"
        />
      </div>
      <div className="mb-3 d-flex flex-column" style={{ width: '40%'}}>
        <label className="form-label">Confirm Password:</label>
        <input
          type="password"
          className="form-control"
          name="confirmPassword"
          value={input.confirmPassword}
          onChange={handleInput}
          placeholder="Conferma la password"
        />
      </div>
      <button type="submit" className="btn btn-primary">Registrati</button>
    </form>
  );
};

export default Register;
