const axios = require('axios');
const cheerio = require('cheerio');

async function fetchEpisodes(searchUrl, requiredKeyword) {
  try {
    const { data: html } = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 8000
    });
    const $ = cheerio.load(html);

    const articlePromises = [];
    
    $('article h2 a, .entry-title a, h2.post-title a').each((_, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr('href');
      
      const matchesKeyword = requiredKeyword
        .toLowerCase()
        .split(' ')
        .every(word => title.toLowerCase().includes(word));

      if (link && matchesKeyword) {
        const detailPromise = axios.get(link, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          timeout: 5000
        }).then(res => {
          const $page = cheerio.load(res.data);
          const embedSrc = $page('iframe').attr('src');
          return { title, pageUrl: link, embedSrc };
        }).catch(() => null);

        articlePromises.push(detailPromise);
      }
    });

    const results = await Promise.all(articlePromises);
    return results.filter(item => item && item.embedSrc);
  } catch (error) {
    return [];
  }
}

export default async function handler(req, res) {
  const asiaExpressUrl = 'https://serialeromanesti.net/?s=Asia+Express+Sezonul+9';
  const insulaIubiriiUrl = 'https://paginamea.net/?s=insula+iubirii+sezonul+10';

  const [asiaExpress, insulaIubirii] = await Promise.all([
    fetchEpisodes(asiaExpressUrl, 'Asia Express'),
    fetchEpisodes(insulaIubiriiUrl, 'Insula Iubirii')
  ]);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ asiaExpress, insulaIubirii });
}
