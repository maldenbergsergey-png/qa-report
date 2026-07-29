const express = require("express");
require("dotenv").config();

const { tools } = require("./jira-client");

const app = express();
const { PORT = 3333 } = process.env;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Jira MCP server is running");
});

app.post("/mcp", async (req, res) => {
  try {
    const { tool, params } = req.body || {};

    if (!tool) {
      return res.status(400).json({ error: "tool is required" });
    }

    if (!tools[tool]) {
      return res.status(400).json({ error: `Unknown tool: ${tool}` });
    }

    const result = await tools[tool](params || {});
    return res.json({ result });
  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      error: `Invalid JSON body: ${err.message}`
    });
  }

  return next(err);
});

app.listen(PORT, () => {
  console.log(`Jira HTTP wrapper is running on http://localhost:${PORT}`);
});
