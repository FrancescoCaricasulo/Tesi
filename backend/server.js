const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Create connection to MariaDB
const db = mysql.createConnection({
  host: "localhost",  // Change if your MariaDB is hosted elsewhere
  user: "root2",
  password: "password",
  database: "docuni"
});

// Connect to MariaDB
db.connect((err) => {
  if (err) {
    console.error("Error connecting to MariaDB:", err);
    return;
  }
  console.log("Connected to MariaDB");
});

// API endpoint to handle registration
app.post("/register", (req, res) => {
  const { email, password } = req.body;
  const query = "INSERT INTO users (username, password) VALUES (?, ?)";
  db.query(query, [email, password], (err, result) => {
    if (err) {
      res.status(500).send({ error: "Registration failed" });
    } else {
      res.send({ success: "User registered successfully" });
    }
  });
});

// API endpoint to handle login
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const query = "SELECT * FROM users WHERE username = ? AND password = ?";
  db.query(query, [email, password], (err, result) => {
    if (err) {
      res.status(500).send({ error: "Login failed" });
    } else if (result.length > 0) {

      const query1 = ` 
      SELECT id, text, comment
      FROM highlighted_text
      WHERE user_id = ${result[0].id}
      `;

      db.query(query1,  (errText, resultText) => {
        if (errText) {
          console.error("Error saving text:", err);
          res.status(500).send({ error: "Error inserting data" });
        } else if (resultText.length > 0) {
          res.send({ success: "Login successful", user: result[0], text: resultText });
        } else{
          res.send({ success: "Login successful", user: result[0], text: [] });
        }
      });
    } else {
      res.status(401).send({ error: "Invalid credentials" });
    }
  });
  
});

//Api endpoint to get text updated
app.get("/get-text:id", (req, res) => {
  const user_id = req.params.id;
  
  const query1 = ` 
      SELECT text, comment
      FROM highlighted_text
      WHERE user_id = ${user_id}
      `;
    db.query(query1,  (errText, resultText) => {
      if (errText) {
        console.error("Error saving text:", err);
        res.status(500).send({ error: "Error inserting data" });
      } else if (resultText.length > 0) {
        res.send({ success: "Success Text Retrieved", text: resultText });
      } else{
        res.send({ success: "Success Text Retrieved", text: [] });
      }
    });
});

// API endpoint to save highlighted text and comments
app.post("/save-annotations", (req, res) => {
    const { userId, annotations } = req.body;

    const query2 = `
      INSERT INTO highlighted_text (user_id, text, comment)
      VALUES ?
    `;
    const values = annotations.map(annotation => [userId, annotation.text, annotation.comment]);

    db.query(query2, [values], (err, result) => {
      if (err) {
        console.error("Error inserting data:", err);
        res.status(500).send({ error: "Error inserting data" });
      } else {
        res.send({ success: "Annotations saved successfully" });
      }
    });
});

//API to change saved comment
app.put("/change-comment", (req, res) =>{
  const { comment, wordId } = req.body;
  const query3 = `
    UPDATE highlighted_text
    SET comment = ?
    WHERE id = ?
  `;

  db.query(query3, [comment, wordId],  (err, result) => {
    if (err) {
      console.error('Error updating comment:', err);  
      return res.status(500).send({ error: "Update Comment failed" });
    }
    
    // Successfully updated the comment
    res.send({ message: "Comment updated successfully", result });
  });
});

//API to delete text
app.delete("/delete-text:id", (req, res) => {
  const text_id = req.params.id;
  const query = `
      DELETE 
      FROM highlighted_text
      WHERE id = ${text_id}
      `;
  db.query(query,  (err, result) => {
    if (err) {
      console.error("Error deleting text:", err);
      res.status(500).send({ error: "Error deleting text" });
    }else {
      res.send({ success: "Text deleted successfully" });
    }
  });
});

// Start the server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
