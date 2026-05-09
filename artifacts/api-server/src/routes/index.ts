import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import chatsRouter from "./chats";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/ai", aiRouter);
router.use("/chats", chatsRouter);

export default router;
