import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import Form from "./components/Form";
import Listen from "./components/Listen";
import CarouselSliders from "./components/CarouselSliders";
import SongProcessingBox from "./components/SongProcessingBox";
import SongLibrary from "./components/SongLibrary";
import { FaMicrophoneLines } from "react-icons/fa6";
import { LiaLaptopSolid } from "react-icons/lia";
// Removed toast imports for cleaner, integrated experience
import { MediaRecorder, register } from "extendable-media-recorder";
import { connect } from "extendable-media-recorder-wav-encoder";

import AnimatedNumber from "./components/AnimatedNumber";

const server = process.env.REACT_APP_BACKEND_URL || "http://localhost:5001";

var socket = io(server);

function App() {
  const [stream, setStream] = useState();
  const [matches, setMatches] = useState([]);
  const [totalSongs, setTotalSongs] = useState(10);
  const [isListening, setisListening] = useState(false);
  const [audioInput, setAudioInput] = useState("device"); // or "mic"
  const [isPhone, setIsPhone] = useState(window.innerWidth <= 550);
  const [registeredMediaEncoder, setRegisteredMediaEncoder] = useState(false);
  
  // Download and fingerprinting states
  const [downloadProgress, setDownloadProgress] = useState({
    isVisible: false,
    percentage: 0,
    status: 'starting',
    title: '',
    artist: '',
    filename: ''
  });
  const [fingerprintProgress, setFingerprintProgress] = useState({
    isVisible: false,
    percentage: 0,
    status: 'starting',
    title: '',
    artist: ''
  });
  const [showFingerprintButton, setShowFingerprintButton] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  const streamRef = useRef(stream);
  let sendRecordingRef = useRef(true);

  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  useEffect(() => {
    if (isPhone) {
      setAudioInput("mic");
    }

    socket.on("connect", () => {
      socket.emit("totalSongs", "");
    });

    socket.on("matches", (matches) => {
      matches = JSON.parse(matches);
      if (matches) {
        setMatches(matches.slice(0, 5));
        console.log("Matches: ", matches);
      }
      // Removed distracting toast notification

      cleanUp();
    });

    socket.on("downloadProgress", (progress) => {
      // Reset fingerprint state when new download starts
      if (progress.status === 'starting' || progress.percentage === 0) {
        setFingerprintProgress({
          isVisible: false,
          percentage: 0,
          status: 'starting',
          title: '',
          artist: ''
        });
        setShowFingerprintButton(false);
      }

      setDownloadProgress({
        isVisible: true,
        percentage: progress.percentage || 0,
        status: progress.status || 'starting',
        title: progress.title || '',
        artist: progress.artist || '',
        filename: progress.filename || ''
      });

      if (progress.isComplete && !progress.error) {
        setShowFingerprintButton(true);
        setTimeout(() => {
          setDownloadProgress(prev => ({ ...prev, isVisible: false }));
        }, 3000);
      }
    });

    socket.on("downloadStatus", (msg) => {
      msg = JSON.parse(msg);
      
      if (msg.type === "success") {
        setShowFingerprintButton(true);
      }
      // Remove toast notifications - all info is shown in the processing box
    });

    socket.on("fingerprintStatus", (msg) => {
      msg = JSON.parse(msg);
      
      // Update fingerprint progress based on status
      if (msg.type === "info") {
        const statusMap = {
          "Starting fingerprinting process...": { percentage: 10, status: 'starting' },
          "Processing audio file...": { percentage: 25, status: 'processing' },
          "Getting YouTube ID...": { percentage: 40, status: 'processing' },
          "Creating fingerprints...": { percentage: 65, status: 'fingerprinting' },
          "Moving to songs directory...": { percentage: 85, status: 'fingerprinting' },
          "Cleaning up temporary files...": { percentage: 95, status: 'fingerprinting' }
        };
        
        const progressUpdate = statusMap[msg.message];
        if (progressUpdate) {
          setFingerprintProgress(prev => ({
            ...prev,
            isVisible: true,
            ...progressUpdate
          }));
        }
      } else if (msg.type === "success") {
        setFingerprintProgress(prev => ({
          ...prev,
          percentage: 100,
          status: 'complete'
        }));
        
        setTimeout(() => {
          resetProcessingState(); // Reset everything after success
        }, 4000);
        
        // Refresh total songs count
        socket.emit("totalSongs", "");
      } else if (msg.type === "error") {
        setFingerprintProgress(prev => ({
          ...prev,
          status: 'error'
        }));
      }
      
      // All status info is now shown in the beautiful processing box
      // No more distracting toast notifications!
    });

    socket.on("totalSongs", (songsCount) => {
      setTotalSongs(songsCount);
    });
  }, []);

  useEffect(() => {
    const emitTotalSongs = () => {
      socket.emit("totalSongs", "");
    };

    const intervalId = setInterval(emitTotalSongs, 8000);

    return () => clearInterval(intervalId);
  }, []);

  async function record() {
    try {
      const mediaDevice =
        audioInput === "device"
          ? navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices)
          : navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

      if (!registeredMediaEncoder) {
        await register(await connect());
        setRegisteredMediaEncoder(true);
      }

      const constraints = {
        audio: {
          autoGainControl: false,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          sampleSize: 16,
        },
      };

      const stream = await mediaDevice(constraints);
      const audioTracks = stream.getAudioTracks();
      const audioStream = new MediaStream(audioTracks);

      setStream(audioStream);

      audioTracks[0].onended = stopListening;

      // Stop video tracks
      for (const track of stream.getVideoTracks()) {
        track.stop();
      }

      /** Attempt to change sampleRate
      const audioContext = new AudioContext({
        sampleRate: 44100,
      });
      const mediaStreamAudioSourceNode = new MediaStreamAudioSourceNode(
        audioContext,
        { mediaStream: audioStream }
      );
      const mediaStreamAudioDestinationNode =
        new MediaStreamAudioDestinationNode(audioContext, {
          channelCount: 1,
        });

      mediaStreamAudioSourceNode.connect(mediaStreamAudioDestinationNode);

      const mediaRecorder = new MediaRecorder(
        mediaStreamAudioDestinationNode.stream,
        { mimeType: "audio/wav" }
      );

      const settings = mediaStreamAudioDestinationNode.stream
        .getAudioTracks()[0]
        .getSettings();

      console.log("Settings: ", settings);
      */

      const mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: "audio/wav",
      });

      mediaRecorder.start();
      setisListening(true);
      sendRecordingRef.current = true;

      const chunks = [];
      mediaRecorder.ondataavailable = function (e) {
        chunks.push(e.data);
      };

      // Stop recording after 20 seconds
      setTimeout(function () {
        mediaRecorder.stop();
      }, 20000);

      mediaRecorder.addEventListener("stop", () => {
        const blob = new Blob(chunks, { type: "audio/wav" });
        const reader = new FileReader();

        cleanUp();
        // downloadRecording(blob);

        reader.readAsArrayBuffer(blob);
        reader.onload = async (event) => {
          const arrayBuffer = event.target.result;

          // get record duration
          const arrayBufferCopy = arrayBuffer.slice(0);
          const audioContext = new AudioContext();
          const audioBufferDecoded = await audioContext.decodeAudioData(
            arrayBufferCopy
          );
          const recordDuration = audioBufferDecoded.duration;

          var binary = "";
          var bytes = new Uint8Array(arrayBuffer);
          var len = bytes.byteLength;
          for (var i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }

          // Convert byte array to base64
          const rawAudio = btoa(binary);
          const audioConfig = audioStream.getAudioTracks()[0].getSettings();

          const recordData = {
            audio: rawAudio,
            duration: recordDuration,
            channels: audioConfig.channelCount,
            sampleRate: audioConfig.sampleRate,
            sampleSize: audioConfig.sampleSize,
          };

          if (sendRecordingRef.current) {
            socket.emit("newRecording", JSON.stringify(recordData));
          }
        };
      });
    } catch (error) {
      console.error("error:", error);
      cleanUp();
    }
  }

  function downloadRecording(blob) {
    const blobUrl = URL.createObjectURL(blob);

    // Create a download link
    const downloadLink = document.createElement("a");
    downloadLink.href = blobUrl;
    downloadLink.download = "recorded_audio.wav";
    document.body.appendChild(downloadLink);
    downloadLink.click();
  }

  function cleanUp() {
    const currentStream = streamRef.current;
    if (currentStream) {
      currentStream.getTracks().forEach((track) => track.stop());
    }

    setStream(null);
    setisListening(false);
  }

  function stopListening() {
    cleanUp();
    sendRecordingRef.current = false;
  }

  function handleLaptopIconClick() {
    setAudioInput("device");
  }

  function handleMicrophoneIconClick() {
    setAudioInput("mic");
  }

  function resetProcessingState() {
    setDownloadProgress({
      isVisible: false,
      percentage: 0,
      status: 'starting',
      title: '',
      artist: '',
      filename: ''
    });
    setFingerprintProgress({
      isVisible: false,
      percentage: 0,
      status: 'starting',
      title: '',
      artist: ''
    });
    setShowFingerprintButton(false);
  }

  function startFingerprinting() {
    // Send filename if available, otherwise backend will find the latest file
    const filename = downloadProgress.filename || "";
    socket.emit("startFingerprinting", filename);
    setFingerprintProgress(prev => ({
      ...prev,
      isVisible: true,
      percentage: 0,
      status: 'starting',
      title: downloadProgress.title,
      artist: downloadProgress.artist
    }));
    setShowFingerprintButton(false); // Hide button once fingerprinting starts
  }

  return (
    <div className="App">
      <div className="TopHeader">
        <h2 style={{ color: "#374151" }}>SeekTune</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={() => setShowLibrary(true)}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0px)';
              e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
            }}
          >
            🎵 Library
          </button>
          <h4 style={{ display: "flex", justifyContent: "flex-end", margin: 0 }}>
            <AnimatedNumber includeComma={true} animateToNumber={totalSongs} />
            &nbsp;Songs
          </h4>
        </div>
      </div>
      <div className="listen">
        <Listen
          stopListening={stopListening}
          disable={false}
          startListening={record}
          isListening={isListening}
        />
      </div>
      {!isPhone && (
        <div className="audio-input">
          <div
            onClick={handleLaptopIconClick}
            className={
              audioInput !== "device"
                ? "audio-input-device"
                : "audio-input-device active-audio-input"
            }
          >
            <LiaLaptopSolid style={{ height: 20, width: 20 }} />
          </div>
          <div
            onClick={handleMicrophoneIconClick}
            className={
              audioInput !== "mic"
                ? "audio-input-mic"
                : "audio-input-mic active-audio-input"
            }
          >
            <FaMicrophoneLines style={{ height: 20, width: 20 }} />
          </div>
        </div>
      )}
      <Form socket={socket} onFormSubmit={resetProcessingState} />
      
      {/* Integrated Song Processing Box */}
      <SongProcessingBox
        downloadProgress={downloadProgress}
        fingerprintProgress={fingerprintProgress}
        showFingerprintButton={showFingerprintButton}
        onStartFingerprinting={startFingerprinting}
        isVisible={downloadProgress.isVisible || fingerprintProgress.isVisible || showFingerprintButton}
      />

      <div className="youtube">
        <CarouselSliders matches={matches} />
      </div>

      {/* Song Library Modal */}
      <SongLibrary
        socket={socket}
        isVisible={showLibrary}
        onClose={() => setShowLibrary(false)}
      />

      {/* Toast container removed for cleaner experience */}
    </div>
  );
}

export default App;
