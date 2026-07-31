import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { requestSmsPermissions, checkSmsPermissions, openAppSettings } from '@/bridge/smsListener';
import type { PermissionStatus } from '@/bridge/smsListener';
import { importSmsHistory } from '@/engines/importSmsHistory';
import type { ImportProgress } from '@/engines/importSmsHistory';
import { setSetting } from '@/db/settingsRepo';
import { colors, spacing, borderRadius, fontSize } from '@/utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  const handleGetStarted = useCallback(() => {
    setStep(1);
  }, []);

  const handleRequestPermission = useCallback(async () => {
    setIsRequesting(true);
    try {
      const status = await requestSmsPermissions();
      setPermissionStatus(status);
      if (status === 'granted') {
        // Auto-advance after a short delay for visual feedback
        setTimeout(() => setStep(2), 500);
      }
    } finally {
      setIsRequesting(false);
    }
  }, []);

  const handleRetryPermission = useCallback(async () => {
    // Check if permission was granted externally (e.g., from settings)
    const hasPermission = await checkSmsPermissions();
    if (hasPermission) {
      setPermissionStatus('granted');
      setTimeout(() => setStep(2), 500);
    } else {
      handleRequestPermission();
    }
  }, [handleRequestPermission]);

  const handleOpenSettings = useCallback(() => {
    openAppSettings();
  }, []);

  const handleStartTracking = useCallback(() => {
    setSetting('onboarding_complete', 'true');
    navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
  }, [navigation]);

  const handleImportSms = useCallback(async () => {
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
      console.error('[Onboarding] Import failed:', error);
      setImportResult('Import failed. You can try again in Settings.');
    } finally {
      setIsImporting(false);
    }
  }, []);

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.appIcon}>💰</Text>
            <Text style={styles.appName}>BudgetBuddy</Text>
            <Text style={styles.tagline}>Your finances, your device.{'\n'}Zero cloud.</Text>
            <Text style={styles.description}>
              Track your spending automatically by reading bank SMS.
              All data stays on your phone — always.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleGetStarted}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepIcon}>📱</Text>
            <Text style={styles.stepTitle}>SMS Access</Text>
            <Text style={styles.stepDescription}>
              BudgetBuddy reads your bank SMS to automatically detect transactions.
              {'\n\n'}
              We need permission to:
            </Text>
            <View style={styles.permissionList}>
              <View style={styles.permissionItem}>
                <Text style={styles.permissionIcon}>📩</Text>
                <View style={styles.permissionTextContainer}>
                  <Text style={styles.permissionLabel}>Receive SMS</Text>
                  <Text style={styles.permissionDesc}>Detect new bank messages instantly</Text>
                </View>
              </View>
              <View style={styles.permissionItem}>
                <Text style={styles.permissionIcon}>📖</Text>
                <View style={styles.permissionTextContainer}>
                  <Text style={styles.permissionLabel}>Read SMS</Text>
                  <Text style={styles.permissionDesc}>Import past transactions from your inbox</Text>
                </View>
              </View>
            </View>

            <View style={styles.privacyNote}>
              <Text style={styles.privacyIcon}>🔒</Text>
              <Text style={styles.privacyText}>
                Your SMS never leaves this device. No server. No cloud. No tracking.
              </Text>
            </View>

            {permissionStatus === null && (
              <TouchableOpacity
                style={[styles.primaryButton, isRequesting && styles.buttonDisabled]}
                onPress={handleRequestPermission}
                activeOpacity={0.8}
                disabled={isRequesting}
              >
                <Text style={styles.primaryButtonText}>
                  {isRequesting ? 'Requesting...' : 'Grant SMS Access'}
                </Text>
              </TouchableOpacity>
            )}

            {permissionStatus === 'denied' && (
              <View style={styles.retryContainer}>
                <Text style={styles.deniedText}>
                  Permission denied. SMS access is required for BudgetBuddy to work.
                </Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleRetryPermission}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}

            {permissionStatus === 'never_ask_again' && (
              <View style={styles.retryContainer}>
                <Text style={styles.deniedText}>
                  Permission was permanently denied. Please enable SMS permissions in your device settings.
                </Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleOpenSettings}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>Open Settings</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleRetryPermission}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryButtonText}>I've enabled it — check again</Text>
                </TouchableOpacity>
              </View>
            )}

            {permissionStatus === 'granted' && (
              <View style={styles.grantedContainer}>
                <Text style={styles.grantedIcon}>✅</Text>
                <Text style={styles.grantedText}>Permissions granted!</Text>
              </View>
            )}
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.successIcon}>🎉</Text>
            <Text style={styles.stepTitle}>Import Existing SMS</Text>
            <Text style={styles.stepDescription}>
              Would you like to import your recent bank SMS?
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
            ) : importResult ? (
              <View style={styles.resultContainer}>
                <Text style={styles.importResultText}>{importResult}</Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleStartTracking}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleImportSms}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>Yes, import</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleStartTracking}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryButtonText}>Skip</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        {renderStep()}
      </View>

      {/* Page indicator dots */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === step && styles.dotActive,
              i < step && styles.dotCompleted,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  stepContainer: {
    alignItems: 'center',
  },
  // Step 0 — Welcome
  appIcon: {
    fontSize: 72,
    marginBottom: spacing.lg,
  },
  appName: {
    color: colors.text,
    fontSize: fontSize.hero,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  tagline: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: spacing.lg,
  },
  description: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.md,
  },
  // Buttons
  primaryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    width: SCREEN_WIDTH - spacing.xl * 2,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    width: SCREEN_WIDTH - spacing.xl * 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  // Step 1 — Permissions
  stepIcon: {
    fontSize: 56,
    marginBottom: spacing.lg,
  },
  stepTitle: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '700',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  stepDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  permissionList: {
    width: '100%',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  permissionIcon: {
    fontSize: 28,
  },
  permissionTextContainer: {
    flex: 1,
  },
  permissionLabel: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  permissionDesc: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  privacyIcon: {
    fontSize: 20,
  },
  privacyText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  retryContainer: {
    alignItems: 'center',
    width: '100%',
  },
  deniedText: {
    color: colors.danger,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  grantedContainer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  grantedIcon: {
    fontSize: 48,
  },
  grantedText: {
    color: colors.accent,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  // Step 2 — Success / Import
  successIcon: {
    fontSize: 72,
    marginBottom: spacing.lg,
  },
  buttonGroup: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
  },
  progressContainer: {
    width: '100%',
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
  resultContainer: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.lg,
  },
  importResultText: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Dots
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceHighlight,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  dotCompleted: {
    backgroundColor: colors.primaryDark,
  },
});
