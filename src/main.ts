import './style.css'

import { invoke } from '@tauri-apps/api/core';

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
    <div class="input-section">
      <label for="session-name">Nom de la session:</label>
      <input type="text" id="session-name" placeholder="ConseilIUT" maxlength="20">
      <p id="validation-message" class="validation-message"></p>
    </div>
    <div class="card" id="card-section" style="display: none;">
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
  </div>
`

// Get DOM elements
const sessionNameInput = document.getElementById('session-name') as HTMLInputElement;
const validationMessage = document.getElementById('validation-message') as HTMLParagraphElement;
const cardSection = document.getElementById('card-section') as HTMLDivElement;
const fileDropArea = document.getElementById('file-drop-area') as HTMLDivElement;
const fileSelectButton = document.getElementById('file-select-button') as HTMLButtonElement;
const filePathDisplay = document.getElementById('file-path-display') as HTMLDivElement;

// Validate session name input
function validateSessionName(value: string): boolean {
  // Must be 4-16 characters, alphanumeric only, no spaces or special chars
  const regex = /^[a-zA-Z0-9]{4,20}$/;
  return regex.test(value);
}

// Session name input validation
sessionNameInput.addEventListener('input', () => {
  const value = sessionNameInput.value;
  
  if (validateSessionName(value)) {
    validationMessage.textContent = '';
    cardSection.style.display = 'block';
  } else {
    cardSection.style.display = 'none';
    
    if (value.length < 4) {
      validationMessage.textContent = 'Le nom doit comporter au moins 4 caractères';
    } else if (value.length > 16) {
      validationMessage.textContent = 'Le nom ne doit pas dépasser 16 caractères';
    } else if (!/^[a-zA-Z0-9]*$/.test(value)) {
      validationMessage.textContent = 'Uniquement des lettres et des chiffres';
    } else {
      validationMessage.textContent = 'Nom de session invalide';
    }
  }
});

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
    msg = '<b>Type de fichier non accepté.<p>Sélectionnez svp un fichier audio<br> avec l\'extension .mp3</b>';
  }
  else {
    msg =`<p>Fichier sélectionné :<br><b> ${fileName}</b></p>`;
    // Show the submit button
    submitButton.hidden = false;
    // Add event listener to the submit button
    submitButton.addEventListener('click', async () => {
        // Get the validated session name
        const sessionName = sessionNameInput.value;
        
        invoke('transcribe', { 
          file_path: filePath,
          session_name: sessionName
        })
        .then((response) => {
          // Handle the response from the Rust backend
          console.log('Response from Rust:', response);
          // Here you can display the transcription result in the UI
        }
        )
        .catch((error) => {
          // Handle any errors that occur during the invocation
          console.error('Error invoking Rust function:', error);
        }
        );
        // Hide the submit button after clicking
        submitButton.hidden = true;
    }
    );
  }
  filePathDisplay.innerHTML = msg;
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
    title: 'Selectionnez un fichier mp3',
    filters: [
      {
        name: 'Audio Files',
        extensions: ['mp3'],
      },
    ],
  });
  if (file) {
    // Handle the selected file
    handleFile(file as string);
  }
});




