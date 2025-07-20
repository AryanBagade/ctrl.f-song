import os
import shutil

# Directories
RECORDINGS_DIR = "recordings"
DEST_DIR = "processed"
DEST_FILE = os.path.join(DEST_DIR, "main.wav")

def get_latest_file(directory):
    """Returns the latest `.wav` file from the given directory."""
    wav_files = [f for f in os.listdir(directory) if f.endswith(".wav")]

    if not wav_files:
        print("❌ No .wav files found in recordings directory.")
        return None

    latest_file = max(wav_files, key=lambda f: os.path.getmtime(os.path.join(directory, f)))
    return os.path.join(directory, latest_file)

def copy_latest_file():
    """Copies the latest `.wav` file to the destination as `main.wav`, overwriting if necessary."""
    latest_file = get_latest_file(RECORDINGS_DIR)

    if latest_file:
        os.makedirs(DEST_DIR, exist_ok=True)  # Ensure destination folder exists

        shutil.copy2(latest_file, DEST_FILE)  # Copy with metadata
        print(f"✅ Copied: {latest_file} ➝ {DEST_FILE}")
    else:
        print("⚠️ No file was copied.")

if __name__ == "__main__":
    copy_latest_file()