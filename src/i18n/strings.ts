/*
 This file is part of TALER
 (C) 2016 Inria

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

export let strings: {[s: string]: any} = {};
strings['de'] = {
  "domain": "messages",
  "locale_data": {
    "messages": {
      "": {
        "domain": "messages",
        "plural_forms": "nplurals=2; plural=(n != 1);",
        "lang": ""
      },
      "Operation": [
        null,
        ""
      ],
      "time (ms/op)": [
        null,
        ""
      ],
      "show more details": [
        null,
        ""
      ],
      "Accepted exchanges:": [
        null,
        ""
      ],
      "Exchanges in the wallet:": [
        null,
        ""
      ],
      "You have insufficient funds of the requested currency in your wallet.": [
        null,
        ""
      ],
      "You do not have any funds from an exchange that is accepted by this merchant. None of the exchanges accepted by the merchant is known to your wallet.": [
        null,
        ""
      ],
      "Confirm payment": [
        null,
        "Bezahlung bestätigen"
      ],
      "Submitting payment": [
        null,
        "Bezahlung bestätigen"
      ],
      "You already paid for this, clicking \"Confirm payment\" will not cost money again.": [
        null,
        ""
      ],
      "Aborting payment ...": [
        null,
        "Bezahlung bestätigen"
      ],
      "Payment aborted!": [
        null,
        ""
      ],
      "Retry Payment": [
        null,
        "Bezahlung bestätigen"
      ],
      "Abort Payment": [
        null,
        "Bezahlung bestätigen"
      ],
      "The merchant %1$s offers you to purchase:": [
        null,
        "Der Händler %1$s möchte einen Vertrag über %2$s mit Ihnen abschließen."
      ],
      "The total price is %1$s (plus %2$s fees).": [
        null,
        ""
      ],
      "The total price is %1$s.": [
        null,
        ""
      ],
      "Select": [
        null,
        ""
      ],
      "Error: URL may not be relative": [
        null,
        ""
      ],
      "Invalid exchange URL (%1$s)": [
        null,
        ""
      ],
      "The exchange is trusted by the wallet.": [
        null,
        ""
      ],
      "The exchange is audited by a trusted auditor.": [
        null,
        ""
      ],
      "Warning: The exchange is neither directly trusted nor audited by a trusted auditor. If you withdraw from this exchange, it will be trusted in the future.": [
        null,
        ""
      ],
      "Using exchange provider %1$s. The exchange provider will charge %2$s in fees.": [
        null,
        ""
      ],
      "Waiting for a response from %1$s %2$s": [
        null,
        ""
      ],
      "Information about fees will be available when an exchange provider is selected.": [
        null,
        ""
      ],
      "Your wallet (protocol version %1$s) might be outdated.%2$s The exchange has a higher, incompatible protocol version (%3$s).": [
        null,
        ""
      ],
      "The chosen exchange (protocol version %1$s might be outdated.%2$s The exchange has a lower, incompatible protocol version than your wallet (protocol version %3$s).": [
        null,
        ""
      ],
      "Accept fees and withdraw": [
        null,
        ""
      ],
      "Change Exchange Provider": [
        null,
        ""
      ],
      "Please select an exchange.  You can review the details before after your selection.": [
        null,
        ""
      ],
      "Select %1$s": [
        null,
        ""
      ],
      "You are about to withdraw %1$s from your bank account into your wallet.": [
        null,
        ""
      ],
      "Oops, something went wrong. The wallet responded with error status (%1$s).": [
        null,
        ""
      ],
      "Checking URL, please wait ...": [
        null,
        ""
      ],
      "Can't parse amount: %1$s": [
        null,
        ""
      ],
      "Can't parse wire_types: %1$s": [
        null,
        ""
      ],
      "Fatal error: \"%1$s\".": [
        null,
        ""
      ],
      "Balance": [
        null,
        "Saldo"
      ],
      "History": [
        null,
        "Verlauf"
      ],
      "Debug": [
        null,
        "Debug"
      ],
      "help": [
        null,
        ""
      ],
      "You have no balance to show. Need some %1$s getting started?": [
        null,
        "Sie haben kein Digitalgeld. Wollen Sie %1$s? abheben?"
      ],
      "%1$s incoming": [
        null,
        ""
      ],
      "%1$s being spent": [
        null,
        ""
      ],
      "Error: could not retrieve balance information.": [
        null,
        ""
      ],
      "Payback": [
        null,
        ""
      ],
      "Return Electronic Cash to Bank Account": [
        null,
        ""
      ],
      "Manage Trusted Auditors and Exchanges": [
        null,
        ""
      ],
      "Bank requested reserve (%1$s) for %2$s.": [
        null,
        "Bank bestätig anlegen der Reserve (%1$s) bei %2$s"
      ],
      "Started to withdraw %1$s from %2$s (%3$s).": [
        null,
        "Reserve (%1$s) mit %2$s bei %3$s erzeugt"
      ],
      "Merchant %1$s offered contract %2$s.": [
        null,
        "%1$s\n               möchte einen Vertrag über %2$s\n               mit Ihnen abschließen."
      ],
      "Withdrew %1$s from %2$s (%3$s).": [
        null,
        "Reserve (%1$s) mit %2$s bei %3$s erzeugt"
      ],
      "Paid %1$s to merchant %2$s. %3$s (%4$s)": [
        null,
        "Reserve (%1$s) mit %2$s bei %3$s erzeugt"
      ],
      "Merchant %1$s gave a refund over %2$s.": [
        null,
        "%1$s\n               möchte einen Vertrag über %2$s\n               mit Ihnen abschließen."
      ],
      "tip": [
        null,
        ""
      ],
      "Merchant %1$s gave a %2$s of %3$s.": [
        null,
        "%1$s\n               möchte einen Vertrag über %2$s\n               mit Ihnen abschließen."
      ],
      "You did not accept the tip yet.": [
        null,
        ""
      ],
      "Unknown event (%1$s)": [
        null,
        ""
      ],
      "Error: could not retrieve event history": [
        null,
        ""
      ],
      "Your wallet has no events recorded.": [
        null,
        "Ihre Geldbörse verzeichnet keine Vorkommnisse."
      ],
      "Wire to bank account": [
        null,
        ""
      ],
      "Confirm": [
        null,
        "Bezahlung bestätigen"
      ],
      "Cancel": [
        null,
        "Saldo"
      ],
      "Withdrawal fees:": [
        null,
        "Abheben bei"
      ],
      "Rounding loss:": [
        null,
        ""
      ],
      "Earliest expiration (for deposit): %1$s": [
        null,
        ""
      ],
      "# Coins": [
        null,
        ""
      ],
      "Value": [
        null,
        ""
      ],
      "Withdraw Fee": [
        null,
        "Abheben bei %1$s"
      ],
      "Refresh Fee": [
        null,
        ""
      ],
      "Deposit Fee": [
        null,
        ""
      ],
      "Invalid Wire": [
        null,
        ""
      ],
      "Invalid Test Wire Detail": [
        null,
        ""
      ],
      "Test Wire Acct #%1$s on %2$s": [
        null,
        ""
      ],
      "Unknown Wire Detail": [
        null,
        ""
      ]
    }
  }
};
strings['en-US'] = {
  "domain": "messages",
  "locale_data": {
    "messages": {
      "": {
        "domain": "messages",
        "plural_forms": "nplurals=2; plural=(n != 1);",
        "lang": ""
      },
      "Operation": [
        null,
        ""
      ],
      "time (ms/op)": [
        null,
        ""
      ],
      "show more details": [
        null,
        ""
      ],
      "Accepted exchanges:": [
        null,
        ""
      ],
      "Exchanges in the wallet:": [
        null,
        ""
      ],
      "You have insufficient funds of the requested currency in your wallet.": [
        null,
        ""
      ],
      "You do not have any funds from an exchange that is accepted by this merchant. None of the exchanges accepted by the merchant is known to your wallet.": [
        null,
        ""
      ],
      "Confirm payment": [
        null,
        ""
      ],
      "Submitting payment": [
        null,
        ""
      ],
      "You already paid for this, clicking \"Confirm payment\" will not cost money again.": [
        null,
        ""
      ],
      "Aborting payment ...": [
        null,
        ""
      ],
      "Payment aborted!": [
        null,
        ""
      ],
      "Retry Payment": [
        null,
        ""
      ],
      "Abort Payment": [
        null,
        ""
      ],
      "The merchant %1$s offers you to purchase:": [
        null,
        ""
      ],
      "The total price is %1$s (plus %2$s fees).": [
        null,
        ""
      ],
      "The total price is %1$s.": [
        null,
        ""
      ],
      "Select": [
        null,
        ""
      ],
      "Error: URL may not be relative": [
        null,
        ""
      ],
      "Invalid exchange URL (%1$s)": [
        null,
        ""
      ],
      "The exchange is trusted by the wallet.": [
        null,
        ""
      ],
      "The exchange is audited by a trusted auditor.": [
        null,
        ""
      ],
      "Warning: The exchange is neither directly trusted nor audited by a trusted auditor. If you withdraw from this exchange, it will be trusted in the future.": [
        null,
        ""
      ],
      "Using exchange provider %1$s. The exchange provider will charge %2$s in fees.": [
        null,
        ""
      ],
      "Waiting for a response from %1$s %2$s": [
        null,
        ""
      ],
      "Information about fees will be available when an exchange provider is selected.": [
        null,
        ""
      ],
      "Your wallet (protocol version %1$s) might be outdated.%2$s The exchange has a higher, incompatible protocol version (%3$s).": [
        null,
        ""
      ],
      "The chosen exchange (protocol version %1$s might be outdated.%2$s The exchange has a lower, incompatible protocol version than your wallet (protocol version %3$s).": [
        null,
        ""
      ],
      "Accept fees and withdraw": [
        null,
        ""
      ],
      "Change Exchange Provider": [
        null,
        ""
      ],
      "Please select an exchange.  You can review the details before after your selection.": [
        null,
        ""
      ],
      "Select %1$s": [
        null,
        ""
      ],
      "You are about to withdraw %1$s from your bank account into your wallet.": [
        null,
        ""
      ],
      "Oops, something went wrong. The wallet responded with error status (%1$s).": [
        null,
        ""
      ],
      "Checking URL, please wait ...": [
        null,
        ""
      ],
      "Can't parse amount: %1$s": [
        null,
        ""
      ],
      "Can't parse wire_types: %1$s": [
        null,
        ""
      ],
      "Fatal error: \"%1$s\".": [
        null,
        ""
      ],
      "Balance": [
        null,
        ""
      ],
      "History": [
        null,
        ""
      ],
      "Debug": [
        null,
        ""
      ],
      "help": [
        null,
        ""
      ],
      "You have no balance to show. Need some %1$s getting started?": [
        null,
        ""
      ],
      "%1$s incoming": [
        null,
        ""
      ],
      "%1$s being spent": [
        null,
        ""
      ],
      "Error: could not retrieve balance information.": [
        null,
        ""
      ],
      "Payback": [
        null,
        ""
      ],
      "Return Electronic Cash to Bank Account": [
        null,
        ""
      ],
      "Manage Trusted Auditors and Exchanges": [
        null,
        ""
      ],
      "Bank requested reserve (%1$s) for %2$s.": [
        null,
        ""
      ],
      "Started to withdraw %1$s from %2$s (%3$s).": [
        null,
        ""
      ],
      "Merchant %1$s offered contract %2$s.": [
        null,
        ""
      ],
      "Withdrew %1$s from %2$s (%3$s).": [
        null,
        ""
      ],
      "Paid %1$s to merchant %2$s. %3$s (%4$s)": [
        null,
        ""
      ],
      "Merchant %1$s gave a refund over %2$s.": [
        null,
        ""
      ],
      "tip": [
        null,
        ""
      ],
      "Merchant %1$s gave a %2$s of %3$s.": [
        null,
        ""
      ],
      "You did not accept the tip yet.": [
        null,
        ""
      ],
      "Unknown event (%1$s)": [
        null,
        ""
      ],
      "Error: could not retrieve event history": [
        null,
        ""
      ],
      "Your wallet has no events recorded.": [
        null,
        ""
      ],
      "Wire to bank account": [
        null,
        ""
      ],
      "Confirm": [
        null,
        ""
      ],
      "Cancel": [
        null,
        ""
      ],
      "Withdrawal fees:": [
        null,
        ""
      ],
      "Rounding loss:": [
        null,
        ""
      ],
      "Earliest expiration (for deposit): %1$s": [
        null,
        ""
      ],
      "# Coins": [
        null,
        ""
      ],
      "Value": [
        null,
        ""
      ],
      "Withdraw Fee": [
        null,
        ""
      ],
      "Refresh Fee": [
        null,
        ""
      ],
      "Deposit Fee": [
        null,
        ""
      ],
      "Invalid Wire": [
        null,
        ""
      ],
      "Invalid Test Wire Detail": [
        null,
        ""
      ],
      "Test Wire Acct #%1$s on %2$s": [
        null,
        ""
      ],
      "Unknown Wire Detail": [
        null,
        ""
      ]
    }
  }
};
strings['fr'] = {
  "domain": "messages",
  "locale_data": {
    "messages": {
      "": {
        "domain": "messages",
        "plural_forms": "nplurals=2; plural=(n != 1);",
        "lang": ""
      },
      "Operation": [
        null,
        ""
      ],
      "time (ms/op)": [
        null,
        ""
      ],
      "show more details": [
        null,
        ""
      ],
      "Accepted exchanges:": [
        null,
        ""
      ],
      "Exchanges in the wallet:": [
        null,
        ""
      ],
      "You have insufficient funds of the requested currency in your wallet.": [
        null,
        ""
      ],
      "You do not have any funds from an exchange that is accepted by this merchant. None of the exchanges accepted by the merchant is known to your wallet.": [
        null,
        ""
      ],
      "Confirm payment": [
        null,
        ""
      ],
      "Submitting payment": [
        null,
        ""
      ],
      "You already paid for this, clicking \"Confirm payment\" will not cost money again.": [
        null,
        ""
      ],
      "Aborting payment ...": [
        null,
        ""
      ],
      "Payment aborted!": [
        null,
        ""
      ],
      "Retry Payment": [
        null,
        ""
      ],
      "Abort Payment": [
        null,
        ""
      ],
      "The merchant %1$s offers you to purchase:": [
        null,
        ""
      ],
      "The total price is %1$s (plus %2$s fees).": [
        null,
        ""
      ],
      "The total price is %1$s.": [
        null,
        ""
      ],
      "Select": [
        null,
        ""
      ],
      "Error: URL may not be relative": [
        null,
        ""
      ],
      "Invalid exchange URL (%1$s)": [
        null,
        ""
      ],
      "The exchange is trusted by the wallet.": [
        null,
        ""
      ],
      "The exchange is audited by a trusted auditor.": [
        null,
        ""
      ],
      "Warning: The exchange is neither directly trusted nor audited by a trusted auditor. If you withdraw from this exchange, it will be trusted in the future.": [
        null,
        ""
      ],
      "Using exchange provider %1$s. The exchange provider will charge %2$s in fees.": [
        null,
        ""
      ],
      "Waiting for a response from %1$s %2$s": [
        null,
        ""
      ],
      "Information about fees will be available when an exchange provider is selected.": [
        null,
        ""
      ],
      "Your wallet (protocol version %1$s) might be outdated.%2$s The exchange has a higher, incompatible protocol version (%3$s).": [
        null,
        ""
      ],
      "The chosen exchange (protocol version %1$s might be outdated.%2$s The exchange has a lower, incompatible protocol version than your wallet (protocol version %3$s).": [
        null,
        ""
      ],
      "Accept fees and withdraw": [
        null,
        ""
      ],
      "Change Exchange Provider": [
        null,
        ""
      ],
      "Please select an exchange.  You can review the details before after your selection.": [
        null,
        ""
      ],
      "Select %1$s": [
        null,
        ""
      ],
      "You are about to withdraw %1$s from your bank account into your wallet.": [
        null,
        ""
      ],
      "Oops, something went wrong. The wallet responded with error status (%1$s).": [
        null,
        ""
      ],
      "Checking URL, please wait ...": [
        null,
        ""
      ],
      "Can't parse amount: %1$s": [
        null,
        ""
      ],
      "Can't parse wire_types: %1$s": [
        null,
        ""
      ],
      "Fatal error: \"%1$s\".": [
        null,
        ""
      ],
      "Balance": [
        null,
        ""
      ],
      "History": [
        null,
        ""
      ],
      "Debug": [
        null,
        ""
      ],
      "help": [
        null,
        ""
      ],
      "You have no balance to show. Need some %1$s getting started?": [
        null,
        ""
      ],
      "%1$s incoming": [
        null,
        ""
      ],
      "%1$s being spent": [
        null,
        ""
      ],
      "Error: could not retrieve balance information.": [
        null,
        ""
      ],
      "Payback": [
        null,
        ""
      ],
      "Return Electronic Cash to Bank Account": [
        null,
        ""
      ],
      "Manage Trusted Auditors and Exchanges": [
        null,
        ""
      ],
      "Bank requested reserve (%1$s) for %2$s.": [
        null,
        ""
      ],
      "Started to withdraw %1$s from %2$s (%3$s).": [
        null,
        ""
      ],
      "Merchant %1$s offered contract %2$s.": [
        null,
        ""
      ],
      "Withdrew %1$s from %2$s (%3$s).": [
        null,
        ""
      ],
      "Paid %1$s to merchant %2$s. %3$s (%4$s)": [
        null,
        ""
      ],
      "Merchant %1$s gave a refund over %2$s.": [
        null,
        ""
      ],
      "tip": [
        null,
        ""
      ],
      "Merchant %1$s gave a %2$s of %3$s.": [
        null,
        ""
      ],
      "You did not accept the tip yet.": [
        null,
        ""
      ],
      "Unknown event (%1$s)": [
        null,
        ""
      ],
      "Error: could not retrieve event history": [
        null,
        ""
      ],
      "Your wallet has no events recorded.": [
        null,
        ""
      ],
      "Wire to bank account": [
        null,
        ""
      ],
      "Confirm": [
        null,
        ""
      ],
      "Cancel": [
        null,
        ""
      ],
      "Withdrawal fees:": [
        null,
        ""
      ],
      "Rounding loss:": [
        null,
        ""
      ],
      "Earliest expiration (for deposit): %1$s": [
        null,
        ""
      ],
      "# Coins": [
        null,
        ""
      ],
      "Value": [
        null,
        ""
      ],
      "Withdraw Fee": [
        null,
        ""
      ],
      "Refresh Fee": [
        null,
        ""
      ],
      "Deposit Fee": [
        null,
        ""
      ],
      "Invalid Wire": [
        null,
        ""
      ],
      "Invalid Test Wire Detail": [
        null,
        ""
      ],
      "Test Wire Acct #%1$s on %2$s": [
        null,
        ""
      ],
      "Unknown Wire Detail": [
        null,
        ""
      ]
    }
  }
};
strings['it'] = {
  "domain": "messages",
  "locale_data": {
    "messages": {
      "": {
        "domain": "messages",
        "plural_forms": "nplurals=2; plural=(n != 1);",
        "lang": ""
      },
      "Operation": [
        null,
        ""
      ],
      "time (ms/op)": [
        null,
        ""
      ],
      "show more details": [
        null,
        ""
      ],
      "Accepted exchanges:": [
        null,
        ""
      ],
      "Exchanges in the wallet:": [
        null,
        ""
      ],
      "You have insufficient funds of the requested currency in your wallet.": [
        null,
        ""
      ],
      "You do not have any funds from an exchange that is accepted by this merchant. None of the exchanges accepted by the merchant is known to your wallet.": [
        null,
        ""
      ],
      "Confirm payment": [
        null,
        ""
      ],
      "Submitting payment": [
        null,
        ""
      ],
      "You already paid for this, clicking \"Confirm payment\" will not cost money again.": [
        null,
        ""
      ],
      "Aborting payment ...": [
        null,
        ""
      ],
      "Payment aborted!": [
        null,
        ""
      ],
      "Retry Payment": [
        null,
        ""
      ],
      "Abort Payment": [
        null,
        ""
      ],
      "The merchant %1$s offers you to purchase:": [
        null,
        ""
      ],
      "The total price is %1$s (plus %2$s fees).": [
        null,
        ""
      ],
      "The total price is %1$s.": [
        null,
        ""
      ],
      "Select": [
        null,
        ""
      ],
      "Error: URL may not be relative": [
        null,
        ""
      ],
      "Invalid exchange URL (%1$s)": [
        null,
        ""
      ],
      "The exchange is trusted by the wallet.": [
        null,
        ""
      ],
      "The exchange is audited by a trusted auditor.": [
        null,
        ""
      ],
      "Warning: The exchange is neither directly trusted nor audited by a trusted auditor. If you withdraw from this exchange, it will be trusted in the future.": [
        null,
        ""
      ],
      "Using exchange provider %1$s. The exchange provider will charge %2$s in fees.": [
        null,
        ""
      ],
      "Waiting for a response from %1$s %2$s": [
        null,
        ""
      ],
      "Information about fees will be available when an exchange provider is selected.": [
        null,
        ""
      ],
      "Your wallet (protocol version %1$s) might be outdated.%2$s The exchange has a higher, incompatible protocol version (%3$s).": [
        null,
        ""
      ],
      "The chosen exchange (protocol version %1$s might be outdated.%2$s The exchange has a lower, incompatible protocol version than your wallet (protocol version %3$s).": [
        null,
        ""
      ],
      "Accept fees and withdraw": [
        null,
        ""
      ],
      "Change Exchange Provider": [
        null,
        ""
      ],
      "Please select an exchange.  You can review the details before after your selection.": [
        null,
        ""
      ],
      "Select %1$s": [
        null,
        ""
      ],
      "You are about to withdraw %1$s from your bank account into your wallet.": [
        null,
        ""
      ],
      "Oops, something went wrong. The wallet responded with error status (%1$s).": [
        null,
        ""
      ],
      "Checking URL, please wait ...": [
        null,
        ""
      ],
      "Can't parse amount: %1$s": [
        null,
        ""
      ],
      "Can't parse wire_types: %1$s": [
        null,
        ""
      ],
      "Fatal error: \"%1$s\".": [
        null,
        ""
      ],
      "Balance": [
        null,
        ""
      ],
      "History": [
        null,
        ""
      ],
      "Debug": [
        null,
        ""
      ],
      "help": [
        null,
        ""
      ],
      "You have no balance to show. Need some %1$s getting started?": [
        null,
        ""
      ],
      "%1$s incoming": [
        null,
        ""
      ],
      "%1$s being spent": [
        null,
        ""
      ],
      "Error: could not retrieve balance information.": [
        null,
        ""
      ],
      "Payback": [
        null,
        ""
      ],
      "Return Electronic Cash to Bank Account": [
        null,
        ""
      ],
      "Manage Trusted Auditors and Exchanges": [
        null,
        ""
      ],
      "Bank requested reserve (%1$s) for %2$s.": [
        null,
        ""
      ],
      "Started to withdraw %1$s from %2$s (%3$s).": [
        null,
        ""
      ],
      "Merchant %1$s offered contract %2$s.": [
        null,
        ""
      ],
      "Withdrew %1$s from %2$s (%3$s).": [
        null,
        ""
      ],
      "Paid %1$s to merchant %2$s. %3$s (%4$s)": [
        null,
        ""
      ],
      "Merchant %1$s gave a refund over %2$s.": [
        null,
        ""
      ],
      "tip": [
        null,
        ""
      ],
      "Merchant %1$s gave a %2$s of %3$s.": [
        null,
        ""
      ],
      "You did not accept the tip yet.": [
        null,
        ""
      ],
      "Unknown event (%1$s)": [
        null,
        ""
      ],
      "Error: could not retrieve event history": [
        null,
        ""
      ],
      "Your wallet has no events recorded.": [
        null,
        ""
      ],
      "Wire to bank account": [
        null,
        ""
      ],
      "Confirm": [
        null,
        ""
      ],
      "Cancel": [
        null,
        ""
      ],
      "Withdrawal fees:": [
        null,
        ""
      ],
      "Rounding loss:": [
        null,
        ""
      ],
      "Earliest expiration (for deposit): %1$s": [
        null,
        ""
      ],
      "# Coins": [
        null,
        ""
      ],
      "Value": [
        null,
        ""
      ],
      "Withdraw Fee": [
        null,
        ""
      ],
      "Refresh Fee": [
        null,
        ""
      ],
      "Deposit Fee": [
        null,
        ""
      ],
      "Invalid Wire": [
        null,
        ""
      ],
      "Invalid Test Wire Detail": [
        null,
        ""
      ],
      "Test Wire Acct #%1$s on %2$s": [
        null,
        ""
      ],
      "Unknown Wire Detail": [
        null,
        ""
      ]
    }
  }
};
strings['sv'] = {
  "domain": "messages",
  "locale_data": {
    "messages": {
      "": {
        "domain": "messages",
        "plural_forms": "nplurals=2; plural=(n != 1);",
        "lang": ""
      },
      "Operation": [
        null,
        ""
      ],
      "time (ms/op)": [
        null,
        ""
      ],
      "show more details": [
        null,
        "visa mer"
      ],
      "Accepted exchanges:": [
        null,
        "Accepterade tjänsteleverantörer:"
      ],
      "Exchanges in the wallet:": [
        null,
        "Tjänsteleverantörer i plånboken:"
      ],
      "You have insufficient funds of the requested currency in your wallet.": [
        null,
        "plånboken"
      ],
      "You do not have any funds from an exchange that is accepted by this merchant. None of the exchanges accepted by the merchant is known to your wallet.": [
        null,
        "plånboken"
      ],
      "Confirm payment": [
        null,
        "Godkän betalning"
      ],
      "Submitting payment": [
        null,
        "Bekräftar betalning"
      ],
      "You already paid for this, clicking \"Confirm payment\" will not cost money again.": [
        null,
        "Du har redan betalat för det här, om du trycker \"Godkän betalning\" debiteras du inte igen"
      ],
      "Aborting payment ...": [
        null,
        "Bekräftar betalning"
      ],
      "Payment aborted!": [
        null,
        ""
      ],
      "Retry Payment": [
        null,
        ""
      ],
      "Abort Payment": [
        null,
        "Godkän betalning"
      ],
      "The merchant %1$s offers you to purchase:": [
        null,
        "Säljaren %1$s erbjuder följande:"
      ],
      "The total price is %1$s (plus %2$s fees).": [
        null,
        "Det totala priset är %1$s (plus %2$s avgifter).\n"
      ],
      "The total price is %1$s.": [
        null,
        "Det totala priset är %1$s."
      ],
      "Select": [
        null,
        "Välj"
      ],
      "Error: URL may not be relative": [
        null,
        ""
      ],
      "Invalid exchange URL (%1$s)": [
        null,
        ""
      ],
      "The exchange is trusted by the wallet.": [
        null,
        "Tjänsteleverantörer i plånboken:"
      ],
      "The exchange is audited by a trusted auditor.": [
        null,
        ""
      ],
      "Warning: The exchange is neither directly trusted nor audited by a trusted auditor. If you withdraw from this exchange, it will be trusted in the future.": [
        null,
        ""
      ],
      "Using exchange provider %1$s. The exchange provider will charge %2$s in fees.": [
        null,
        ""
      ],
      "Waiting for a response from %1$s %2$s": [
        null,
        ""
      ],
      "Information about fees will be available when an exchange provider is selected.": [
        null,
        ""
      ],
      "Your wallet (protocol version %1$s) might be outdated.%2$s The exchange has a higher, incompatible protocol version (%3$s).": [
        null,
        "tjänsteleverantörer plånboken"
      ],
      "The chosen exchange (protocol version %1$s might be outdated.%2$s The exchange has a lower, incompatible protocol version than your wallet (protocol version %3$s).": [
        null,
        "tjänsteleverantörer plånboken"
      ],
      "Accept fees and withdraw": [
        null,
        "Acceptera avgifter och utbetala"
      ],
      "Change Exchange Provider": [
        null,
        "Ändra tjänsteleverantörer"
      ],
      "Please select an exchange.  You can review the details before after your selection.": [
        null,
        ""
      ],
      "Select %1$s": [
        null,
        "Välj %1$s"
      ],
      "You are about to withdraw %1$s from your bank account into your wallet.": [
        null,
        "Du är på väg att ta ut\n %1$s från ditt bankkonto till din plånbok.\n"
      ],
      "Oops, something went wrong. The wallet responded with error status (%1$s).": [
        null,
        "plånboken"
      ],
      "Checking URL, please wait ...": [
        null,
        ""
      ],
      "Can't parse amount: %1$s": [
        null,
        ""
      ],
      "Can't parse wire_types: %1$s": [
        null,
        ""
      ],
      "Fatal error: \"%1$s\".": [
        null,
        ""
      ],
      "Balance": [
        null,
        "Balans"
      ],
      "History": [
        null,
        "Historia"
      ],
      "Debug": [
        null,
        ""
      ],
      "help": [
        null,
        "hjälp"
      ],
      "You have no balance to show. Need some %1$s getting started?": [
        null,
        "Du har ingen balans att visa. Behöver du\n %1$s att börja?\n"
      ],
      "%1$s incoming": [
        null,
        "%1$s inkommande"
      ],
      "%1$s being spent": [
        null,
        ""
      ],
      "Error: could not retrieve balance information.": [
        null,
        ""
      ],
      "Payback": [
        null,
        "Återbetalning"
      ],
      "Return Electronic Cash to Bank Account": [
        null,
        "Återlämna elektroniska pengar till bank konto"
      ],
      "Manage Trusted Auditors and Exchanges": [
        null,
        ""
      ],
      "Bank requested reserve (%1$s) for %2$s.": [
        null,
        ""
      ],
      "Started to withdraw %1$s from %2$s (%3$s).": [
        null,
        ""
      ],
      "Merchant %1$s offered contract %2$s.": [
        null,
        "Säljaren %1$s erbjöd kontrakt %2$s.\n"
      ],
      "Withdrew %1$s from %2$s (%3$s).": [
        null,
        ""
      ],
      "Paid %1$s to merchant %2$s. %3$s (%4$s)": [
        null,
        ""
      ],
      "Merchant %1$s gave a refund over %2$s.": [
        null,
        "Säljaren %1$sgav en återbetalning på %2$s.\n"
      ],
      "tip": [
        null,
        ""
      ],
      "Merchant %1$s gave a %2$s of %3$s.": [
        null,
        "Säljaren %1$sgav en återbetalning på %2$s.\n"
      ],
      "You did not accept the tip yet.": [
        null,
        ""
      ],
      "Unknown event (%1$s)": [
        null,
        ""
      ],
      "Error: could not retrieve event history": [
        null,
        ""
      ],
      "Your wallet has no events recorded.": [
        null,
        "plånboken"
      ],
      "Wire to bank account": [
        null,
        "Övervisa till bank konto"
      ],
      "Confirm": [
        null,
        "Bekräfta"
      ],
      "Cancel": [
        null,
        "Avbryt"
      ],
      "Withdrawal fees:": [
        null,
        "Utbetalnings avgifter:"
      ],
      "Rounding loss:": [
        null,
        ""
      ],
      "Earliest expiration (for deposit): %1$s": [
        null,
        ""
      ],
      "# Coins": [
        null,
        "# Mynt"
      ],
      "Value": [
        null,
        "Värde"
      ],
      "Withdraw Fee": [
        null,
        "Utbetalnings avgift"
      ],
      "Refresh Fee": [
        null,
        "Återhämtnings avgift"
      ],
      "Deposit Fee": [
        null,
        "Depostitions avgift"
      ],
      "Invalid Wire": [
        null,
        ""
      ],
      "Invalid Test Wire Detail": [
        null,
        ""
      ],
      "Test Wire Acct #%1$s on %2$s": [
        null,
        ""
      ],
      "Unknown Wire Detail": [
        null,
        "visa mer"
      ]
    }
  }
};
