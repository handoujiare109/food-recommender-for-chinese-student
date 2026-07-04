const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = 3000;

const DATA_FILE = path.join(__dirname, 'data.json');
const N0 = 20; // 先验强度

// 产品冷启动初始权重（仅当数据文件不存在时使用）
const initialProducts = [
    { name: "兰州拉面", price: 0, spicy: 0, w1: 0.30375 },
    { name: "烤肉饭", price: 0, spicy: 0, w1: 0.2278125 },
    { name: "卤肉饭", price: 0, spicy: 0, w1: 0.151875 },
    { name: "沙县小吃", price: 0, spicy: 0, w1: 0.151875 },
    { name: "炒饭", price: 0, spicy: 0, w1: 0.0759375 },
    { name: "拌面", price: 0, spicy: 0, w1: 0.050625 },
    { name: "馄饨", price: 0, spicy: 0, w1: 0.050625 },
    { name: "水饺", price: 0, spicy: 0, w1: 0.050625 },
    { name: "粥品", price: 0, spicy: 0, w1: 0.050625 },
    { name: "麻辣烫", price: 0, spicy: 1, w1: 0.455625 },
    { name: "黄焖鸡米饭", price: 0, spicy: 1, w1: 0.405 },
    { name: "酸辣粉", price: 0, spicy: 1, w1: 0.23625 },
    { name: "螺蛳粉", price: 0, spicy: 1, w1: 0.16875 },
    { name: "重庆小面", price: 0, spicy: 1, w1: 0.135 },
    { name: "桂林米粉", price: 0, spicy: 1, w1: 0.10125 },
    { name: "粤菜简餐", price: 1, spicy: 0, w1: 0.3796875 },
    { name: "煲仔饭", price: 1, spicy: 0, w1: 0.2025 },
    { name: "寿司", price: 1, spicy: 0, w1: 0.135 },
    { name: "牛肉汉堡套餐", price: 1, spicy: 0, w1: 0.1125 },
    { name: "米饭炒菜", price: 1, spicy: 0, w1: 0.10125 },
    { name: "披萨", price: 1, spicy: 0, w1: 0.0675 },
    { name: "炸鸡套餐", price: 1, spicy: 0, w1: 0.045 },
    { name: "川菜套餐", price: 1, spicy: 1, w1: 0.253125 },
    { name: "酸菜鱼米饭", price: 1, spicy: 1, w1: 0.2025 },
    { name: "湘菜小炒", price: 1, spicy: 1, w1: 0.151875 },
    { name: "江西辣小炒", price: 1, spicy: 1, w1: 0.10125 },
    { name: "麻辣小龙虾", price: 1, spicy: 1, w1: 0.0675 }
];

let products = [];

// ===================== 文件持久化 =====================
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            products = parsed.map(p => ({
                ...p,
                shows: p.shows || 0,
                clicks: p.clicks || 0
            }));
            console.log(`已加载数据文件，共 ${products.length} 个产品。`);
        } else {
            products = initialProducts.map(p => ({ ...p, shows: 0, clicks: 0 }));
            saveData();
            console.log('已创建新的数据文件。');
        }
    } catch (err) {
        console.error('加载数据失败，使用初始权重', err);
        products = initialProducts.map(p => ({ ...p, shows: 0, clicks: 0 }));
        saveData();
    }
}

let saveTimer = null;
const SAVE_DEBOUNCE_MS = 2000; // 2秒内的多次写入合并为一次

function saveData() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2), 'utf8');
        } catch (err) {
            console.error('保存数据失败', err);
        }
    }, SAVE_DEBOUNCE_MS);
}

// 立即保存（用于进程退出）
function saveDataSync() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2), 'utf8');
    } catch (err) {
        console.error('保存数据失败', err);
    }
}

// 初始化数据
loadData();

// ===================== 中间件 =====================
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===================== Thompson Sampling 工具函数 =====================

// Marsaglia-Tsang 方法生成 Gamma 随机变量
function rgamma(shape) {
    if (shape < 1) {
        // Gamma(a) ~ Gamma(a+1) * U^(1/a)
        return rgamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
        // Box-Muller 生成标准正态分布
        const u1 = 1 - Math.random(); // 避免 log(0)
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const v = Math.pow(1 + c * z, 3);
        if (v <= 0) continue;
        const u = Math.random();
        // squeeze 加速
        if (u < 1 - 0.0331 * Math.pow(z, 4)) return d * v;
        if (Math.log(u) < 0.5 * z * z + d * (1 - v + Math.log(v))) return d * v;
    }
}

// 从 Beta(alpha, beta) 中随机采样
function rbeta(alpha, beta) {
    const x = rgamma(alpha);
    const y = rgamma(beta);
    return x / (x + y);
}

function getQuadrant(price, spicy) {
    return products.filter(p => p.price === price && p.spicy === spicy);
}

// 计算后验 Beta 参数
function getPosteriorParams(product, quadrantProds) {
    const totalW1 = quadrantProds.reduce((sum, p) => sum + p.w1, 0);
    const priorProb = product.w1 / totalW1;
    const alpha0 = N0 * priorProb;
    const beta0 = N0 * (1 - priorProb);
    return {
        alpha: alpha0 + product.clicks,
        beta: beta0 + (product.shows - product.clicks)
    };
}

// 后验期望（用于展示，不用于推荐决策）
function computeExpectedScore(product, quadrantProds) {
    const { alpha, beta } = getPosteriorParams(product, quadrantProds);
    return alpha / (alpha + beta);
}

// Thompson Sampling：从后验 Beta 分布中采样（用于推荐决策）
function thompsonSample(product, quadrantProds) {
    const { alpha, beta } = getPosteriorParams(product, quadrantProds);
    return rbeta(alpha, beta);
}

// ===================== 鉴权工具 =====================
function isLocalhost(req) {
    const ip = req.ip || req.socket.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

// ===================== API 路由 =====================

// 1. 获取推荐（Thompson Sampling）
app.get('/api/recommend', (req, res) => {
    const price = parseInt(req.query.price);
    const spicy = parseInt(req.query.spicy);
    if (isNaN(price) || isNaN(spicy) || ![0,1].includes(price) || ![0,1].includes(spicy)) {
        return res.status(400).json({ error: '参数错误' });
    }
    const quadrantProds = getQuadrant(price, spicy);
    if (quadrantProds.length === 0) {
        return res.status(404).json({ error: '该分类无产品' });
    }

    // Thompson Sampling：从每个产品的后验 Beta 分布中随机采样，选采样值最高的
    let best = null, bestSample = -1;
    for (let p of quadrantProds) {
        const sample = thompsonSample(p, quadrantProds);
        if (sample > bestSample) {
            bestSample = sample;
            best = p;
        }
    }

    // 记录展示
    best.shows += 1;
    saveData();

    const expectedScore = computeExpectedScore(best, quadrantProds);

    res.json({
        name: best.name,
        score: expectedScore,          // 后验期望（可解释性）
        sample: bestSample,            // Thompson 采样值（实际决策依据）
        shows: best.shows,
        clicks: best.clicks
    });
});

// 2. 用户反馈
app.post('/api/feedback', (req, res) => {
    const { name, interested } = req.body;
    if (typeof name !== 'string' || typeof interested !== 'boolean') {
        return res.status(400).json({ error: '参数错误：name 必须为字符串，interested 必须为布尔值' });
    }
    const prod = products.find(p => p.name === name);
    if (!prod) return res.status(404).json({ error: '产品未找到' });
    if (interested) {
        prod.clicks += 1;
    }
    saveData();
    res.json({ success: true });
});

// 3. 获取全部数据（管理面板，仅限本机）
app.get('/api/data', (req, res) => {
    if (!isLocalhost(req)) {
        return res.status(403).json({ error: '仅限本机访问' });
    }
    res.json(products);
});

// ===================== 页面路由 =====================
app.get('/admin', (req, res) => {
    if (!isLocalhost(req)) {
        return res.status(403).send('Access denied. Only localhost.');
    }
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===================== 启动服务器 =====================
const server = app.listen(PORT, () => {
    console.log(`服务器已启动: http://localhost:${PORT}`);
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                console.log(`局域网地址: http://${net.address}:${PORT}`);
            }
        }
    }
});

// 进程退出前立即保存数据
process.on('SIGINT', () => { saveDataSync(); process.exit(); });
process.on('SIGTERM', () => { saveDataSync(); process.exit(); });
