import { Router, type IRouter } from "express";
import healthRouter from "./health";
import catalogRouter from "./catalog";
import workflowsRouter from "./workflows";

const router: IRouter = Router();

router.use(healthRouter);
router.use(catalogRouter);
router.use(workflowsRouter);

export default router;
