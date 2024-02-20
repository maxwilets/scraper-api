"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT) || 5001;
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
app.get('/scrape', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const searchString = req.query.search_string;
    try {
        const scrapedData = yield scrapeAmazon(searchString);
        res.json(scrapedData);
    }
    catch (error) {
        console.error('Error scraping data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
function scrapeAmazon(searchString) {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.default.launch();
        const page = yield browser.newPage();
        yield page.goto(`https://www.amazon.com/s?k=${searchString}`);
        const products = yield page.evaluate(() => {
            const productList = [];
            const productElements = document.querySelectorAll('.s-result-item');
            productElements.forEach((productElement) => {
                var _a, _b, _c, _d, _e, _f;
                const title = ((_b = (_a = productElement.querySelector('.a-text-normal')) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.trim()) || '';
                const priceText = ((_d = (_c = productElement.querySelector('.a-price')) === null || _c === void 0 ? void 0 : _c.textContent) === null || _d === void 0 ? void 0 : _d.trim()) || '';
                const price = parseFloat(priceText.replace(/[^\d.]/g, '')).toFixed(2);
                const imageUrl = ((_e = productElement.querySelector('img')) === null || _e === void 0 ? void 0 : _e.getAttribute('src')) || '';
                const link = ((_f = productElement.querySelector('a')) === null || _f === void 0 ? void 0 : _f.getAttribute('href')) || '';
                if (title) {
                    productList.push({ title, price, imageUrl, link });
                }
            });
            return productList.slice(0, 10);
        });
        yield browser.close();
        return products;
    });
}
const authenticateUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    next();
});
app.post('/scrape', authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password, type } = req.body;
    try {
        if (type === 'Capital One') {
            const creditData = yield scrapeCapitolOne(username, password);
            res.json(creditData);
        }
        else if (type === 'Playstation') {
            const playstationData = yield scrapePlaystation(username, password);
            res.json(playstationData);
        }
        else {
            const lastTenPurchases = yield scrapeUserPurchaseHistory(username, password);
            res.json(lastTenPurchases);
        }
    }
    catch (error) {
        console.error('Error scraping user purchase history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
function scrapeUserPurchaseHistory(username, password) {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.default.launch();
        const page = yield browser.newPage();
        const selectors = {
            emailid: 'input[name=email]',
            password: 'input[name=password]',
            continue: 'input[id=continue]',
            singin: 'input[id=signInSubmit]',
        };
        yield page.goto('https://www.amazon.com/gp/sign-in.html');
        yield page.waitForSelector(selectors.emailid);
        yield page.type(selectors.emailid, username, { delay: 100 });
        yield page.click(selectors.continue);
        yield page.waitForSelector(selectors.password);
        yield page.type(selectors.password, password, { delay: 100 });
        yield page.click(selectors.singin);
        yield page.waitForNavigation();
        yield page.goto('https://www.amazon.com/gp/history/');
        // scrolling page to wait for lazy load
        yield page.evaluate(() => __awaiter(this, void 0, void 0, function* () {
            const scrollToBottom = () => __awaiter(this, void 0, void 0, function* () {
                window.scrollTo(0, document.body.scrollHeight);
                yield new Promise(resolve => setTimeout(resolve, 500));
            });
            for (let i = 0; i < 2; i++) {
                yield scrollToBottom();
            }
        }));
        const relatedItems = yield page.evaluate(() => {
            const itemsList = document.querySelectorAll('.p13n-grid-content');
            const itemsData = [];
            itemsList.forEach((itemElement) => {
                var _a, _b, _c, _d, _e, _f;
                const title = ((_b = (_a = itemElement.querySelector('.p13n-sc-line-clamp-1')) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.trim()) || '';
                const link = ((_c = itemElement.querySelector('.a-link-normal')) === null || _c === void 0 ? void 0 : _c.getAttribute('href')) || '';
                const imageUrl = ((_d = itemElement.querySelector('img')) === null || _d === void 0 ? void 0 : _d.getAttribute('src')) || '';
                const priceText = ((_f = (_e = itemElement.querySelector('.a-color-price')) === null || _e === void 0 ? void 0 : _e.textContent) === null || _f === void 0 ? void 0 : _f.trim()) || '';
                const price = parseFloat(priceText.replace(/[^\d.]/g, '')).toFixed(2);
                itemsData.push({ title, imageUrl, price, link });
            });
            return itemsData.slice(0, 10);
        });
        yield browser.close();
        return relatedItems;
    });
}
function scrapeCapitolOne(username, password) {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.default.launch();
        const page = yield browser.newPage();
        const selectors = {
            user: 'input[id=usernameInputField]',
            password: 'input[id=pwInputField]',
            signIn: 'button[type=submit]',
            redirect: 'div.ci-step-up-container'
        };
        try {
            console.log('Navigating to Capital One sign-in page...');
            yield page.goto('https://verified.capitalone.com/auth/signin');
            console.log('Waiting for sign-in form to load...');
            yield page.waitForSelector(selectors.user);
            console.log('Typing username...');
            yield page.type(selectors.user, username);
            console.log('Typing password...');
            yield page.type(selectors.password, password);
            console.log('Clicking sign-in button...');
            yield page.click(selectors.signIn);
            // Wait for navigation to complete
            console.log('Waiting for navigation...');
            yield page.waitForNavigation();
            const isRedirect = yield page.waitForSelector(selectors.redirect, { timeout: 6000 }).then(() => true).catch(() => false);
            if (isRedirect) {
                console.log('successful login');
            }
            else {
                console.log('login failed invalid credentials');
            }
            // just throwing empy data I odnt want to show finance information
            yield browser.close();
            console.log('Browser closed successfully.');
            return [{ title: 'string', price: 'string', imageUrl: 'string', link: 'string' }, { title: 'string', price: 'string', imageUrl: 'string', link: 'string' }];
        }
        catch (error) {
            console.error('Error scraping Capital One:', error);
            yield browser.close();
            throw error; // Rethrow the error to handle it at a higher level
        }
    });
}
function scrapePlaystation(username, password) {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.default.launch();
        const page = yield browser.newPage();
        const selectors = {
            user: 'input[type=email]',
            password: 'input[id=signin-password-input-password]',
            continue: 'button[type=submit]',
            signIn: 'button[type=submit]',
            signInButton: 'button[type=button]'
        };
        try {
            console.log('Navigating to Playstation sign in...');
            yield page.goto('https://www.playstation.com/en-us/playstation-network/', { waitUntil: 'domcontentloaded' });
            // Wait for the sign-in button to be visible in the navbar
            console.log('Waiting for sign-in button...');
            yield page.waitForSelector(selectors.signInButton);
            // Click the sign-in button in the navbar
            console.log('Clicking the sign-in button...');
            yield page.click(selectors.signInButton);
            console.log('Waiting for sign-in form to load...');
            // goes to sign in form waiting to load
            yield page.waitForNavigation({ waitUntil: 'networkidle0' });
            yield page.type(selectors.user, username, { delay: 1000 });
            console.log('Waiting for Email...');
            yield page.click(selectors.continue);
            console.log('Waiting for password...');
            yield page.waitForSelector(selectors.password);
            yield page.type(selectors.password, password, { delay: 1000 });
            yield page.click(selectors.signIn);
            console.log('Scraping user purchase history...');
            // currently just authenticates login, due to text 2fa
            yield browser.close();
            console.log('Browser closed successfully.');
            return [{ title: 'string', price: 'string', imageUrl: 'string', link: 'string' }, { title: 'string', price: 'string', imageUrl: 'string', link: 'string' }];
        }
        catch (error) {
            console.error('Error scraping PlayStation:', error);
            yield browser.close();
            throw error; // Rethrow the error to handle it at a higher level
        }
    });
}
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
