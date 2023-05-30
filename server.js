const express = require("express");
const app = express();
const routes = require("./routes");

const path = require("path");

const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));
app.use(express.urlencoded({ extended: true }));

app.use(routes);

app.listen(3000, () => {
  console.log("Server is Running");
});
