import asyncio
import re
import json
from shazamio import Shazam

def clean_string(s):
    """
    Removes content inside parentheses or square brackets (and the brackets themselves)
    along with any whitespace immediately preceding them.

    Args:
        s (str): The input string.

    Returns:
        str: The cleaned string.
    """
    cleaned = re.sub(r'\s*[\(\[].*?[\)\]]', '', s)  # Remove text inside parentheses or brackets
    return cleaned.strip()

async def recognize_song(file_path):
    shazam = Shazam()
    result = await shazam.recognize(file_path)
    
    if result and 'track' in result:
        track = result['track']
        title = track.get('title', 'Unknown')
        artist = track.get('subtitle', 'Unknown')

        # ✅ Clean the title before outputting
        cleaned_title = clean_string(title)

        print(json.dumps({"title": cleaned_title, "artist": artist}))  # JSON Output
    else:
        print(json.dumps({"title": "Not Found", "artist": "Not Found"}))

if __name__ == "__main__":
    file_path = 'processed/main.wav'
    asyncio.run(recognize_song(file_path))