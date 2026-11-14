import json
from pathlib import Path
from flask import Flask, jsonify

app = Flask(__name__)

# Locate scraped_data.json relative to server.py
DATA_FILE = Path(__file__).resolve().parent / "scraped_data.json"


@app.route("/", methods=["GET"])
def get_scraped_data():
    # Return 404 if data file is missing
    if not DATA_FILE.is_file():
        return jsonify({"error": "Scraped data file not found"}), 404

    # Read and return JSON data
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as file:
            data = json.load(file)
        return jsonify(data), 200
    except (json.JSONDecodeError, OSError):
        return jsonify({"error": "Unable to read or parse scraped data"}), 500


if __name__ == "__main__":
    # Host 0.0.0.0 allows external access (required for container port mapping)
    app.run(host="0.0.0.0", port=5000, debug=False)
