package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"os"
	"path/filepath"
	"song-recognition/db"
	"song-recognition/models"
	"song-recognition/shazam"
	"song-recognition/spotify"
	"song-recognition/spotdl"
	"song-recognition/utils"
	"song-recognition/wav"
	"strconv"
	"strings"

	socketio "github.com/googollee/go-socket.io"
	"github.com/mdobak/go-xerrors"
)

func downloadStatus(statusType, message string) string {
	data := map[string]interface{}{"type": statusType, "message": message}
	jsonData, err := json.Marshal(data)
	if err != nil {
		logger := utils.GetLogger()
		ctx := context.Background()
		err := xerrors.New(err)
		logger.ErrorContext(ctx, "failed to marshal data.", slog.Any("error", err))
		return ""
	}
	return string(jsonData)
}

func handleTotalSongs(socket socketio.Conn) {
	logger := utils.GetLogger()
	ctx := context.Background()

	db, err := db.NewDBClient()
	if err != nil {
		err := xerrors.New(err)
		logger.ErrorContext(ctx, "error connecting to DB", slog.Any("error", err))
		return
	}
	defer db.Close()

	totalSongs, err := db.TotalSongs()
	if err != nil {
		err := xerrors.New(err)
		logger.ErrorContext(ctx, "Log error getting total songs", slog.Any("error", err))
		return
	}

	socket.Emit("totalSongs", totalSongs)
}

func handleSongDownload(socket socketio.Conn, spotifyURL string) {
	logger := utils.GetLogger()
	ctx := context.Background()

	// Use spotdl for downloading
	progress, err := spotdl.DownloadSong(spotifyURL, "original_songs", socket)
	if err != nil {
		err := xerrors.New(err)
		logger.ErrorContext(ctx, "failed to download song with spotdl", slog.Any("error", err))
		socket.Emit("downloadStatus", downloadStatus("error", "Failed to download song"))
		return
	}

	if progress.Error != "" {
		socket.Emit("downloadStatus", downloadStatus("error", progress.Error))
		return
	}

	// Send final success message
	statusMsg := fmt.Sprintf("'%s' by '%s' downloaded successfully", progress.Title, progress.Artist)
	socket.Emit("downloadStatus", downloadStatus("success", statusMsg))
}

func handleNewRecording(socket socketio.Conn, recordData string) {
	logger := utils.GetLogger()
	ctx := context.Background()

	var recData models.RecordData
	if err := json.Unmarshal([]byte(recordData), &recData); err != nil {
		err := xerrors.New(err)
		logger.ErrorContext(ctx, "Failed to unmarshal record data.", slog.Any("error", err))
		return
	}

	samples, err := utils.ProcessRecording(&recData, true)
	if err != nil {
		err := xerrors.New(err)
		logger.ErrorContext(ctx, "Failed to process recording.", slog.Any("error", err))
		return
	}

	matches, _, err := shazam.FindMatches(samples, recData.Duration, recData.SampleRate)
	if err != nil {
		err := xerrors.New(err)
		logger.ErrorContext(ctx, "failed to get matches.", slog.Any("error", err))
	}

	jsonData, err := json.Marshal(matches)
	if len(matches) > 10 {
		jsonData, _ = json.Marshal(matches[:10])
	}

	if err != nil {
		err := xerrors.New(err)
		logger.ErrorContext(ctx, "failed to marshal matches.", slog.Any("error", err))
		return
	}

	socket.Emit("matches", string(jsonData))
}

func handleGetAllSongs(socket socketio.Conn) {
	logger := utils.GetLogger()
	ctx := context.Background()

	dbClient, err := db.NewDBClient()
	if err != nil {
		err := xerrors.New(err)
		logger.ErrorContext(ctx, "error connecting to DB", slog.Any("error", err))
		socket.Emit("allSongs", "[]")
		return
	}
	defer dbClient.Close()

	songs, err := dbClient.GetAllSongs()
	if err != nil {
		err := xerrors.New(err)
		logger.ErrorContext(ctx, "error getting all songs", slog.Any("error", err))
		socket.Emit("allSongs", "[]")
		return
	}

	jsonData, err := json.Marshal(songs)
	if err != nil {
		err := xerrors.New(err)
		logger.ErrorContext(ctx, "failed to marshal songs", slog.Any("error", err))
		socket.Emit("allSongs", "[]")
		return
	}

	socket.Emit("allSongs", string(jsonData))
}

func handleDeleteSong(socket socketio.Conn, songID string) {
	logger := utils.GetLogger()
	ctx := context.Background()

	// Convert string ID to uint32
	id64, err := strconv.ParseUint(songID, 10, 32)
	if err != nil {
		socket.Emit("deleteResult", downloadStatus("error", "Invalid song ID"))
		return
	}
	songIDUint := uint32(id64)

	dbClient, err := db.NewDBClient()
	if err != nil {
		err := xerrors.New(err)
		logger.ErrorContext(ctx, "error connecting to DB", slog.Any("error", err))
		socket.Emit("deleteResult", downloadStatus("error", "Database connection failed"))
		return
	}
	defer dbClient.Close()

	// Get song info before deletion
	song, found, err := dbClient.GetSongByID(songIDUint)
	if err != nil {
		err := xerrors.New(err)
		logger.ErrorContext(ctx, "error getting song", slog.Any("error", err))
		socket.Emit("deleteResult", downloadStatus("error", "Song not found"))
		return
	}

	if !found {
		socket.Emit("deleteResult", downloadStatus("error", "Song not found"))
		return
	}

	// Delete song from database
	err = dbClient.DeleteSongByID(songIDUint)
	if err != nil {
		err := xerrors.New(err)
		logger.ErrorContext(ctx, "error deleting song", slog.Any("error", err))
		socket.Emit("deleteResult", downloadStatus("error", "Failed to delete song"))
		return
	}

	// Try to delete the corresponding WAV file
	fileName := strings.ReplaceAll(song.Title, "/", "_") + " - " + strings.ReplaceAll(song.Artist, "/", "_") + ".wav"
	filePath := filepath.Join(SONGS_DIR, fileName)
	if err := os.Remove(filePath); err != nil {
		// Log but don't fail - file might not exist or have different name
		logger.ErrorContext(ctx, "warning: could not delete song file", slog.Any("error", err))
	}

	statusMsg := fmt.Sprintf("'%s' by '%s' deleted successfully", song.Title, song.Artist)
	socket.Emit("deleteResult", downloadStatus("success", statusMsg))
	socket.Emit("totalSongs", "") // Trigger refresh of total songs
}

func handleDeleteAllSongs(socket socketio.Conn) {
	logger := utils.GetLogger()
	ctx := context.Background()

	dbClient, err := db.NewDBClient()
	if err != nil {
		err := xerrors.New(err)
		logger.ErrorContext(ctx, "error connecting to DB", slog.Any("error", err))
		socket.Emit("deleteAllResult", downloadStatus("error", "Database connection failed"))
		return
	}
	defer dbClient.Close()

	// Get total count before deletion
	totalSongs, err := dbClient.TotalSongs()
	if err != nil {
		err := xerrors.New(err)
		logger.ErrorContext(ctx, "error getting total songs", slog.Any("error", err))
	}

	// Delete all fingerprints and songs
	err = dbClient.DeleteCollection("fingerprints")
	if err != nil {
		err := xerrors.New(err)
		logger.ErrorContext(ctx, "error deleting fingerprints", slog.Any("error", err))
		socket.Emit("deleteAllResult", downloadStatus("error", "Failed to delete fingerprints"))
		return
	}

	err = dbClient.DeleteCollection("songs")
	if err != nil {
		err := xerrors.New(err)
		logger.ErrorContext(ctx, "error deleting songs", slog.Any("error", err))
		socket.Emit("deleteAllResult", downloadStatus("error", "Failed to delete songs"))
		return
	}

	// Delete all WAV files in songs directory
	err = filepath.Walk(SONGS_DIR, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && filepath.Ext(path) == ".wav" {
			return os.Remove(path)
		}
		return nil
	})
	if err != nil {
		logger.ErrorContext(ctx, "warning: could not delete all song files", slog.Any("error", err))
	}

	statusMsg := fmt.Sprintf("Successfully deleted %d songs from library", totalSongs)
	socket.Emit("deleteAllResult", downloadStatus("success", statusMsg))
	socket.Emit("totalSongs", "") // Trigger refresh of total songs
}

func handleFingerprinting(socket socketio.Conn, filename string) {
	logger := utils.GetLogger()
	ctx := context.Background()

	// If no filename provided, get the latest file from original_songs
	var filePath string
	if filename == "" {
		latestFile, err := spotdl.GetLatestDownloadedFile("original_songs")
		if err != nil {
			socket.Emit("fingerprintStatus", downloadStatus("error", "No downloaded files found"))
			return
		}
		filePath = latestFile
	} else {
		// Get the full path to the downloaded file
		filePath = filepath.Join("original_songs", filename)
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			// Try to find the file with different extensions
			baseName := strings.TrimSuffix(filename, filepath.Ext(filename))
			possibleExts := []string{".mp3", ".wav", ".flac", ".m4a"}
			found := false
			
			for _, ext := range possibleExts {
				testPath := filepath.Join("original_songs", baseName+ext)
				if _, err := os.Stat(testPath); err == nil {
					filePath = testPath
					found = true
					break
				}
			}
			
			if !found {
				socket.Emit("fingerprintStatus", downloadStatus("error", fmt.Sprintf("File not found: %s", filename)))
				return
			}
		}
	}

	socket.Emit("fingerprintStatus", downloadStatus("info", "Starting fingerprinting process..."))

	// Extract metadata from the file
	metadata, err := wav.GetMetadata(filePath)
	if err != nil {
		err := xerrors.New(err)
		logger.ErrorContext(ctx, "failed to get metadata", slog.Any("error", err))
		socket.Emit("fingerprintStatus", downloadStatus("error", "Failed to extract metadata"))
		return
	}

	socket.Emit("fingerprintStatus", downloadStatus("info", "Processing audio file..."))

	// Parse duration
	durationFloat, err := strconv.ParseFloat(metadata.Format.Duration, 64)
	if err != nil {
		err := xerrors.New(err)
		logger.ErrorContext(ctx, "failed to parse duration", slog.Any("error", err))
		socket.Emit("fingerprintStatus", downloadStatus("error", "Invalid audio duration"))
		return
	}

	// Get metadata tags
	tags := metadata.Format.Tags
	track := &spotify.Track{
		Album:    tags["album"],
		Artist:   tags["artist"],
		Title:    tags["title"],
		Duration: int(math.Round(durationFloat)),
	}

	// Get YouTube ID
	socket.Emit("fingerprintStatus", downloadStatus("info", "Getting YouTube ID..."))
	ytID, err := spotify.GetYoutubeId(*track)
	if err != nil {
		err := xerrors.New(err)
		logger.ErrorContext(ctx, "failed to get YouTube ID", slog.Any("error", err))
		// Continue without YouTube ID
		ytID = ""
	}

	// Validate required fields
	if track.Title == "" || track.Artist == "" {
		socket.Emit("fingerprintStatus", downloadStatus("error", "Missing title or artist in metadata"))
		return
	}

	socket.Emit("fingerprintStatus", downloadStatus("info", "Creating fingerprints..."))

	// Process and save the song
	err = spotify.ProcessAndSaveSong(filePath, track.Title, track.Artist, ytID)
	if err != nil {
		if strings.Contains(err.Error(), "already exists") || strings.Contains(err.Error(), "UNIQUE constraint") {
			statusMsg := fmt.Sprintf("'%s' by '%s' already exists in database - skipping fingerprinting", track.Title, track.Artist)
			socket.Emit("fingerprintStatus", downloadStatus("success", statusMsg))
			return
		}
		
		err := xerrors.New(err)
		logger.ErrorContext(ctx, "failed to process and save song", slog.Any("error", err))
		socket.Emit("fingerprintStatus", downloadStatus("error", "Failed to create fingerprints"))
		return
	}

	socket.Emit("fingerprintStatus", downloadStatus("info", "Moving to songs directory..."))

	// Move song to songs directory
	fileName := strings.TrimSuffix(filepath.Base(filePath), filepath.Ext(filePath))
	wavFile := fileName + ".wav"
	sourcePath := filepath.Join(filepath.Dir(filePath), wavFile)
	newFilePath := filepath.Join(SONGS_DIR, wavFile)
	
	if err := os.Rename(sourcePath, newFilePath); err != nil {
		err := xerrors.New(err)
		logger.ErrorContext(ctx, "failed to move file", slog.Any("error", err))
		socket.Emit("fingerprintStatus", downloadStatus("error", "Failed to move processed file"))
		return
	}

	// Clean up: Delete the original file from original_songs directory
	socket.Emit("fingerprintStatus", downloadStatus("info", "Cleaning up temporary files..."))
	if err := os.Remove(filePath); err != nil {
		// Log the error but don't fail the entire process
		logger.ErrorContext(ctx, "failed to clean up original file", slog.Any("error", err))
	}

	// Success message
	statusMsg := fmt.Sprintf("'%s' by '%s' successfully fingerprinted and saved to database", track.Title, track.Artist)
	socket.Emit("fingerprintStatus", downloadStatus("success", statusMsg))
}
