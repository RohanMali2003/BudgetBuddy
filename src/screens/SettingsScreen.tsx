import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import {
  startListening,
  stopListening,
  checkSmsPermissions,
} from '@/bridge/smsListener';
import { importSmsHistory } from '@/engines/importSmsHistory';
import type { ImportProgress } from '@/engines/importSmsHistory';
import { slmEngine } from '@/engines/slmEngine';
import { colors, spacing, borderRadius, fontSize, commonStyles } from '@/utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props): React.JSX.Element {
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  const handleSmsToggle = useCallback(
    async (value: boolean) => {
      if (value) {
        const hasPermission = await checkSmsPermissions();
        if (!hasPermission) {
          Alert.alert(
            'Permission Required',
            'SMS permissions are needed to monitor bank messages.',
          );
          return;
        }
        startListening();
      } else {
        stopListening();
      }
      setSmsEnabled(value);
    },
    [],
  );

  const handleImportSms = useCallback(async () => {
    const hasPermission = await checkSmsPermissions();
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'SMS read permission is needed to import existing messages.',
      );
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await importSmsHistory(200, (progress) => {
        setImportProgress(progress);
      });
      setImportResult(
        `Imported ${result.succeeded} transactions. ${result.failed} duplicates skipped.`,
      );
    } catch (error) {
      console.error('[Settings] Import failed:', error);
      setImportResult('Import failed. Please try again.');
    } finally {
      setIsImporting(false);
    }
  }, []);

  const modelPath = slmEngine.getModelPath();
  const modelAvailable = slmEngine.isModelAvailable();
  const modelLoaded = slmEngine.isLoaded();

  return (
    <View style={commonStyles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SMS Monitoring */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>SMS Monitoring</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto-detect transactions</Text>
              <Text style={styles.settingDesc}>
                Automatically parse incoming bank SMS
              </Text>
            </View>
            <Switch
              value={smsEnabled}
              onValueChange={handleSmsToggle}
              trackColor={{ false: colors.surfaceHighlight, true: colors.primaryDark }}
              thumbColor={smsEnabled ? colors.primary : colors.textMuted}
            />
          </View>
        </View>

        {/* Import SMS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Import SMS History</Text>
          <Text style={styles.sectionDesc}>
            Scan your SMS inbox for existing bank messages and import transactions.
          </Text>

          {isImporting ? (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width:
                        importProgress && importProgress.total > 0
                          ? `${(importProgress.processed / importProgress.total) * 100}%`
                          : '0%',
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                Processing {importProgress?.processed ?? 0} of {importProgress?.total ?? 0} messages... ({importProgress?.succeeded ?? 0} imported)
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.importButton, isImporting && styles.buttonDisabled]}
              onPress={handleImportSms}
              activeOpacity={0.8}
              disabled={isImporting}
            >
              <Text style={styles.importButtonIcon}>📥</Text>
              <Text style={styles.importButtonText}>Import SMS History</Text>
            </TouchableOpacity>
          )}

          {importResult && (
            <Text style={styles.importResult}>{importResult}</Text>
          )}
        </View>

        {/* SLM Model Status */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>SLM Model Status</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                modelAvailable ? styles.statusDotGreen : styles.statusDotRed,
              ]}
            />
            <Text style={styles.statusText}>
              {modelAvailable ? 'Model available' : 'Model not downloaded'}
            </Text>
          </View>
          {modelAvailable && (
            <>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    modelLoaded ? styles.statusDotGreen : styles.statusDotYellow,
                  ]}
                />
                <Text style={styles.statusText}>
                  {modelLoaded ? 'Model loaded in memory' : 'Model not loaded (loads on demand)'}
                </Text>
              </View>
              <View style={styles.modelPathContainer}>
                <Text style={styles.modelPathLabel}>Path:</Text>
                <Text style={styles.modelPath} numberOfLines={2}>
                  {modelPath}
                </Text>
              </View>
            </>
          )}
          {!modelAvailable && (
            <Text style={styles.modelHint}>
              Place a GGUF model file in the app's models directory and restart.
            </Text>
          )}
        </View>

        {/* Privacy */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.privacyContent}>
            <Text style={styles.privacyIcon}>🔒</Text>
            <Text style={styles.privacyText}>
              BudgetBuddy follows a strict zero-cloud policy.{'\n\n'}
              • All data is stored locally on your device{'\n'}
              • No network requests are made with your data{'\n'}
              • SMS parsing happens entirely on-device{'\n'}
              • The SLM runs locally — no API calls{'\n'}
              • No analytics, no tracking, no telemetry
            </Text>
          </View>
        </View>

        {/* About */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>App Version</Text>
            <Text style={styles.aboutValue}>0.0.1</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Engine A</Text>
            <Text style={styles.aboutValue}>Regex Parser</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Engine B</Text>
            <Text style={styles.aboutValue}>On-Device SLM (llama.rn)</Text>
          </View>
          <View style={[styles.aboutRow, styles.aboutRowLast]}>
            <Text style={styles.aboutLabel}>Database</Text>
            <Text style={styles.aboutValue}>op-sqlite (WAL)</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  // Section cards
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  sectionDesc: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  // Settings row
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  settingDesc: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  // Import
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  importButtonIcon: {
    fontSize: 20,
  },
  importButtonText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  importResult: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  // Model status
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotGreen: {
    backgroundColor: colors.accent,
  },
  statusDotRed: {
    backgroundColor: colors.danger,
  },
  statusDotYellow: {
    backgroundColor: colors.warning,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  modelPathContainer: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  modelPathLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginBottom: 2,
  },
  modelPath: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontFamily: 'monospace',
  },
  modelHint: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  // Privacy
  privacyContent: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  privacyIcon: {
    fontSize: 28,
  },
  privacyText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 22,
  },
  // About
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  aboutRowLast: {
    borderBottomWidth: 0,
  },
  aboutLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  aboutValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
});
