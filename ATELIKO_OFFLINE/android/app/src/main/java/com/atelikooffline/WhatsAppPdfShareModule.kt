package com.atelikooffline

import android.content.ActivityNotFoundException
import android.content.Intent
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class WhatsAppPdfShareModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "WhatsAppPdfShare"

    @Suppress("UNUSED_PARAMETER")
    @ReactMethod
    fun sharePdf(path: String, phone: String, message: String, promise: Promise) {
        try {
            val file = File(path.removePrefix("file://"))
            if (!file.exists()) {
                promise.reject("PDF_NOT_FOUND", "Le fichier PDF du reçu est introuvable.")
                return
            }

            val uri = FileProvider.getUriForFile(
                reactContext,
                "${reactContext.packageName}.fileprovider",
                file,
            )

            val cleanPhone = phone.filter { it.isDigit() }
            val baseIntent = Intent(Intent.ACTION_SEND).apply {
                type = "application/pdf"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, "Reçu thermique ATELIKO")
                if (cleanPhone.isNotBlank()) {
                    putExtra("jid", "$cleanPhone@s.whatsapp.net")
                }
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            val packageManager = reactContext.packageManager
            val packages = listOf("com.whatsapp", "com.whatsapp.w4b")
            for (packageName in packages) {
                val intent = Intent(baseIntent).apply { setPackage(packageName) }
                if (intent.resolveActivity(packageManager) != null) {
                    reactContext.grantUriPermission(packageName, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    reactContext.startActivity(intent)
                    promise.resolve(true)
                    return
                }
            }

            val chooser = Intent.createChooser(baseIntent, "Envoyer le reçu PDF").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(chooser)
            promise.resolve(true)
        } catch (error: ActivityNotFoundException) {
            promise.reject("NO_APP", "WhatsApp ou une application de partage PDF est introuvable.", error)
        } catch (error: Exception) {
            promise.reject("SHARE_FAILED", error.message ?: "Impossible de partager le reçu PDF.", error)
        }
    }

    @Suppress("UNUSED_PARAMETER")
    @ReactMethod
    fun shareImage(path: String, phone: String, message: String, promise: Promise) {
        try {
            val file = File(path.removePrefix("file://"))
            if (!file.exists()) {
                promise.reject("IMAGE_NOT_FOUND", "Le fichier image du reçu est introuvable.")
                return
            }

            val uri = FileProvider.getUriForFile(
                reactContext,
                "${reactContext.packageName}.fileprovider",
                file,
            )

            val cleanPhone = phone.filter { it.isDigit() }
            val baseIntent = Intent(Intent.ACTION_SEND).apply {
                type = "image/png"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_TEXT, message)
                if (cleanPhone.isNotBlank()) {
                    putExtra("jid", "$cleanPhone@s.whatsapp.net")
                }
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            val packageManager = reactContext.packageManager
            val packages = listOf("com.whatsapp", "com.whatsapp.w4b")
            for (packageName in packages) {
                val intent = Intent(baseIntent).apply { setPackage(packageName) }
                if (intent.resolveActivity(packageManager) != null) {
                    reactContext.grantUriPermission(packageName, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    reactContext.startActivity(intent)
                    promise.resolve(true)
                    return
                }
            }

            val chooser = Intent.createChooser(baseIntent, "Envoyer le reçu").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(chooser)
            promise.resolve(true)
        } catch (error: ActivityNotFoundException) {
            promise.reject("NO_APP", "WhatsApp ou une application de partage d'image est introuvable.", error)
        } catch (error: Exception) {
            promise.reject("SHARE_FAILED", error.message ?: "Impossible de partager l'image du reçu.", error)
        }
    }
}
