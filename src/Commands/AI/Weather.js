const axios = require("axios");
const config = require("../../../settings/config");

// Use weather API key from config (falls back to hardcoded if not set)
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || config.api?.weather || '';

/* ===============================
   WEATHER EMOJI ENGINE
=============================== */

function getWeatherEmoji(weather) {
    const map = {
        Thunderstorm: "⛈️",
        Drizzle: "🌦️",
        Rain: "🌧️",
        Snow: "❄️",
        Mist: "🌫️",
        Smoke: "💨",
        Haze: "🌫️",
        Dust: "🌪️",
        Fog: "🌫️",
        Sand: "🏜️",
        Ash: "🌋",
        Squall: "💨",
        Tornado: "🌪️",
        Clear: "☀️",
        Clouds: "☁️"
    };

    return map[weather] || "🌍";
}

/* ===============================
   EXPORT PLUGIN
=============================== */

module.exports = {
    name: "weather",
    alias: ["wthr", "forecast"],
    category: "tools",
    // ⭐ Reaction config
    reactions: {
        start: '⛅',
        success: '✨'
    },
    
    execute: async (sock, m, { args, reply }) => {

        const city = args.join(" ").trim();
        if (!city) return reply("⚉ Please provide a city name.");

        try {

            await sock.sendPresenceUpdate("composing", m.key.remoteJid);

            const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${WEATHER_API_KEY}&units=metric`;

            const { data } = await axios.get(url);

            const emoji = getWeatherEmoji(data.weather[0].main);

            const weatherText = `
${emoji}

╭─❍ *CRYSNOVA WEATHER*
│ 📍 ${data.name}, ${data.sys.country}
│ ${emoji} ${data.weather[0].description}
│
│ 🌡️ Temp: ${data.main.temp}°C
│ 🤒 Feels: ${data.main.feels_like}°C
│ 💧 Humidity: ${data.main.humidity}%
│ 🌬️ Wind: ${data.wind.speed} m/s
│ 📊 Pressure: ${data.main.pressure} hPa
│
│ 🌐 ${data.coord.lat}, ${data.coord.lon}
╰─𓄄 Powered by Crysnova
            `.trim();

            await sock.sendMessage(
                m.key.remoteJid,
                { text: weatherText },
                { quoted: m }
            );

            await sock.sendPresenceUpdate("paused", m.key.remoteJid);

        } catch (error) {
            console.error("Weather Error:", error.response?.data || error.message);
            await reply("ಠ_ಠ Unable to fetch weather right now. Check city name.");
        }
    }
};
