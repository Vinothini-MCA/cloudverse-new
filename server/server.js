require("dotenv").config();
const path = require("path");
const express = require("express");
const apiApp = require("../api");

const app = express();
app.use(apiApp);
app.use(express.static(path.join(__dirname, "..")));
app.get("*", (req,res) => res.sendFile(path.join(__dirname,"../index.html")));

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log(`CloudVerse running at http://localhost:${PORT}`));
