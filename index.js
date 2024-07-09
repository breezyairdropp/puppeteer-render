const express = require("express");
const { scrapeLogic } = require("./scrapeLogic");
const { googleLogic } = require("./googleLogic");
const { leadsGeneration } = require("./leadsGeneration");
const { leadsGenerationPro } = require("./leadsGenerationPro");
const path = require("path");


const app = express();
app.use(express.static(__dirname + "/out"));

const PORT = process.env.PORT || 4000;

app.get('/', (req, res) => {
    app.render('index', function (err, html) {
        if (err) console.log(err);
        res.send(html)
    });
  })

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

// app.get("/", (req, res) => {
//   res.send("Render Puppeteer server is up and running!");
// });

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
