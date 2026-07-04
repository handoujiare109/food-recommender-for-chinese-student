# 🍜 Food Recommender for Chinese Students / 中国留学生美食推荐系统

A food recommendation web application that uses **Thompson Sampling** (a Bayesian multi-armed bandit algorithm) to help Chinese students decide what to eat. It learns your preferences over time by balancing exploration (trying new dishes) and exploitation (recommending proven favorites).

一款基于 **Thompson Sampling（汤普森采样）** 贝叶斯多臂老虎机算法的美食推荐 Web 应用。帮助中国留学生解决"今天吃什么"的终极难题，通过不断学习你的口味偏好，在探索新菜品和推荐已知喜好之间找到最佳平衡。

---

## 🧠 How It Works / 工作原理

The system categorizes **27 popular Chinese food items** into four quadrants based on:

系统将 **27 种常见中餐** 按照以下两个维度分为四个象限：

| | 🌶️ Not Spicy / 不辣 | 🔥 Spicy / 辣 |
|---|---|---|
| **💰 Under ¥25 / 25元以下** | Quadrant 1 | Quadrant 2 |
| **💎 ¥25 and above / 25元及以上** | Quadrant 3 | Quadrant 4 |

### Thompson Sampling Algorithm

For each recommendation, the algorithm:

1. Computes a **Beta posterior distribution** for each food item in the selected quadrant
2. Draws a random sample from each distribution
3. Recommends the item with the highest sampled value

This naturally balances:
- **Exploration** — items with few observations have wide posteriors and can occasionally "win"
- **Exploitation** — items with strong historical click-through rates are more likely to be recommended

The prior for each item is set by domain knowledge (an initial weight `w1`), with a pseudo-count of `N0 = 20`, meaning real user feedback gradually overrides the prior after ~20 interactions.

---

## 🍚 Food Items / 菜品种类

| Name | Price | Spicy |
|---|---|---|
| 兰州拉面 (Lanzhou Noodles) | < ¥25 | No |
| 烤串+米饭 (Kebab + Rice) | < ¥25 | Yes |
| 黄焖鸡米饭 (Braised Chicken Rice) | < ¥25 | No |
| 麻辣烫 (Malatang) | < ¥25 | Yes |
| 沙县小吃 (Shaxian Snacks) | < ¥25 | No |
| 盖饭 (Rice Topped) | < ¥25 | No |
| 煲仔饭 (Claypot Rice) | < ¥25 | Yes |
| 干锅系列 (Dry Pot Series) | ≥ ¥25 | Yes |
| 寿司 (Sushi) | ≥ ¥25 | No |
| 披萨 (Pizza) | ≥ ¥25 | No |
| 汉堡+薯条 (Burger + Fries) | ≥ ¥25 | No |
| 牛排 (Steak) | ≥ ¥25 | No |
| 川菜套餐 (Sichuan Set) | ≥ ¥25 | Yes |
| 煎饼果子/卷饼 (Jianbing/Wrap) | < ¥25 | No |
| 米线 (Rice Noodles) | < ¥25 | Yes |
| 小碗菜 (Small Bowl Dishes) | < ¥25 | No |
| 东北套餐 (Dongbei Set) | < ¥25 | No |
| 烤盘饭 (Grilled Plate Rice) | < ¥25 | Yes |
| 麻辣拌 (Mala Sauce Mix) | < ¥25 | Yes |
| 鸡排饭 (Chicken Cutlet Rice) | ≥ ¥25 | No |
| 麻辣香锅 (Spicy Hot Pot) | ≥ ¥25 | Yes |
| 日式套餐 (Japanese Set) | ≥ ¥25 | No |
| 韩式套餐 (Korean Set) | ≥ ¥25 | No |
| 粤菜套餐 (Cantonese Set) | ≥ ¥25 | No |
| 饺子/馄饨 (Dumplings/Wonton) | < ¥25 | No |
| 减脂餐 (Diet Meal) | ≥ ¥25 | No |
| 螺蛳粉 (Luosifen) | < ¥25 | Yes |

---

## 🛠️ Tech Stack / 技术栈

| Technology | Purpose |
|---|---|
| **Node.js** (v18+) | JavaScript runtime |
| **Express 5.x** | Web server framework |
| **Vanilla JavaScript (ES6+)** | Frontend logic |
| **HTML5 + CSS3** | User interface |
| **JSON file** | Data persistence |

> 🧪 The entire Thompson Sampling engine (gamma sampling, beta sampling, posterior computation) is implemented **from scratch in vanilla JavaScript** — zero ML dependencies.

---

## 🚀 Getting Started / 快速开始

### Prerequisites / 环境要求

- **Node.js** v18 or later

### Installation / 安装

```bash
git clone https://github.com/handoujiare109/food-recommender-for-chinese-student.git
cd food-recommender-for-chinese-student
npm install
```

### Run / 运行

```bash
npm start
# or
node server.js
```

The server starts at `http://localhost:3000`.

| Page | URL | Description |
|---|---|---|
| 🏠 Main App | `http://localhost:3000/` | Get food recommendations |
| 📊 Admin Dashboard | `http://localhost:3000/admin` | View stats (localhost only) |

---

## 📡 API Endpoints

### `GET /api/recommend`

Get a food recommendation.

**Query Parameters:**
| Param | Type | Description |
|---|---|---|
| `price` | `0` or `1` | `0` = under ¥25, `1` = ¥25 and above |
| `spicy` | `0` or `1` | `0` = not spicy, `1` = spicy |

**Response:**
```json
{
  "name": "兰州拉面",
  "price": 0,
  "spicy": 0,
  "score": 0.723
}
```

### `POST /api/feedback`

Submit feedback for a recommendation.

**Body (JSON):**
```json
{
  "name": "兰州拉面",
  "interested": true
}
```

### `GET /api/data`

Get all product statistics (admin use).

---

## 📁 Project Structure / 项目结构

```
food-recommender/
├── server.js           # Express server + Thompson Sampling engine
├── data.json           # Product weights & interaction stats (auto-created)
├── package.json        # NPM metadata
├── package-lock.json   # Locked dependencies
└── public/
    ├── index.html      # Main recommendation UI
    └── admin.html      # Admin statistics dashboard
```

---

## 🎯 Features

- ✅ **Thompson Sampling** — intelligent exploration vs. exploitation trade-off
- ✅ **Bayesian priors** — domain-expert initial weights for cold start
- ✅ **Real-time learning** — updates model immediately after each feedback
- ✅ **Persistent storage** — all data saved to `data.json` (debounced writes)
- ✅ **Admin dashboard** — real-time statistics with auto-refresh
- ✅ **Zero ML dependencies** — sampling algorithms implemented from scratch
- ✅ **LAN access** — accessible from other devices on the same network

---

## 📄 License

MIT
