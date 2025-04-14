// Required modules :
// cargo tauri add shell
// cargo tauri add @tauri-apps/api/core

import './style.css'
import './code_lang.ts'
import { languageCodes } from './code_lang.ts'

import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open } from '@tauri-apps/plugin-dialog';
import { open as openExternal } from '@tauri-apps/plugin-shell';

// Default chunk duration (in minutes)
const CHUNKDURATION = 10;

// Create a sorted list of language codes for the dropdown
const sortedLanguageCodes = (() => {
  // Preferred languages to appear at the top
  const preferredLanguages = [
    "fr", "en", "es", "de", "it", "nl", "da", "sv", "no", "pt", "pl", "ro", "sk"
  ];
  
  // Create a map of all languages
  const allLanguages = Object.entries(languageCodes);
  
  // Sort the remaining languages alphabetically by name
  const remainingLanguages = allLanguages
    .filter(([code]) => !preferredLanguages.includes(code))
    .sort((a, b) => a[1].localeCompare(b[1], 'fr'));
  
  // Combine preferred languages in order with the alphabetically sorted remaining languages
  return [
    ...preferredLanguages.map(code => [code, languageCodes[code]]),
    ...remainingLanguages
  ];
})();

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <h1>ALBERT</h1>
    <div class="input-section">
      <label for="session-name">Nom de la transcription :</label>
      <input type="text" id="session-name" placeholder="ConseilIUT" maxlength="20">
      <p id="validation-message" class="validation-message"></p>
    </div>
    <div class="card" id="card-section" style="display: none;">
      <div id="file-drop-area" class="file-drop-area">
        <p>Glissez / déposez<br> votre fichier audio wav ou mp3 ici</p>
        <p>ou</p>
        <button id="file-select-button">Sélectionnez un fichier</button>
      </div>
      <div id="file-path-display" class="file-path-display">
        <p>Aucun fichier sélectionné</p>
      </div>
      <div>
        <button id="file-submit-button" hidden>Transcrire</button>
        <button id="file-cancel-button" hidden>Annuler</button>
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
            <div class="label-with-value">
              <label for="chunk-duration"><b>Durée en minutes de découpage du fichier audio</b></label>
              <div class="slider-value" id="chunk-duration-value">${CHUNKDURATION}</div>
            </div>
            <div class="slider-container">
              <input 
                type="range" 
                id="chunk-duration" 
                min="2" 
                max="12" 
                value="${CHUNKDURATION}" 
                step="1" 
                class="slider" 
                list="chunk-duration-ticks"
              >
              <datalist id="chunk-duration-ticks">
                ${Array.from({length: 11}, (_, i) => i + 2).map(val => `<option value="${val}"></option>`).join('')}
              </datalist>
            </div>
            <div class="slider-ticks">
              ${Array.from({length: 11}, (_, i) => i + 2).map(val => `<span class="tick">${val}</span>`).join('')}
            </div>
            <div class="chunk-duration-info">
              <p>Le fichier audio va être découpé en plusieurs fichiers audio plus courts avant d'être transmis successivement à Albert, le nom de l'IA de la DINUM, pour transcription. <br>  
              Le temps de traitement d'Albert est d'environ 1 minute par fichier audio de 10 minutes ou encore de 1 minute par tranche de taille de 10 Mo pour un fichier mp3 ou de 100 Mo pour un fichier wav.<br>
              Ainsi, un fichier audio mp3 de 1 heure pourra par exemple être découpé en 6 fichiers audio de 10 minutes et prendra environ 6 minutes à être traité par Albert.<br>
              Chaque morceau fait l'objet d'une transcription séparée et sera enregistré le répertoire transcription_albert du dossier Documents de votre ordinateur. </p>
            </div>
          </div>

          <!-- Language Selection -->
          <div class="settings-item">
            <label for="transcription-language"><b>Langue de la transcription :</b></label>
            <div class="select-container">
              <select id="transcription-language" class="language-select">
                ${sortedLanguageCodes.map(([code, name]) => 
                  `<option value="${code}" ${code === 'fr' ? 'selected' : ''}>${name}</option>`
                ).join('')}
              </select>
            </div>
            <div class="language-info">
              <p>Sélectionnez la langue de l'audio à transcrire. Par défaut, la langue est le français.</p>
            </div>
          </div>

          <label for="no-proxy"><b>Paramètres de proxy</b></label>
          <div class="settings-item checkbox-setting">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                id="no-proxy" 
                class="checkbox-input"
              >
              <span class="checkbox-text">Ne pas utiliser le proxy du système</span>
            </label>
            <div class="checkbox-info">
              <p>Par défaut, ce logiciel utilise les paramètres proxy du système.<br>
              Ce proxy peut parfois avoir des limitations sur les temps de réponse (timeout) ou sur la taille des fichiers autorisée à l'envoi.<br>
              Si vous cochez cette case, le proxy du système ne sera pas utilisé et la connexion se fera directement à Albert, dans la mesure où votre ordinateur a accès directement à l'Internet.<br>
              </p>
          </div>
        </div>
        <div class="api-status-info">
          <p>État actuel des services Albert : <a href="#" id="api-status-link">Consulter</a></p>
        </div>
        <div class="version-info">
          <p>v0.3.0</p>
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
const languageSelect = document.getElementById('transcription-language') as HTMLSelectElement;

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
  // Must be 4-20 characters, alphanumeric plus underscore and minus, no spaces or other special chars
  const regex = /^[a-zA-Z0-9_-]{4,20}$/;
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
    } else if (value.length > 20) {
      validationMessage.textContent = 'Le nom ne doit pas dépasser 20 caractères';
    } else if (!/^[a-zA-Z0-9_-]*$/.test(value)) {
      validationMessage.textContent = 'Uniquement des lettres, des chiffres, le tiret et le souligné';
    } else {
      validationMessage.textContent = 'Nom de transcription invalide';
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
    msg = '<b>Type de fichier non accepté.<p>Sélectionnez svp un fichier audio<br> avec l\'extension .mp3 ou .wav</b>';
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
        
        // Hide submit button and show cancel button
        submitButton.hidden = true;
        document.getElementById('file-cancel-button')!.hidden = false;
        
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
          send_chunks(response, chunkDuration);
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

// Global variable to track if processing should continue
let isCancelled = false;

// Add event listener for the cancel button
document.getElementById('file-cancel-button')?.addEventListener('click', async () => {
  // Show confirmation dialog
  if (await showConfirmationDialog()) {
    // Set the cancellation flag
    isCancelled = true;
    
    logMessage("Annulation en cours... Arrêt des transcriptions.");
    
    // Call terminate to clean up temporary files
    terminate(0);
  }
});

// Function to show a confirmation dialog
async function showConfirmationDialog(): Promise<boolean> {
  return new Promise((resolve) => {
    // Create dialog overlay
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    
    // Create dialog box
    const dialog = document.createElement('div');
    dialog.className = 'dialog-box';
    
    // Add dialog content
    dialog.innerHTML = `
      <p>Confirmer l'annulation de la transcription OUI/NON ?</p>
      <div class="dialog-buttons">
        <button id="dialog-yes" class="dialog-button">OUI</button>
        <button id="dialog-no" class="dialog-button dialog-button-primary">NON</button>
      </div>
    `;
    
    // Add dialog to overlay and overlay to body
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Focus the "NON" button (default option)
    setTimeout(() => {
      const noButton = document.getElementById('dialog-no');
      if (noButton) noButton.focus();
    }, 0);
    
    // Add event listeners for buttons
    const yesButton = document.getElementById('dialog-yes');
    const noButton = document.getElementById('dialog-no');
    
    if (yesButton) {
      yesButton.addEventListener('click', () => {
        document.body.removeChild(overlay);
        resolve(true);
      });
    }
    
    if (noButton) {
      noButton.addEventListener('click', () => {
        document.body.removeChild(overlay);
        resolve(false);
      });
      
      // Set NON as default option with Enter key
      noButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          document.body.removeChild(overlay);
          resolve(false);
        }
      });
    }
    
    // Close dialog on Escape key
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        document.body.removeChild(overlay);
        document.removeEventListener('keydown', escHandler);
        resolve(false);
      }
    });
  });
}

function send_chunks(chunks: string[], chunkDuration: number) {
  // Reset cancellation flag when starting new processing
  isCancelled = false;
  
  let length = chunks.length;
  // Il faut 1' pour traiter 10 Mo ou 10 minutes d'audio
  let duration = length * chunkDuration * 0.1; 
  let minutes = Math.floor(duration);
  let seconds = Math.round((duration - minutes) * 60);
  
  logMessage('<br>Envoi des ' + length.toString() + ' morceaux successivement à Albert pour transcription.<br>Cette opération peut durer jusqu`à plus d\'une minute par morceau.<br>Durée totale maximum estimée à environ <b>' + minutes.toString() + '\' ' + '0' + seconds.toString().slice(-2) + '"</b><br>Merci de patienter...<br><br>');
  
  // Process chunks sequentially with their respective delays
  processChunksSequentially(chunks, 0, 0);
}

// Process chunks one at a time
// This function will be called recursively
// to process each chunk sequentially
async function processChunksSequentially(chunks: string[], index: number, errors: number) {
  // Check for cancellation
  if (isCancelled) {
    logMessage("Transcription annulée par l'utilisateur.");
    return;
  }

  // Base case: all chunks processed
  if (index >= chunks.length) {
    terminate(errors);
    return;
  }
  
  const path = chunks[index];
  
  try {
    const response = await invoke<string>('send_chunk', { 
      path, 
      use_system_proxy: useSystemProxy,
      language: transcriptionLanguage
    });
    
    // Check for cancellation again after processing
    if (isCancelled) {
      logMessage("Transcription annulée par l'utilisateur.");
      return;
    }
    
    const n = index + 1;
    const msg = `fichier ${n} transcrit : ${response}`;
    logMessage(msg);
    
    // Process the next chunk
    processChunksSequentially(chunks, index + 1, errors);
  } catch (error) {
    // Check for cancellation on error too
    if (isCancelled) {
      logMessage("Transcription annulée par l'utilisateur.");
      return;
    }
    
    logMessage(`Erreur pour le fichier ${index + 1}: ${error}`);
    
    // Process the next chunk, but increment the error count
    processChunksSequentially(chunks, index + 1, errors + 1);
  }
}

function terminate(errors: number) {
  let msg = isCancelled ? 'Transcription annulée' : 'Transcription terminée';
  if (errors > 0 && !isCancelled) {
    msg += ' avec ' + errors.toString() + ' fichiers en erreur';
  }
  msg += '.';
  logMessage(msg);
  
  // Terminate the Tauri process
  let submitButton = document.getElementById('file-submit-button') as HTMLButtonElement;
  let cancelButton = document.getElementById('file-cancel-button') as HTMLButtonElement;
  
  invoke<string>('terminate_transcription', { cancelled: isCancelled })
    .then((response) => {
      logMessage(response);
      // Hide cancel button and show submit button
      cancelButton.hidden = true;
      submitButton.hidden = false;
      stopTimer();
      enableFileInputs();
    })
    .catch((error) => {
      logMessage('Erreur lors de la suppression des fichiers temporaires : ' + error);
      // Hide cancel button and show submit button
      cancelButton.hidden = true;
      submitButton.hidden = false;
      stopTimer();
      enableFileInputs();
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
    title: 'Selectionnez un fichier mp3 ou wav',
    filters: [
      {
        name: 'Audio Files',
        extensions: ['mp3', 'wav'],
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
let transcriptionLanguage = languageSelect.value; // Default: 'fr' (Français)

// Function to handle slider change
function handleChunkDurationChange() {
  chunkDuration = parseInt(chunkDurationSlider.value);
  chunkDurationValue.textContent = chunkDurationSlider.value;
}

// Function to handle language selection change
function handleLanguageChange() {
  transcriptionLanguage = languageSelect.value;
  console.log(`Transcription language set to: ${transcriptionLanguage} (${languageCodes[transcriptionLanguage]})`);
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
languageSelect.addEventListener('change', handleLanguageChange);
noProxyCheckbox.addEventListener('change', handleProxyChange);

// Add event listener for API status link to open in system browser
document.getElementById('api-status-link')?.addEventListener('click', async (e) => {
  e.preventDefault();
  await openExternal('https://albert.api.etalab.gouv.fr/status/api');
});




