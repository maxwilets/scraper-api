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
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
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
                const price = ((_d = (_c = productElement.querySelector('.a-price')) === null || _c === void 0 ? void 0 : _c.textContent) === null || _d === void 0 ? void 0 : _d.trim()) || '';
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
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
