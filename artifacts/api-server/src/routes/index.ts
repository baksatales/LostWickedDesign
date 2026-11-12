import { Router, type IRouter } from "express";
import healthRouter from "./health";
import catalogRouter from "./catalog";
import workflowsRouter from "./workflows";
import siteRouter from "./site";
import operationsRouter from "./operations";
import editorialAssistRouter from "./editorial-assist";
import sampleAccountsRouter from "./sample-accounts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(catalogRouter);
router.use(workflowsRouter);
router.use(siteRouter);
router.use(operationsRouter);
router.use(editorialAssistRouter);
router.use(sampleAccountsRouter);

export default router;
