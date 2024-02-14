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
const PORT = process.env.PORT || 5001;
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
                let price = ((_d = (_c = productElement.querySelector('.a-price')) === null || _c === void 0 ? void 0 : _c.textContent) === null || _d === void 0 ? void 0 : _d.trim()) || '';
                price = price.replace(/[^\d.]/g, '');
                let priceNum = parseInt(price);
                priceNum = parseFloat(price).toFixed(2);
                priceNum.toString();
                price = priceNum.toString();
                const imageUrl = ((_e = productElement.querySelector('img')) === null || _e === void 0 ? void 0 : _e.getAttribute('src')) || '';
                const link = ((_f = productElement.querySelector('a')) === null || _f === void 0 ? void 0 : _f.getAttribute('href')) || '';
                productList.push({ title, price, imageUrl, link });
            });
            return productList;
        });
        yield browser.close();
        return products;
    });
}
const authenticateUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    // Check if username and password are provided
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    // Perform authentication logic here (e.g., verify credentials with a database)
    // For demonstration purposes, always allow access
    next();
});
app.post('/scrape', authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    try {
        // Scraping logic for user's purchase history
        const lastTenPurchases = yield scrapeUserPurchaseHistory(username, password);
        res.json(lastTenPurchases);
    }
    catch (error) {
        console.error('Error scraping user purchase history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
function scrapeUserPurchaseHistory(username, password) {
    return __awaiter(this, void 0, void 0, function* () {
        // Scraping logic to fetch user's purchase history from Amazon
        const browser = yield puppeteer_1.default.launch();
        const page = yield browser.newPage();
        const selectors = {
            emailid: 'input[name=email]',
            password: 'input[name=password]',
            continue: 'input[id=continue]',
            singin: 'input[id=signInSubmit]',
        };
        // Navigate to Amazon sign-in page
        yield page.goto('https://www.amazon.com/gp/sign-in.html');
        // Fill in username and password fields
        yield page.waitForSelector(selectors.emailid);
        yield page.type(selectors.emailid, "satyam@gmail.com", { delay: 100 });
        yield page.click(selectors.continue);
        yield page.waitForSelector(selectors.password);
        yield page.type(selectors.password, "mypassword", { delay: 100 });
        yield page.click(selectors.singin);
        yield page.waitForNavigation();
        // Navigate to user's order history page
        yield page.goto('https://www.amazon.com/gp/css/order-history');
        // Scraping logic to extract last 10 purchases
        const lastTenPurchases = yield page.evaluate(() => {
            // Implement logic to extract last 10 purchases from the order history page
            // For demonstration purposes, returning dummy data\
            const ordersList = [...document.querySelectorAll('.order')];
            const ordersData = [];
            console.log(ordersList);
            ordersList.forEach((order, index) => {
                if (index > 9) {
                    return;
                }
                else {
                    ordersData.push(order);
                }
            });
            return ordersData;
        });
        yield browser.close();
        console.log(lastTenPurchases);
        return lastTenPurchases;
    });
}
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
