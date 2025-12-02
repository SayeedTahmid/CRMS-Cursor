package com.nextgencrm.mobile

import android.content.Context

/**
 * Simple helper for persisting the CRM ID token on device.
 * This keeps the mobile session logged in between app launches.
 */
object AuthPrefs {
    private const val PREFS_NAME = "nextgen_crm_auth"
    private const val KEY_ID_TOKEN = "id_token"

    fun saveToken(context: Context, token: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_ID_TOKEN, token)
            .apply()
    }

    fun getToken(context: Context): String? {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_ID_TOKEN, null)
    }

    fun clear(context: Context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .remove(KEY_ID_TOKEN)
            .apply()
    }
}


