import * as http from "http";
import app from "./app/server.js";

const httpServer = http.createServer(app);

httpServer.listen(app.get("port"), "0.0.0.0", () => {
    console.log(`Server running - Port ${app.get("port")}`);
});
