function handleInstall() {
  var show = document.getElementsByClassName("taler-installed-show");
  var hide = document.getElementsByClassName("taler-installed-hide");
  for (var i = 0; i < show.length; i++) {
    show[i].style.display = "";
  }
  for (var i = 0; i < hide.length; i++) {
    hide[i].style.display = "none";
  }
};

function handleUninstall() {
  var show = document.getElementsByClassName("taler-installed-show");
  var hide = document.getElementsByClassName("taler-installed-hide");
  for (var i = 0; i < show.length; i++) {
    show[i].style.display = "none";
  }
  for (var i = 0; i < hide.length; i++) {
    hide[i].style.display = "";
  }
};

function probeTaler() {
  var eve = new Event("taler-probe");
  document.dispatchEvent(eve);
};

function initTaler() {
  handleUninstall(); probeTaler();
};

document.addEventListener("taler-wallet-present", handleInstall, false);
document.addEventListener("taler-unload", handleUninstall, false);
document.addEventListener("taler-load", handleInstall, false);
window.addEventListener("load", initTaler, false);
