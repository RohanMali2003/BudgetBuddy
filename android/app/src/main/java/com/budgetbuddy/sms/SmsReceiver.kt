package com.budgetbuddy.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import androidx.core.content.ContextCompat

class SmsReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "BudgetBuddy.SmsReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
        for (sms in messages) {
            val sender = sms.displayOriginatingAddress ?: continue
            val body = sms.displayMessageBody ?: continue

            if (!BankSenderRegistry.isBankSender(sender)) {
                Log.d(TAG, "Skipping non-bank sender: $sender")
                continue
            }

            if (!BankSenderRegistry.isTransactionSms(body)) {
                Log.d(TAG, "Skipping non-transaction SMS from: $sender")
                continue
            }

            Log.d(TAG, "Bank SMS detected from: $sender")

            val serviceIntent = Intent(context, SmsForegroundService::class.java).apply {
                action = "NEW_SMS"
                putExtra("sms_body", body)
                putExtra("sms_sender", sender)
                putExtra("sms_timestamp", sms.timestampMillis)
            }
            ContextCompat.startForegroundService(context, serviceIntent)
        }
    }
}
