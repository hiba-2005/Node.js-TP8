document.addEventListener("DOMContentLoaded", () => {
  const fileInputs = document.querySelectorAll('input[type="file"]');

  fileInputs.forEach((input) => {
    input.addEventListener("change", () => {
      const form = input.closest("form");
      let oldPreview = form.querySelector(".file-preview");

      if (oldPreview) oldPreview.remove();

      const preview = document.createElement("div");
      preview.className = "file-preview";

      if (input.files.length === 0) return;

      preview.innerHTML = `<strong>Fichier(s) sélectionné(s) :</strong>`;

      const list = document.createElement("ul");

      Array.from(input.files).forEach((file) => {
        const item = document.createElement("li");
        item.textContent = `${file.name} - ${(file.size / 1024).toFixed(2)} Ko`;
        list.appendChild(item);
      });

      preview.appendChild(list);
      input.after(preview);
    });
  });

  const forms = document.querySelectorAll("form");

  forms.forEach((form) => {
    form.addEventListener("submit", () => {
      const button = form.querySelector("button");
      button.textContent = "Téléversement...";
      button.disabled = true;
    });
  });
});