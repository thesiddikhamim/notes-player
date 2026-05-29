import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, BackHandler, useWindowDimensions } from 'react-native';
import { Video, Audio, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';

export default function VideoPlayer({ source, onGoBack, onTimeUpdate, videoRef, onEndReached }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioMode, setAudioMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [screenOffPlay, setScreenOffPlay] = useState(false);
  const [sleepTimer, setSleepTimer] = useState(0);
  const [status, setStatus] = useState({});
  const { width, height } = useWindowDimensions();
  const sleepTimerId = useRef(null);

  // Keep screen awake normally, unless screenOffPlay is true
  useKeepAwake();
  useEffect(() => {
    if (screenOffPlay) {
      deactivateKeepAwake();
    }
  }, [screenOffPlay]);

  useEffect(() => {
    return () => {
      if (sleepTimerId.current) {
        clearTimeout(sleepTimerId.current);
      }
    };
  }, []);

  useEffect(() => {
    // Set Audio Mode for background play
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
    }).catch((e) => console.log('Audio mode error', e));

    const onBackPress = () => {
      if (isFullscreen) {
        toggleFullscreen();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [isFullscreen]);

  const toggleFullscreen = async () => {
    if (isFullscreen) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      setIsFullscreen(false);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      setIsFullscreen(true);
    }
  };

  const handlePlaybackStatusUpdate = (newStatus) => {
    setStatus(newStatus);
    if (newStatus.isLoaded) {
      if (newStatus.isPlaying !== isPlaying) {
        setIsPlaying(newStatus.isPlaying);
      }
      if (onTimeUpdate) {
        onTimeUpdate(newStatus.positionMillis / 1000); // Send time in seconds
      }
      if (newStatus.didJustFinish) {
        if (onEndReached) onEndReached();
      }
    }
  };

  const togglePlayPause = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
  };

  const toggleSleepTimer = () => {
    const options = [0, 15, 30, 45, 60];
    const currentIndex = options.indexOf(sleepTimer);
    const nextIndex = (currentIndex + 1) % options.length;
    const nextTimer = options[nextIndex];
    
    setSleepTimer(nextTimer);
    
    if (sleepTimerId.current) {
      clearTimeout(sleepTimerId.current);
      sleepTimerId.current = null;
    }
    
    if (nextTimer > 0) {
      sleepTimerId.current = setTimeout(async () => {
        if (videoRef.current) {
          await videoRef.current.pauseAsync();
        }
        setSleepTimer(0);
      }, nextTimer * 60 * 1000);
    }
  };

  return (
    <View style={[styles.container, isFullscreen && styles.fullscreenContainer]}>
      <Video
        ref={videoRef}
        source={{ uri: source }}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      />
      {audioMode && (
        <View style={styles.audioModeOverlay}>
          <Ionicons name="musical-notes" size={48} color="#4CAF50" />
          <Text style={styles.audioModeText}>Audio Mode</Text>
        </View>
      )}

      {/* Controls Overlay */}
      <View style={styles.controlsOverlay} pointerEvents="box-none">
        <View style={styles.topRow}>
          <TouchableOpacity onPress={onGoBack} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.topRightControls}>
            <TouchableOpacity onPress={toggleSleepTimer} style={styles.timerButton}>
              <Ionicons name={sleepTimer > 0 ? "timer" : "timer-outline"} size={24} color="#fff" />
              {sleepTimer > 0 && <Text style={styles.timerText}>{sleepTimer}m</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAudioMode(!audioMode)} style={styles.iconButton}>
              <Ionicons name={audioMode ? "headset" : "headset-outline"} size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setScreenOffPlay(!screenOffPlay)} style={styles.iconButton}>
              <Ionicons name={screenOffPlay ? "moon" : "moon-outline"} size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleFullscreen} style={styles.iconButton}>
              <Ionicons name={isFullscreen ? "contract" : "expand"} size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.centerControl} pointerEvents="box-none">
           <TouchableOpacity onPress={togglePlayPause} style={styles.playPauseButton}>
             <Ionicons name={isPlaying ? "pause" : "play"} size={48} color="#fff" />
           </TouchableOpacity>
        </View>

        <View style={styles.bottomRow}>
             {/* Progress bar mock */}
             <Text style={styles.timeText}>
               {status.positionMillis ? (status.positionMillis / 1000).toFixed(0) : '0'}s / {status.durationMillis ? (status.durationMillis / 1000).toFixed(0) : '0'}s
             </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '38%',
    backgroundColor: '#000',
    position: 'relative',
  },
  fullscreenContainer: {
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 999,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  audioModeOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
    zIndex: 1,
  },
  audioModeText: {
    color: '#4CAF50',
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 10,
    zIndex: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  timerText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: 'bold',
  },
  centerControl: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    color: '#fff',
  }
});
