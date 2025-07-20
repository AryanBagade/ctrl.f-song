import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './styles/SongProcessingBox.module.css';

const SongProcessingBox = ({ 
  downloadProgress, 
  fingerprintProgress, 
  showFingerprintButton,
  onStartFingerprinting,
  isVisible 
}) => {
  if (!isVisible) return null;

  const isDownloading = downloadProgress.isVisible;
  const isFingerprinting = fingerprintProgress.isVisible;
  const isDownloadComplete = downloadProgress.status === 'complete';
  const isFingerprintComplete = fingerprintProgress.status === 'complete';
  const isComplete = isDownloadComplete && isFingerprintComplete;

  const getCurrentProgress = () => {
    if (isFingerprinting) return fingerprintProgress;
    return downloadProgress;
  };

  const currentProgress = getCurrentProgress();

  const getStatusIcon = () => {
    if (isComplete) return '✅';
    if (currentProgress.status === 'error') return '❌';
    if (isFingerprinting) return '🎵';
    if (isDownloading) return '⬇️';
    return '⏳';
  };

  const getMainStatus = () => {
    if (isComplete) return 'Song Ready!';
    if (isFingerprinting) return 'Creating Fingerprints';
    if (isDownloading) return 'Downloading Song';
    return 'Processing...';
  };

  const getSubStatus = () => {
    if (isComplete) return 'Song has been added to your library';
    if (isFingerprinting) {
      switch (fingerprintProgress.status) {
        case 'starting': return 'Initializing fingerprinting process...';
        case 'processing': return 'Analyzing audio patterns...';
        case 'fingerprinting': return 'Creating unique audio signature...';
        default: return 'Processing audio fingerprints...';
      }
    }
    if (isDownloading) {
      switch (downloadProgress.status) {
        case 'starting': return 'Initializing download...';
        case 'processing': return 'Fetching song information...';
        case 'downloading': return 'Downloading from YouTube...';
        case 'complete': return 'Download completed successfully!';
        default: return 'Processing download...';
      }
    }
    return 'Working on your request...';
  };

  const getTotalProgress = () => {
    if (isComplete) return 100;
    if (isFingerprinting) return 50 + (fingerprintProgress.percentage * 0.5);
    return downloadProgress.percentage * 0.5;
  };

  const getProgressColor = () => {
    if (isComplete) return '#10b981';
    if (currentProgress.status === 'error') return '#ef4444';
    if (isFingerprinting) return '#8b5cf6';
    return '#3b82f6';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="song-processing-box"
        style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '24px',
          margin: '20px auto',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Background Pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(99, 102, 241, 0.02) 10px, rgba(99, 102, 241, 0.02) 20px)',
          pointerEvents: 'none'
        }} />

        {/* Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: '20px',
          position: 'relative',
          zIndex: 1
        }}>
          <motion.div 
            animate={{ rotate: currentProgress.status === 'error' ? 0 : 360 }}
            transition={{ duration: 2, repeat: currentProgress.status !== 'error' && !isComplete ? Infinity : 0, ease: "linear" }}
            style={{
              fontSize: '28px',
              marginRight: '12px',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
            }}
          >
            {getStatusIcon()}
          </motion.div>
          <div>
            <h3 style={{ 
              margin: 0, 
              fontSize: '18px', 
              fontWeight: '700',
              color: '#1e293b',
              marginBottom: '4px'
            }}>
              {getMainStatus()}
            </h3>
            <p style={{ 
              margin: 0, 
              fontSize: '14px', 
              color: '#64748b',
              fontWeight: '500'
            }}>
              {getSubStatus()}
            </p>
          </div>
        </div>

        {/* Song Info Card */}
        {(currentProgress.title || currentProgress.artist) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ 
              background: 'white',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              position: 'relative',
              zIndex: 1
            }}
          >
            <div style={{ 
              fontSize: '16px', 
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: '4px',
              lineHeight: '1.4'
            }}>
              {currentProgress.title || 'Unknown Title'}
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#64748b',
              fontWeight: '500'
            }}>
              {currentProgress.artist || 'Unknown Artist'}
            </div>
          </motion.div>
        )}

        {/* Progress Bar */}
        <div style={{ 
          marginBottom: '16px',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ 
              fontSize: '12px', 
              fontWeight: '600',
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Progress
            </span>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: '700',
              color: getProgressColor()
            }}>
              {Math.round(getTotalProgress())}%
            </span>
          </div>
          
          <div style={{ 
            background: '#e2e8f0', 
            borderRadius: '8px', 
            overflow: 'hidden',
            height: '8px',
            position: 'relative'
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${getTotalProgress()}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{
                height: '100%',
                background: `linear-gradient(90deg, ${getProgressColor()}, ${getProgressColor()}cc)`,
                borderRadius: '8px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Shimmer effect */}
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  borderRadius: '8px'
                }}
              />
            </motion.div>
          </div>
        </div>

        {/* Step Indicators */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '20px',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: isDownloadComplete ? '#10b981' : (downloadProgress.percentage > 0 ? '#3b82f6' : '#e2e8f0'),
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}>
              {isDownloadComplete ? '✓' : '1'}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
              Download
            </div>
          </div>

          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: isFingerprintComplete ? '#10b981' : (fingerprintProgress.percentage > 0 ? '#8b5cf6' : '#e2e8f0'),
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}>
              {isFingerprintComplete ? '✓' : '2'}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
              Fingerprint
            </div>
          </div>

          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: isComplete ? '#10b981' : '#e2e8f0',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}>
              {isComplete ? '✓' : '3'}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
              Complete
            </div>
          </div>
        </div>

        {/* Fingerprint Button */}
        {showFingerprintButton && !isFingerprinting && !isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ 
              textAlign: 'center',
              position: 'relative',
              zIndex: 1
            }}
          >
            <button
              onClick={onStartFingerprinting}
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '14px 28px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 auto',
                minWidth: '200px',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 24px rgba(139, 92, 246, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0px)';
                e.target.style.boxShadow = '0 4px 16px rgba(139, 92, 246, 0.3)';
              }}
            >
              <span style={{ fontSize: '18px' }}>🎵</span>
              Create Fingerprints
            </button>
            <p style={{
              margin: '12px 0 0',
              fontSize: '12px',
              color: '#64748b',
              fontStyle: 'italic'
            }}>
              Click to add this song to your recognition database
            </p>
          </motion.div>
        )}

        {/* Success Message */}
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              textAlign: 'center',
              background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #16a34a',
              position: 'relative',
              zIndex: 1
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎉</div>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#166534',
              marginBottom: '4px'
            }}>
              Song Added Successfully!
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#15803d'
            }}>
              Your song is now ready for recognition
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default SongProcessingBox;