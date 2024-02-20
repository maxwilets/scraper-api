import express, { Request, Response } from 'express';
import puppeteer, { Browser, Page } from 'puppeteer';
import cors from 'cors';
import bodyParser from 'body-parser';

interface Product {
  title: string;
  price: string;
  imageUrl: string;
  link: string;
}

const app = express();
const PORT: number = parseInt(process.env.PORT!) || 5001;

app.use(cors());
app.use(bodyParser.json());

app.get('/scrape', async (req: Request<{}, {}, {}, { search_string: string }>, res: Response) => {
  const searchString: string = req.query.search_string;
  try {
    const scrapedData = await scrapeAmazon(searchString);
    res.json(scrapedData);
  } catch (error) {
    console.error('Error scraping data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function scrapeAmazon(searchString: string): Promise<Product[]> {
  const browser: Browser = await puppeteer.launch();
  const page: Page = await browser.newPage();
  await page.goto(`https://www.amazon.com/s?k=${searchString}`);

  const products: Product[] = await page.evaluate(() => {
    const productList: Product[] = [];
    const productElements: NodeListOf<Element> = document.querySelectorAll('.s-result-item');

    productElements.forEach((productElement: Element) => {
      const title: string = (productElement.querySelector('.a-text-normal') as HTMLElement)?.textContent?.trim() || '';
      const priceText: string = (productElement.querySelector('.a-price') as HTMLElement)?.textContent?.trim() || '';
      const price: string = parseFloat(priceText.replace(/[^\d.]/g, '')).toFixed(2);
      const imageUrl: string = (productElement.querySelector('img') as HTMLImageElement)?.getAttribute('src') || '';
      const link: string = (productElement.querySelector('a') as HTMLAnchorElement)?.getAttribute('href') || '';

      if (title) {
        productList.push({ title, price, imageUrl, link });
      }
    });

    return productList.slice(0, 10);
  });

  await browser.close();
  return products;
}

const authenticateUser = async (req: Request, res: Response, next: Function) => {
  const { username, password }: { username: string; password: string } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  next();
};

app.post('/scrape', authenticateUser, async (req: Request<{}, {}, { username: string; password: string, type: string }>, res: Response) => {
  const { username, password, type } = req.body;

  try {
    if (type === 'Capital One') {
      const creditData = await scrapeCapitolOne(username, password);
      res.json(creditData);
    } else if (type === 'Playstation') {
      const playstationData = await scrapePlaystation(username, password);
      res.json(playstationData)
    } else {
      const lastTenPurchases = await scrapeUserPurchaseHistory(username, password);
      res.json(lastTenPurchases);
    }
    
  } catch (error) {
    console.error('Error scraping user purchase history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function scrapeUserPurchaseHistory(username: string, password: string): Promise<Product[]> {
  const browser: Browser = await puppeteer.launch();
  const page: Page = await browser.newPage();

  const selectors: { [key: string]: string } = {
    emailid: 'input[name=email]',
    password: 'input[name=password]',
    continue: 'input[id=continue]',
    singin: 'input[id=signInSubmit]',
  };

  await page.goto('https://www.amazon.com/gp/sign-in.html');

  await page.waitForSelector(selectors.emailid);
  await page.type(selectors.emailid, username, { delay: 100 });
  await page.click(selectors.continue);
  await page.waitForSelector(selectors.password);
  await page.type(selectors.password, password, { delay: 100 });
  await page.click(selectors.singin);
  await page.waitForNavigation();

  await page.goto('https://www.amazon.com/gp/history/');
  // scrolling page to wait for lazy load
  await page.evaluate(async () => {
    const scrollToBottom = async () => {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise(resolve => setTimeout(resolve, 500));
    };

    for (let i = 0; i < 2; i++) {
      await scrollToBottom();
    }
  });

  const relatedItems: Product[] = await page.evaluate(() => {
    const itemsList: NodeListOf<Element> = document.querySelectorAll('.p13n-grid-content');
    const itemsData: Product[] = [];

    itemsList.forEach((itemElement: Element) => {
      const title: string = (itemElement.querySelector('.p13n-sc-line-clamp-1') as HTMLElement)?.textContent?.trim() || '';
      const link: string = (itemElement.querySelector('.a-link-normal') as HTMLAnchorElement)?.getAttribute('href') || '';
      const imageUrl: string = (itemElement.querySelector('img') as HTMLImageElement)?.getAttribute('src') || '';
      const priceText: string = (itemElement.querySelector('.a-color-price') as HTMLElement)?.textContent?.trim() || '';
      const price: string = parseFloat(priceText.replace(/[^\d.]/g, '')).toFixed(2);

      itemsData.push({ title, imageUrl, price, link });
    });

    return itemsData.slice(0, 10);
  });

  await browser.close();
  return relatedItems;
}

async function scrapeCapitolOne(username: string, password: string): Promise<Product[]> {
  const browser: Browser = await puppeteer.launch();
  const page: Page = await browser.newPage();

   const selectors: { [key: string]: string } = {
    user: 'input[id=usernameInputField]',
    password: 'input[id=pwInputField]',
    signIn: 'button[type=submit]',
  };

  try {
    console.log('Navigating to Capital One sign-in page...');
    await page.goto('https://verified.capitalone.com/auth/signin');
    console.log('Waiting for sign-in form to load...');
    await page.waitForSelector(selectors.user);
    console.log('Typing username...');
    await page.type(selectors.user, username);
    console.log('Typing password...');
    await page.type(selectors.password, password);
    console.log('Clicking sign-in button...');
    await page.click(selectors.signIn);

    // Wait for navigation to complete
    console.log('Waiting for navigation...');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    console.log('Scraping user purchase history...');

    await browser.close();
    console.log('Browser closed successfully.');
    return [{ title: 'string', price: 'string', imageUrl: 'string', link: 'string' }, { title: 'string', price: 'string', imageUrl: 'string', link: 'string' }];
  } catch (error) {
    console.error('Error scraping Capital One:', error);
    await browser.close();
    throw error; // Rethrow the error to handle it at a higher level
  }
}

async function scrapePlaystation(username: string, password: string): Promise<Product[]> {
  const browser: Browser = await puppeteer.launch();
  const page: Page = await browser.newPage();

  const selectors: { [key: string]: string } = {
    user: 'input[type=email]',
    password: 'input[id=signin-password-input-password]',
    continue: 'button[type=submit]',
    signIn: 'button[type=submit]',
    signInButton: 'button[type=button]'
  };

  try {
    console.log('Navigating to Playstation sign in...');
    await page.goto('https://www.playstation.com/en-us/playstation-network/', { waitUntil: 'domcontentloaded' });
    // scrolling dom to trigger nav

    // Wait for the sign-in button to be visible in the navbar
    console.log('Waiting for sign-in button...');
    await page.waitForSelector(selectors.signInButton);

    // Click the sign-in button in the navbar
    console.log('Clicking the sign-in button...');
    await page.click(selectors.signInButton);

    console.log('Waiting for sign-in form to load...');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    await page.type(selectors.user, username, { delay: 1000 }); 
    console.log('Waiting for Email...')
    await page.click(selectors.continue);
    console.log('Waiting for password...')
    await page.waitForSelector(selectors.password);
    await page.type(selectors.password, password, { delay: 1000 });
    await page.click(selectors.signIn);


    console.log('Scraping user purchase history...');
    // currently just authenticates login, due to text 2fa
    await browser.close();
    console.log('Browser closed successfully.');
    return [{ title: 'string', price: 'string', imageUrl: 'string', link: 'string' }, { title: 'string', price: 'string', imageUrl: 'string', link: 'string' }];
  } catch (error) {
    console.error('Error scraping PlayStation:', error);
    await browser.close();
    throw error; // Rethrow the error to handle it at a higher level
  }
}


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});