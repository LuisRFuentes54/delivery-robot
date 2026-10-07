import express, { json } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import path from 'path';
import { fileURLToPath } from 'url';

// SETTINGS
const app = express();
app.set("port", 3000);

// MIDDLEWARES
app.use(express.static(path.join(fileURLToPath(import.meta.url), "..", "public")));
app.use(morgan("dev"));
app.use(json());
app.use(
  cors({
    origin: "*",
  })
);
app.use(helmet());

// ROUTES
app.get("/test", async (req, res) => {
  res.status(200).send("Server running");
});

export default app;
