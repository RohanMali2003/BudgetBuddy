package com.budgetbuddy.network

import android.util.Log
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Protocol
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody

/**
 * OkHttp interceptor that blocks ALL outgoing network requests.
 * This enforces BudgetBuddy's zero-cloud privacy policy at the HTTP layer.
 */
class NetworkBlockInterceptor : Interceptor {
    companion object {
        private const val TAG = "BudgetBuddy.NetBlock"
    }

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        Log.w(TAG, "BLOCKED outgoing request to: ${request.url}")

        return Response.Builder()
            .code(403)
            .protocol(Protocol.HTTP_1_1)
            .message("Blocked by BudgetBuddy privacy policy")
            .body("Network requests are disabled for privacy.".toResponseBody("text/plain".toMediaType()))
            .request(request)
            .build()
    }
}
