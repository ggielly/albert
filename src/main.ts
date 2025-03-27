import './style.css'

// Note : l'event file drop n'est pas détecté par la webview
// on ajoute donc la prise en charge de onDragDrop
// https://tauri.app/reference/javascript/api/namespacewebviewwindow/#ondragdropevent
// on installera donc la librairie @tauri-apps/api au préalable
// pnpm install @tauri-apps/api
import { getCurrentWebview } from "@tauri-apps/api/webview";


document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <h1>ALBERT</h1>
    <div class="card">
      <div id="file-drop-area" class="file-drop-area">
        <p>Drag & drop your file here</p>
        <p>or</p>
        <button id="file-select-button">Select File</button>
        <input type="file" id="file-input" hidden />
      </div>
      <div id="file-path-display" class="file-path-display">
        <p>No file selected</p>
      </div>
    </div>
  </div>
`

// Get DOM elements
const fileDropArea = document.getElementById('file-drop-area') as HTMLDivElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const fileSelectButton = document.getElementById('file-select-button') as HTMLButtonElement;
const filePathDisplay = document.getElementById('file-path-display') as HTMLDivElement;

// Handle file selection
function handleFile(file: File) {
  // Display the selected file path
  filePathDisplay.innerHTML = `<p>Selected file: ${file.name}</p>`;
  
  // Here we would send the file path to Rust backend
  // This will be implemented later
  console.log('File selected:', file.name);
}

// File input change event
fileInput.addEventListener('change', (event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    handleFile(target.files[0]);
  }
});

// File select button click event
fileSelectButton.addEventListener('click', () => {
  fileInput.click();
});

// Drag and drop events
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

const unlisten = await getCurrentWebview().onDragDropEvent((event) => {
  if (event.payload.type === 'over') {
  } else if (event.payload.type === 'drop') {
    console.log('User dropped', event.payload.paths);
  } else {
    console.log('File drop cancelled');
  }
 });
 
 // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
 //unlisten();



