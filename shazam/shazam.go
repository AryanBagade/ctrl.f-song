package shazam

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"os/exec"
	"song-recognition/db"
	"time"
)

// SongInfo represents the JSON structure from recognize_song.py
type SongInfo struct {
	Title  string `json:"title"`
	Artist string `json:"artist"`
}

// Match represents a recognized song match
type Match struct {
	SongID     uint32
	SongTitle  string
	SongArtist string
	YouTubeID  string
	Timestamp  uint32
	Score      float64
}

// runPythonScript executes a Python script and returns its output
func runPythonScript(script string) (string, error) {
	cmd := exec.Command("python3", script)

	var out bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &out // Capture standard error output

	err := cmd.Run()
	return out.String(), err
}

// FindMatches processes the recorded song and finds a match in the database
func FindMatches(audioSamples []float64, audioDuration float64, sampleRate int) ([]Match, time.Duration, error) {
	startTime := time.Now()

	fmt.Println("🚀 Running `watch_recordings.py` to copy the latest recording...")
	output, err := runPythonScript("shazam/watch_recordings.py")
	if err != nil {
		log.Fatalf("❌ Error running watch_recordings.py: %v\nOutput: %s", err, output)
	}
	fmt.Println("✅ Copy successful!\n", output)

	fmt.Println("🎵 Running `recognize_song.py` to identify the song...")
	output, err = runPythonScript("shazam/recognize_song.py")
	if err != nil {
		log.Fatalf("❌ Error running recognize_song.py: %v\nOutput: %s", err, output)
	}

	// 🔍 Debugging: Print raw Python output
	fmt.Println("🔍 Raw Output from Python:\n", output)

	// ✅ Step 3: Extract the song title from JSON output
	var songInfo SongInfo
	err = json.Unmarshal([]byte(output), &songInfo)
	if err != nil {
		log.Fatalf("❌ Failed to parse JSON: %v", err)
	}

	recognizedTitle := songInfo.Title
	fmt.Printf("🎶 Recognized Song: %s\n", recognizedTitle)

	// ✅ Step 4: Connect to the database
	dbInstance, err := db.NewSQLiteClient("db.sqlite3")
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}
	defer dbInstance.Close()

	// ✅ Step 5: Fetch song by title from the database
	song, found, err := dbInstance.GetSongByTitle(recognizedTitle)
	if err != nil {
		log.Fatalf("❌ Database error: %v", err)
	}

	// ✅ Step 6: Prepare the match list
	var matches []Match
	if found {
		// 🎯 Song is found, add to matches list
		fmt.Printf("✅ Song FOUND in database: %s by %s (YouTube ID: %s)\n", song.Title, song.Artist, song.YouTubeID)

		match := Match{
			SongID:     0, // No songID needed
			SongTitle:  song.Title,
			SongArtist: song.Artist,
			YouTubeID:  song.YouTubeID,
			Timestamp:  0,   // No timestamp needed
			Score:      1.0, // High confidence since it's an exact match
		}
		matches = append(matches, match)
	} else {
		// ❌ Song not found, return an empty match list
		fmt.Printf("❌ Song NOT found in database: %s\n", recognizedTitle)
	}

	// ✅ Return the matches
	return matches, time.Since(startTime), nil
}
