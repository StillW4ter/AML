const next = require("next");

const port = Number(process.env.PORT || 5173);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, hostname: "0.0.0.0", port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  require("node:http")
    .createServer((req, res) => handle(req, res))
    .listen(port, "0.0.0.0", () => {
      console.log(`WAYS AML app listening on port ${port}`);
    });
});
