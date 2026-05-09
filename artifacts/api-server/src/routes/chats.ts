import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { chatsTable, messagesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
}

// GET /api/chats — list user's chats
router.get("/", requireAuth, async (req: any, res) => {
  try {
    const chats = await db
      .select()
      .from(chatsTable)
      .where(eq(chatsTable.userId, req.userId))
      .orderBy(desc(chatsTable.updatedAt));
    res.json(chats);
  } catch (err) {
    req.log.error({ err }, "Failed to list chats");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/chats — create chat
router.post("/", requireAuth, async (req: any, res) => {
  try {
    const { title = "New Chat", language = "general" } = req.body as { title?: string; language?: string };
    const [chat] = await db
      .insert(chatsTable)
      .values({ userId: req.userId, title, language })
      .returning();
    res.status(201).json(chat);
  } catch (err) {
    req.log.error({ err }, "Failed to create chat");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/chats/:chatId — get chat with messages
router.get("/:chatId", requireAuth, async (req: any, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const [chat] = await db
      .select()
      .from(chatsTable)
      .where(and(eq(chatsTable.id, chatId), eq(chatsTable.userId, req.userId)));
    if (!chat) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }
    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.chatId, chatId))
      .orderBy(messagesTable.createdAt);
    res.json({ ...chat, messages });
  } catch (err) {
    req.log.error({ err }, "Failed to get chat");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/chats/:chatId — update chat title
router.patch("/:chatId", requireAuth, async (req: any, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const { title } = req.body as { title: string };
    const [chat] = await db
      .update(chatsTable)
      .set({ title, updatedAt: new Date() })
      .where(and(eq(chatsTable.id, chatId), eq(chatsTable.userId, req.userId)))
      .returning();
    if (!chat) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }
    res.json(chat);
  } catch (err) {
    req.log.error({ err }, "Failed to update chat");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/chats/:chatId — delete chat
router.delete("/:chatId", requireAuth, async (req: any, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const deleted = await db
      .delete(chatsTable)
      .where(and(eq(chatsTable.id, chatId), eq(chatsTable.userId, req.userId)))
      .returning();
    if (!deleted.length) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete chat");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/chats/:chatId/messages — add message
router.post("/:chatId/messages", requireAuth, async (req: any, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const { role, content } = req.body as { role: string; content: string };
    // Verify ownership
    const [chat] = await db
      .select()
      .from(chatsTable)
      .where(and(eq(chatsTable.id, chatId), eq(chatsTable.userId, req.userId)));
    if (!chat) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }
    const [message] = await db
      .insert(messagesTable)
      .values({ chatId, role, content })
      .returning();
    // Update chat updatedAt
    await db
      .update(chatsTable)
      .set({ updatedAt: new Date() })
      .where(eq(chatsTable.id, chatId));
    res.status(201).json(message);
  } catch (err) {
    req.log.error({ err }, "Failed to add message");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
