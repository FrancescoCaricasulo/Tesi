const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require('multer');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Create connection to database
const db = mysql.createConnection({
  host: "localhost",  
  user: "root2",
  password: "password",
  database: "docuni"
});

// Connect to database
db.connect((err) => {
  if (err) {
    console.error("Error connecting to MariaDB:", err);
    return;
  }
  console.log("Connected to MariaDB");
});

/*LOGIN MANAGMENT SECTION */

  //API endpoint to handle registration
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

/* TEXT MANIPULATION SECTION */

  //Api endpoint to get text updated
  app.get("/get-text", (req, res) => {
    const { userId, pdfId } = req.query;
    

    const query1 = ` 
        SELECT id, text, comment
        FROM highlighted_text
        WHERE user_id = ? AND pdf_id = ?
        `;
      db.query(query1, [userId, pdfId ], (errText, resultText) => {
        if (errText) {
          console.error("Error saving text:", errText);
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
      const {pdfId, userId, annotations } = req.body;

      const query2 = `
        INSERT INTO highlighted_text (user_id, pdf_id,  text)
        VALUES ?
        
      `;
      const values = annotations.map(annotation => [userId, pdfId, annotation.text]);

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
    const { id, comment } = req.body;

    const query3 = `
      UPDATE highlighted_text
      SET comment = ?
      WHERE id = ?
    `;

    db.query(query3, [comment, id],  (err, result) => {
      if (err) {
        console.error('Error updating comment:', err);  
        return res.status(500).send({ error: "Update Comment failed" });
      }
      
      // Successfully updated the comment
      res.send({ message: "Comment updated successfully", result });
    });
  });

  //API to delete text
  app.delete("/delete-text/:id", (req, res) => {
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

/*LEMMAS MANIPULATION SECTION*/

  //API to visualize saved lemmas
  app.post("/visualize-lemmas", (req, res)=>{
    const { pdfId } = req.body;

    const query5 = "SELECT * FROM lemmas WHERE id_pdf = ? ORDER BY riga_apparizione";
    db.query(query5, [pdfId], (err, result) =>{
      if(err){
        console.error('Error visualizing lemmas:', err);  
        res.status(500).send({ error: "visualizing lemmas failed" });
      }

      // Successfully updated the comment
      res.send({ message: "visualizing lemmas", result });
    })
  });

  //API to add lemmas
  app.post("/add-lemmas", (req, res) => {
    const {pdf, text, comment, row } = req.body;

    const query4 = "INSERT INTO lemmas (id_pdf, testo, commento, riga_apparizione) VALUES (?, ?, ?, ?)";
    db.query(query4, [pdf, text, comment, row], (err, result) => {
      if (err) {
        console.error("Error inserting data:", err);
        res.status(500).send({ error: "Error inserting data" });
      } else {
        res.send({ success: "Annotations saved successfully" });
      }
    });
  });

  // API to delete a lemma
  app.delete("/delete-lemma/:id", (req, res) => {
    const { id } = req.params;
    
    const query = "DELETE FROM lemmas WHERE id_lemma = ?";
    db.query(query, [id], (err, result) => {
      if (err) {
        console.error("Error deleting lemma:", err);
        res.status(500).send({ error: "Error deleting lemma" });
      } else {
        res.send({ success: "Lemma deleted successfully" });
      }
    });
  });

/*PDF UPLOADING SECTION*/

// Upload PDF endpoint
app.post('/upload-pdf', upload.single('pdf'), (req, res) => {
  const { originalname, buffer} = req.file;
  const userId = req.body.userId;

  const sql = 'INSERT INTO pdfs (id_user, nome, file_data) VALUES (?, ?, ?)';
  db.query(sql, [userId,originalname, buffer ], (err, result) => {
    if (err) {
      console.error('Error saving PDF to the database:', err);
      res.status(500).send('Error saving PDF to the database');
    } else {

      res.send(result);
    }
  });
});


// Get list of PDFs endpoint(user's pdf)
app.get('/get-pdfs/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT id, nome, file_data FROM pdfs where id_user = ?';
  db.query(sql, [id] ,(err, result) => {
    if (err) {
      console.error('Error fetching PDFs from the database:', err);
      res.status(500).send('Error fetching PDFs from the database');
    } else {
      res.send(result);
    }
  });
});

// API endpoint to fetch a singol PDF by its ID
app.get('/get-selectedpdf/:id', (req, res) => {
  const pdfId = req.params.id;

  const query = 'SELECT nome, file_data FROM pdfs WHERE id = ?';
  db.query(query, [pdfId], (err, result) => {
    if (err) {
      console.error('Error fetching PDF:', err);
      res.status(500).send({ error: 'Error fetching PDF' });
    } else if (result.length > 0) {
      const pdf = result[0];
      res.send({ name: pdf.nome, data: pdf.file_data.toString('base64') });
    } else {
      res.status(404).send({ error: 'PDF not found' });
    }
  });
});



// Start the server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
