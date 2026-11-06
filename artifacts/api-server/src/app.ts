import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { HttpError } from "./lib/supabase";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(cors({ origin: false }));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.use("/api", router);
app.use("/api", (_req, res) => { res.status(404).json({ error: "This action is not available." }); });
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) { res.status(err.status).json({ error: err.message }); return; }
  if (err instanceof SyntaxError && "body" in err) { res.status(400).json({ error: "The submitted data could not be read." }); return; }
  req.log.error({ errorName: err.name }, "API action failed");
  res.status(500).json({ error: "Something went wrong. Please try again; this action has not been confirmed." });
});

export default app;
