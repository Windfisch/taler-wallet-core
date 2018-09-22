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
        ""
      ],
      "time (ms/op)": [
        ""
      ],
      "show more details": [
        ""
      ],
      "Accepted exchanges:": [
        ""
      ],
      "Exchanges in the wallet:": [
        ""
      ],
      "You have insufficient funds of the requested currency in your wallet.": [
        ""
      ],
      "You do not have any funds from an exchange that is accepted by this merchant. None of the exchanges accepted by the merchant is known to your wallet.": [
        ""
      ],
      "Confirm payment": [
        "Bezahlung bestätigen"
      ],
      "Submitting payment": [
        ""
      ],
      "You already paid for this, clicking \"Confirm payment\" will not cost money again.": [
        ""
      ],
      "Aborting payment ...": [
        "Bezahlung bestätigen"
      ],
      "Payment aborted!": [
        ""
      ],
      "Retry Payment": [
        "Bezahlung bestätigen"
      ],
      "Abort Payment": [
        "Bezahlung bestätigen"
      ],
      "The merchant %1$s offers you to purchase:": [
        "Der Händler %1$s möchte einen Vertrag über %2$s mit Ihnen abschließen."
      ],
      "The total price is %1$s (plus %2$s fees).": [
        ""
      ],
      "The total price is %1$s.": [
        ""
      ],
      "Select": [
        ""
      ],
      "Error: URL may not be relative": [
        ""
      ],
      "Invalid exchange URL (%1$s)": [
        ""
      ],
      "The exchange is trusted by the wallet.": [
        ""
      ],
      "The exchange is audited by a trusted auditor.": [
        ""
      ],
      "Warning: The exchange is neither directly trusted nor audited by a trusted auditor. If you withdraw from this exchange, it will be trusted in the future.": [
        ""
      ],
      "Using exchange provider %1$s. The exchange provider will charge %2$s in fees.": [
        ""
      ],
      "Waiting for a response from %1$s %2$s": [
        ""
      ],
      "Information about fees will be available when an exchange provider is selected.": [
        ""
      ],
      "Your wallet (protocol version %1$s) might be outdated.%2$s The exchange has a higher, incompatible protocol version (%3$s).": [
        ""
      ],
      "The chosen exchange (protocol version %1$s might be outdated.%2$s The exchange has a lower, incompatible protocol version than your wallet (protocol version %3$s).": [
        ""
      ],
      "Accept fees and withdraw": [
        ""
      ],
      "Change Exchange Provider": [
        ""
      ],
      "Please select an exchange.  You can review the details before after your selection.": [
        ""
      ],
      "Select %1$s": [
        ""
      ],
      "You are about to withdraw %1$s from your bank account into your wallet.": [
        ""
      ],
      "Oops, something went wrong. The wallet responded with error status (%1$s).": [
        ""
      ],
      "Checking URL, please wait ...": [
        ""
      ],
      "Can't parse amount: %1$s": [
        ""
      ],
      "Can't parse wire_types: %1$s": [
        ""
      ],
      "Fatal error: \"%1$s\".": [
        ""
      ],
      "Balance": [
        "Saldo"
      ],
      "History": [
        "Verlauf"
      ],
      "Debug": [
        "Debug"
      ],
      "help": [
        ""
      ],
      "You have no balance to show. Need some %1$s getting started?": [
        "Sie haben kein Digitalgeld. Wollen Sie %1$s? abheben?"
      ],
      "%1$s incoming": [
        ""
      ],
      "%1$s being spent": [
        ""
      ],
      "Error: could not retrieve balance information.": [
        ""
      ],
      "Payback": [
        ""
      ],
      "Return Electronic Cash to Bank Account": [
        ""
      ],
      "Manage Trusted Auditors and Exchanges": [
        ""
      ],
      "Bank requested reserve (%1$s) for %2$s.": [
        "Bank bestätig anlegen der Reserve (%1$s) bei %2$s"
      ],
      "Started to withdraw %1$s from %2$s (%3$s).": [
        "Reserve (%1$s) mit %2$s bei %3$s erzeugt"
      ],
      "Merchant %1$s offered contract %2$s.": [
        "%1$s\n               möchte einen Vertrag über %2$s\n               mit Ihnen abschließen."
      ],
      "Withdrew %1$s from %2$s (%3$s).": [
        "Reserve (%1$s) mit %2$s bei %3$s erzeugt"
      ],
      "Paid %1$s to merchant %2$s. %3$s (%4$s)": [
        "Reserve (%1$s) mit %2$s bei %3$s erzeugt"
      ],
      "Merchant %1$s gave a refund over %2$s.": [
        "%1$s\n               möchte einen Vertrag über %2$s\n               mit Ihnen abschließen."
      ],
      "tip": [
        ""
      ],
      "Merchant %1$s gave a %2$s of %3$s.": [
        "%1$s\n               möchte einen Vertrag über %2$s\n               mit Ihnen abschließen."
      ],
      "You did not accept the tip yet.": [
        ""
      ],
      "Unknown event (%1$s)": [
        ""
      ],
      "Error: could not retrieve event history": [
        ""
      ],
      "Your wallet has no events recorded.": [
        "Ihre Geldbörse verzeichnet keine Vorkommnisse."
      ],
      "Wire to bank account": [
        ""
      ],
      "Confirm": [
        "Bezahlung bestätigen"
      ],
      "Cancel": [
        "Saldo"
      ],
      "Withdrawal fees:": [
        "Abheben bei"
      ],
      "Rounding loss:": [
        ""
      ],
      "Earliest expiration (for deposit): %1$s": [
        ""
      ],
      "# Coins": [
        ""
      ],
      "Value": [
        ""
      ],
      "Withdraw Fee": [
        "Abheben bei %1$s"
      ],
      "Refresh Fee": [
        ""
      ],
      "Deposit Fee": [
        ""
      ],
      "Invalid Wire": [
        ""
      ],
      "Invalid Test Wire Detail": [
        ""
      ],
      "Test Wire Acct #%1$s on %2$s": [
        ""
      ],
      "Unknown Wire Detail": [
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
        ""
      ],
      "time (ms/op)": [
        ""
      ],
      "show more details": [
        ""
      ],
      "Accepted exchanges:": [
        ""
      ],
      "Exchanges in the wallet:": [
        ""
      ],
      "You have insufficient funds of the requested currency in your wallet.": [
        ""
      ],
      "You do not have any funds from an exchange that is accepted by this merchant. None of the exchanges accepted by the merchant is known to your wallet.": [
        ""
      ],
      "Confirm payment": [
        ""
      ],
      "Submitting payment": [
        ""
      ],
      "You already paid for this, clicking \"Confirm payment\" will not cost money again.": [
        ""
      ],
      "Aborting payment ...": [
        ""
      ],
      "Payment aborted!": [
        ""
      ],
      "Retry Payment": [
        ""
      ],
      "Abort Payment": [
        ""
      ],
      "The merchant %1$s offers you to purchase:": [
        ""
      ],
      "The total price is %1$s (plus %2$s fees).": [
        ""
      ],
      "The total price is %1$s.": [
        ""
      ],
      "Select": [
        ""
      ],
      "Error: URL may not be relative": [
        ""
      ],
      "Invalid exchange URL (%1$s)": [
        ""
      ],
      "The exchange is trusted by the wallet.": [
        ""
      ],
      "The exchange is audited by a trusted auditor.": [
        ""
      ],
      "Warning: The exchange is neither directly trusted nor audited by a trusted auditor. If you withdraw from this exchange, it will be trusted in the future.": [
        ""
      ],
      "Using exchange provider %1$s. The exchange provider will charge %2$s in fees.": [
        ""
      ],
      "Waiting for a response from %1$s %2$s": [
        ""
      ],
      "Information about fees will be available when an exchange provider is selected.": [
        ""
      ],
      "Your wallet (protocol version %1$s) might be outdated.%2$s The exchange has a higher, incompatible protocol version (%3$s).": [
        ""
      ],
      "The chosen exchange (protocol version %1$s might be outdated.%2$s The exchange has a lower, incompatible protocol version than your wallet (protocol version %3$s).": [
        ""
      ],
      "Accept fees and withdraw": [
        ""
      ],
      "Change Exchange Provider": [
        ""
      ],
      "Please select an exchange.  You can review the details before after your selection.": [
        ""
      ],
      "Select %1$s": [
        ""
      ],
      "You are about to withdraw %1$s from your bank account into your wallet.": [
        ""
      ],
      "Oops, something went wrong. The wallet responded with error status (%1$s).": [
        ""
      ],
      "Checking URL, please wait ...": [
        ""
      ],
      "Can't parse amount: %1$s": [
        ""
      ],
      "Can't parse wire_types: %1$s": [
        ""
      ],
      "Fatal error: \"%1$s\".": [
        ""
      ],
      "Balance": [
        ""
      ],
      "History": [
        ""
      ],
      "Debug": [
        ""
      ],
      "help": [
        ""
      ],
      "You have no balance to show. Need some %1$s getting started?": [
        ""
      ],
      "%1$s incoming": [
        ""
      ],
      "%1$s being spent": [
        ""
      ],
      "Error: could not retrieve balance information.": [
        ""
      ],
      "Payback": [
        ""
      ],
      "Return Electronic Cash to Bank Account": [
        ""
      ],
      "Manage Trusted Auditors and Exchanges": [
        ""
      ],
      "Bank requested reserve (%1$s) for %2$s.": [
        ""
      ],
      "Started to withdraw %1$s from %2$s (%3$s).": [
        ""
      ],
      "Merchant %1$s offered contract %2$s.": [
        ""
      ],
      "Withdrew %1$s from %2$s (%3$s).": [
        ""
      ],
      "Paid %1$s to merchant %2$s. %3$s (%4$s)": [
        ""
      ],
      "Merchant %1$s gave a refund over %2$s.": [
        ""
      ],
      "tip": [
        ""
      ],
      "Merchant %1$s gave a %2$s of %3$s.": [
        ""
      ],
      "You did not accept the tip yet.": [
        ""
      ],
      "Unknown event (%1$s)": [
        ""
      ],
      "Error: could not retrieve event history": [
        ""
      ],
      "Your wallet has no events recorded.": [
        ""
      ],
      "Wire to bank account": [
        ""
      ],
      "Confirm": [
        ""
      ],
      "Cancel": [
        ""
      ],
      "Withdrawal fees:": [
        ""
      ],
      "Rounding loss:": [
        ""
      ],
      "Earliest expiration (for deposit): %1$s": [
        ""
      ],
      "# Coins": [
        ""
      ],
      "Value": [
        ""
      ],
      "Withdraw Fee": [
        ""
      ],
      "Refresh Fee": [
        ""
      ],
      "Deposit Fee": [
        ""
      ],
      "Invalid Wire": [
        ""
      ],
      "Invalid Test Wire Detail": [
        ""
      ],
      "Test Wire Acct #%1$s on %2$s": [
        ""
      ],
      "Unknown Wire Detail": [
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
        ""
      ],
      "time (ms/op)": [
        ""
      ],
      "show more details": [
        ""
      ],
      "Accepted exchanges:": [
        ""
      ],
      "Exchanges in the wallet:": [
        ""
      ],
      "You have insufficient funds of the requested currency in your wallet.": [
        ""
      ],
      "You do not have any funds from an exchange that is accepted by this merchant. None of the exchanges accepted by the merchant is known to your wallet.": [
        ""
      ],
      "Confirm payment": [
        ""
      ],
      "Submitting payment": [
        ""
      ],
      "You already paid for this, clicking \"Confirm payment\" will not cost money again.": [
        ""
      ],
      "Aborting payment ...": [
        ""
      ],
      "Payment aborted!": [
        ""
      ],
      "Retry Payment": [
        ""
      ],
      "Abort Payment": [
        ""
      ],
      "The merchant %1$s offers you to purchase:": [
        ""
      ],
      "The total price is %1$s (plus %2$s fees).": [
        ""
      ],
      "The total price is %1$s.": [
        ""
      ],
      "Select": [
        ""
      ],
      "Error: URL may not be relative": [
        ""
      ],
      "Invalid exchange URL (%1$s)": [
        ""
      ],
      "The exchange is trusted by the wallet.": [
        ""
      ],
      "The exchange is audited by a trusted auditor.": [
        ""
      ],
      "Warning: The exchange is neither directly trusted nor audited by a trusted auditor. If you withdraw from this exchange, it will be trusted in the future.": [
        ""
      ],
      "Using exchange provider %1$s. The exchange provider will charge %2$s in fees.": [
        ""
      ],
      "Waiting for a response from %1$s %2$s": [
        ""
      ],
      "Information about fees will be available when an exchange provider is selected.": [
        ""
      ],
      "Your wallet (protocol version %1$s) might be outdated.%2$s The exchange has a higher, incompatible protocol version (%3$s).": [
        ""
      ],
      "The chosen exchange (protocol version %1$s might be outdated.%2$s The exchange has a lower, incompatible protocol version than your wallet (protocol version %3$s).": [
        ""
      ],
      "Accept fees and withdraw": [
        ""
      ],
      "Change Exchange Provider": [
        ""
      ],
      "Please select an exchange.  You can review the details before after your selection.": [
        ""
      ],
      "Select %1$s": [
        ""
      ],
      "You are about to withdraw %1$s from your bank account into your wallet.": [
        ""
      ],
      "Oops, something went wrong. The wallet responded with error status (%1$s).": [
        ""
      ],
      "Checking URL, please wait ...": [
        ""
      ],
      "Can't parse amount: %1$s": [
        ""
      ],
      "Can't parse wire_types: %1$s": [
        ""
      ],
      "Fatal error: \"%1$s\".": [
        ""
      ],
      "Balance": [
        ""
      ],
      "History": [
        ""
      ],
      "Debug": [
        ""
      ],
      "help": [
        ""
      ],
      "You have no balance to show. Need some %1$s getting started?": [
        ""
      ],
      "%1$s incoming": [
        ""
      ],
      "%1$s being spent": [
        ""
      ],
      "Error: could not retrieve balance information.": [
        ""
      ],
      "Payback": [
        ""
      ],
      "Return Electronic Cash to Bank Account": [
        ""
      ],
      "Manage Trusted Auditors and Exchanges": [
        ""
      ],
      "Bank requested reserve (%1$s) for %2$s.": [
        ""
      ],
      "Started to withdraw %1$s from %2$s (%3$s).": [
        ""
      ],
      "Merchant %1$s offered contract %2$s.": [
        ""
      ],
      "Withdrew %1$s from %2$s (%3$s).": [
        ""
      ],
      "Paid %1$s to merchant %2$s. %3$s (%4$s)": [
        ""
      ],
      "Merchant %1$s gave a refund over %2$s.": [
        ""
      ],
      "tip": [
        ""
      ],
      "Merchant %1$s gave a %2$s of %3$s.": [
        ""
      ],
      "You did not accept the tip yet.": [
        ""
      ],
      "Unknown event (%1$s)": [
        ""
      ],
      "Error: could not retrieve event history": [
        ""
      ],
      "Your wallet has no events recorded.": [
        ""
      ],
      "Wire to bank account": [
        ""
      ],
      "Confirm": [
        ""
      ],
      "Cancel": [
        ""
      ],
      "Withdrawal fees:": [
        ""
      ],
      "Rounding loss:": [
        ""
      ],
      "Earliest expiration (for deposit): %1$s": [
        ""
      ],
      "# Coins": [
        ""
      ],
      "Value": [
        ""
      ],
      "Withdraw Fee": [
        ""
      ],
      "Refresh Fee": [
        ""
      ],
      "Deposit Fee": [
        ""
      ],
      "Invalid Wire": [
        ""
      ],
      "Invalid Test Wire Detail": [
        ""
      ],
      "Test Wire Acct #%1$s on %2$s": [
        ""
      ],
      "Unknown Wire Detail": [
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
        ""
      ],
      "time (ms/op)": [
        ""
      ],
      "show more details": [
        ""
      ],
      "Accepted exchanges:": [
        ""
      ],
      "Exchanges in the wallet:": [
        ""
      ],
      "You have insufficient funds of the requested currency in your wallet.": [
        ""
      ],
      "You do not have any funds from an exchange that is accepted by this merchant. None of the exchanges accepted by the merchant is known to your wallet.": [
        ""
      ],
      "Confirm payment": [
        ""
      ],
      "Submitting payment": [
        ""
      ],
      "You already paid for this, clicking \"Confirm payment\" will not cost money again.": [
        ""
      ],
      "Aborting payment ...": [
        ""
      ],
      "Payment aborted!": [
        ""
      ],
      "Retry Payment": [
        ""
      ],
      "Abort Payment": [
        ""
      ],
      "The merchant %1$s offers you to purchase:": [
        ""
      ],
      "The total price is %1$s (plus %2$s fees).": [
        ""
      ],
      "The total price is %1$s.": [
        ""
      ],
      "Select": [
        ""
      ],
      "Error: URL may not be relative": [
        ""
      ],
      "Invalid exchange URL (%1$s)": [
        ""
      ],
      "The exchange is trusted by the wallet.": [
        ""
      ],
      "The exchange is audited by a trusted auditor.": [
        ""
      ],
      "Warning: The exchange is neither directly trusted nor audited by a trusted auditor. If you withdraw from this exchange, it will be trusted in the future.": [
        ""
      ],
      "Using exchange provider %1$s. The exchange provider will charge %2$s in fees.": [
        ""
      ],
      "Waiting for a response from %1$s %2$s": [
        ""
      ],
      "Information about fees will be available when an exchange provider is selected.": [
        ""
      ],
      "Your wallet (protocol version %1$s) might be outdated.%2$s The exchange has a higher, incompatible protocol version (%3$s).": [
        ""
      ],
      "The chosen exchange (protocol version %1$s might be outdated.%2$s The exchange has a lower, incompatible protocol version than your wallet (protocol version %3$s).": [
        ""
      ],
      "Accept fees and withdraw": [
        ""
      ],
      "Change Exchange Provider": [
        ""
      ],
      "Please select an exchange.  You can review the details before after your selection.": [
        ""
      ],
      "Select %1$s": [
        ""
      ],
      "You are about to withdraw %1$s from your bank account into your wallet.": [
        ""
      ],
      "Oops, something went wrong. The wallet responded with error status (%1$s).": [
        ""
      ],
      "Checking URL, please wait ...": [
        ""
      ],
      "Can't parse amount: %1$s": [
        ""
      ],
      "Can't parse wire_types: %1$s": [
        ""
      ],
      "Fatal error: \"%1$s\".": [
        ""
      ],
      "Balance": [
        ""
      ],
      "History": [
        ""
      ],
      "Debug": [
        ""
      ],
      "help": [
        ""
      ],
      "You have no balance to show. Need some %1$s getting started?": [
        ""
      ],
      "%1$s incoming": [
        ""
      ],
      "%1$s being spent": [
        ""
      ],
      "Error: could not retrieve balance information.": [
        ""
      ],
      "Payback": [
        ""
      ],
      "Return Electronic Cash to Bank Account": [
        ""
      ],
      "Manage Trusted Auditors and Exchanges": [
        ""
      ],
      "Bank requested reserve (%1$s) for %2$s.": [
        ""
      ],
      "Started to withdraw %1$s from %2$s (%3$s).": [
        ""
      ],
      "Merchant %1$s offered contract %2$s.": [
        ""
      ],
      "Withdrew %1$s from %2$s (%3$s).": [
        ""
      ],
      "Paid %1$s to merchant %2$s. %3$s (%4$s)": [
        ""
      ],
      "Merchant %1$s gave a refund over %2$s.": [
        ""
      ],
      "tip": [
        ""
      ],
      "Merchant %1$s gave a %2$s of %3$s.": [
        ""
      ],
      "You did not accept the tip yet.": [
        ""
      ],
      "Unknown event (%1$s)": [
        ""
      ],
      "Error: could not retrieve event history": [
        ""
      ],
      "Your wallet has no events recorded.": [
        ""
      ],
      "Wire to bank account": [
        ""
      ],
      "Confirm": [
        ""
      ],
      "Cancel": [
        ""
      ],
      "Withdrawal fees:": [
        ""
      ],
      "Rounding loss:": [
        ""
      ],
      "Earliest expiration (for deposit): %1$s": [
        ""
      ],
      "# Coins": [
        ""
      ],
      "Value": [
        ""
      ],
      "Withdraw Fee": [
        ""
      ],
      "Refresh Fee": [
        ""
      ],
      "Deposit Fee": [
        ""
      ],
      "Invalid Wire": [
        ""
      ],
      "Invalid Test Wire Detail": [
        ""
      ],
      "Test Wire Acct #%1$s on %2$s": [
        ""
      ],
      "Unknown Wire Detail": [
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
        ""
      ],
      "time (ms/op)": [
        ""
      ],
      "show more details": [
        "visa mer"
      ],
      "Accepted exchanges:": [
        "Accepterade tjänsteleverantörer:"
      ],
      "Exchanges in the wallet:": [
        "Tjänsteleverantörer i plånboken:"
      ],
      "You have insufficient funds of the requested currency in your wallet.": [
        "plånboken"
      ],
      "You do not have any funds from an exchange that is accepted by this merchant. None of the exchanges accepted by the merchant is known to your wallet.": [
        "plånboken"
      ],
      "Confirm payment": [
        "Godkän betalning"
      ],
      "Submitting payment": [
        "Bekräftar betalning"
      ],
      "You already paid for this, clicking \"Confirm payment\" will not cost money again.": [
        "Du har redan betalat för det här, om du trycker \"Godkän betalning\" debiteras du inte igen"
      ],
      "Aborting payment ...": [
        ""
      ],
      "Payment aborted!": [
        ""
      ],
      "Retry Payment": [
        ""
      ],
      "Abort Payment": [
        ""
      ],
      "The merchant %1$s offers you to purchase:": [
        "Säljaren %1$s erbjuder följande:"
      ],
      "The total price is %1$s (plus %2$s fees).": [
        "Det totala priset är %1$s (plus %2$s avgifter).\n"
      ],
      "The total price is %1$s.": [
        "Det totala priset är %1$s."
      ],
      "Select": [
        "Välj"
      ],
      "Error: URL may not be relative": [
        ""
      ],
      "Invalid exchange URL (%1$s)": [
        ""
      ],
      "The exchange is trusted by the wallet.": [
        ""
      ],
      "The exchange is audited by a trusted auditor.": [
        ""
      ],
      "Warning: The exchange is neither directly trusted nor audited by a trusted auditor. If you withdraw from this exchange, it will be trusted in the future.": [
        ""
      ],
      "Using exchange provider %1$s. The exchange provider will charge %2$s in fees.": [
        ""
      ],
      "Waiting for a response from %1$s %2$s": [
        ""
      ],
      "Information about fees will be available when an exchange provider is selected.": [
        ""
      ],
      "Your wallet (protocol version %1$s) might be outdated.%2$s The exchange has a higher, incompatible protocol version (%3$s).": [
        "tjänsteleverantörer plånboken"
      ],
      "The chosen exchange (protocol version %1$s might be outdated.%2$s The exchange has a lower, incompatible protocol version than your wallet (protocol version %3$s).": [
        "tjänsteleverantörer plånboken"
      ],
      "Accept fees and withdraw": [
        "Acceptera avgifter och utbetala"
      ],
      "Change Exchange Provider": [
        "Ändra tjänsteleverantörer"
      ],
      "Please select an exchange.  You can review the details before after your selection.": [
        ""
      ],
      "Select %1$s": [
        "Välj %1$s"
      ],
      "You are about to withdraw %1$s from your bank account into your wallet.": [
        "Du är på väg att ta ut\n %1$s från ditt bankkonto till din plånbok.\n"
      ],
      "Oops, something went wrong. The wallet responded with error status (%1$s).": [
        "plånboken"
      ],
      "Checking URL, please wait ...": [
        ""
      ],
      "Can't parse amount: %1$s": [
        ""
      ],
      "Can't parse wire_types: %1$s": [
        ""
      ],
      "Fatal error: \"%1$s\".": [
        ""
      ],
      "Balance": [
        "Balans"
      ],
      "History": [
        "Historia"
      ],
      "Debug": [
        ""
      ],
      "help": [
        "hjälp"
      ],
      "You have no balance to show. Need some %1$s getting started?": [
        "Du har ingen balans att visa. Behöver du\n %1$s att börja?\n"
      ],
      "%1$s incoming": [
        "%1$s inkommande"
      ],
      "%1$s being spent": [
        ""
      ],
      "Error: could not retrieve balance information.": [
        ""
      ],
      "Payback": [
        "Återbetalning"
      ],
      "Return Electronic Cash to Bank Account": [
        "Återlämna elektroniska pengar till bank konto"
      ],
      "Manage Trusted Auditors and Exchanges": [
        ""
      ],
      "Bank requested reserve (%1$s) for %2$s.": [
        ""
      ],
      "Started to withdraw %1$s from %2$s (%3$s).": [
        ""
      ],
      "Merchant %1$s offered contract %2$s.": [
        "Säljaren %1$s erbjöd kontrakt %2$s.\n"
      ],
      "Withdrew %1$s from %2$s (%3$s).": [
        ""
      ],
      "Paid %1$s to merchant %2$s. %3$s (%4$s)": [
        ""
      ],
      "Merchant %1$s gave a refund over %2$s.": [
        "Säljaren %1$sgav en återbetalning på %2$s.\n"
      ],
      "tip": [
        ""
      ],
      "Merchant %1$s gave a %2$s of %3$s.": [
        "Säljaren %1$sgav en återbetalning på %2$s.\n"
      ],
      "You did not accept the tip yet.": [
        ""
      ],
      "Unknown event (%1$s)": [
        ""
      ],
      "Error: could not retrieve event history": [
        ""
      ],
      "Your wallet has no events recorded.": [
        "plånboken"
      ],
      "Wire to bank account": [
        "Övervisa till bank konto"
      ],
      "Confirm": [
        "Bekräfta"
      ],
      "Cancel": [
        "Avbryt"
      ],
      "Withdrawal fees:": [
        "Utbetalnings avgifter:"
      ],
      "Rounding loss:": [
        ""
      ],
      "Earliest expiration (for deposit): %1$s": [
        ""
      ],
      "# Coins": [
        "# Mynt"
      ],
      "Value": [
        "Värde"
      ],
      "Withdraw Fee": [
        "Utbetalnings avgift"
      ],
      "Refresh Fee": [
        "Återhämtnings avgift"
      ],
      "Deposit Fee": [
        "Depostitions avgift"
      ],
      "Invalid Wire": [
        ""
      ],
      "Invalid Test Wire Detail": [
        ""
      ],
      "Test Wire Acct #%1$s on %2$s": [
        ""
      ],
      "Unknown Wire Detail": [
        ""
      ]
    }
  }
};
