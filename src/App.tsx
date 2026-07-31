import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from '@/navigation/AppNavigator';
import { getDatabase } from '@/db/database';
import { getSetting } from '@/db/settingsRepo';
import { colors } from '@/utils/theme';
import { useSmsListener } from '@/hooks/useSmsListener';
import { slmEngine } from '@/engines/slmEngine';
import RNFS from 'react-native-fs';

export default function App(): React.JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);

  useEffect(() => {
    // Initialize database on app start
    getDatabase();
    const onboarded = getSetting('onboarding_complete') === 'true';
    setIsOnboarded(onboarded);
    setIsReady(true);
  }, []);

  useEffect(() => {
    const checkModel = async () => {
      const modelPath = `${RNFS.ExternalDirectoryPath}/models/qwen2.5-0.5b-instruct-q4_k_m.gguf`;
      const exists = await RNFS.exists(modelPath);
      if (exists) {
        slmEngine.setModelPath(modelPath);
        console.log('[App] SLM model found at:', modelPath);
      } else {
        console.log('[App] SLM model not found. Engine B disabled.');
      }
    };
    checkModel();
  }, []);

  useSmsListener(isOnboarded);

  if (!isReady) return <></>;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <AppNavigator isOnboarded={isOnboarded} />
    </SafeAreaProvider>
  );
}
