
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

const PLACE_ID = "91719580047904";

app.use(express.json());

async function robloxFetch(url) {
    const response = await fetch(url, {
        headers: {
            "User-Agent": "RobloxLauncher/1.0"
        },
        signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
        throw new Error(`Roblox API error: HTTP ${response.status}`);
    }

    return response.json();
}

// Health check
app.get("/", (req, res) => {
    res.json({
        success: true,
        service: "Roblox Launcher Backend",
        placeId: PLACE_ID
    });
});

// Game information
app.get("/api/server", async (req, res) => {
    try {
        // Resolve Place ID -> Universe ID
        const universeInfo = await robloxFetch(
            `https://apis.roblox.com/universes/v1/places/${PLACE_ID}/universe`
        );

        const universeId = universeInfo.universeId;

        if (!universeId) {
            throw new Error("Cannot resolve Universe ID");
        }

        const gameInfo = await robloxFetch(
            `https://games.roblox.com/v1/games?universeIds=${universeId}`
        );

        const game = gameInfo.data?.[0];

        if (!game) {
            throw new Error("Game information not found");
        }

        let gameImage = "";

        try {
            const thumbnail = await robloxFetch(
                `https://thumbnails.roblox.com/v1/places/gameicons?placeIds=${PLACE_ID}&size=512x512&format=Png&isCircular=false`
            );

            gameImage = thumbnail.data?.[0]?.imageUrl || "";
        } catch (error) {
            console.warn("Thumbnail unavailable:", error.message);
        }

        res.json({
            success: true,
            placeId: PLACE_ID,
            universeId,
            gameName: game.name || "Unknown Experience",
            description: game.description || "",
            gameImage,
            playing: game.playing ?? 0,
            visits: game.visits ?? 0,
            maxPlayers: game.maxPlayers ?? 0
        });

    } catch (error) {
        console.error("Game information error:", error.message);

        res.status(502).json({
            success: false,
            message: error.message
        });
    }
});

// Get public servers
app.get("/api/servers", async (req, res) => {
    try {
        const requestedPlaceId = String(
            req.query.placeId || PLACE_ID
        );

        if (requestedPlaceId !== PLACE_ID) {
            return res.status(400).json({
                success: false,
                message: "Invalid Place ID"
            });
        }

        const limit = Math.min(
            Math.max(parseInt(req.query.limit || "100", 10), 1),
            100
        );

        const cursor = req.query.cursor
            ? String(req.query.cursor)
            : "";

        const params = new URLSearchParams({
            sortOrder: "1",
            limit: String(limit),
            excludeFullGames: "true"
        });

        if (cursor) {
            params.set("cursor", cursor);
        }

        const url =
            `https://games.roblox.com/v1/games/${PLACE_ID}/servers/Public?` +
            params.toString();

        const result = await robloxFetch(url);

        const servers = (result.data || [])
            .filter(server => {
                return (
                    typeof server.id === "string" &&
                    server.id.length > 0 &&
                    Number.isFinite(server.playing) &&
                    Number.isFinite(server.maxPlayers) &&
                    server.playing < server.maxPlayers
                );
            })
            .map(server => ({
                jobId: server.id,
                playing: server.playing,
                maxPlayers: server.maxPlayers,
                fps: server.fps ?? null,
                ping: server.ping ?? null
            }));

        res.json({
            success: true,
            placeId: PLACE_ID,
            servers,
            nextPageCursor: result.nextPageCursor || null
        });

    } catch (error) {
        console.error("Public server error:", error.message);

        res.status(502).json({
            success: false,
            message: error.message
        });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Roblox Backend running on port ${PORT}`);
    console.log(`Place ID: ${PLACE_ID}`);
});
