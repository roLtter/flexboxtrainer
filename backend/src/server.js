import { initDb } from "./db.js";
import { createApp } from "./createApp.js";

const PORT = Number(process.env.PORT ?? 3001);
const app = createApp();

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to init DB", error);
    process.exit(1);
  });
