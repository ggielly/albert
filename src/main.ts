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
        <p>Glissez / déposez<br> votre fichier audio ici</p>
        <p>ou</p>
        <button id="file-select-button">Sélectionnez un fichier</button>
      </div>
      <div id="file-path-display" class="file-path-display">
        <p>Aucun fichier sélectionné</p>
      </div>
      <div>
        <button id="file-submit-button" hidden>Transcrire</button>
    </div>
  </div>
`

// Get DOM elements
const fileDropArea = document.getElementById('file-drop-area') as HTMLDivElement;
const fileSelectButton = document.getElementById('file-select-button') as HTMLButtonElement;
const filePathDisplay = document.getElementById('file-path-display') as HTMLDivElement;

// Handle file selection
function handleFile(filePath: string) {
  // Get the file name from the path
  const fileName = filePath.split('/').pop() || '';
  const fileExtension = fileName.split('.').pop() || '';
  const validExtensions = ['wav', 'mp3'];
  let submitButton = document.getElementById('file-submit-button') as HTMLButtonElement;
  // Hide the submit button by default  
  submitButton.hidden = true;
  let msg = '';
  // Check if the file extension is valid
  if (!validExtensions.includes(fileExtension)) {
    msg = '<b>Type de fichier non accepté.<p>Sélectionnez svp un fichier audio<br> avec l\'extension .mp3 ou .wav</b>';
  }
  else {
    msg =`<p>Fichier sélectionné :<br><b> ${fileName}</b></p>`;
    // Show the submit button
    submitButton.hidden = false;
    // Add event listener to the submit button
    submitButton.addEventListener('click', async () => {
      // Here we would send the file path to Rust backend
      // This will be implemented later
      console.log('File submitted:', filePath);
    }
    );
  }
  filePathDisplay.innerHTML = msg;
  

  
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
// https://tauri.app/reference/javascript/dialog/
fileSelectButton.addEventListener('click', async (_event) => {
  // Open a dialog
  const file = await open({
    multiple: false,
    directory: false,
    title: 'Selectionnez un fichier wav ou mp3',
    filters: [
      {
        name: 'Audio Files',
        extensions: ['wav', 'mp3'],
      },
    ],
  });
  if (file) {
    // Handle the selected file
    handleFile(file as string);
  }
});




