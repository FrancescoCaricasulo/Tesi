import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { v4 as uuidv4 } from 'uuid'; // Import the UUID function
import workerSrc from "../pdf-worker";
import styles from './pdf-viewer.module.css';
import axios from 'axios';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export default function PDFViewer({user, text, updateText}) {
  const [file, setFile] = useState("./Abstract.pdf");
  const [numPages, setNumPages] = useState(null);
  const [selectedTextList, setSelectedTextList] = useState(text);
  const [allSentences, setAllSentences] = useState([]);

  useEffect(() => {
    if (file) {
      extractSentencesFromPDF(file);
    }
  }, [file]);

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
      let pageSentences = buffer.match(/[^.!?;]+[.!?;]+/g) || [];
  
      // Handle sentences that may be interrupted at the end of a page
      if (pageSentences.length > 0) {
        pageSentences.forEach((sentence, index) => {
          sentence = sentence.trim();
  
          // Check if the sentence ends with a delimiter
          if (/[.!?;]$/.test(sentence)) {
            sentences.push({
              sentence: sentence,
              pageNumber: pageNum
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
      finalSentences.forEach(sentence => {
        sentences.push({
          sentence: sentence.trim(),
          pageNumber: numPages // Assume final text belongs to the last page
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
        { id: uuidv4(), text: selected, comment: "" } // Added comment field
      ]);

      window.getSelection().removeAllRanges();
    }
  };

  const handleButtonClick = (text) => {
    // Filter sentences containing the exact highlighted word
    const relevantSentences = allSentences.filter(sentence => {
      const regex = new RegExp(`\\b${text}\\b`, 'i');
      return regex.test(sentence.sentence);
    });

    // Ensure unique sentences
    const uniqueSentences = Array.from(new Set(relevantSentences.map(s => s.sentence)));

    // Set up the graph data
    const graphData = {
      word: text,
      sentences: uniqueSentences.map(sentence => ({
        sentence: sentence,
        lineNumber: relevantSentences.find(s => s.sentence === sentence).lineNumber
      }))
    };

    // Open a new tab
    const newWindow = window.open("", "_blank");

    // Write the initial HTML structure to the new tab
    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Graph Visualization</title>
        <script src="https://unpkg.com/react/umd/react.development.js"></script>
        <script src="https://unpkg.com/react-dom/umd/react-dom.development.js"></script>
        <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
        <link rel="stylesheet" href="https://unpkg.com/vis-network/styles/vis-network.css" />
        <style>
          #network { width: 100%; height: 100vh; }
        </style>
      </head>
      <body>
        <div id="network"></div>
        <script>
          class Graph extends React.Component {
            componentDidMount() {
              const { word, sentences } = this.props.data;
              const nodes = [{ id: 1, label: word }];
              const edges = [];

              sentences.forEach((sentence, index) => {
                const nodeId = index + 2;
                nodes.push({ id: nodeId, label: \`\${sentence.sentence}\` });
                edges.push({ from: 1, to: nodeId });
              });

              const container = document.getElementById('network');
              const networkData = {
                nodes: nodes,
                edges: edges
              };
              const options = {
                nodes: {
                  shape: 'box'
                },
                edges: {
                  arrows: {
                    to: { enabled: true, scaleFactor: 1.2 }
                  }
                },
                  physics: {
                  enabled: false // Disable physics simulation
                }
              };

              new vis.Network(container, networkData, options);
            }
            
            render() {
              return null;
            }
          }

          ReactDOM.render(
            React.createElement(Graph, { data: ${JSON.stringify(graphData)} }),
            document.getElementById('network')
          );

          // Debugging: log the graph data to the console
          console.log('Graph Data:', ${JSON.stringify(graphData)});
        </script>
      </body>
      </html>
    `);

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

    if(!isTextPresent){
      try {
        const response = axios.delete(`http://localhost:5000/delete-text${id}`);
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
    try{
      //Salvare modifiche commenti
        const response3 = await axios.put(`http://localhost:5000/change-comment`, {
          comment: comment,
          wordId : id
        });
    }catch (error) {
      console.error('Error saving annotations:', error);
      alert('Error saving annotations');
    }
  }

  const saveAnnotations = async () => {
    console.log("text", text);
    console.log("selectedTextList", selectedTextList);
    if(selectedTextList == text){
      console.log("stessa lunghezza, nessun cambiamento");
      return null;
    }else{
      // Find items in selectedTextList that do not have the same text key in text
      const uniqueInselectedTextList = selectedTextList.filter(item1 => {
        return !text.some(item2 => item1.text === item2.text);
      });
    
      try {
        if(uniqueInselectedTextList.length > 0){
          //Salvo il testo nel db
          const response = await axios.post('http://localhost:5000/save-annotations', {
            userId: user.id,
            annotations: uniqueInselectedTextList
          });
        }

        //Aggiorna il testo sul frontend dopo il salvataggio
        const response2 = await axios.get(`http://localhost:5000/get-text${user.id}`);
        updateText(response2.data.text);
        console.log("text", text);
        alert('Annotations saved successfully');
      } catch (error) {
        console.error('Error saving annotations:', error);
        alert('Error saving annotations');
      }
    }
  };

  return (
    <div className={styles.App}>
      <div className={styles.selectContainer}>
        
      <label> Benvenuto {user.username}</label>
        
      </div>
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
          <div key={item.id} className={styles.selectedTextItem}>
            <span>{item.text}</span>
            <textarea
              value={item.comment}
              onChange={(e) => handleCommentChange(item.id, e.target.value)}
              placeholder="Aggiungi un commento..."
              className={styles.textarea}
            />
            
            <div className={styles.buttonsContainer}>
            <button
                className={styles.actionButton}
                onClick={() => handleSaveComment(item.id, item.comment)}
              >
                Salva Commento
              </button>
              <button
                className={styles.actionButton}
                onClick={() => handleButtonClick(item.text)}
              >
                Grafico
              </button>
              <button
                className={styles.deleteButton}
                onClick={() => handleDeleteClick(item.id, item.text)}
              >
                Elimina
              </button>
            </div>
          </div>
        ))}
        <button onClick={saveAnnotations}>Save Annotations</button>
      </div>
    </div>
  );
}
