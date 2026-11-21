
const express = require("express");

const app = express();
const PORT = Number(process.env.PORT || 3000);

const PLACE_ID = String(
    process.env.PLACE_ID || "91719580047904"
).trim();

const JOB_ID = String(
    process.env.JOB_ID || "2433ddc9-f24f-4906-9d42-f3c54a86cdbe"
).trim();

app.disable("x-powered-by");
app.use(express.json());

const isValidPlaceId = value =>
    /^\d{1,20}$/.test(String(value || ""));

const cleanString = (value, fallback, maxLength) =>
    typeof value === "string" && value.trim()
        ? value.trim().slice(0, maxLength)
        : fallback;


async function fetchJson(url, timeoutMs = 12000) {

    const controller = new AbortController();

    const timer = setTimeout(
        () => controller.abort(),
        timeoutMs
    );

    try {

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                "Accept": "application/json",
                "User-Agent": "RobloxLauncherBackend/3.0"
            }
        });

        if (!response.ok) {
            throw new Error(
                `Roblox API returned HTTP ${response.status}`
            );
        }

        return await response.json();

    } finally {
        clearTimeout(timer);
    }
}


async function getGameInformation(placeId) {

    const detailsURL =
        `https://games.roblox.com/v1/games/multiget-place-details?placeIds=${encodeURIComponent(placeId)}`;

    const imageURL =
        `https://thumbnails.roblox.com/v1/places/gameicons?placeIds=${encodeURIComponent(placeId)}&size=512x512&format=Png&isCircular=false`;

    const [detailsResult, imageResult] =
        await Promise.allSettled([
            fetchJson(detailsURL),
            fetchJson(imageURL)
        ]);

    let gameName = "Roblox Experience";
    let description = "Explore and enjoy this Roblox experience.";
    let gameImage = "";

    if (detailsResult.status === "fulfilled") {

        const details = detailsResult.value;

        const game = Array.isArray(details)
            ? details[0]
            : null;

        if (game) {

            gameName = cleanString(
                game.name,
                gameName,
                150
            );

            description = cleanString(
                game.description,
                description,
                2000
            );
        }

    } else {

        console.error(
            "Game details request failed:",
            detailsResult.reason
        );
    }

    if (imageResult.status === "fulfilled") {

        const images = imageResult.value;

        if (
            Array.isArray(images.data) &&
            images.data.length > 0
        ) {

            gameImage = cleanString(
                images.data[0].imageUrl,
                "",
                2048
            );
        }

    } else {

        console.error(
            "Game icon request failed:",
            imageResult.reason
        );
    }

    return {
        gameName,
        description,
        gameImage
    };
}


app.get("/api/server", async (_req, res) => {

    res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate"
    );

    res.setHeader("Pragma", "no-cache");

    if (!isValidPlaceId(PLACE_ID)) {

        return res.status(503).json({
            success: false,
            message: "Invalid PLACE_ID environment variable."
        });
    }

    try {

        const game = await getGameInformation(PLACE_ID);

        return res.json({
            success: true,
            placeId: PLACE_ID,
            jobId: JOB_ID,
            gameName: game.gameName,
            description: game.description,
            gameImage: game.gameImage,
            metadataLoaded: game.gameName !== "Roblox Experience",
            updatedAt: new Date().toISOString()
        });

    } catch (error) {

        console.error("Game information error:", error);

        return res.status(502).json({
            success: false,
            message: "Unable to retrieve game information from Roblox."
        });
    }
});


app.get("/", (_req, res) => {

    res.json({
        name: "Roblox Launcher API",
        status: "online",
        endpoint: "/api/server"
    });
});


app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `Roblox Launcher API listening on port ${PORT}`
    );
});
