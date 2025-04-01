import './style.css'

// Note : l'event file drop n'est pas détecté par la webview
// on ajoute donc la prise en charge de onDragDrop
// https://tauri.app/reference/javascript/api/namespacewebviewwindow/#ondragdropevent
// on installera donc la librairie @tauri-apps/api au préalable
// pnpm install @tauri-apps/api
import { getCurrentWebview } from "@tauri-apps/api/webview";

// Idem on ajoute l'API Tauri dialog pour récupérer le chemin d'un fichier sur le filesystem local (HTML5 ne l'autorise pas)
// https://tauri.app/plugin/dialog/
// pnpm tauri add dialog
import { open } from '@tauri-apps/plugin-dialog';


document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <h1>ALBERT</h1>
    <div class="card">
      <div id="file-drop-area" class="file-drop-area">
        <p>Drag & drop your file here</p>
        <p>or</p>
        <button id="file-select-button">Select File</button>
        <input type="file" id="file-input" accept="audio/wav, audio/mp3" hidden />
      </div>
      <div id="file-path-display" class="file-path-display">
        <p>No file selected</p>
      </div>
    </div>
  </div>
`

// Get DOM elements
const fileDropArea = document.getElementById('file-drop-area') as HTMLDivElement;
const fileSelectButton = document.getElementById('file-select-button') as HTMLButtonElement;
const filePathDisplay = document.getElementById('file-path-display') as HTMLDivElement;

// Handle file selection
function handleFile(file: string) {
  // Display the selected file path
  filePathDisplay.innerHTML = `<p>Selected file: ${file}</p>`;
  
  // Here we would send the file path to Rust backend
  // This will be implemented later

}

// Drag and drop events HTML5
// changement de la couleur de la zone de drop sur entrée et sortie
fileDropArea.addEventListener('dragenter', (event) => {
  event.preventDefault();
  event.stopPropagation();
  fileDropArea.classList.add('drag-over');
});

fileDropArea.addEventListener('dragleave', (event) => {
  event.preventDefault();
  event.stopPropagation();
  fileDropArea.classList.remove('drag-over');
});


// Traitement Tauri du drop d'un fichier
// Tauri onDragDropEvent
const _unlisten = await getCurrentWebview().onDragDropEvent((event) => {
  if (event.payload.type === 'drop') {
    // Handle the first dropped file
    const filePath = event.payload.paths[0];
    handleFile(filePath); 
  }
});
 
// Traitement Tauri d'ouverture du selecteur de fichiers pour obtenir le path complet
// Tauri file selector dialog
// File button click event
fileSelectButton.addEventListener('click', async (_event) => {
  // Open a dialog
  const file = await open({
    multiple: false,
    directory: false,
  });
  if (file) {
    // Handle the selected file
    handleFile(file as string);
  }
});
 // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
 //unlisten();



