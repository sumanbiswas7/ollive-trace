import db from "../../../lib/db";

export async function GET() {
  try {
    const { rows } = await db.query(`
      SELECT
        s.id,
        s.created_at,
        s.updated_at,
        COALESCE(
          (SELECT LEFT(content, 48)
           FROM messages
           WHERE session_id = s.id AND role = 'user'
           ORDER BY created_at ASC
           LIMIT 1),
          'New chat'
        ) AS title
      FROM sessions s
      ORDER BY s.updated_at DESC
    `);
    return Response.json(rows);
  } catch (err) {
    console.error("[conversations] GET failed:", err);
    return Response.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const id = crypto.randomUUID();
    await db.query(
      `INSERT INTO sessions (id) VALUES ($1)`,
      [id]
    );
    return Response.json({ id }, { status: 201 });
  } catch (err) {
    console.error("[conversations] POST failed:", err);
    return Response.json({ error: "DB error" }, { status: 500 });
  }
}
