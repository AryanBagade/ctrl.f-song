import React from 'react';
import { motion } from 'framer-motion';
import './styles/ProgressBar.module.css';

const ProgressBar = ({ 
  progress, 
  status, 
  title, 
  artist, 
  isVisible, 
  type = 'download' // 'download' or 'fingerprint'
}) => {
  if (!isVisible) return null;

  const getStatusColor = () => {
    switch (status) {
      case 'error':
        return '#ef4444';
      case 'complete':
        return '#10b981';
      case 'processing':
      case 'downloading':
      case 'fingerprinting':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'starting':
        return type === 'download' ? 'Initializing download...' : 'Starting fingerprinting...';
      case 'processing':
        return type === 'download' ? 'Processing song info...' : 'Processing audio file...';
      case 'downloading':
        return 'Downloading from YouTube...';
      case 'fingerprinting':
        return 'Creating audio fingerprints...';
      case 'complete':
        return type === 'download' ? 'Download complete!' : 'Fingerprinting complete!';
      case 'error':
        return 'Error occurred';
      default:
        return 'Processing...';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'complete':
        return '✓';
      case 'error':
        return '✗';
      case 'downloading':
        return '⬇';
      case 'fingerprinting':
        return '🎵';
      default:
        return '⏳';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="progress-container"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        padding: '24px',
        margin: '16px 0',
        color: 'white',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        maxWidth: '400px',
        width: '100%'
      }}
    >
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '16px',
        gap: '12px'
      }}>
        <div style={{
          fontSize: '24px',
          animation: status === 'processing' || status === 'downloading' || status === 'fingerprinting' 
            ? 'pulse 2s infinite' : 'none'
        }}>
          {getIcon()}
        </div>
        <div>
          <h3 style={{ 
            margin: 0, 
            fontSize: '16px', 
            fontWeight: '600',
            color: 'white'
          }}>
            {type === 'download' ? 'Downloading Song' : 'Creating Fingerprints'}
          </h3>
          <p style={{ 
            margin: 0, 
            fontSize: '12px', 
            opacity: 0.8,
            color: 'rgba(255, 255, 255, 0.8)'
          }}>
            {getStatusText()}
          </p>
        </div>
      </div>

      {/* Song Info */}
      {(title || artist) && (
        <div style={{ 
          marginBottom: '16px',
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: '600',
            marginBottom: '4px',
            color: 'white'
          }}>
            {title || 'Unknown Title'}
          </div>
          <div style={{ 
            fontSize: '12px', 
            opacity: 0.8,
            color: 'rgba(255, 255, 255, 0.8)'
          }}>
            {artist || 'Unknown Artist'}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.2)', 
        borderRadius: '12px', 
        overflow: 'hidden',
        height: '8px',
        marginBottom: '12px'
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ 
            duration: 0.3,
            ease: "easeOut"
          }}
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${getStatusColor()}, ${getStatusColor()}cc)`,
            borderRadius: '12px',
            boxShadow: `0 0 10px ${getStatusColor()}66`
          }}
        />
      </div>

      {/* Progress Text */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.8)'
      }}>
        <span>{Math.round(progress)}%</span>
        <span style={{ color: getStatusColor(), fontWeight: '600' }}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      {/* Animated dots for processing states */}
      {(status === 'processing' || status === 'downloading' || status === 'fingerprinting') && (
        <div style={{ 
          textAlign: 'center', 
          marginTop: '12px',
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.6)'
        }}>
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            ●
          </motion.span>
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            style={{ margin: '0 4px' }}
          >
            ●
          </motion.span>
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
          >
            ●
          </motion.span>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </motion.div>
  );
};

export default ProgressBar;