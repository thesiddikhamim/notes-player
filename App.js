import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import LibraryScreen from './src/screens/LibraryScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0d0d0d',
    card: '#1a1a1a',
    text: '#ffffff',
    border: '#2a2a2a',
    primary: '#4CAF50',
  },
};

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer theme={CustomDarkTheme}>
        <Stack.Navigator 
          initialRouteName="Library"
          screenOptions={{
            headerStyle: { backgroundColor: '#1a1a1a' },
            headerTintColor: '#ffffff',
            headerTitleStyle: { fontWeight: 'bold' },
            contentStyle: { backgroundColor: '#0d0d0d' },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen 
            name="Library" 
            component={LibraryScreen} 
            options={{ title: 'VideoNotePlayer' }}
          />
          <Stack.Screen 
            name="Player" 
            component={PlayerScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen} 
            options={{ title: 'Settings' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
