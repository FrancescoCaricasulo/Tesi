import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { v4 as uuidv4 } from 'uuid'; // Import the UUID function
import workerSrc from "../pdf-worker";
import styles from './pdf-viewer.module.css';
import axios from 'axios';



pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export default function PDFViewer({user, text}) {
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [selectedTextList, setSelectedTextList] = useState(text);
  const [allSentences, setAllSentences] = useState([]);
  const [activeWordId, setActiveWordId] = useState(null); //Per selezionare l'id delle parole interagite
  const [wordContext,setWordContext] = useState('')
  //Gestione per l'upload dei pdf
  const [pdfs, setPdfs] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [pdfId, setPdfId] = useState(null);
  
  
  useEffect(() => {
    if (file) {
      extractSentencesFromPDF(file);
    }
  }, [file]);

  //Effetti e funzione per la gestione del pdf selezionato
  useEffect(() => {
    // Fetch the list of uploaded PDFs when the component mounts
    axios.get(`http://localhost:5000/get-pdfs/${user.id}`)
      .then(response => {
        setPdfs(response.data);
      })
      .catch(error => {
        console.error('Error fetching PDFs:', error);
      });
  }, [user.id]);

  //Al cambiare di text o selectedTextList, aggiorno il session Storage
  useEffect(() => {
    sessionStorage.setItem('text', JSON.stringify(selectedTextList));

  }, [selectedTextList]);

  

  const handleSelectPdf = (pdfId) => {
    setPdfId(pdfId);
    axios.get(`http://localhost:5000/get-selectedpdf/${pdfId}`)
      .then(response => {
        const pdfData = response.data.data;
        // Create a blob URL from the base64 encoded PDF data
        const pdfBlob = new Blob([Uint8Array.from(atob(pdfData), c => c.charCodeAt(0))], { type: 'application/pdf' });
        const pdfUrl = URL.createObjectURL(pdfBlob);
        setFile(pdfUrl);
      })
      .catch(error => {
        console.error('Error fetching selected PDF:', error);
        alert('Error fetching selected PDF');
      });
  };


  async function extractSentencesFromPDF(pdfFile) {
    const pdf = await pdfjs.getDocument(pdfFile).promise;
    const numPages = pdf.numPages;
    const sentences = [];
    let buffer = ""; // Buffer to accumulate text across pages
  
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = textContent.items;
      

      // Accumulate text per page
      let pageText = items.map(item => item.str).join(" ");
      buffer += " " + pageText + " "; // Add space to handle word boundaries
  
      // Process buffer to extract sentences
      // Split by sentence delimiters, including those spanning across pages
      let pageSentences = buffer.match(/[^.!?;\n]+[.!?;\n]+/g) || [];
  
      // Handle sentences that may be interrupted at the end of a page
      if (pageSentences.length > 0) {
        pageSentences.forEach((sentence, index) => {
          sentence = sentence.trim();
  
          // Check if the sentence ends with a delimiter
          if (/[.!?;\n]$/.test(sentence)) {

            sentences.push({
              sentence: sentence,
              pageNumber: pageNum,
              lineNumber: index+1
            });
          } else {
            // Sentence may be cut off, so retain it for the next page
            buffer = sentence; // Keep it in the buffer to continue in the next page
          }
        });
  
        // Clear buffer for the next page, except for the remaining incomplete sentence
        buffer = buffer.replace(/[^.!?;]+[.!?;]+$/, "").trim();
      }
    }
  
    // Handle any remaining text in the buffer after the last page
    if (buffer) {
      const finalSentences = buffer.match(/[^.!?;]+[.!?;]+/g) || [];
      finalSentences.forEach((sentence, index) => {
        sentences.push({
          sentence: sentence.trim(),
          pageNumber: numPages, // Assume final text belongs to the last page
          lineNumber: index+1
        });
      });
    }
  
    setAllSentences(sentences);
  }

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  const handleMouseUp = () => {
    const selected = window.getSelection().toString().trim();

    if (selected && selected !== "" && !selectedTextList.some(item => item.text === selected)) {
      setSelectedTextList(prev => [
        ...prev,
        { id: uuidv4(), text: selected, comment: ""} // Added comment field
      ]);

      window.getSelection().removeAllRanges();
    }
  };

  function isUUID(id_string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id_string);
  }

  //Funzione per la gestione dell'aggiunta ai lemmi
  const handleLemmaClick = async(pdfId, text, comment) => {
    // Filter sentences containing the exact highlighted word
    const relevantSentences = allSentences.filter(sentence => {
      const regex = new RegExp(`\\b${text}\\b`, 'i');
      return regex.test(sentence.sentence);
    });
    const row = allSentences[allSentences.indexOf(relevantSentences[0])].lineNumber;
    
    try{
      //aggiunta parola a lemmi
        const response3 = await axios.post(`http://localhost:5000/add-lemmas`, {
          pdf: pdfId,
          text: text,
          comment: comment,
          row: row
        });
        alert('Lemma saved successfully');
    }catch (error) {
      console.error('Error saving lemma:', error);
      alert('Error saving lemma');
    }
  }
  
  // Make sure this is defined in the global scope
const handleContextClick = async (pdfId, text) => {
  // Fetch lemmas from the database
  let lemmas = [];
  try {
    const response = await axios.post("http://localhost:5000/visualize-lemmas", {pdfId: pdfId})

    console.log(response.data.result);
    lemmas = response.data.result.map(lemma => lemma.testo); // Adjust based on your response structure
  } catch (error) {
    console.error("Error fetching lemmas:", error);
    alert("Error fetching lemmas, please try again.");
    return; // Exit if there's an error
  }

  // Filter sentences containing the exact highlighted word
  const relevantSentences = allSentences.filter(sentence => {
    const regex = new RegExp(`\\b${text}\\b`, 'i');
    return regex.test(sentence.sentence);
  });

  // Ensure unique sentences
  const uniqueSentenceMap = new Map();

  relevantSentences.forEach(s => {
    if (!uniqueSentenceMap.has(s.sentence)) {
      uniqueSentenceMap.set(s.sentence, allSentences[allSentences.indexOf(s)].lineNumber);
    }
  });

  // Convert the map back to an array
  const uniqueSentences = Array.from(uniqueSentenceMap.entries()).map(([sentence, lineNumber]) => ({
    sentence: sentence,
    lineNumbers: lineNumber
  }));


  const newWindow = window.open("", "_blank");
  if (!newWindow) {
    alert("Pop-up blocked. Please allow pop-ups for this website.");
    return;
  }

  // Create a function to highlight lemmas in sentences and make them clickable
  const highlightLemmas = (sentence) => {
    const words = sentence.split(' ');
    return words.map(word => {
      // Check if the word (case-insensitive) is in the lemmas array
      const isLemma = lemmas.some(lemma => lemma.toLowerCase() === word.toLowerCase());
      if (isLemma) {
        setWordContext(word)
        // If the word is a lemma, make it clickable
        return `<span style="background-color: yellow; cursor: pointer;" onclick="window.opener.handleContextClick('${pdfId}, ${wordContext}')">${wordContext}</span>`;
      }
      return word;
    }).join(' ');
  };

  // Create HTML content to visualize the sentences with highlighted lemmas
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Visualized Sentences</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
        }
        ul {
          list-style-type: none;
          padding: 0;
        }
        li {
          margin: 10px 0;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 5px;
        }
      </style>
      <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script> <!-- Include Axios -->
      <script>
        // Function to handle clicking on a lemma
        async function handleContextClick(pdfId,lemma) {
          // Call the main handleContextClick function from the parent window
          window.opener.handleContextClick(pdfId,lemma);
          window.close(); // Close the current popup window
        }
      </script>
    </head>
    <body>
      <h1>Frasi di Contesto</h1>
      <ul>
        ${uniqueSentences.map(sentence => `<li>${highlightLemmas(sentence.sentence)} (riga: ${sentence.lineNumbers})</li>`).join('')}
      </ul>
    </body>
    </html>
  `;

  // Write the HTML content to the new window
  window.handleContextClick = () => handleContextClick(pdfId, wordContext);
  newWindow.document.open();
  newWindow.document.write(htmlContent);
  newWindow.document.close();
};

  const handleDeleteClick = (id, textDel) => {
    var isTextPresent = true;
    setSelectedTextList(prev => prev.filter(item => item.id !== id));

    if(text.length>0){
      // Find items in selectedTextList that do not have the same text key in text
      const uniqueInselectedTextList = selectedTextList.filter(item1 => {
        return !text.some(item2 => item1.text === item2.text);
      });
      isTextPresent = uniqueInselectedTextList.some(item => item.text === textDel);
    }

    if(isTextPresent&& !isNaN(id)){
      try {
        const response = axios.delete(`http://localhost:5000/delete-text/${id}`);
      } catch (error) {
        console.error('Error deleting text:', error);
        alert('Error deleting text');
      }
    }
  };

  const handleCommentChange = async (id, newComment) => {
    setSelectedTextList(prev => 
      prev.map(item => 
        item.id === id ? { ...item, comment: newComment } : item
      )
    );
    
  };
  
  const handleSaveComment = async(id, comment) => {
    if(typeof(id) == Number){
      alert("The word isn't saved yet, please save it before add any comment");
    }else{
      try{
        //Salvare modifiche commenti
          const response3 = await axios.put(`http://localhost:5000/change-comment`, {
            id: id,
            comment: comment          
          });
          alert('Annotations saved successfully');
      }catch (error) {
        console.error('Error saving annotations:', error);
        alert('Error saving annotations');
      }
    } 
  }

  const saveAnnotations = async (pdfId) => {

    const hasNonNumericId = selectedTextList.some(item => isNaN(item.id));
    if (!hasNonNumericId) {
        alert("Non sono state salvate nuove parole.");
        return null;
    }else{
      //Find items in selectedTextList that do not have the same text key in text
      const uniqueInselectedTextList = selectedTextList.filter(item => isNaN(item.id));
      try {
        if(uniqueInselectedTextList.length > 0){
          //Salvo il testo nel db
          const response2 = await axios.post('http://localhost:5000/save-annotations', {
            pdfId: pdfId,
            userId: user.id,
            annotations: uniqueInselectedTextList
          });
        }
        updateFront(pdfId);
        alert('Annotations saved successfully');
      } catch (error) {
        console.error('Error saving annotations:', error);
        alert('Error saving annotations');
      }
    }
  };

  const updateFront = async (pdfId) =>{
    
    //Aggiorna il testo sul frontend dopo il salvataggio
    const response2 = await axios.get(`http://localhost:5000/get-text`, {
      params:{
        userId: user.id,
        pdfId: pdfId
      }
    });
    setSelectedTextList([]);
    
    setSelectedTextList(response2.data.text);
  }

  const visualizeLemmas = async (pdfId) => {
    await axios.post("http://localhost:5000/visualize-lemmas", {pdfId: pdfId})
      .then(response => {
        console.log("Visualization successful:", response.data);
        // Open a new window
        const newWindow = window.open("", "_blank");
        if (!newWindow) {
          alert("Pop-up blocked. Please allow pop-ups for this website.");
          return;
        }
  
        // Create HTML content to visualize the context
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Visualized Lemmas</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
            .deleteButton {
              background-color: red;
              color: white;
              border: none;
              padding: 5px 10px;
              cursor: pointer;
            }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
        </head>
        <body>
          <h1>Visualized Lemmas</h1>
          <table>
            <thead>
              <tr>
                <th>Text</th>
                <th>Line Number</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="lemmaTableBody">
              ${response.data.result.map(lemma => `
                <tr key="${lemma.id_lemma}">
                  <td>${lemma.testo}</td>
                  <td>${lemma.riga_apparizione}</td>
                  <td>
                    <button
                      class="deleteButton"
                      onclick="handleDeleteLemmaClick('${lemma.id_lemma}')">
                      Elimina
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            function handleDeleteLemmaClick(id) {
              axios.delete(\`http://localhost:5000/delete-lemma/\${id}\`)
                .then(response => {
                  if (response.data.success) {
                    alert('Lemma deleted successfully');
                    
                    // Fetch the updated list of lemmas
                    axios.post("http://localhost:5000/visualize-lemmas")
                      .then(updatedResponse => {
                        const updatedLemmas = updatedResponse.data.result;
                        const lemmaTableBody = document.getElementById('lemmaTableBody');
                        lemmaTableBody.innerHTML = ''; // Clear existing rows

                        // Populate the table with updated lemmas
                        updatedLemmas.forEach(lemma => {
                          const row = document.createElement('tr');
                          row.innerHTML = \`
                            <td>\${lemma.testo}</td>
                            <td>\${lemma.commento}</td>
                            <td>\${lemma.riga_apparizione}</td>
                            <td>
                              <button class="deleteButton" onclick="handleDeleteLemmaClick('\${lemma.id_lemma}')">Elimina</button>
                            </td>
                          \`;
                          lemmaTableBody.appendChild(row);
                        });
                      })
                      .catch(err => {
                        console.error('Error fetching updated lemmas:', err);
                        alert('Error fetching updated lemmas.');
                      });
                  } else {
                    alert('Error deleting lemma');
                  }
                })
                .catch(error => {
                  console.error('Error deleting lemma:', error);
                  alert('Error deleting lemma');
                });
            }
          </script>
        </body>
        </html>
        `;

        // Write the HTML content to the new window
        newWindow.document.open();
        newWindow.document.write(htmlContent);
        newWindow.document.close();
      })
      .catch(error => {
        console.error("Error visualizing lemmas:", error);
        alert("Error visualizing lemmas, retry");
      });
  };


  //Gestione upload Pdf

  const handleFileChange = (event) => {
    //setSelectedFile(event.target.files[0]);
    const selectedFile = event.target.files[0];
    setSelectedFile(selectedFile);
  };

  const handleUpload = () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }
    
    const formData = new FormData();
    formData.append('pdf', selectedFile);
    formData.append('userId', user.id);
    axios.post('http://localhost:5000/upload-pdf', formData)
      .then(response => {
        alert('PDF uploaded successfully');
        setPdfId(response.data.insertId);

      })
      .catch(error => {
        console.error('Error uploading PDF:', error);
        alert('Error uploading PDF');
      });
      setFile(selectedFile);
      extractSentencesFromPDF(selectedFile)
  };

  
    // Function to handle showing buttons for a specific word
    const toggleActiveWord = (wordId) => {
      setActiveWordId((prevId) => (prevId === wordId ? null : wordId));
    };

  return (
    <div>
      {file === null ? (
        // Sezione er la gestione del caricamento di un pdf
        <div className={styles.uploadContainer}>
          <div className={styles.uploadSection}>
            <h1>Carica un PDF</h1>
            
            <div>
              <input type="file" onChange={handleFileChange}/>
              <button onClick={handleUpload}>Upload PDF</button>
            </div>
          </div>

          <div className={styles.listSection}>
          <h1>PDF Disponibili</h1>
            <ul>
              {pdfs.map(pdf => (
                <li key={pdf.id}>
                  {pdf.nome +"   "}
                  <button onClick={() =>{handleSelectPdf(pdf.id), updateFront(pdf.id)}}>
                      Select
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : ( 
        //Sezione per la gestione della visualizzazione del pdf
      <div className={styles.App}>
        <div>
          <button onClick={() =>{ setFile(null), setSelectedTextList([])}}> Cambia PDf </button>
        </div>
        <div className={styles.selectContainer}></div>
        <div className={styles.pdfContainer} onMouseUp={handleMouseUp}>
          <Document file={file} onLoadSuccess={onDocumentLoadSuccess}>
            {Array.from(new Array(numPages), (el, index) => (
              <Page
                className={styles.page}
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                renderMode="none"
                renderAnnotationLayer={false}
                renderTextLayer={true}
              />
            ))}
          </Document>
        </div>
      <div className={styles.textContainer}>
        <h3>Testo Selezionato</h3>
          {selectedTextList.map((item) => (
            <div
              key={item.id}
              className={styles.selectedTextItem}
            >
              <span
                onClick={() => toggleActiveWord(item.id)}
                className={styles.interactiveWord}
                style={{ cursor: "pointer" }}
              >
                {item.text} 
              </span>
              {/* Conditionally render buttons only for the selected word */}

              {activeWordId === item.id && (
                <div>
                  <textarea
                    value={item.comment}
                    onChange={(e) => handleCommentChange(item.id, e.target.value)}
                    placeholder="Aggiungi un commento..."
                    className={styles.textarea}
                  />
                </div>
              )}
            
              {activeWordId === item.id && (
                
                <div className={styles.buttonsContainer}>
                  
                  <button
                    className={styles.saveButton}
                    onClick={() => handleSaveComment(item.id, item.comment)}
                  >
                    Salva Commento
                  </button>
                  <button
                    className={styles.saveButton}
                    onClick={() =>{handleLemmaClick(pdfId, item.text, item.comment)}}
                  >
                    Aggiungi ai Lemmi
                  </button>
                  
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDeleteClick(item.id, item.text)}
                  >
                    Elimina
                  </button>
                  </div>
                )}
                <br></br>
                {activeWordId === item.id && (
                  <div className={styles.buttonsContainer}>
                    <button
                    className={styles.actionButton}
                    onClick={() => handleContextClick(pdfId, item.text)}
                  >
                    Visualizza Contesto
                  </button>
                  
                </div>
              )}
            </div>
          ))}
        <button className={styles.saveTextButton} onClick={() => saveAnnotations(pdfId)}>Salva Annotazioni</button>
        <button className={styles.saveLemmaButton} onClick={() => visualizeLemmas(pdfId)}>Visualizza Lemmi</button>
      </div>
      </div>
    )}




  </div>
  );

}
