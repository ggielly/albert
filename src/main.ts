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


// Delay in seconds between each request to Albert
// about  1 minute per audio chunk of 10'
const DELAY = 50; // 50 seconds
// Note : le délai est à ajuster en fonction de la taille du fichier audio et de la vitesse de traitement d'Albert

// Default chunk duration (in minutes)
const CHUNKDURATION = 10;

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
      <div id="log-message">
      </div>
      <div id="timer-display" class="timer-display">
        <span>Temps écoulé: </span>
        <span id="timer-value">00:00</span>
      </div>
    </div>
    
    <!-- Settings Panel -->
    <div id="settings-panel" class="settings-panel">
      <div id="settings-tab" class="settings-tab">
        <img src="/assets/parametres.png" alt="Settings" />
      </div>
      <div class="settings-content">
        <div class="settings-header">
          <h2>Paramètres</h2>
          <button id="close-settings" class="close-settings">
            <img src="/assets/fleche-droite.png" alt="Close" />
          </button>
        </div>
        <div class="settings-body">
          <div class="settings-item">
            <label for="chunk-duration">Durée en minutes des découpages du fichier audio</label>
            <div class="slider-container">
              <input 
                type="range" 
                id="chunk-duration" 
                min="2" 
                max="12" 
                value="${CHUNKDURATION}" 
                step="1" 
                class="slider"
              >
              <div class="slider-value" id="chunk-duration-value">${CHUNKDURATION}</div>
            </div>
          </div>
          <div class="settings-item checkbox-setting">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                id="no-proxy" 
                class="checkbox-input"
              >
              <span class="checkbox-text">Ne pas utiliser le proxy du système</span>
            </label>
          </div>
        </div>
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
const timerValue = document.getElementById('timer-value') as HTMLSpanElement;

// Timer variables
let timerInterval: number | null = null;
let secondsElapsed = 0;

// Timer functions
function startTimer() {
  resetTimer();
  timerInterval = window.setInterval(() => {
    secondsElapsed++;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (timerInterval !== null) {
    window.clearInterval(timerInterval);
    timerInterval = null;
  }
}

function resetTimer() {
  stopTimer();
  secondsElapsed = 0;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const minutes = Math.floor(secondsElapsed / 60);
  const seconds = secondsElapsed % 60;
  timerValue.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Validate session name input
function validateSessionName(value: string): boolean {
  // Must be 4-16 characters, alphanumeric only, no spaces or special chars
  const regex = /^[a-zA-Z0-9]{4,20}$/;
  return regex.test(value);
}

// Function logMessage
function logMessage(message: string) {
  let logMessageDiv = document.getElementById('log-message') as HTMLDivElement;
  let logMessageContent = logMessageDiv.innerHTML;
  // Add the new message to the existing content
  logMessageContent += `<p>${message}</p>`;
  // Update the log message div with the new content
  logMessageDiv.innerHTML = logMessageContent;
  // Scroll to the bottom of the log message div
  logMessageDiv.scrollTop = logMessageDiv.scrollHeight;
  console.log(message);
}

// Function to disable file input elements
function disableFileInputs() {
  fileDropArea.classList.add('disabled');
  fileSelectButton.disabled = true;
}

// Function to enable file input elements
function enableFileInputs() {
  fileDropArea.classList.remove('disabled');
  fileSelectButton.disabled = false;
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
// The call to the Rust function "split_file()" is done in the handleFile function
function handleFile(filePath: string) {
  // Reset timer when selecting a new file
  resetTimer();
  
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
        // Reset and start the timer when submitting
        resetTimer();
        startTimer();
        
        // Disable file drop area and select button
        disableFileInputs();
        
        // Get the validated session name
        const sessionName = sessionNameInput.value;
        
        invoke<string[]>('split_file', { 
          file_path: filePath,
          session_name: sessionName,
          chunk_duration: chunkDuration
        })
        .then((response) => {
          // The Rust response an array of strings
          let length = response.length;
          let msgResponse = 'Découpage du fichier audio en ' + length.toString() + ' morceaux de ' + chunkDuration.toString() + ' minutes maximum :<br><br>';
          for (let i = 0; i < length; i++) {
            msgResponse += `${response[i]}<br>`;
          }
          logMessage(msgResponse);
          send_chunks(response);
        })
        .catch((error) => {
          // Handle any errors that occur during the invocation
          logMessage('<br>Erreur lors du découpage du fichier audio :<br>' + error);
          stopTimer(); // Stop timer on error
        }
        );
        // Hide the submit button after clicking
        submitButton.hidden = true;
    }
    );
  }
  filePathDisplay.innerHTML = msg;
}

function send_chunks(chunks: string[]) {
  let length = chunks.length;
  let duration = length * DELAY / 60; 
  let minutes = Math.floor(duration);
  let seconds = Math.round((duration - minutes) * 60);
  logMessage('<br>Envoi des ' + length.toString() + ' morceaux successivement à Albert pour transcription.<br>Cette opération peut durer jusqu`à plus d\'une minute par morceau.<br>Durée totale maximum estimée à environ <b>' + minutes.toString() + '\' ' + seconds.toString() + '"</b><br>Merci de patienter...<br><br>');
  let nb_processed = 0; // nb of processed files
  let errors = 0; // nb of errors
  let over = false; // boolean to check if all files are processed
  for (let i = 0; i < length; i++) {
    // Delay the invocation by DURATION seconds for each chunk
    let delay = i * DELAY;
    invoke<string>('send_chunk', { path: chunks[i], delay: delay, use_system_proxy: useSystemProxy })
      .then((response) => {
        let n = i + 1;
        let msg = `fichier ${n} transcrit : ${response}`;
        logMessage(msg);
        nb_processed++;
        over = (nb_processed === length);
        if (over) {
          terminate(errors);
        }
      })
      .catch((error) => {
        logMessage(error);
        nb_processed++;
        errors++;
        over = (nb_processed === length);
        if (over) {
          terminate(errors);
        }
      });
  }
}

function terminate(errors: number) {
  let msg = 'Transcription terminée';
  if (errors > 0) {
    msg += ' avec ' + errors.toString() + ' fichiers en erreur';
  }
  msg += '.';
  logMessage(msg);
  // Terminate the Tauri process
  let submitButton = document.getElementById('file-submit-button') as HTMLButtonElement;
  invoke<string>('terminate')
    .then((response) => {
      logMessage(response);
      submitButton.hidden = false;
      stopTimer(); // Stop the timer when transcription is complete
      enableFileInputs(); // Re-enable file input elements
    })
    .catch((error) => {
      logMessage('Erreur lors de la suppression des fichiers temporaires : ' + error);
      submitButton.hidden = false;
      stopTimer(); // Stop the timer on error
      enableFileInputs(); // Re-enable file input elements
    });
   
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
let _unlisten: () => void;

async function setupDragDropListener() {
  _unlisten = await getCurrentWebview().onDragDropEvent((event) => {
    if (event.payload.type === 'drop') {
      // Handle the first dropped file
      const filePath = event.payload.paths[0];
      handleFile(filePath); 
    }
  });
}

// Call the setup function immediately
setupDragDropListener();

// Add a cleanup function that can be called when needed
function cleanup() {
  if (_unlisten) {
    _unlisten();
    console.log('Drag-drop event listener removed');
  }
}

// Add event listener for beforeunload to clean up when the window is closed
window.addEventListener('beforeunload', cleanup);
 
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

// Settings panel functionality
const settingsPanel = document.getElementById('settings-panel') as HTMLDivElement;
const settingsTab = document.getElementById('settings-tab') as HTMLDivElement;
const closeSettings = document.getElementById('close-settings') as HTMLButtonElement;
const chunkDurationSlider = document.getElementById('chunk-duration') as HTMLInputElement;
const chunkDurationValue = document.getElementById('chunk-duration-value') as HTMLDivElement;
const noProxyCheckbox = document.getElementById('no-proxy') as HTMLInputElement;


// Settings global variables
let useSystemProxy = true;
let chunkDuration = parseInt(chunkDurationSlider.value);

// Function to handle slider change
function handleChunkDurationChange() {
  chunkDuration = parseInt(chunkDurationSlider.value);
  chunkDurationValue.textContent = chunkDurationSlider.value;
}

// Function to handle checkbox change
function handleProxyChange() {
  useSystemProxy = !noProxyCheckbox.checked;
  console.log(`Use system proxy: ${useSystemProxy}`);
}

// Function to open settings panel
function openSettingsPanel() {
  settingsPanel.classList.add('open');
  // Tab will be hidden via CSS
}

// Function to close settings panel
function closeSettingsPanel() {
  settingsPanel.classList.remove('open');
  
  // Make tab visible again after transition completes
  setTimeout(() => {
    // This ensures the tab is fully visible after the panel is hidden
    settingsTab.style.opacity = '1';
    settingsTab.style.pointerEvents = 'auto';
  }, 300); // Match transition duration
}

// Event listeners for settings panel
settingsTab.addEventListener('click', openSettingsPanel);
closeSettings.addEventListener('click', closeSettingsPanel);
chunkDurationSlider.addEventListener('input', handleChunkDurationChange);
noProxyCheckbox.addEventListener('change', handleProxyChange);




