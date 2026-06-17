require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());


const secret = process.env.X-SteadyWeb-Secret;
app.get("/forecast", async (req, res) => {
  try {
    const { latitude, longitude, fields, widgetToken} = req.query;

    const apiUrl =
      `https://api.frogcast.com/api/v1/widget_forecast/?latitude=${encodeURIComponent(latitude)}` +
      `&longitude=${encodeURIComponent(longitude)}` +
      `&fields=${encodeURIComponent(fields)}`+
      `&time_step=${60}`+
      `&horizon${7200}`;

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${widgetToken}`,
        "X-SteadyWeb-Secret": `${secret}`
      }
    });
    console.log(apiUrl);
    console.log(widgetToken);
    const text = await response.text();

    if (!response.ok) {
      return res.status(response.status).send(text);
    }

    const data = JSON.parse(text);
    res.json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: error.message });
  }
});



app.listen(PORT, () => {
  console.log(`Proxy running on http://localhost:${PORT}`);
});