/* script.js - Jewels-Ai Atelier: Premium Physics, Voice & AI Features */

/* --- CONFIGURATION --- */
const API_KEY = "AIzaSyAXG3iG2oQjUA_BpnO8dK8y-MHJ7HLrhyE"; 
const UPLOAD_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby96W9Mf1fvsfdp7dpzRCEiQEvFEg3ZiSa-iEnYgbr4Zu2bC7IcQVMTxudp4QDofAg3/exec";

const DRIVE_FOLDERS = {
  earrings: "1ySHR6Id5RxVj16-lf7NMN9I61RPySY9s",
  chains: "1BHhizdJ4MDfrqITTkynshEL9D0b1MY-J",
  rings: "1iB1qgTE-Yl7w-CVsegecniD_DzklQk90",
  bangles: "1d2b7I8XlhIEb8S_eXnRFBEaNYSwngnba"
};

/* --- ASSETS & STATE --- */
const JEWELRY_ASSETS = {};
const PRELOADED_IMAGES = {}; 
const watermarkImg = new Image(); watermarkImg.src = 'logo_watermark.png'; 

/* DOM Elements */
const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('overlay');
const canvasCtx = canvasElement.getContext('2d');
const loadingStatus = document.getElementById('loading-status');
const voiceStatus = document.getElementById('voice-status-text');

/* App State */
let earringImg = null, necklaceImg = null, ringImg = null, bangleImg = null;
let currentType = ''; 
let isProcessingHand = false, isProcessingFace = false;
let lastGestureTime = 0;
const GESTURE_COOLDOWN = 800; 
let previousHandX = null;     

/* Physics State (Swing/Gravity) */
let physics = {
    earringVelocity: 0,
    earringAngle: 0,
    lastHeadTilt: 0
};

/* Auto-Try & Gallery */
let autoTryRunning = false;
let autoSnapshots = [];
let autoTryIndex = 0;
let autoTryTimeout = null;
let currentPreviewData = { url: null, name: 'Jewels-Ai_look.png' }; 
let pendingDownloadAction = null; 

/* --- 1. VOICE RECOGNITION AI --- */
function initVoiceControl() {
    if ('webkitSpeechRecognition' in window) {
        const recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => { 
            document.getElementById('voice-indicator').style.display = 'flex';
            voiceStatus.innerText = "Listening...";
        };

        recognition.onresult = (event) => {
            const command = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
            voiceStatus.innerText = `Heard: "${command}"`;
            processVoiceCommand(command);
            setTimeout(() => { voiceStatus.innerText = "Listening..."; }, 2000);
        };

        recognition.onerror = (event) => { console.log("Voice Error", event); };
        recognition.start();
    } else {
        console.log("Voice API not supported");
    }
}

function processVoiceCommand(cmd) {
    if (cmd.includes('next') || cmd.includes('change')) navigateJewelry(1);
    else if (cmd.includes('back') || cmd.includes('previous')) navigateJewelry(-1);
    else if (cmd.includes('photo') || cmd.includes('capture') || cmd.includes('snap')) takeSnapshot();
    else if (cmd.includes('earring')) selectJewelryType('earrings');
    else if (cmd.includes('chain') || cmd.includes('necklace')) selectJewelryType('chains');
    else if (cmd.includes('ring')) selectJewelryType('rings');
    else if (cmd.includes('bangle')) selectJewelryType('bangles');
    else if (cmd.includes('gold')) toggleCategory('gold'); // Assuming simple toggle
}

/* --- 2. GOOGLE DRIVE FETCHING --- */
async function fetchFromDrive(category) {
    if (JEWELRY_ASSETS[category]) return;
    const folderId = DRIVE_FOLDERS[category];
    if (!folderId) return;

    loadingStatus.style.display = 'block';
    loadingStatus.textContent = "Fetching Designs...";

    try {
        const query = `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,thumbnailLink)&key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        JEWELRY_ASSETS[category] = data.files.map(file => {
            const src = file.thumbnailLink ? file.thumbnailLink.replace(/=s\d+$/, "=s3000") : `https://drive.google.com/uc?export=view&id=${file.id}`;
            return { id: file.id, name: file.name, src: src };
        });
        loadingStatus.style.display = 'none';
    } catch (err) {
        console.error("Drive Error:", err);
        loadingStatus.textContent = "Load Error";
    }
}

async function preloadCategory(type) {
    await fetchFromDrive(type);
    if (!JEWELRY_ASSETS[type]) return;
    if (!PRELOADED_IMAGES[type]) {
        PRELOADED_IMAGES[type] = [];
        const promises = JEWELRY_ASSETS[type].map(file => {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous'; 
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null); 
                img.src = file.src;
                PRELOADED_IMAGES[type].push(img);
            });
        });
        loadingStatus.style.display = 'block';
        loadingStatus.textContent = "Downloading Assets...";
        await Promise.all(promises);
        loadingStatus.style.display = 'none';
    }
}

/* --- 3. WHATSAPP AUTOMATION (Simulated) --- */
function requestWhatsApp(actionType) {
    pendingDownloadAction = actionType;
    document.getElementById('whatsapp-modal').style.display = 'flex';
}

function closeWhatsAppModal() {
    document.getElementById('whatsapp-modal').style.display = 'none';
    pendingDownloadAction = null;
}

function confirmWhatsAppDownload() {
    const phoneInput = document.getElementById('user-phone');
    const phone = phoneInput.value.trim();
    if (phone.length < 5) { alert("Invalid Number"); return; }

    // UI Feedback
    document.getElementById('whatsapp-modal').style.display = 'none';
    const overlay = document.getElementById('process-overlay');
    overlay.style.display = 'flex';
    document.getElementById('process-text').innerText = "Sending to WhatsApp...";

    // 1. Send data to Google Script (simulating backend trigger)
    uploadToDrive(phone);

    // 2. Open WhatsApp Chat with "Thank You" pre-filled (Client-side automation)
    setTimeout(() => {
        const msg = encodeURIComponent("Hi! Here is my Jewels-Ai virtual try-on look. Thanks!");
        // We open this in a new tab so they can send the message
        window.open(`https://wa.me/${phone.replace('+','')}?text=${msg}`, '_blank');
        
        // 3. Process the download locally
        if (pendingDownloadAction === 'single') performSingleDownload();
        else if (pendingDownloadAction === 'zip') performZipDownload();
        
        setTimeout(() => { overlay.style.display = 'none'; }, 2500);
    }, 1500);
}

function uploadToDrive(phone) {
    const data = pendingDownloadAction === 'single' ? currentPreviewData : autoSnapshots[0]; // Simplified for logic
    fetch(UPLOAD_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone, image: data.url, filename: data.name })
    }).catch(err => console.error("Upload failed", err));
}

/* --- DOWNLOAD & SHARE --- */
function downloadSingleSnapshot() { if(currentPreviewData.url) requestWhatsApp('single'); }
function downloadAllAsZip() { if (autoSnapshots.length === 0) alert("No images!"); else requestWhatsApp('zip'); }
function performSingleDownload() { saveAs(currentPreviewData.url, currentPreviewData.name); }
function performZipDownload() {
    const zip = new JSZip();
    const folder = zip.folder("Jewels-Ai_Collection");
    autoSnapshots.forEach(item => folder.file(item.name, item.url.replace(/^data:image\/(png|jpg);base64,/, ""), {base64:true}));
    zip.generateAsync({type:"blob"}).then(c => saveAs(c, "Jewels-Ai_Collection.zip"));
}
async function shareSingleSnapshot() {
    if(!currentPreviewData.url) return;
    const blob = await (await fetch(currentPreviewData.url)).blob();
    const file = new File([blob], "look.png", { type: "image/png" });
    if (navigator.share) navigator.share({ files: [file] }).catch(console.warn);
    else alert("Share not supported.");
}

/* --- 4. ADVANCED AI & PHYSICS CORE --- */

function calculateAngle(p1, p2) { return Math.atan2(p2.y - p1.y, p2.x - p1.x); }

/* Hands: Ring & Bangle Logic */
const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
hands.onResults((results) => {
  isProcessingHand = false; 
  // We draw hands ON TOP of face, so we don't clear canvas here, FaceMesh clears it.
  
  // Coordinate Mapping
  const w = canvasElement.width;
  const h = canvasElement.height;
  
  canvasCtx.save();
  // Mirroring to match video
  canvasCtx.translate(w, 0);
  canvasCtx.scale(-1, 1);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const lm = results.multiHandLandmarks[0];

      // --- RING LOGIC (Rotation & Snug Fit) ---
      if (ringImg && ringImg.complete) {
          const mcp = { x: lm[13].x * w, y: lm[13].y * h };
          const pip = { x: lm[14].x * w, y: lm[14].y * h };
          
          const angle = calculateAngle(mcp, pip);
          const dist = Math.hypot(pip.x - mcp.x, pip.y - mcp.y);
          
          const rWidth = dist * 0.7; // Snug fit
          const rHeight = (ringImg.height / ringImg.width) * rWidth;

          canvasCtx.save();
          canvasCtx.translate(mcp.x, mcp.y);
          canvasCtx.rotate(angle - (Math.PI / 2)); // Rotate with finger
          canvasCtx.drawImage(ringImg, -rWidth/2, dist * 0.15, rWidth, rHeight);
          canvasCtx.restore();
      }

      // --- BANGLE LOGIC (Wrist Thickness Detection) ---
      if (bangleImg && bangleImg.complete) {
          const wrist = { x: lm[0].x * w, y: lm[0].y * h };
          const pinkyMcp = { x: lm[17].x * w, y: lm[17].y * h };
          const indexMcp = { x: lm[5].x * w, y: lm[5].y * h };
          
          // Calculate wrist width based on palm base width
          const wristWidth = Math.hypot(pinkyMcp.x - indexMcp.x, pinkyMcp.y - indexMcp.y);
          const armAngle = calculateAngle(wrist, { x: lm[9].x * w, y: lm[9].y * h });

          // Dynamic Sizing based on "detected" wrist thickness
          const bWidth = wristWidth * 1.6; // Multiplier for loose fit
          const bHeight = (bangleImg.height / bangleImg.width) * bWidth;

          canvasCtx.save();
          canvasCtx.translate(wrist.x, wrist.y);
          canvasCtx.rotate(armAngle - (Math.PI / 2));
          canvasCtx.drawImage(bangleImg, -bWidth/2, -bHeight/2, bWidth, bHeight);
          canvasCtx.restore();
      }

      // --- GESTURE CONTROL ---
      if (!autoTryRunning) {
          const now = Date.now();
          if (now - lastGestureTime > GESTURE_COOLDOWN) {
              const indexTip = lm[8]; 
              if (previousHandX !== null) {
                  const diff = indexTip.x - previousHandX;
                  if (Math.abs(diff) > 0.04) {
                      navigateJewelry(diff < 0 ? 1 : -1);
                      lastGestureTime = now;
                      previousHandX = null;
                  }
              }
              if (now - lastGestureTime > 100) previousHandX = indexTip.x;
          }
      }
  } else { previousHandX = null; }
  canvasCtx.restore();
});

/* Face: Earrings & Necklaces + Physics */
const faceMesh = new FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
faceMesh.setOptions({ refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
faceMesh.onResults((results) => {
  isProcessingFace = false;
  if(loadingStatus.style.display !== 'none') loadingStatus.style.display = 'none';

  // Resize canvas to match video
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;
  
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  
  // --- BEAUTY FILTER (Skin Smoothing) ---
  // Simple overlay approach for performance
  canvasCtx.globalCompositeOperation = 'overlay';
  canvasCtx.fillStyle = 'rgba(255, 220, 180, 0.15)'; // Subtle warm tint
  canvasCtx.fillRect(0,0, canvasElement.width, canvasElement.height);
  canvasCtx.globalCompositeOperation = 'source-over'; // Reset

  // Mirroring
  canvasCtx.translate(canvasElement.width, 0);
  canvasCtx.scale(-1, 1);

  if (results.multiFaceLandmarks && results.multiFaceLandmarks[0]) {
    const lm = results.multiFaceLandmarks[0];
    const w = canvasElement.width;
    const h = canvasElement.height;

    // Landmarks
    const leftEar = { x: lm[132].x * w, y: lm[132].y * h };
    const rightEar = { x: lm[361].x * w, y: lm[361].y * h };
    const neck = { x: lm[152].x * w, y: lm[152].y * h };
    const nose = { x: lm[1].x * w, y: lm[1].y * h };

    // --- PHYSICS ENGINE (Gravity & Swing) ---
    // Calculate Head Roll (Tilt)
    const rawHeadTilt = Math.atan2(rightEar.y - leftEar.y, rightEar.x - leftEar.x);
    
    // Physics Simulation: Spring System
    // Target angle is Vertical (Gravity) relative to head tilt
    // If head tilts right, earring should hang vertical (rotate left relative to head)
    const gravityTarget = -rawHeadTilt; 
    
    // Apply inertia
    const force = (gravityTarget - physics.earringAngle) * 0.1; // Spring stiffness
    physics.earringVelocity += force;
    physics.earringVelocity *= 0.85; // Damping (Air resistance)
    physics.earringAngle += physics.earringVelocity;

    const earDist = Math.hypot(rightEar.x - leftEar.x, rightEar.y - leftEar.y);

    // --- EARRINGS LOGIC (Side View & Physics) ---
    if (earringImg && earringImg.complete) {
      let ew = earDist * 0.25;
      let eh = (earringImg.height/earringImg.width) * ew;

      // Detect Side View (Yaw)
      // Check distance from nose to ears. If nose is too close to one ear, hide the other.
      const distToLeft = Math.hypot(nose.x - leftEar.x, nose.y - leftEar.y);
      const distToRight = Math.hypot(nose.x - rightEar.x, nose.y - rightEar.y);
      const ratio = distToLeft / (distToLeft + distToRight);

      // Draw Left Earring (only if visible)
      if (ratio > 0.2) { 
          canvasCtx.save();
          canvasCtx.translate(leftEar.x, leftEar.y);
          canvasCtx.rotate(physics.earringAngle); // Apply Gravity
          canvasCtx.drawImage(earringImg, -ew/2, 0, ew, eh);
          canvasCtx.restore();
      }

      // Draw Right Earring (only if visible)
      if (ratio < 0.8) {
          canvasCtx.save();
          canvasCtx.translate(rightEar.x, rightEar.y);
          canvasCtx.rotate(physics.earringAngle); // Apply Gravity
          canvasCtx.drawImage(earringImg, -ew/2, 0, ew, eh);
          canvasCtx.restore();
      }
    }

    // --- NECKLACE LOGIC (Auto-Sizing) ---
    if (necklaceImg && necklaceImg.complete) {
      // Auto-Size based on ear distance (proxy for body size)
      let nw = earDist * 0.85; // Snug fit
      let nh = (necklaceImg.height/necklaceImg.width) * nw;
      
      canvasCtx.drawImage(necklaceImg, neck.x - nw/2, neck.y + (earDist*0.2), nw, nh);
    }
  }
  canvasCtx.restore();
});

/* --- INIT CAMERA --- */
async function startCameraFast() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } });
        videoElement.srcObject = stream;
        videoElement.onloadeddata = () => { 
            videoElement.play(); 
            loadingStatus.textContent = "Loading AI Models..."; 
            detectLoop();
            initVoiceControl(); // Start AI Voice
        };
    } catch (err) { alert("Camera Error"); }
}

async function detectLoop() {
    if (videoElement.readyState >= 2) {
        // Send frames to AI
        if (!isProcessingFace) { isProcessingFace = true; await faceMesh.send({image: videoElement}); }
        if (!isProcessingHand) { isProcessingHand = true; await hands.send({image: videoElement}); }
    }
    requestAnimationFrame(detectLoop);
}
window.onload = startCameraFast;

/* --- UI LOGIC --- */
function navigateJewelry(dir) {
  if (!currentType || !PRELOADED_IMAGES[currentType]) return;
  const list = PRELOADED_IMAGES[currentType];
  let currentImg = (currentType === 'earrings') ? earringImg : (currentType === 'chains') ? necklaceImg : (currentType === 'rings') ? ringImg : bangleImg;
  let idx = list.indexOf(currentImg);
  if (idx === -1) idx = 0; 
  let nextIdx = (idx + dir + list.length) % list.length;
  const nextItem = list[nextIdx];
  if (currentType === 'earrings') earringImg = nextItem;
  else if (currentType === 'chains') necklaceImg = nextItem;
  else if (currentType === 'rings') ringImg = nextItem;
  else if (currentType === 'bangles') bangleImg = nextItem;
}

async function selectJewelryType(type) {
  currentType = type;
  // Reset images
  if(type !== 'earrings') earringImg = null;
  if(type !== 'chains') necklaceImg = null;
  if(type !== 'rings') ringImg = null;
  if(type !== 'bangles') bangleImg = null;

  await preloadCategory(type); 
  const container = document.getElementById('jewelry-options');
  container.innerHTML = ''; container.style.display = 'flex';
  if (!JEWELRY_ASSETS[type]) return;
  JEWELRY_ASSETS[type].forEach((file, i) => {
    const btnImg = new Image(); btnImg.src = file.src; btnImg.crossOrigin = 'anonymous'; btnImg.className = "thumb-btn"; 
    btnImg.onclick = () => {
        const fullImg = PRELOADED_IMAGES[type][i];
        if (type === 'earrings') earringImg = fullImg;
        else if (type === 'chains') necklaceImg = fullImg;
        else if (type === 'rings') ringImg = fullImg;
        else if (type === 'bangles') bangleImg = fullImg;
    };
    container.appendChild(btnImg);
  });
}

function toggleTryAll() {
    if (!currentType) { alert("Select category!"); return; }
    if (autoTryRunning) stopAutoTry(); else startAutoTry();
}
function startAutoTry() {
    autoTryRunning = true; autoSnapshots = []; autoTryIndex = 0;
    document.getElementById('tryall-btn').textContent = "STOP";
    runAutoStep();
}
function stopAutoTry() {
    autoTryRunning = false; clearTimeout(autoTryTimeout);
    document.getElementById('tryall-btn').textContent = "Try All";
    if (autoSnapshots.length > 0) showGallery();
}
async function runAutoStep() {
    if (!autoTryRunning) return;
    const assets = PRELOADED_IMAGES[currentType];
    if (!assets || autoTryIndex >= assets.length) { stopAutoTry(); return; }
    // Set image
    const targetImg = assets[autoTryIndex];
    if (currentType === 'earrings') earringImg = targetImg;
    else if (currentType === 'chains') necklaceImg = targetImg;
    else if (currentType === 'rings') ringImg = targetImg;
    else if (currentType === 'bangles') bangleImg = targetImg;
    // Wait then Snap
    autoTryTimeout = setTimeout(() => { captureToGallery(); autoTryIndex++; runAutoStep(); }, 1500); 
}

/* --- CAPTURE & GALLERY --- */
function captureToGallery() {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = videoElement.videoWidth; tempCanvas.height = videoElement.videoHeight;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.translate(tempCanvas.width, 0); tempCtx.scale(-1, 1); tempCtx.drawImage(videoElement, 0, 0);
  tempCtx.setTransform(1, 0, 0, 1, 0, 0); 
  try { tempCtx.drawImage(canvasElement, 0, 0); } catch(e) {}
  
  // Branding
  const padding = 20; 
  tempCtx.font = "bold 24px Montserrat, sans-serif"; tempCtx.textAlign = "left"; tempCtx.textBaseline = "bottom";
  tempCtx.fillStyle = "white"; tempCtx.fillText("Jewels-Ai Look", padding, tempCanvas.height - padding);
  if (watermarkImg.complete) {
      const wWidth = tempCanvas.width * 0.25; const wHeight = (watermarkImg.height / watermarkImg.width) * wWidth;
      tempCtx.drawImage(watermarkImg, tempCanvas.width - wWidth - padding, tempCanvas.height - wHeight - padding, wWidth, wHeight);
  }
  
  const dataUrl = tempCanvas.toDataURL('image/png');
  autoSnapshots.push({ url: dataUrl, name: `Look_${Date.now()}.png` });
  return { url: dataUrl, name: `Look_${Date.now()}.png` }; 
}
function takeSnapshot() { const shotData = captureToGallery(); currentPreviewData = shotData; document.getElementById('preview-image').src = shotData.url; document.getElementById('preview-modal').style.display = 'flex'; }
function closePreview() { document.getElementById('preview-modal').style.display = 'none'; }
function showGallery() {
  const grid = document.getElementById('gallery-grid'); grid.innerHTML = '';
  autoSnapshots.forEach((item, index) => {
    const img = document.createElement('img'); img.src = item.url; img.className = "gallery-thumb";
    img.onclick = () => { document.getElementById('lightbox-image').src = item.url; document.getElementById('lightbox-overlay').style.display = 'flex'; };
    grid.appendChild(img);
  });
  document.getElementById('gallery-modal').style.display = 'flex';
}
function closeGallery() { document.getElementById('gallery-modal').style.display = 'none'; }
function closeLightbox() { document.getElementById('lightbox-overlay').style.display = 'none'; }

/* --- EXPORTS --- */
window.selectJewelryType = selectJewelryType; window.toggleTryAll = toggleTryAll;
window.closeGallery = closeGallery; window.closeLightbox = closeLightbox; window.takeSnapshot = takeSnapshot;
window.downloadAllAsZip = downloadAllAsZip; window.closePreview = closePreview;
window.downloadSingleSnapshot = downloadSingleSnapshot; window.shareSingleSnapshot = shareSingleSnapshot;
window.confirmWhatsAppDownload = confirmWhatsAppDownload; window.closeWhatsAppModal = closeWhatsAppModal;
window.toggleChatbot = function() { const b = document.getElementById('chatbot-box'); b.style.display = b.style.display==='flex'?'none':'flex'; };