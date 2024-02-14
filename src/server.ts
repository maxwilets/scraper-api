import express, { Request, Response } from 'express';
import puppeteer from 'puppeteer';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors())
app.use(bodyParser.json());

app.get('/scrape', async  (req: { query: { search_string: string } }, res: { json: (data: any) => void, status: (code: number) => { json: (data: { error: string }) => void } }) => {
  const searchString: string = req.query.search_string as string;
  try {
    const scrapedData = await scrapeAmazon(searchString);
    res.json(scrapedData);
  } catch (error) {
    console.error('Error scraping data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function scrapeAmazon(searchString: string) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(`https://www.amazon.com/s?k=${searchString}`);

  const products = await page.evaluate(() => {
    const productList: any[] = [];
    const productElements = document.querySelectorAll('.s-result-item');

    productElements.forEach((productElement) => {
      const title = productElement.querySelector('.a-text-normal')?.textContent?.trim() || '';
      let price = productElement.querySelector('.a-price')?.textContent?.trim() || '';
      price = price.replace(/[^\d.]/g, '');
      let priceNum: number | string = parseInt(price);
      priceNum = parseFloat(price).toFixed(2);
      priceNum.toString()
      price = priceNum.toString();
      const imageUrl = productElement.querySelector('img')?.getAttribute('src') || '';
      const link = productElement.querySelector('a')?.getAttribute('href') || '';

      productList.push({ title, price, imageUrl, link });
    });

    return productList;
  });

  await browser.close();
  return products;
}

const authenticateUser = async (req: Request, res: Response, next: Function) => {
  const { username, password } = req.body;

  // Check if username and password are provided
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // Perform authentication logic here (e.g., verify credentials with a database)
  // For demonstration purposes, always allow access
  next();
};

app.post('/scrape', authenticateUser, async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    // Scraping logic for user's purchase history
    const lastTenPurchases = await scrapeUserPurchaseHistory(username, password);
    res.json(lastTenPurchases);
  } catch (error) {
    console.error('Error scraping user purchase history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function scrapeUserPurchaseHistory(username: string, password: string): Promise<any[]> {
  // Scraping logic to fetch user's purchase history from Amazon
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const selectors = {
  emailid: 'input[name=email]',
  password: 'input[name=password]',
  continue: 'input[id=continue]',
  singin: 'input[id=signInSubmit]',
};
  
  // Navigate to Amazon sign-in page
  await page.goto('https://www.amazon.com/gp/sign-in.html');
  
  // Fill in username and password fields

    await page.waitForSelector(selectors.emailid);
    await page.type(selectors.emailid, username, { delay: 100 });
    await page.click(selectors.continue);
    await page.waitForSelector(selectors.password);
    await page.type(selectors.password, password, { delay: 100 });
    await page.click(selectors.singin);
    await page.waitForNavigation();

  // Navigate to user's order history page
  await page.goto('https://www.amazon.com/gp/css/order-history');

  // Scraping logic to extract last 10 purchases
  const lastTenPurchases: any[] | NodeListOf<Element> | any = await page.evaluate(() => {
    // Implement logic to extract last 10 purchases from the order history page
    // For demonstration purposes, returning dummy data\
    const ordersList = [...document.querySelectorAll('.order')];
    const ordersData: any[] = [];
    console.log(ordersList);
    ordersList.forEach((order, index) => {
      if (index > 9) {
        return;
      } else {
        ordersData.push(order)
      }
    }) 
    return ordersData;
  });

  await browser.close();
  console.log(lastTenPurchases)
  return lastTenPurchases;
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});