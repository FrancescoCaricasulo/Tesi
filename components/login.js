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
    <form className="needs-validation d-flex align-items-center flex-column mt-3"  onSubmit={handleSubmit} noValidate>
      <div className="mb-3 d-flex flex-column" style={{ width: '40%'}}>
        <label htmlFor="email" className="form-label">Email:</label>
        <input
          type="email"
          className="form-control"
          id="email"
          name="email"
          value={input.email}
          onChange={handleInput}
          placeholder="Inserisci l'Email"
          required
        />
        <div className="invalid-feedback">
          Per favore, inserisci un indirizzo email valido.
        </div>
      </div>
      <div className="mb-3 d-flex flex-column" style={{ width: '40%'}}>
        <label htmlFor="password" className="form-label">Password:</label>
        <input
          type="password"
          className="form-control"
          id="password"
          name="password"
          value={input.password}
          onChange={handleInput}
          placeholder="Inserisci la password"
          required
        />
        <div className="invalid-feedback">
          Per favore, inserisci la password.
        </div>
      </div>
      <button type="submit" className="btn btn-primary">Accedi</button>
    </form>
  );
};

export default Login;
