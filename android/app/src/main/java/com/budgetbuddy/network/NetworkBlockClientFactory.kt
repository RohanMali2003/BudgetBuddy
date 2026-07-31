package com.budgetbuddy.network

import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import okhttp3.OkHttpClient

/**
 * Custom OkHttpClient factory that adds the NetworkBlockInterceptor
 * to all OkHttp clients created by React Native.
 */
class NetworkBlockClientFactory : OkHttpClientFactory {
    override fun createNewNetworkModuleClient(): OkHttpClient {
        return OkHttpClientProvider.createClientBuilder()
            .addInterceptor(NetworkBlockInterceptor())
            .build()
    }
}
