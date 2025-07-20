import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlay, FaTrash, FaMusic, FaYoutube, FaMagnifyingGlass } from 'react-icons/fa6';
import { MdLibraryMusic, MdDeleteSweep } from 'react-icons/md';
import './styles/SongLibrary.module.css';

const SongLibrary = ({ socket, isVisible, onClose }) => {
  const [songs, setSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  useEffect(() => {
    if (isVisible) {
      loadSongs();
    }
  }, [isVisible]);

  useEffect(() => {
    // Filter songs based on search term
    if (songs && Array.isArray(songs)) {
      const filtered = songs.filter(song => 
        song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSongs(filtered);
    } else {
      setFilteredSongs([]);
    }
  }, [songs, searchTerm]);

  useEffect(() => {
    // Socket listeners
    socket.on('allSongs', (songsData) => {
      try {
        const parsedSongs = JSON.parse(songsData);
        setSongs(Array.isArray(parsedSongs) ? parsedSongs : []);
        setIsLoading(false);
      } catch (error) {
        console.error('Error parsing songs:', error);
        setSongs([]);
        setIsLoading(false);
      }
    });

    socket.on('deleteResult', () => {
      setShowDeleteConfirm(null);
      loadSongs(); // Reload songs after deletion
    });

    socket.on('deleteAllResult', () => {
      setShowDeleteAllConfirm(false);
      loadSongs(); // Reload songs after deletion
    });

    return () => {
      socket.off('allSongs');
      socket.off('deleteResult');
      socket.off('deleteAllResult');
    };
  }, [socket]);

  const loadSongs = () => {
    setIsLoading(true);
    socket.emit('getAllSongs');
  };

  const deleteSong = (songId) => {
    socket.emit('deleteSong', songId.toString());
  };

  const deleteAllSongs = () => {
    socket.emit('deleteAllSongs');
  };

  const openYouTube = (youtubeId) => {
    if (youtubeId) {
      window.open(`https://www.youtube.com/watch?v=${youtubeId}`, '_blank');
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="library-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 50 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="library-panel"
          style={{
            background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
            borderRadius: '24px',
            width: '90%',
            maxWidth: '900px',
            height: '85vh',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            background: 'linear-gradient(90deg, #1db954 0%, #1ed760 100%)',
            padding: '24px 32px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <MdLibraryMusic size={32} />
              <div>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
                  Music Library
                </h2>
                <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
                  {songs ? songs.length : 0} songs in your collection
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '12px',
                padding: '12px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '18px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
            >
              ✕
            </button>
          </div>

          {/* Search and Actions */}
          <div style={{
            padding: '24px 32px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            {/* Search Bar */}
            <div style={{
              flex: 1,
              minWidth: '300px',
              position: 'relative'
            }}>
              <FaMagnifyingGlass 
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#666',
                  fontSize: '16px'
                }}
              />
              <input
                type="text"
                placeholder="Search songs or artists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px 16px 16px 48px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.target.style.borderColor = '#1db954';
                }}
                onBlur={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }}
              />
            </div>

            {/* Delete All Button */}
            {songs && songs.length > 0 && (
              <button
                onClick={() => setShowDeleteAllConfirm(true)}
                style={{
                  background: 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(229, 62, 62, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 16px rgba(229, 62, 62, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(229, 62, 62, 0.3)';
                }}
              >
                <MdDeleteSweep size={18} />
                Delete All
              </button>
            )}
          </div>

          {/* Songs List */}
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '0 32px 32px'
          }}>
            {isLoading ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '200px',
                color: '#666'
              }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <FaMusic size={32} />
                </motion.div>
                <span style={{ marginLeft: '16px', fontSize: '18px' }}>
                  Loading your music...
                </span>
              </div>
            ) : filteredSongs.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '300px',
                color: '#666',
                textAlign: 'center'
              }}>
                <FaMusic size={64} style={{ marginBottom: '16px', opacity: 0.3 }} />
                <h3 style={{ margin: '0 0 8px', color: '#999' }}>
                  {searchTerm ? 'No songs found' : 'No songs in library'}
                </h3>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  {searchTerm ? 'Try adjusting your search terms' : 'Add some songs to get started!'}
                </p>
              </div>
            ) : (
              <div style={{ marginTop: '24px' }}>
                {filteredSongs.map((song, index) => (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '16px',
                      padding: '20px',
                      marginBottom: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '20px',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    whileHover={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      scale: 1.02
                    }}
                  >
                    {/* Song Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{
                        margin: '0 0 4px',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {song.title}
                      </h4>
                      <p style={{
                        margin: 0,
                        color: '#999',
                        fontSize: '14px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {song.artist}
                      </p>
                    </div>

                    {/* Actions */}
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center'
                    }}>
                      {/* YouTube Button */}
                      {song.youtubeId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openYouTube(song.youtubeId);
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                        >
                          <FaYoutube size={16} />
                        </button>
                      )}

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(song);
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                borderRadius: '20px',
                padding: '32px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                maxWidth: '400px',
                width: '90%',
                textAlign: 'center'
              }}
            >
              <h3 style={{ color: 'white', margin: '0 0 16px', fontSize: '20px' }}>
                Delete Song?
              </h3>
              <p style={{ color: '#999', margin: '0 0 24px', fontSize: '14px' }}>
                Are you sure you want to delete "{showDeleteConfirm.title}" by {showDeleteConfirm.artist}?
                This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteSong(showDeleteConfirm.id)}
                  style={{
                    background: 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete All Confirmation Modal */}
        <AnimatePresence>
          {showDeleteAllConfirm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                borderRadius: '20px',
                padding: '32px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                maxWidth: '400px',
                width: '90%',
                textAlign: 'center'
              }}
            >
              <h3 style={{ color: 'white', margin: '0 0 16px', fontSize: '20px' }}>
                Delete All Songs?
              </h3>
              <p style={{ color: '#999', margin: '0 0 24px', fontSize: '14px' }}>
                This will permanently delete all {songs ? songs.length : 0} songs from your library.
                This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => setShowDeleteAllConfirm(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={deleteAllSongs}
                  style={{
                    background: 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Delete All
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default SongLibrary;