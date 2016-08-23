/* Trigger Taler contract generation on the server, and pass the
   contract to the extension once we got it. */
function taler_pay(form) {
  var contract_request = new XMLHttpRequest();

  /* Note that the URL we give here is simply an example
     and not dictated by the protocol: each web shop can
     have its own way of generating and transmitting the
     contract, there just must be a way to get the contract
     and to pass it to the wallet when the user selects 'Pay'. */
  contract_request.open("GET", "generate-taler-contract", true);
  contract_request.onload = function (e) {
    if (contract_request.readyState == 4) {
      if (contract_request.status == 200) {
        /* Send contract to the extension. */
        handle_contract(contract_request.responseText);
      } else {
        /* There was an error obtaining the contract from the merchant,
           obviously this should not happen. To keep it simple, we just
           alert the user to the error. */
        alert("Failure to download contract " +
              "(" + contract_request.status + "):\n" +
              contract_request.responseText);
      }
    }
  };
  contract_request.onerror = function (e) {
    /* There was an error obtaining the contract from the merchant,
       obviously this should not happen. To keep it simple, we just
       alert the user to the error. */
      alert("Failure requesting the contract:\n" +
            contract_request.statusText);
  };
  contract_request.send();
}

<script src="taler-wallet-lib.js"></script>
<script>
  taler.offerContractFrom("https://myshop/products/article/42", (err) => {
    alert("Error while offering contract");
  });
</script>
