import { Router, type IRouter } from "express";
import healthRouter from "./health";
import accountsRouter from "./accounts";
import instrumentsRouter from "./instruments";
import strategiesRouter from "./strategies";
import setupsRouter from "./setups";
import confluencesRouter from "./confluences";
import tagsRouter from "./tags";
import tradesRouter from "./trades";
import executionsRouter from "./executions";
import reviewsRouter from "./reviews";
import dashboardRouter from "./dashboard";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(accountsRouter);
router.use(instrumentsRouter);
router.use(strategiesRouter);
router.use(setupsRouter);
router.use(confluencesRouter);
router.use(tagsRouter);
router.use(tradesRouter);
router.use(executionsRouter);
router.use(reviewsRouter);
router.use(dashboardRouter);
router.use(settingsRouter);

export default router;
