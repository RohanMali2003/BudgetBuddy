package com.budgetbuddy.sms

import android.content.ContentResolver
import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.*

class SmsNativeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "BudgetBuddy.SmsModule"
        private var reactContextRef: ReactApplicationContext? = null

        fun emitBankSms(sender: String, body: String, timestamp: Long) {
            val context = reactContextRef ?: run {
                Log.w(TAG, "ReactContext not available, cannot emit SMS event")
                return
            }

            if (!context.hasActiveReactInstance()) {
                Log.w(TAG, "No active React instance, cannot emit SMS event")
                return
            }

            val params = Arguments.createMap().apply {
                putString("sender", sender)
                putString("body", body)
                putDouble("timestamp", timestamp.toDouble())
            }

            context
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onBankSmsReceived", params)

            Log.d(TAG, "Emitted onBankSmsReceived event")
        }
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun getName(): String = "SmsNativeModule"

    override fun initialize() {
        super.initialize()
        reactContextRef = reactApplicationContext
    }

    override fun invalidate() {
        super.invalidate()
        scope.cancel()
        reactContextRef = null
    }

    @ReactMethod
    fun startSmsListener() {
        Log.d(TAG, "Starting SMS listener service")
        val context = reactApplicationContext
        val intent = Intent(context, SmsForegroundService::class.java)
        ContextCompat.startForegroundService(context, intent)
    }

    @ReactMethod
    fun stopSmsListener() {
        Log.d(TAG, "Stopping SMS listener service")
        val context = reactApplicationContext
        val intent = Intent(context, SmsForegroundService::class.java)
        context.stopService(intent)
    }

    @ReactMethod
    fun readExistingSms(count: Int, promise: Promise) {
        scope.launch {
            try {
                val smsList = readSmsFromInbox(count)
                promise.resolve(smsList)
            } catch (e: Exception) {
                Log.e(TAG, "Error reading SMS inbox", e)
                promise.reject("SMS_READ_ERROR", "Failed to read SMS: ${e.message}", e)
            }
        }
    }

    private fun readSmsFromInbox(count: Int): WritableArray {
        val resolver: ContentResolver = reactApplicationContext.contentResolver
        val uri: Uri = Uri.parse("content://sms/inbox")
        val cursor: Cursor? = resolver.query(
            uri,
            arrayOf("address", "body", "date"),
            null, null,
            "date DESC"
        )

        val results = Arguments.createArray()
        var added = 0

        cursor?.use {
            while (it.moveToNext() && added < count) {
                val address = it.getString(0) ?: continue
                val body = it.getString(1) ?: continue
                val date = it.getLong(2)

                if (!BankSenderRegistry.isBankSender(address)) continue
                if (!BankSenderRegistry.isTransactionSms(body)) continue

                val smsMap = Arguments.createMap().apply {
                    putString("sender", address)
                    putString("body", body)
                    putDouble("timestamp", date.toDouble())
                }
                results.pushMap(smsMap)
                added++
            }
        }

        Log.d(TAG, "Read $added bank SMS from inbox")
        return results
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for NativeEventEmitter
    }
}
