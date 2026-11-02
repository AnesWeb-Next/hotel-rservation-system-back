import "dotenv/config";
import { logger } from "./utils/logger.js";
import { connectDB } from "./services/db.js";
import app from "./app.js";

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    logger.error("Failed to start Server:", { error });
    process.exit(1);
  });
