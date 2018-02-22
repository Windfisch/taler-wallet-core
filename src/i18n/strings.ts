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
      "show more details\n ": [
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
        ""
      ],
      "Payment aborted!": [
        ""
      ],
      "Retry Payment": [
        ""
      ],
      "Abort Payment": [
        "Bezahlung bestätigen"
      ],
      "The merchant %1$soffers you to purchase:\n ": [
        ""
      ],
      "The total price is %1$s(plus %2$sfees).\n ": [
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
      "The exchange is trusted by the wallet.\n ": [
        ""
      ],
      "The exchange is audited by a trusted auditor.\n ": [
        ""
      ],
      "Warning:  The exchange is neither directly trusted nor audited by a trusted auditor.\nIf you withdraw from this exchange, it will be trusted in the future.\n ": [
        ""
      ],
      "Using exchange provider %1$s.\nThe exchange provider will charge\n %2$s%3$s%4$sin fees.\n ": [
        ""
      ],
      "Waiting for a response from\n %1$s%2$s": [
        ""
      ],
      "Information about fees will be available when an exchange provider is selected.": [
        ""
      ],
      "Your wallet (protocol version %1$s) might be outdated.%2$sThe exchange has a higher, incompatible\nprotocol version (%3$s).\n ": [
        ""
      ],
      "The chosen exchange (protocol version %1$smight be outdated.%2$sThe exchange has a lower, incompatible\nprotocol version than your wallet (protocol version %3$s).\n ": [
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
      "You are about to withdraw\n %1$sfrom your bank account into your wallet.\n ": [
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
      "You have no balance to show. Need some\n  %1$s getting started?\n ": [
        "Sie haben kein Digitalgeld. Wollen Sie %1$s? abheben?"
      ],
      "%1$s incoming\n ": [
        ""
      ],
      "%1$s being spent\n ": [
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
      "Bank requested reserve (%1$s) for\n  %2$s.\n ": [
        "Bank bestätig anlegen der Reserve (%1$s) bei %2$s"
      ],
      "Started to withdraw\n  %1$s%2$sfrom %3$s(%4$s).\n ": [
        "Reserve (%1$s) mit %2$s bei %3$s erzeugt"
      ],
      "Merchant %1$soffered%2$scontract %3$s.\n ": [
        "%1$s\n               möchte einen Vertrag über %2$s\n               mit Ihnen abschließen."
      ],
      "Withdrew %1$sfrom %2$s(%3$s).\n ": [
        "Reserve (%1$s) mit %2$s bei %3$s erzeugt"
      ],
      "Paid %1$sto merchant %2$s.\n %3$s(%4$s)\n ": [
        "Reserve (%1$s) mit %2$s bei %3$s erzeugt"
      ],
      "Merchant %1$sgave a refund over %2$s.\n ": [
        "%1$s\n               möchte einen Vertrag über %2$s\n               mit Ihnen abschließen."
      ],
      "Merchant %1$sgave\na %2$sof %3$s.\n %4$s%5$s": [
        "%1$s\n               möchte einen Vertrag über %2$s\n               mit Ihnen abschließen."
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
      "show more details\n ": [
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
      "The merchant %1$soffers you to purchase:\n ": [
        ""
      ],
      "The total price is %1$s(plus %2$sfees).\n ": [
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
      "The exchange is trusted by the wallet.\n ": [
        ""
      ],
      "The exchange is audited by a trusted auditor.\n ": [
        ""
      ],
      "Warning:  The exchange is neither directly trusted nor audited by a trusted auditor.\nIf you withdraw from this exchange, it will be trusted in the future.\n ": [
        ""
      ],
      "Using exchange provider %1$s.\nThe exchange provider will charge\n %2$s%3$s%4$sin fees.\n ": [
        ""
      ],
      "Waiting for a response from\n %1$s%2$s": [
        ""
      ],
      "Information about fees will be available when an exchange provider is selected.": [
        ""
      ],
      "Your wallet (protocol version %1$s) might be outdated.%2$sThe exchange has a higher, incompatible\nprotocol version (%3$s).\n ": [
        ""
      ],
      "The chosen exchange (protocol version %1$smight be outdated.%2$sThe exchange has a lower, incompatible\nprotocol version than your wallet (protocol version %3$s).\n ": [
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
      "You are about to withdraw\n %1$sfrom your bank account into your wallet.\n ": [
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
      "You have no balance to show. Need some\n  %1$s getting started?\n ": [
        ""
      ],
      "%1$s incoming\n ": [
        ""
      ],
      "%1$s being spent\n ": [
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
      "Bank requested reserve (%1$s) for\n  %2$s.\n ": [
        ""
      ],
      "Started to withdraw\n  %1$s%2$sfrom %3$s(%4$s).\n ": [
        ""
      ],
      "Merchant %1$soffered%2$scontract %3$s.\n ": [
        ""
      ],
      "Withdrew %1$sfrom %2$s(%3$s).\n ": [
        ""
      ],
      "Paid %1$sto merchant %2$s.\n %3$s(%4$s)\n ": [
        ""
      ],
      "Merchant %1$sgave a refund over %2$s.\n ": [
        ""
      ],
      "Merchant %1$sgave\na %2$sof %3$s.\n %4$s%5$s": [
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
      "show more details\n ": [
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
      "The merchant %1$soffers you to purchase:\n ": [
        ""
      ],
      "The total price is %1$s(plus %2$sfees).\n ": [
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
      "The exchange is trusted by the wallet.\n ": [
        ""
      ],
      "The exchange is audited by a trusted auditor.\n ": [
        ""
      ],
      "Warning:  The exchange is neither directly trusted nor audited by a trusted auditor.\nIf you withdraw from this exchange, it will be trusted in the future.\n ": [
        ""
      ],
      "Using exchange provider %1$s.\nThe exchange provider will charge\n %2$s%3$s%4$sin fees.\n ": [
        ""
      ],
      "Waiting for a response from\n %1$s%2$s": [
        ""
      ],
      "Information about fees will be available when an exchange provider is selected.": [
        ""
      ],
      "Your wallet (protocol version %1$s) might be outdated.%2$sThe exchange has a higher, incompatible\nprotocol version (%3$s).\n ": [
        ""
      ],
      "The chosen exchange (protocol version %1$smight be outdated.%2$sThe exchange has a lower, incompatible\nprotocol version than your wallet (protocol version %3$s).\n ": [
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
      "You are about to withdraw\n %1$sfrom your bank account into your wallet.\n ": [
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
      "You have no balance to show. Need some\n  %1$s getting started?\n ": [
        ""
      ],
      "%1$s incoming\n ": [
        ""
      ],
      "%1$s being spent\n ": [
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
      "Bank requested reserve (%1$s) for\n  %2$s.\n ": [
        ""
      ],
      "Started to withdraw\n  %1$s%2$sfrom %3$s(%4$s).\n ": [
        ""
      ],
      "Merchant %1$soffered%2$scontract %3$s.\n ": [
        ""
      ],
      "Withdrew %1$sfrom %2$s(%3$s).\n ": [
        ""
      ],
      "Paid %1$sto merchant %2$s.\n %3$s(%4$s)\n ": [
        ""
      ],
      "Merchant %1$sgave a refund over %2$s.\n ": [
        ""
      ],
      "Merchant %1$sgave\na %2$sof %3$s.\n %4$s%5$s": [
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
      "show more details\n ": [
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
      "The merchant %1$soffers you to purchase:\n ": [
        ""
      ],
      "The total price is %1$s(plus %2$sfees).\n ": [
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
      "The exchange is trusted by the wallet.\n ": [
        ""
      ],
      "The exchange is audited by a trusted auditor.\n ": [
        ""
      ],
      "Warning:  The exchange is neither directly trusted nor audited by a trusted auditor.\nIf you withdraw from this exchange, it will be trusted in the future.\n ": [
        ""
      ],
      "Using exchange provider %1$s.\nThe exchange provider will charge\n %2$s%3$s%4$sin fees.\n ": [
        ""
      ],
      "Waiting for a response from\n %1$s%2$s": [
        ""
      ],
      "Information about fees will be available when an exchange provider is selected.": [
        ""
      ],
      "Your wallet (protocol version %1$s) might be outdated.%2$sThe exchange has a higher, incompatible\nprotocol version (%3$s).\n ": [
        ""
      ],
      "The chosen exchange (protocol version %1$smight be outdated.%2$sThe exchange has a lower, incompatible\nprotocol version than your wallet (protocol version %3$s).\n ": [
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
      "You are about to withdraw\n %1$sfrom your bank account into your wallet.\n ": [
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
      "You have no balance to show. Need some\n  %1$s getting started?\n ": [
        ""
      ],
      "%1$s incoming\n ": [
        ""
      ],
      "%1$s being spent\n ": [
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
      "Bank requested reserve (%1$s) for\n  %2$s.\n ": [
        ""
      ],
      "Started to withdraw\n  %1$s%2$sfrom %3$s(%4$s).\n ": [
        ""
      ],
      "Merchant %1$soffered%2$scontract %3$s.\n ": [
        ""
      ],
      "Withdrew %1$sfrom %2$s(%3$s).\n ": [
        ""
      ],
      "Paid %1$sto merchant %2$s.\n %3$s(%4$s)\n ": [
        ""
      ],
      "Merchant %1$sgave a refund over %2$s.\n ": [
        ""
      ],
      "Merchant %1$sgave\na %2$sof %3$s.\n %4$s%5$s": [
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
