import {
  NativeModules,
  NativeEventEmitter,
  PermissionsAndroid,
  Platform,
  Linking,
} from 'react-native';
import type { RawBankSms } from '@/utils/types';

const { SmsNativeModule } = NativeModules;
const smsEmitter = new NativeEventEmitter(SmsNativeModule);

export type PermissionStatus = 'granted' | 'denied' | 'never_ask_again';

export async function requestSmsPermissions(): Promise<PermissionStatus> {
  if (Platform.OS !== 'android') return 'denied';

  try {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS!,
      PermissionsAndroid.PERMISSIONS.READ_SMS!,
    ]);

    const receiveSms = results[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS!];
    const readSms = results[PermissionsAndroid.PERMISSIONS.READ_SMS!];

    if (receiveSms === 'granted' && readSms === 'granted') {
      return 'granted';
    }

    if (receiveSms === 'never_ask_again' || readSms === 'never_ask_again') {
      return 'never_ask_again';
    }

    return 'denied';
  } catch (error) {
    console.error('Permission request failed:', error);
    return 'denied';
  }
}

export async function checkSmsPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const receive = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS!,
  );
  const read = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_SMS!,
  );
  return receive && read;
}

export function openAppSettings(): void {
  Linking.openSettings();
}

export function startListening(): void {
  SmsNativeModule.startSmsListener();
}

export function stopListening(): void {
  SmsNativeModule.stopSmsListener();
}

export function onBankSmsReceived(
  callback: (sms: RawBankSms) => void,
): () => void {
  const subscription = smsEmitter.addListener(
    'onBankSmsReceived',
    (event: Record<string, unknown>) => {
      callback({
        sender: event.sender as string,
        body: event.body as string,
        timestamp: event.timestamp as number,
      });
    },
  );
  return () => subscription.remove();
}

export async function readExistingSms(
  count: number = 200,
): Promise<RawBankSms[]> {
  return SmsNativeModule.readExistingSms(count);
}
