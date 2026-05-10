const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

const uploadFolder = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
}

app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

const storageConfig = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeName = file.originalname
      .replace(extension, "")
      .replace(/[^a-zA-Z0-9]/g, "_");

    const newName = `${safeName}_${Date.now()}${extension}`;
    cb(null, newName);
  }
});

const imageFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const allowedExt = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("Type de fichier refusé. Image seulement."), false);
  }

  if (!allowedExt.includes(ext)) {
    return cb(new Error("Extension refusée. Utilisez jpg, png, gif ou webp."), false);
  }

  cb(null, true);
};

const upload = multer({
  storage: storageConfig,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

function deleteUploadedFiles(files) {
  if (!files) return;

  if (Array.isArray(files)) {
    files.forEach((file) => fs.unlink(file.path, () => {}));
  } else if (files.path) {
    fs.unlink(files.path, () => {});
  } else {
    Object.values(files).forEach((group) => {
      group.forEach((file) => fs.unlink(file.path, () => {}));
    });
  }
}

function errorMessage(err) {
  if (err.code === "LIMIT_FILE_SIZE") {
    return "Le fichier dépasse la taille maximale autorisée : 5 Mo.";
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return "Nombre de fichiers trop élevé ou champ incorrect.";
  }

  return err.message || "Erreur inconnue pendant le téléversement.";
}

function pageResult(title, content) {
  return `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <link rel="stylesheet" href="/css/style.css">
  </head>
  <body>
    <main class="container">
      <div class="card result-card">
        <h1>${title}</h1>
        ${content}
        <a href="/" class="btn secondary">Retour</a>
      </div>
    </main>
  </body>
  </html>
  `;
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

app.post("/upload-simple", upload.single("photo"), (req, res) => {
  if (!req.file) {
    return res.status(400).send(pageResult("Erreur", "<p>Aucune image reçue.</p>"));
  }

  res.send(pageResult(
    "Image envoyée avec succès",
    `
    <p><strong>Nom original :</strong> ${req.file.originalname}</p>
    <p><strong>Taille :</strong> ${(req.file.size / 1024).toFixed(2)} Ko</p>
    <img src="/uploads/${req.file.filename}" class="preview">
    `
  ));
}, (err, req, res, next) => {
  deleteUploadedFiles(req.file);
  res.status(400).send(pageResult("Erreur upload simple", `<p>${errorMessage(err)}</p>`));
});

app.post("/upload-gallery", upload.array("photos", 3), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).send(pageResult("Erreur", "<p>Aucune image reçue.</p>"));
  }

  const images = req.files.map(file => `
    <div class="mini-card">
      <img src="/uploads/${file.filename}">
      <p>${file.originalname}</p>
      <small>${(file.size / 1024).toFixed(2)} Ko</small>
    </div>
  `).join("");

  res.send(pageResult(
    "Galerie téléversée",
    `
    <p>${req.files.length} image(s) envoyée(s).</p>
    <div class="gallery">${images}</div>
    `
  ));
}, (err, req, res, next) => {
  deleteUploadedFiles(req.files);
  res.status(400).send(pageResult("Erreur upload multiple", `<p>${errorMessage(err)}</p>`));
});

const uploadWithInfo = upload.fields([
  { name: "cover", maxCount: 1 },
  { name: "album", maxCount: 2 }
]);

app.post("/upload-details", uploadWithInfo, (req, res) => {
  if (!req.files || !req.files.cover) {
    return res.status(400).send(pageResult("Erreur", "<p>L'image principale est obligatoire.</p>"));
  }

  const title = req.body.title || "Sans titre";
  const description = req.body.description || "Aucune description";

  const cover = req.files.cover[0];
  const album = req.files.album || [];

  const albumHtml = album.map(file => `
    <div class="mini-card">
      <img src="/uploads/${file.filename}">
      <p>${file.originalname}</p>
    </div>
  `).join("");

  res.send(pageResult(
    title,
    `
    <p>${description}</p>
    <h3>Image principale</h3>
    <img src="/uploads/${cover.filename}" class="preview">

    <h3>Images supplémentaires</h3>
    <div class="gallery">
      ${albumHtml || "<p>Aucune image supplémentaire.</p>"}
    </div>
    `
  ));
}, (err, req, res, next) => {
  deleteUploadedFiles(req.files);
  res.status(400).send(pageResult("Erreur upload avec données", `<p>${errorMessage(err)}</p>`));
});

app.listen(PORT, () => {
  console.log(`Serveur lancé : http://localhost:${PORT}`);
});