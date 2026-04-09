let recognition;
let isListening = true;
let messages = []; // conversation memory
let recognitionRunning = false;

// ----------------------
// Initialize Speech Recognition
// ----------------------
function initSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Voice not supported in your browser");
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false; // ⚡ reduce CPU/RAM load

    recognition.onstart = () => { recognitionRunning = true; };
    recognition.onend = () => {
        recognitionRunning = false;
        if (isListening && !recognitionRunning) {
            try { recognition.start(); } catch (e) { console.warn("Recognition already started"); }
        }
    };

    recognition.onerror = (e) => {
        if (e.error !== "no-speech") console.error("Recognition error:", e);
        // ignore no-speech to prevent spam
    };

    recognition.onresult = async (event) => {
        const transcript = event.results[event.resultIndex][0].transcript.trim();
        if (transcript) await handleUserInput(transcript);
    };

    try { recognition.start(); } catch(e) { console.warn("Recognition failed to start"); }
}
// ----------------------
// Click-to-activate introduction
// ----------------------
const eye = document.getElementById("fairy-eye");
const pupil = document.querySelector(".pupil");

function lookAtCursor(e) {
    if (!eye || !pupil) return;

    const rect = eye.getBoundingClientRect();
    const eyeX = rect.left + rect.width / 2;
    const eyeY = rect.top + rect.height / 2;

    const dx = e.clientX - eyeX;
    const dy = e.clientY - eyeY;

    const maxMovement = 30;
    const angle = Math.atan2(dy, dx);
    const distance = Math.min(maxMovement, Math.hypot(dx, dy));

    const pupilX = distance * Math.cos(angle);
    const pupilY = distance * Math.sin(angle);

    pupil.style.transform = `translate(${pupilX}px, ${pupilY}px)`;
}

// Attach mousemove for looking around
document.addEventListener("mousemove", lookAtCursor);

// Introduce fairy and prompt user
function startFairyIntro() {
    animateEye(); // blink before speaking

    const introText = "Hello! I am your assistant Fairy AI. I can chat, answer questions, and help you explore. What would you like to ask me first?";
    speak(introText);
}

// Click the eye to start
eye.addEventListener("click", () => {
    startFairyIntro();
});
// ----------------------
// Stop listening
// ----------------------
function stopListening() {
    isListening = false;
    if (recognition && recognitionRunning) recognition.stop();
}

// ----------------------
// Animate fairy eye
// ----------------------
function animateEye(duration = 150) {
    const eye = document.getElementById("fairy-eye");
    if (!eye) return;

    eye.classList.add("blink");
    setTimeout(() => eye.classList.remove("blink"), duration);
}

// ----------------------
// Natural blinking (random intervals)
// ----------------------
function naturalBlink() {
    const eye = document.getElementById("fairy-eye");
    if (!eye) return;

    const blinkCount = Math.random() < 0.2 ? 2 : 1;
    let delay = 0;
    for (let i = 0; i < blinkCount; i++) {
        setTimeout(() => animateEye(100 + Math.random() * 50), delay);
        delay += 120 + Math.random() * 80;
    }

    setTimeout(naturalBlink, 2500 + Math.random() * 4000); // 2.5–6.5s next blink
}

// Start natural blinking on page load
window.addEventListener("DOMContentLoaded", () => {
    naturalBlink();
});

// ----------------------
// Speak text using TTS
// ----------------------
function speak(text) {
    if (!text || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;

    // Quick blink before speaking
    animateEye();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.95;  // playful tone
    utterance.pitch = 1.1;  // subtle personality

    speechSynthesis.speak(utterance);
}

// ----------------------
// Handle user input
// ----------------------
async function handleUserInput(text) {
    // Keep memory short for low RAM
    if (messages.length > 8) messages.shift(); 
    messages.push({ role: "user", content: text });

    try {
        const response = await fetch("/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: messages })
        });

        const data = await response.json();
        const reply = data.response || "Hmm… I don't know.";

        messages.push({ role: "assistant", content: reply });
        speak(reply);

    } catch (err) {
        console.error("Error fetching AI response:", err);
        speak("Oops, something went wrong!");
    }
}