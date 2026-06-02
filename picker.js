// Catchr hosted Google Picker page.
//
// Driven entirely by the extension via chrome.identity.launchWebAuthFlow.
// All inputs arrive in the URL *fragment* (#…), never the query string, so the
// OAuth token is never sent to GitHub's servers / logs.
//
//   #token=<extension OAuth access token, scope incl. drive.file>
//   &view=docs|sheets
//   &appId=<GCP project number>
//   &redirect=<https://<EXT_ID>.chromiumapp.org/picker>
//
// On pick:   redirect#id=<fileId>&name=<fileName>
// On cancel: redirect#cancel=1
// On error:  redirect#error=<message>

// Referrer-locked browser API key (Google Picker API only). Safe to be public
// because it is restricted by HTTP referrer + API in the GCP console.
const API_KEY = "AIzaSyBnAiWK6fAYmX2fivYxUlDxTJaDr2bxzLM";

// Only ever redirect back to the Catchr extension's own chromiumapp.org origin.
// Guards against this public page being abused as an open redirector.
const ALLOWED_REDIRECT_HOST = "kleffbpannecinoopgebbdhkfpkjhbia.chromiumapp.org";

function getParams() {
  // Fragment looks like "#token=…&view=…"; strip the leading '#'.
  return new URLSearchParams(location.hash.replace(/^#/, ""));
}

function safeRedirect(redirect) {
  try {
    const u = new URL(redirect);
    if (u.protocol === "https:" && u.hostname === ALLOWED_REDIRECT_HOST) return redirect;
  } catch (e) { /* fall through */ }
  return null;
}

function fail(redirect, message) {
  document.getElementById("err").textContent = message;
  document.getElementById("msg").textContent = "";
  if (redirect) {
    location.replace(redirect + "#error=" + encodeURIComponent(message));
  }
}

// Called by api.js once it has loaded (?onload=onApiLoad).
window.onApiLoad = function onApiLoad() {
  gapi.load("picker", { callback: buildPicker });
};

function buildPicker() {
  const p = getParams();
  const token = p.get("token");
  const view = (p.get("view") || "docs").toLowerCase();
  const appId = p.get("appId");
  const redirect = safeRedirect(p.get("redirect"));

  if (!redirect) { fail(null, "Invalid or missing redirect target."); return; }
  if (!token) { fail(redirect, "Missing OAuth token."); return; }
  if (API_KEY === "__PICKER_API_KEY__") { fail(redirect, "Picker API key not configured."); return; }

  const viewId = view === "sheets"
    ? google.picker.ViewId.SPREADSHEETS
    : google.picker.ViewId.DOCUMENTS;

  const docsView = new google.picker.DocsView(viewId)
    .setOwnedByMe(true)
    .setMode(google.picker.DocsViewMode.LIST);

  const builder = new google.picker.PickerBuilder()
    .setOAuthToken(token)
    .setDeveloperKey(API_KEY)
    .addView(docsView)
    .setCallback(function (data) { onPicked(data, redirect); });

  if (appId) builder.setAppId(appId);

  builder.build().setVisible(true);
  document.getElementById("msg").textContent = "Choose a file…";
}

function onPicked(data, redirect) {
  const action = data[google.picker.Response.ACTION];
  if (action === google.picker.Action.PICKED) {
    const doc = data[google.picker.Response.DOCUMENTS][0];
    const id = doc[google.picker.Document.ID];
    const name = doc[google.picker.Document.NAME] || "";
    location.replace(
      redirect + "#id=" + encodeURIComponent(id) + "&name=" + encodeURIComponent(name)
    );
  } else if (action === google.picker.Action.CANCEL) {
    location.replace(redirect + "#cancel=1");
  }
}
