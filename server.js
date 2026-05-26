const fs = require("node:fs");
const path = require("node:path");
const next = require("next");

const port = Number(process.env.PORT || 5173);
const hasProductionBuild = fs.existsSync(path.join(__dirname, ".next", "BUILD_ID"));
const dev = process.env.NODE_ENV !== "production" || !hasProductionBuild;
const app = next({ dev, hostname: "0.0.0.0", port });
const handle = app.getRequestHandler();

if (!hasProductionBuild && process.env.NODE_ENV === "production") {
  console.warn("No .next production build found; starting Next in dev mode for this preview deploy.");
}

app.prepare().then(() => {
  require("node:http")
    .createServer((req, res) => handle(req, res))
    .listen(port, "0.0.0.0", () => {
      console.log(`WAYS AML app listening on port ${port}`);
    });
});
