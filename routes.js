const express = require("express");
const routes = express.Router();

routes.get("/", function (req, res) {
  return res.redirect("/exams");
});

routes.get("/about", (req, res) => {
  res.send('Esta é a página "Sobre" do projeto.');
});

module.exports = routes;
