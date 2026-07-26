"use strict";

const express = require("express");
const cors = require("cors");

const statusRouter = require("./routes/statusRouter");

const app = express();

const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: "*",
    methods: ["GET"],
    credentials: false,
  })
);

app.use(express.json());

app.use("/api", statusRouter);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: "Internal server error",
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend listening on port ${PORT}`);
});