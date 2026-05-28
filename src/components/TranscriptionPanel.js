import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { parseSRT } from '../utils/srtParser';

export default function TranscriptionPanel({ currentTime, onSeek }) {
  const [cues, setCues] = useState([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const listRef = useRef(null);
  const scrollTimeout = useRef(null);

  useEffect(() => {
    if (cues.length > 0 && autoScroll && listRef.current) {
      const activeIndex = cues.findIndex(c => currentTime >= c.start && currentTime <= c.end);
      if (activeIndex !== -1) {
        listRef.current.scrollToIndex({
          index: activeIndex,
          animated: true,
          viewPosition: 0.2 // ~2 rows from top
        });
      }
    }
  }, [currentTime, cues, autoScroll]);

  const handleLoadCaptions = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['*/*'], // specify extensions if possible, rn lets just allow all and check
        copyToCacheDirectory: true,
      });

      if (res.canceled) return;
      const fileUri = res.assets[0].uri;
      
      const fileData = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
      const parsed = parseSRT(fileData);
      setCues(parsed);

    } catch (e) {
      console.log('Failed to load captions', e);
    }
  };

  const onScrollBeginDrag = () => {
    setAutoScroll(false);
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
  };

  const onScrollEndDrag = () => {
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      setAutoScroll(true);
    }, 3000);
  };

  const renderItem = ({ item, index }) => {
    const isActive = currentTime >= item.start && currentTime <= item.end;
    const isPast = currentTime > item.end;
    
    // Formatting time
    const m = Math.floor(item.start / 60);
    const s = Math.floor(item.start % 60).toString().padStart(2, '0');

    return (
      <TouchableOpacity 
        style={[styles.cueRow, isActive && styles.activeCueRow]}
        onPress={() => onSeek(item.start)}
      >
        <Text style={[styles.timeText, isActive && styles.activeTimeText]}>{m}:{s}</Text>
        <Text style={[
          styles.cueText, 
          isActive && styles.activeCueText,
          isPast && styles.pastCueText
        ]}>
          {item.text}
        </Text>
      </TouchableOpacity>
    );
  };

  if (cues.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <TouchableOpacity style={styles.loadBtn} onPress={handleLoadCaptions}>
          <Text style={styles.loadBtnText}>Load SRT / VTT</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={cues}
        keyExtractor={(item, index) => item.id || index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onScrollBeginDrag={onScrollBeginDrag}
        onScrollEndDrag={onScrollEndDrag}
        onScrollMomentumEnd={onScrollEndDrag}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
  },
  loadBtn: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  loadBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 15,
  },
  cueRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    paddingLeft: 10,
  },
  activeCueRow: {
    borderLeftColor: '#4CAF50',
  },
  timeText: {
    color: '#555',
    width: 50,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  activeTimeText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  cueText: {
    flex: 1,
    color: '#aaa',
    fontSize: 15,
    lineHeight: 22,
  },
  activeCueText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '500',
  },
  pastCueText: {
    color: '#555',
  }
});
