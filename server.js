const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

// Helper function to scrape search results and extract iframe embeds
async function fetchEpisodes(searchUrl) {
  try {
    const { data: html } = await axios.get(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const $ = cheerio.load(html);
    const episodes = [];

    // Select article links from search results (adjust selector based on site structure)
    const articlePromises = [];
    
    $('article h2 a, .entry-title a').each((_, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr('href');
      
      if (link) {
        // Fetch each episode page to extract the video iframe
        const detailPromise = axios.get(link, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        }).then(res => {
          const $page = cheerio.load(res.data);
          // Find embedded iframe video player
          const embedSrc = $page('iframe').attr('src');
          return { title, pageUrl: link, embedSrc };
        }).catch(() => null);

        articlePromises.push(detailPromise);
      }
    });

    const results = await Promise.all(articlePromises);
    return results.filter(item => item && item.embedSrc);
  } catch (error) {
    console.error(`Error scraping ${searchUrl}:`, error.message);
    return [];
  }
}

app.get('/api/episodes', async (req, res) => {
  const asiaExpressUrl = 'https://serialeromanesti.net/?s=Asia+Express+Sezonul+9';
  const insulaIubiriiUrl = 'https://paginamea.net/?s=insula+iubirii+sezonul+10';

  const [asiaExpress, insulaIubirii] = await Promise.all([
    fetchEpisodes(asiaExpressUrl),
    fetchEpisodes(insulaIubiriiUrl)
  ]);

  res.json({ asiaExpress, insulaIubirii });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
