const express = require("express");
const { scrapeLogic } = require("./scrapeLogic");
const { googleLogic } = require("./googleLogic");
const { leadsGeneration } = require("./leadsGeneration");
const { leadsGenerationPro } = require("./leadsGenerationPro");



const app = express();

const PORT = process.env.PORT || 4000;

app.get("/scrape", (req, res) => {
  scrapeLogic(res);
});

app.get("/google", (req, res) => {
  googleLogic(res);
});

app.get("/leads", (req, res) => {
  leadsGeneration(req, res);
});

app.get("/leadspro", (req, res) => {
  leadsGenerationPro(req, res);
});

app.get("/", (req, res) => {
  res.send("Render Puppeteer server is up and running!");
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
