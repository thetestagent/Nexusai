import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const chatsTable = pgTable("chats", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull().default("New Chat"),
  language: text("language").notNull().default("general"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id")
    .notNull()
    .references(() => chatsTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatSchema = createInsertSchema(chatsTable).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertChat = z.infer<typeof insertChatSchema>;
export type Chat = typeof chatsTable.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
