package com.budgetbuddy.sms

object BankSenderRegistry {
    // Explicit known bank sender IDs (uppercase)
    private val EXPLICIT_SENDERS = setOf(
        "HDFCBK", "ICICIB", "SBIINB", "KOTAKB", "AXISBK",
        "PNBSMS", "YESBK", "IDFCFB", "BOIIND", "CANBNK",
        "CENTBK", "ILOBBK", "UCOBNK", "BARODQ", "INDBNK",
        "SBIUPI", "PAYTM", "GPAY", "PHONPE", "AIRTEL",
        "AMZN", "JIOPAY"
    )

    // Regex patterns for bank-like sender IDs (XX-KEYWORD format)
    private val BANK_PATTERNS = listOf(
        Regex("[A-Z]{2}-[A-Z]*[Bb][Kk]", RegexOption.IGNORE_CASE),
        Regex("[A-Z]{2}-[A-Z]*UPI", RegexOption.IGNORE_CASE),
        Regex("[A-Z]{2}-[A-Z]*[Bb]ank", RegexOption.IGNORE_CASE),
        Regex("[A-Z]{2}-[A-Z]*FIN", RegexOption.IGNORE_CASE),
    )

    // Keywords in the SMS body that confirm it's a transaction
    private val TRANSACTION_KEYWORDS = listOf(
        "debited", "credited", "debit", "credit",
        "spent", "received", "transferred", "withdrawn",
        "a/c", "acct", "account", "bal", "balance",
        "upi", "neft", "imps", "rtgs", "atm"
    )

    fun isBankSender(address: String): Boolean {
        val upper = address.uppercase().trim()
        if (EXPLICIT_SENDERS.any { upper.contains(it) }) return true
        return BANK_PATTERNS.any { it.containsMatchIn(upper) }
    }

    fun isTransactionSms(body: String): Boolean {
        val lower = body.lowercase()
        return TRANSACTION_KEYWORDS.any { lower.contains(it) }
    }
}
