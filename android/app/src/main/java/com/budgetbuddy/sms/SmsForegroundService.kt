package com.budgetbuddy.sms

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

class SmsForegroundService : Service() {
    companion object {
        private const val TAG = "BudgetBuddy.FgService"
        private const val CHANNEL_ID = "budgetbuddy_sms_monitor"
        private const val NOTIFICATION_ID = 1001
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
        Log.d(TAG, "ForegroundService created")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "NEW_SMS") {
            val body = intent.getStringExtra("sms_body") ?: return START_STICKY
            val sender = intent.getStringExtra("sms_sender") ?: return START_STICKY
            val timestamp = intent.getLongExtra("sms_timestamp", System.currentTimeMillis())

            Log.d(TAG, "Forwarding SMS to JS layer from: $sender")
            SmsNativeModule.emitBankSms(sender, body, timestamp)
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "SMS Transaction Monitor",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Monitors incoming bank SMS for transaction tracking"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("BudgetBuddy")
            .setContentText("Monitoring bank transactions")
            .setSmallIcon(android.R.drawable.ic_menu_manage)  // Replace with custom icon later
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }
}
