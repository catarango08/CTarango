// Standalone seed script: `npm run seed`.
// Rebuilds data/knowledge.db from src/data/articles.ts.
import { getDb, seedDatabase } from "./db";

const db = getDb();
seedDatabase(db);
const { n } = db.prepare("SELECT COUNT(*) AS n FROM articles").get() as { n: number };
console.log(`Seeded ${n} articles into the knowledge base.`);
