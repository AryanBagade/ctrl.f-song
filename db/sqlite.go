package db

import (
	"database/sql"
	"fmt"
	"song-recognition/models"
	"song-recognition/utils"
	"strings"

	"github.com/mattn/go-sqlite3"
)

type SQLiteClient struct {
	db *sql.DB
}

func NewSQLiteClient(dataSourceName string) (*SQLiteClient, error) {
	db, err := sql.Open("sqlite3", dataSourceName)
	if err != nil {
		return nil, fmt.Errorf("error connecting to SQLite: %s", err)
	}

	err = createTables(db)
	if err != nil {
		return nil, fmt.Errorf("error creating tables: %s", err)
	}

	return &SQLiteClient{db: db}, nil
}

// createTables creates the required tables if they don't exist
func createTables(db *sql.DB) error {
	createSongsTable := `
    CREATE TABLE IF NOT EXISTS songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        ytID TEXT UNIQUE,
        key TEXT NOT NULL UNIQUE
    );
    `

	createFingerprintsTable := `
    CREATE TABLE IF NOT EXISTS fingerprints (
        address INTEGER NOT NULL,
        anchorTimeMs INTEGER NOT NULL,
        songID INTEGER NOT NULL,
        PRIMARY KEY (address, anchorTimeMs, songID)
    );
    `

	_, err := db.Exec(createSongsTable)
	if err != nil {
		return fmt.Errorf("error creating songs table: %s", err)
	}

	_, err = db.Exec(createFingerprintsTable)
	if err != nil {
		return fmt.Errorf("error creating fingerprints table: %s", err)
	}

	return nil
}

func (db *SQLiteClient) Close() error {
	if db.db != nil {
		return db.db.Close()
	}
	return nil
}

func (db *SQLiteClient) StoreFingerprints(fingerprints map[uint32]models.Couple) error {
	tx, err := db.db.Begin()
	if err != nil {
		return fmt.Errorf("error starting transaction: %s", err)
	}

	stmt, err := tx.Prepare("INSERT OR REPLACE INTO fingerprints (address, anchorTimeMs, songID) VALUES (?, ?, ?)")
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("error preparing statement: %s", err)
	}
	defer stmt.Close()

	for address, couple := range fingerprints {
		if _, err := stmt.Exec(address, couple.AnchorTimeMs, couple.SongID); err != nil {
			tx.Rollback()
			return fmt.Errorf("error executing statement: %s", err)
		}
	}

	return tx.Commit()
}

func (db *SQLiteClient) GetCouples(addresses []uint32) (map[uint32][]models.Couple, error) {
	couples := make(map[uint32][]models.Couple)

	for _, address := range addresses {
		rows, err := db.db.Query("SELECT anchorTimeMs, songID FROM fingerprints WHERE address = ?", address)
		if err != nil {
			return nil, fmt.Errorf("error querying database: %s", err)
		}
		defer rows.Close()

		var docCouples []models.Couple
		for rows.Next() {
			var couple models.Couple
			if err := rows.Scan(&couple.AnchorTimeMs, &couple.SongID); err != nil {
				return nil, fmt.Errorf("error scanning row: %s", err)
			}
			docCouples = append(docCouples, couple)
		}
		couples[address] = docCouples
	}

	return couples, nil
}

func (db *SQLiteClient) TotalSongs() (int, error) {
	var count int
	err := db.db.QueryRow("SELECT COUNT(*) FROM songs").Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("error counting songs: %s", err)
	}
	return count, nil
}

func (db *SQLiteClient) RegisterSong(songTitle, songArtist, ytID string) (uint32, error) {
	tx, err := db.db.Begin()
	if err != nil {
		return 0, fmt.Errorf("error starting transaction: %s", err)
	}

	stmt, err := tx.Prepare("INSERT INTO songs (id, title, artist, ytID, key) VALUES (?, ?, ?, ?, ?)")
	if err != nil {
		tx.Rollback()
		return 0, fmt.Errorf("error preparing statement: %s", err)
	}
	defer stmt.Close()

	songID := utils.GenerateUniqueID()
	songKey := utils.GenerateSongKey(songTitle, songArtist)
	if _, err := stmt.Exec(songID, songTitle, songArtist, ytID, songKey); err != nil {
		tx.Rollback()
		if sqliteErr, ok := err.(sqlite3.Error); ok && sqliteErr.Code == sqlite3.ErrConstraint {
			return 0, fmt.Errorf("song with ytID or key already exists: %v", err)
		}
		return 0, fmt.Errorf("failed to register song: %v", err)
	}

	return songID, tx.Commit()
}

var sqlitefilterKeys = "id | ytID | key"

// GetSong retrieves a song by filter key
func (s *SQLiteClient) GetSong(filterKey string, value interface{}) (Song, bool, error) {

	if !strings.Contains(sqlitefilterKeys, filterKey) {
		return Song{}, false, fmt.Errorf("invalid filter key")
	}

	query := fmt.Sprintf("SELECT title, artist, ytID FROM songs WHERE %s = ?", filterKey)

	row := s.db.QueryRow(query, value)

	var song Song
	err := row.Scan(&song.Title, &song.Artist, &song.YouTubeID)
	if err != nil {
		if err == sql.ErrNoRows {
			return Song{}, false, nil
		}
		return Song{}, false, fmt.Errorf("failed to retrieve song: %s", err)
	}

	return song, true, nil
}

func (db *SQLiteClient) GetSongByID(songID uint32) (Song, bool, error) {
	return db.GetSong("id", songID)
}

func (db *SQLiteClient) GetSongByYTID(ytID string) (Song, bool, error) {
	return db.GetSong("ytID", ytID)
}

func (db *SQLiteClient) GetSongByKey(key string) (Song, bool, error) {
	return db.GetSong("key", key)
}

// DeleteSongByID deletes a song by ID
func (db *SQLiteClient) DeleteSongByID(songID uint32) error {
	_, err := db.db.Exec("DELETE FROM songs WHERE id = ?", songID)
	if err != nil {
		return fmt.Errorf("failed to delete song: %v", err)
	}
	return nil
}

// DeleteCollection deletes a collection (table) from the database
func (db *SQLiteClient) DeleteCollection(collectionName string) error {
	_, err := db.db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s", collectionName))
	if err != nil {
		return fmt.Errorf("error deleting collection: %v", err)
	}
	return nil
}

func (db *SQLiteClient) GetSongByTitle(title string) (Song, bool, error) {
	query := "SELECT title, artist, ytID FROM songs WHERE title LIKE ?"
	row := db.db.QueryRow(query, "%"+title+"%") // Use wildcards for partial match

	var song Song
	err := row.Scan(&song.Title, &song.Artist, &song.YouTubeID)
	if err != nil {
		if err == sql.ErrNoRows {
			return Song{}, false, nil
		}
		return Song{}, false, fmt.Errorf("failed to retrieve song: %s", err)
	}

	return song, true, nil
}

// GetAllSongs retrieves all songs from the database
func (db *SQLiteClient) GetAllSongs() ([]SongWithID, error) {
	query := "SELECT id, title, artist, ytID FROM songs ORDER BY title ASC"
	rows, err := db.db.Query(query)
	if err != nil {
		return []SongWithID{}, fmt.Errorf("failed to query songs: %s", err)
	}
	defer rows.Close()

	var songs []SongWithID
	for rows.Next() {
		var song SongWithID
		err := rows.Scan(&song.ID, &song.Title, &song.Artist, &song.YouTubeID)
		if err != nil {
			return []SongWithID{}, fmt.Errorf("failed to scan song: %s", err)
		}
		songs = append(songs, song)
	}

	// Return empty slice instead of nil if no songs found
	if songs == nil {
		songs = []SongWithID{}
	}

	return songs, nil
}
