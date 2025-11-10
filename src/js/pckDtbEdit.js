// src/js/pckDtbEdit.js

// URL na Node-RED HTTP In node
const FORM_API_URL = "https://10.212.32.39:1884/submit-form";
// Endpoint pro nahrávání PSDS souboru
const UPLOAD_API_URL = "https://10.212.32.39:1884/upload-psds";
/**
 * Inicializace formuláře Packaging Database Edit.
 */
export function initPckDtbEditForm() {
  const form = document.getElementById("pckDtbEditForm");
  if (!form) return;

  const clearButton = document.getElementById("pckDtbEditClear");
  const messageBox = document.getElementById("pckDtbEditMessage");

  function showMessage(text, type = "info") {
    if (!messageBox) return;
    messageBox.textContent = text;
    messageBox.dataset.type = type; // můžeš v CSS použít [data-type="error"] atd.
  }

  // --- Nahrávání PSDS souboru (stejně jako ui-file-input v Node-RED) ---
  const uploadInput = document.getElementById("field-psdsFile");
  const uploadStatus = document.getElementById("pckDtbEditUploadStatus");
  const urlHiddenField = document.getElementById("field-URL1");

  function showUploadStatus(text) {
    if (!uploadStatus) return;
    uploadStatus.textContent = text;
  }

  async function uploadPsdsFile(file) {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      showUploadStatus("Nahrávám soubor...");

      const response = await fetch(UPLOAD_API_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        console.error("Upload HTTP error", response.status);
        showUploadStatus(
          `Chyba při nahrávání souboru (kód ${response.status}).`
        );
        if (urlHiddenField) urlHiddenField.value = "";
        return;
      }

      let data = null;
      try {
        data = await response.json();
      } catch (err) {
        console.error("Chyba při čtení JSON odpovědi uploadu", err);
      }

      // Očekává se, že Node-RED vrátí něco jako { url: "http://.../soubor.pdf" }
      const fileUrl = data && (data.url || data.URL1);

      if (fileUrl && urlHiddenField) {
        urlHiddenField.value = fileUrl;
        showUploadStatus("Soubor byl úspěšně nahrán.");
      } else {
        showUploadStatus("Soubor byl nahrán, ale server nevrátil URL.");
      }
    } catch (err) {
      console.error("Upload network error", err);
      showUploadStatus("Chyba: nepodařilo se nahrát soubor.");
      if (urlHiddenField) urlHiddenField.value = "";
    }
  }

  if (uploadInput) {
    uploadInput.addEventListener("change", () => {
      const file = uploadInput.files && uploadInput.files[0];
      if (file) {
        uploadPsdsFile(file);
      } else {
        showUploadStatus("");
        if (urlHiddenField) urlHiddenField.value = "";
      }
    });
  }

  // ODESLÁNÍ FORMULÁŘE
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const payload = {};

    for (const [key, value] of formData.entries()) {
      payload[key] = value;
    }

    try {
      showMessage("Odesílám data na server...", "info");

      const response = await fetch(FORM_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error("HTTP error", response.status);
        showMessage(`Chyba: server vrátil kód ${response.status}`, "error");
        return;
      }

      showMessage("Formulář byl úspěšně odeslán.", "success");
      // případně form.reset();
    } catch (err) {
      console.error("Network error", err);
      showMessage("Chyba: nepodařilo se připojit k serveru.", "error");
    }
  });

  // VYMAZÁNÍ FORMULÁŘE
  // VYMAZÁNÍ FORMULÁŘE
  if (clearButton) {
    clearButton.addEventListener("click", () => {
      form.reset();

      if (uploadStatus) {
        uploadStatus.textContent = "";
      }
      if (urlHiddenField) {
        urlHiddenField.value = "";
      }

      showMessage("Formulář byl vymazán.", "info");
    });
  }

  // DYNAMICKÉ CHOVÁNÍ (dropdowny -> disable/enable polí)
  setupDynamicBehaviour(form);
}

/**
 * Přidá logiku dropdownů jako v Node-RED ui-template.
 */
function setupDynamicBehaviour(form) {
  const field = (name) => form.elements[name] ?? null;

  // ----------------------------------------------------
  // 1) Type of p-pack (KLT Box -> dropdown + zamknutí polí)
  // ----------------------------------------------------
  const typeOfPpackSelect = field("Type of p-pack");
  const descriptionContainer = document.getElementById(
    "p-pack-description-container"
  );
  const sapIdPpackInput = field("SAP ID P-pack");
  const weightOfEmptyPpackKg = field("Weight of empty P-pack (kg)");
  const lenghtOfPpack = field("Lenght of P-pack");
  const widthOfPpack = field("Width of P-pack (mm)");
  const heightOfPpack = field("Height of P-pack (mm)");

  if (typeOfPpackSelect && descriptionContainer) {
    const kltOptions = [
      "RL-KLT 4047",
      "RL-KLT 6047",
      "RL-KLT 6013",
      "E1",
      "E2",
      "E22",
      "E3",
      "_112580",
    ];

    typeOfPpackSelect.addEventListener("change", () => {
      descriptionContainer.innerHTML = "";
      const selectedValue = typeOfPpackSelect.value;

      const controlledFields = [
        sapIdPpackInput,
        weightOfEmptyPpackKg,
        lenghtOfPpack,
        widthOfPpack,
        heightOfPpack,
      ];

      if (selectedValue === "KLT Box") {
        // vytvoř <select> místo inputu
        const select = document.createElement("select");
        select.name = "P-pack description";
        select.id = "field-Ppack_description";

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        defaultOption.textContent = "Select a KLT type";
        select.appendChild(defaultOption);

        kltOptions.forEach((text) => {
          const opt = document.createElement("option");
          opt.value = text;
          opt.textContent = text;
          select.appendChild(opt);
        });

        descriptionContainer.appendChild(select);

        // zamknout ruční zadávání rozměrů/SAP
        controlledFields.forEach((el) => {
          if (!el) return;
          el.disabled = true;
          el.value = "";
        });
      } else {
        // zpět obyčejný text input
        const input = document.createElement("input");
        input.type = "text";
        input.name = "P-pack description";
        input.id = "field-Ppack_description";
        descriptionContainer.appendChild(input);

        controlledFields.forEach((el) => {
          if (!el) return;
          el.disabled = false;
          // hodnotu necháme prázdnou
        });
      }
    });
  }

  // ----------------------------------------------------
  // 2) P-pack lid RE / EX (Returnable -> dropdown + lock weight + SAP)
  // ----------------------------------------------------
  const ppackLidReEx = field("P-pack lid RE / EX");
  const ppackLidNameContainer = document.getElementById(
    "p-pack-lid-name-container"
  );
  const ppackLidWeight = field("P-pack lid weight (kg)");
  const ppackLidSap = field("P-pack lid SAP no");

  if (ppackLidReEx && ppackLidNameContainer) {
    const kltLidOptions = ["D41", "D61", "Deckel01"];

    ppackLidReEx.addEventListener("change", () => {
      ppackLidNameContainer.innerHTML = "";
      const selectedValue = ppackLidReEx.value;

      if (selectedValue === "Returnable") {
        const select = document.createElement("select");
        select.name = "P-pack lid name";
        select.id = "field-Ppack_lid_name";

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        defaultOption.textContent = "Select a lid type";
        select.appendChild(defaultOption);

        kltLidOptions.forEach((text) => {
          const opt = document.createElement("option");
          opt.value = text;
          opt.textContent = text;
          select.appendChild(opt);
        });

        ppackLidNameContainer.appendChild(select);

        if (ppackLidWeight) {
          ppackLidWeight.disabled = true;
          ppackLidWeight.value = "";
        }
        if (ppackLidSap) {
          ppackLidSap.disabled = true;
          ppackLidSap.value = "";
        }
      } else {
        const input = document.createElement("input");
        input.type = "text";
        input.name = "P-pack lid name";
        input.id = "field-Ppack_lid_name";
        ppackLidNameContainer.appendChild(input);

        if (ppackLidWeight) {
          ppackLidWeight.disabled = false;
          ppackLidWeight.value = "";
        }
        if (ppackLidSap) {
          // v původním flow bylo SAP pole stále disabled – necháme stejné chování
          ppackLidSap.disabled = true;
          ppackLidSap.value = "";
        }
      }
    });
  }

  // ----------------------------------------------------
  // 3) Pallet RE / EX (Returnable -> dropdown + lock parametrů palety)
  // ----------------------------------------------------
  const palletReEx = field("Pallet RE / EX");
  const palletNameContainer = document.getElementById("pallet-name-container");
  const palletSap = field("Pallet SAP no");
  const emptyPalletWeight = field("Empty pallet weight (kg)");
  const palletLenght = field("Pallet lenght (mm)");
  const palletWidth = field("Pallet width (mm)");
  const palletHeight = field("Height of empty pallet (mm)");

  if (palletReEx && palletNameContainer) {
    const palletOptions = [
      "ESD pallet 1200x800",
      "nonESD pallet 1200x800 grey",
      "CD ESD pallet 1200x800",
      "CD pallet 1200x1000",
      "CD ESD pallet 1200x1000",
    ];

    palletReEx.addEventListener("change", () => {
      palletNameContainer.innerHTML = "";
      const selectedValue = palletReEx.value;

      const controlledFields = [
        palletSap,
        emptyPalletWeight,
        palletLenght,
        palletWidth,
        palletHeight,
      ];

      if (selectedValue === "Returnable") {
        const select = document.createElement("select");
        select.name = "Pallet name";
        select.id = "field-Pallet_name";

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        defaultOption.textContent = "Select pallet type";
        select.appendChild(defaultOption);

        palletOptions.forEach((text) => {
          const opt = document.createElement("option");
          opt.value = text;
          opt.textContent = text;
          select.appendChild(opt);
        });

        palletNameContainer.appendChild(select);

        controlledFields.forEach((el) => {
          if (!el) return;
          el.disabled = true;
          el.value = "";
        });
      } else {
        const input = document.createElement("input");
        input.type = "text";
        input.name = "Pallet name";
        input.id = "field-Pallet_name";
        palletNameContainer.appendChild(input);

        controlledFields.forEach((el) => {
          if (!el) return;
          el.disabled = false;
          el.value = "";
        });
      }
    });
  }

  // ----------------------------------------------------
  // 4) Pallet lid RE / EX (Returnable -> dropdown + lock weight)
  // ----------------------------------------------------
  const palletLidReEx = field("Pallet lid RE / EX");
  const palletLidNameContainer = document.getElementById(
    "pallet-lid-description-container"
  );
  const palletLidWeight = field("Pallet lid weight (kg)");

  if (palletLidReEx && palletLidNameContainer) {
    const palletLidOptions = ["PALETTENDECKEL", "Pallet lid 120x100"];

    palletLidReEx.addEventListener("change", () => {
      palletLidNameContainer.innerHTML = "";
      const selectedValue = palletLidReEx.value;

      if (selectedValue === "Returnable") {
        const select = document.createElement("select");
        select.name = "Pallet lid description";
        select.id = "field-Pallet_lid_description";

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        defaultOption.textContent = "Select pallet lid type";
        select.appendChild(defaultOption);

        palletLidOptions.forEach((text) => {
          const opt = document.createElement("option");
          opt.value = text;
          opt.textContent = text;
          select.appendChild(opt);
        });

        palletLidNameContainer.appendChild(select);

        if (palletLidWeight) {
          palletLidWeight.disabled = true;
          palletLidWeight.value = "";
        }
      } else {
        const input = document.createElement("input");
        input.type = "text";
        input.name = "Pallet lid description";
        input.id = "field-Pallet_lid_description";
        palletLidNameContainer.appendChild(input);

        if (palletLidWeight) {
          palletLidWeight.disabled = false;
          palletLidWeight.value = "";
        }
      }
    });
  }
}
