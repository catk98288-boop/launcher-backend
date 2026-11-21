
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

const PLACE_ID = process.env.PLACE_ID || "91719580047904";
const JOB_ID = process.env.JOB_ID || "2433ddc9-f24f-4906-9d42-f3c54a86cdbe";

app.use(express.json());

async function getGameInformation(placeId) {
    const detailsURL =
        `https://games.roblox.com/v1/games/multiget-place-details?placeIds=${placeId}`;

    const imageURL =
        `https://thumbnails.roblox.com/v1/places/gameicons?placeIds=${placeId}&size=512x512&format=Png&isCircular=false`;

    const [detailsResponse, imageResponse] = await Promise.all([
        fetch(detailsURL),
        fetch(imageURL)
    ]);

    let gameName = "Roblox Experience";
    let description = "Explore and enjoy this Roblox experience.";
    let gameImage = "";

    if (detailsResponse.ok) {
        const details = await detailsResponse.json();
        const game = Array.isArray(details) ? details[0] : null;

        if (game) {
            gameName = game.name || gameName;
            description = game.description || description;
        }
    }

    if (imageResponse.ok) {
        const images = await imageResponse.json();

        if (images.data && images.data.length > 0) {
            gameImage = images.data[0].imageUrl || "";
        }
    }

    return {
        gameName,
        description,
        gameImage
    };
}

app.get("/api/server", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");

    if (!/^\d+$/.test(PLACE_ID)) {
        return res.status(503).json({
            success: false,
            message: "Invalid Place ID"
        });
    }

    try {
        const game = await getGameInformation(PLACE_ID);

        res.json({
            success: true,
            placeId: PLACE_ID,
            jobId: JOB_ID,
            gameName: game.gameName,
            description: game.description,
            gameImage: game.gameImage
        });

    } catch (error) {
        console.error("Roblox API Error:", error);

        res.json({
            success: true,
            placeId: PLACE_ID,
            jobId: JOB_ID,
            gameName: "Roblox Experience",
            description: "Unable to load game information.",
            gameImage: ""
        });
    }
});

app.get("/", (req, res) => {
    res.json({
        name: "Roblox Launcher API",
        status: "online"
    });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
