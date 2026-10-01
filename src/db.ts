// digibuddy's own memory: chat transcript, diary of save events and reminders.
// Strictly separate from save.json — this app never writes tuipet's file.
// Memory is best-effort: if SQLite is unavailable every call degrades to a
// no-op and the app keeps working exactly as before.
import Database from "@tauri-apps/plugin-sql";
import { invoke } from "@tauri-apps/api/core";

export interface MessageRow {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: number;
}

export interface EventRow {
  id: number;
  kind: string;
  detail: string;
  created_at: number;
}

export interface ReminderRow {
  id: number;
  text: string;
  due_at: number;
  done: number;
  created_at: number;
}

let db: Database | null = null;
let opening: Promise<void> | null = null;

/** Connects and runs the registered migrations. Safe to call repeatedly. */
export function openDb(): Promise<void> {
  if (!opening) {
    opening = (async () => {
      try {
        const url = await invoke<string>("db_url");
        db = await Database.load(url);
      } catch (e) {
        db = null;
        console.warn("memoria (SQLite) no disponible:", e);
      }
    })();
  }
  return opening;
}

async function run<T>(fn: (d: Database) => Promise<T>): Promise<T | null> {
  if (!opening) void openDb();
  await opening;
  if (!db) return null;
  try {
    return await fn(db);
  } catch (e) {
    console.warn("sqlite:", e);
    return null;
  }
}

export function addMessage(role: MessageRow["role"], content: string): Promise<null> {
  return run((d) =>
    d
      .execute("INSERT INTO messages (role, content, created_at) VALUES ($1, $2, $3)", [
        role,
        content,
        Date.now(),
      ])
      .then(() => null),
  );
}

export function recentMessages(limit = 12): Promise<MessageRow[] | null> {
  return run((d) =>
    d.select<MessageRow[]>(
      "SELECT id, role, content, created_at FROM messages ORDER BY id DESC LIMIT $1",
      [limit],
    ),
  );
}

export function logEvent(kind: string, detail: string): Promise<null> {
  return run((d) =>
    d
      .execute("INSERT INTO events (kind, detail, created_at) VALUES ($1, $2, $3)", [
        kind,
        detail,
        Date.now(),
      ])
      .then(() => null),
  );
}

export function recentEvents(limit = 50): Promise<EventRow[] | null> {
  return run((d) =>
    d.select<EventRow[]>(
      "SELECT id, kind, detail, created_at FROM events ORDER BY id DESC LIMIT $1",
      [limit],
    ),
  );
}

export function addReminder(text: string, dueAt: number): Promise<number | null> {
  return run(async (d) => {
    const res = await d.execute(
      "INSERT INTO reminders (text, due_at, done, created_at) VALUES ($1, $2, 0, $3)",
      [text, dueAt, Date.now()],
    );
    return res.lastInsertId ?? null;
  });
}

/** Not yet fired, newest due time first. */
export function pendingReminders(): Promise<ReminderRow[] | null> {
  return run((d) =>
    d.select<ReminderRow[]>(
      "SELECT id, text, due_at, done, created_at FROM reminders WHERE done = 0 ORDER BY due_at ASC",
    ),
  );
}

export function completeReminder(id: number): Promise<null> {
  return run((d) =>
    d.execute("UPDATE reminders SET done = 1 WHERE id = $1", [id]).then(() => null),
  );
}
