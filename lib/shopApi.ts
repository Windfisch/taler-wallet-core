/*
 This file is part of TALER
 (C) 2015 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */


/**
 * Implementation of the shop API, either invoked via HTTP or
 * via a JS DOM Events.
 *
 * @author Florian Dold
 */



function subst(url: string, H_contract: string) {
  url = url.replace("${H_contract}", H_contract);
  url = url.replace("${$}", "$");
  return url;
}

export function createReserve(amount: any, callback_url: any, wt_types: any) {
  let params = {
    amount: JSON.stringify(amount),
    callback_url: URI(callback_url)
      .absoluteTo(document.location.href),
    bank_url: document.location.href,
    wt_types: JSON.stringify(wt_types),
  };
  let uri = URI(chrome.extension.getURL("pages/confirm-create-reserve.html"));
  document.location.href = uri.query(params).href();
}

export function confirmContract(contract_wrapper: any, replace_navigation: any) {
  if (contract_wrapper) {
    console.error("contract wrapper missing");
    return;
  }

  const offer = contract_wrapper;

  if (!offer.contract) {
    console.error("contract field missing");
    return;
  }

  const msg = {
    type: "check-repurchase",
    detail: {
      contract: offer.contract
    },
  };

  chrome.runtime.sendMessage(msg, (resp) => {
    if (resp.error) {
      console.error("wallet backend error", resp);
      return;
    }
    if (resp.isRepurchase) {
      console.log("doing repurchase");
      console.assert(resp.existingFulfillmentUrl);
      console.assert(resp.existingContractHash);
      window.location.href = subst(resp.existingFulfillmentUrl,
                                   resp.existingContractHash);

    } else {
      const uri = URI(chrome.extension.getURL("pages/confirm-contract.html"));
      const params = {
        offer: JSON.stringify(offer),
        merchantPageUrl: document.location.href,
      };
      const target = uri.query(params).href();
      if (replace_navigation === true) {
        document.location.replace(target);
      } else {
        document.location.href = target;
      }
    }
  });
}


/**
 * Fetch a payment (coin deposit permissions) for a given contract.
 * If we don't have the payment for the contract, redirect to
 * offering url instead.
 */
export function fetchPayment(H_contract: any, offering_url: any) {
  const msg = {
    type: "fetch-payment",
    detail: {H_contract},
  };

  chrome.runtime.sendMessage(msg, (resp) => {
    console.log("got resp");
    console.dir(resp);
    if (!resp.success) {
      if (offering_url) {
        console.log("offering url", offering_url);
        window.location.href = offering_url;
      } else {
        console.error("fetch-payment failed");
      }
      return;
    }
    let contract = resp.contract;
    if (!contract) {
      throw Error("contract missing");
    }

    // We have the details for then payment, the merchant page
    // is responsible to give it to the merchant.

    let evt = new CustomEvent("taler-notify-payment", {
      detail: {
        H_contract: H_contract,
        contract: resp.contract,
        payment: resp.payReq,
      }
    });
    document.dispatchEvent(evt);
  });
}


/**
 * Offer a contract to the wallet after
 * downloading it from the given URL.
 */
function offerContractFrom(url: string) {
  var contract_request = new XMLHttpRequest();
  console.log("downloading contract from '" + url + "'");
  contract_request.open("GET", url, true);
  contract_request.onload = function (e) {
    if (contract_request.readyState == 4) {
      if (contract_request.status == 200) {
        console.log("response text:",
                    contract_request.responseText);
        var contract_wrapper = JSON.parse(contract_request.responseText);
        if (!contract_wrapper) {
          console.error("response text was invalid json");
          alert("Failure to download contract (invalid json)");
          return;
        }
        confirmContract(contract_wrapper, true);
      } else {
        alert("Failure to download contract from merchant " +
              "(" + contract_request.status + "):\n" +
              contract_request.responseText);
      }
    }
  };
  contract_request.onerror = function (e) {
    alert("Failure requesting the contract:\n"
          + contract_request.statusText);
  };
  contract_request.send();
}