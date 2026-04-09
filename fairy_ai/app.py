from flask import Flask, render_template, request, jsonify
import requests

app = Flask(__name__)

OLLAMA_URL = "http://localhost:11434/api/generate"

# -------------------------
# Global memory for personality + chat history
# -------------------------
memory = {
    "personality": (
        "You are Fairy AI, created by a man known as Karma. "
        "You are friendly, playful "
        "but always helpful. Keep replies short, clear, and lively."
    ),
    "history": []  # stores last 20 messages
}


def is_ollama_running():
    try:
        requests.get("http://localhost:11434", timeout=2)
        return True
    except:
        return False


def ask_fairy(new_messages):
    if not is_ollama_running():
        return "⚠️ Start Ollama using: ollama serve"

    # Append new messages to memory
    memory["history"].extend(new_messages)

    # Keep only last 20 messages to save context
    memory["history"] = memory["history"][-20:]

    # Build conversation string
    convo = memory["personality"] + "\n\n"
    for msg in memory["history"]:
        role = msg.get("role")
        content = msg.get("content")
        if role == "user":
            convo += f"User: {content}\n"
        elif role == "assistant":
            convo += f"Fairy AI: {content}\n"
    convo += "Fairy AI:"

    payload = {
        "model": "llama3",
        "prompt": convo,
        "stream": False
    }

    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=120)
        response.raise_for_status()
        data = response.json()
        return data.get("response", "No response.")
    except requests.exceptions.Timeout:
        return "⚠️ Request timed out."
    except requests.exceptions.RequestException as e:
        return f"⚠️ API error: {str(e)}"
    except Exception as e:
        return f"⚠️ Error: {str(e)}"


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json()
    messages = data.get("messages", [])

    if not messages:
        return jsonify({"response": "Say something first."})

    answer = ask_fairy(messages)
    
    # Append AI response to memory
    memory["history"].append({"role": "assistant", "content": answer})

    return jsonify({"response": answer})


if __name__ == "__main__":
    app.run(debug=True)