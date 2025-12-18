import dotenv from "dotenv";
import { buildApp } from "./app.js";
import { initDb, closeDb } from "./infra/db.js";
import { initKafkaProducer, closeKafkaProducer } from "./infra/kafka.js";

dotenv.config();

const PORT = Number(process.env.PORT) || 8080;
const HOST = "0.0.0.0";

async function startServer() {
    try {
        await initDb();
        await initKafkaProducer();

        const app = await buildApp();

        await app.listen({ port: PORT, host: HOST });
        app.log.info(`🚀 WebhookHub API listening on ${HOST}:${PORT}`);

        const shutdown = async (signal: NodeJS.Signals) => {
            app.log.info({ signal }, "🛑 Shutting down server");

            try {
                await app.close();
                await closeKafkaProducer();
                await closeDb();
                process.exit(0);
            } catch (err) {
                app.log.error({ err }, "❌ Error during shutdown");
                process.exit(1);
            }
        };

        process.on("SIGTERM", shutdown);
        process.on("SIGINT", shutdown);

    } catch (err) {
        console.error("❌ Failed to start server", err);
        process.exit(1);
    }
}

startServer();
