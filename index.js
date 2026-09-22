import http from 'http';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// 1. Web Server giữ cho Render sống
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => res.end('Bot Meo va Tra is running!')).listen(PORT, () => {
    console.log(`🌐 Web server đang lắng nghe tại port ${PORT}`);
});

// 2. SCHEMAS & DATABASE
const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    coins: { type: Number, default: 50 },
    cats: { type: Array, default: [] }, // [{ name, rarity, level, xp }]
    inventory: { type: Object, default: { hatgiong_lua: 2, thucan: 2 } },
    plots: { type: Array, default: [] },
    maxPlots: { type: Number, default: 5 },
    unlockedRecipes: { type: Array, default: [] },
    lastDiemDanh: { type: Number, default: 0 },
    lastClaimCatCoins: { type: Number, default: Date.now() },
    questResetAt: { type: Number, default: 0 },
    quests: { type: Array, default: [] }
});

const configSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: String, default: null }
});

const User = mongoose.model('User', userSchema);
const Config = mongoose.model('Config', configSchema);

// DỮ LIỆU CÂY TRỒNG & NÔNG SẢN
const PLANTS = {
    lua: { name: 'Lúa', seedItem: 'hatgiong_lua', cropItem: 'lua', cropName: 'Lúa', seedPrice: 10, cropPrice: 18, timeMs: 20000 },
    tra: { name: 'Cây Trà', seedItem: 'hatgiong_tra', cropItem: 'la_tra', cropName: 'Lá Trà', seedPrice: 25, cropPrice: 45, timeMs: 40000 },
    mia: { name: 'Cây Mía', seedItem: 'hatgiong_mia', cropItem: 'cay_mia', cropName: 'Cây Mía', seedPrice: 45, cropPrice: 80, timeMs: 60000 },
    caphe: { name: 'Cây Cà Phê', seedItem: 'hatgiong_caphe', cropItem: 'hat_caphe', cropName: 'Hạt Cà Phê', seedPrice: 70, cropPrice: 130, timeMs: 90000 },
    tre: { name: 'Cây Tre', seedItem: 'hatgiong_tre', cropItem: 'than_tre', cropName: 'Thân Tre', seedPrice: 120, cropPrice: 220, timeMs: 120000 }
};

// DỮ LIỆU ĐỘ HIẾM & EMOJI
const RARITY_CONFIG = {
    'Thường': { icon: '<:common:1551966215721975878>' },
    'Hiếm': { icon: '<:uncommon:1551966317287055430>' },
    'Cực Hiếm': { icon: '<:rare_:1551966385893277706>' },
    'Huyền Thoại': { icon: '<:legend:1551966453459324968>' },
    'Sử Thi': { icon: '<:mythic:1551966543074820106>' },
    'Limited': { icon: '<:secret:1551966624221888592>' }
};

// DỮ LIỆU MÈO (Đã đổi Mèo Ta thành Mèo Mướp + Thêm Emoji Mèo)
const CAT_TYPES = [
    { name: 'Mèo Béo Phơi Nắng', rarity: 'Thường', rate: 25, emoji: '🐱', image: 'https://i.pinimg.com/736x/09/04/14/0904144cabdfd4e01784bf064d56d290.jpg', incomePerSec: 0.1 },
    { name: 'Mèo Mướp', rarity: 'Thường', rate: 20, emoji: '<:meomuop:1551973509796724786>', image: 'https://i.pinimg.com/736x/ce/04/8c/ce048c234c179b17841811151df5259c.jpg', incomePerSec: 0.1 },
    { name: 'Mèo Ragdoll', rarity: 'Hiếm', rate: 12, emoji: '<:meoragdoll:1551973858276409414>', image: 'https://i.pinimg.com/736x/39/d2/da/39d2dae2e2cabc21163699f6e3601916.jpg', incomePerSec: 0.25 },
    { name: 'Mèo Tuxedo', rarity: 'Hiếm', rate: 12, emoji: '<:meotuxedo:1551973751921451079>', image: 'https://i.pinimg.com/1200x/9f/84/3d/9f843d43cc4078283dae7327e8ce7314.jpg', incomePerSec: 0.25 },
    { name: 'Mèo Trà Xanh', rarity: 'Hiếm', rate: 10, emoji: '<:meotraxanh:1551974270505189426>', image: 'https://i.pinimg.com/736x/a2/06/ad/a206ad186aed59dff16bbce4bdff424b.jpg', incomePerSec: 0.25 },
    { name: 'Mèo Maine Coon', rarity: 'Cực Hiếm', rate: 8, emoji: '<:meomarinecoon:1551974053542109204>', image: 'https://i.pinimg.com/736x/65/e6/e9/65e6e9bf4946447e0af173e6d340c908.jpg', incomePerSec: 0.833 },
    { name: 'Mèo Lofi Nghe Nhạc', rarity: 'Cực Hiếm', rate: 8, emoji: '<:meolofi:1551974186455670865>', image: 'https://i.pinimg.com/736x/b3/12/89/b3128925bda713b4303f89b9c2d62744.jpg', incomePerSec: 0.833 },
    { name: 'Mèo Hoàng Gia', rarity: 'Huyền Thoại', rate: 5, emoji: '<:meohoanggia:1551973577153314966>', image: 'https://i.pinimg.com/1200x/2b/05/9e/2b059e2fbcf5c9087bf1e8f1f2a17165.jpg', incomePerSec: 2.5 }
];

// CÔNG THỨC PHA CHẾ
const RECIPES = {
    tradao: { name: 'Trà Đào Cam Sả 🍹', ingredients: { la_tra: 5, dao: 3, cam: 2 }, brewTimeMs: 180000, price: 600 },
    caphesua: { name: 'Cà Phê Sữa ☕', ingredients: { hat_caphe: 4, sua: 2 }, brewTimeMs: 150000, price: 400 },
    nuocmia: { name: 'Nước Mía Tắc 🥤', ingredients: { cay_mia: 5, tac: 2 }, brewTimeMs: 90000, price: 250 }
};

function getRequiredXP(level) {
    return Math.floor(10 * Math.pow(level, 1.5));
}

function checkAndResetQuests(user) {
    const now = Date.now();
    const TWELVE_HOURS = 12 * 60 * 60 * 1000;
    if (!user.questResetAt || now - user.questResetAt >= TWELVE_HOURS) {
        user.questResetAt = now;
        user.quests = [
            { id: 'plant', desc: 'Trồng 5 cây bất kỳ', target: 5, progress: 0, reward: 80, claimed: false },
            { id: 'catch', desc: 'Bắt 1 con mèo lang thang', target: 1, progress: 0, reward: 120, claimed: false },
            { id: 'brew', desc: 'Pha 2 ly nước uống', target: 2, progress: 0, reward: 150, claimed: false }
        ];
        user.markModified('quests');
    }
}

function updateQuestProgress(user, questId, amount = 1) {
    checkAndResetQuests(user);
    const q = user.quests.find(x => x.id === questId);
    if (q && !q.claimed && q.progress < q.target) {
        q.progress = Math.min(q.target, q.progress + amount);
        user.markModified('quests');
    }
}

async function getUser(userId) {
    if (mongoose.connection.readyState !== 1) return null;
    try {
        let user = await User.findOne({ userId }).maxTimeMS(5000);
        if (!user) {
            user = new User({ userId });
            await user.save();
        }
        if (!user.inventory || typeof user.inventory !== 'object') user.inventory = {};
        if (!Array.isArray(user.cats)) user.cats = [];
        if (!Array.isArray(user.plots)) user.plots = [];
        checkAndResetQuests(user);
        return user;
    } catch (e) {
        console.error('Lỗi getUser:', e);
        return null;
    }
}

// 3. DISCORD CLIENT
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const PREFIX = '!';
let currentWildCat = null;

client.once('ready', () => {
    console.log(`✅ Bot chill Node.js ${client.user.tag} đã sẵn sàng!`);
    client.user.setActivity('Uống trà & chăm mèo 🍵');
    setInterval(spawnCatTask, 45 * 60 * 1000);
});

async function spawnCatTask() {
    try {
        if (mongoose.connection.readyState !== 1) return;
        const channelConfig = await Config.findOne({ key: 'spawn_channel' }).maxTimeMS(5000);
        if (!channelConfig || !channelConfig.value) return;

        const channel = await client.channels.fetch(channelConfig.value).catch(() => null);
        if (!channel) return;

        const rand = Math.floor(Math.random() * 100) + 1;
        let cumulative = 0;
        let selectedCat = CAT_TYPES[0];

        for (const cat of CAT_TYPES) {
            cumulative += cat.rate;
            if (rand <= cumulative) {
                selectedCat = cat;
                break;
            }
        }

        currentWildCat = selectedCat;

        const embed = new EmbedBuilder()
            .setTitle('🐾 Một con mèo lang thang vừa xuất hiện!')
            .setDescription(`Nó là **${selectedCat.name}** (Độ hiếm: \`${selectedCat.rarity}\`)\n\n👉 Gõ **\`!cat\`** hoặc **\`!meo\`** để bắt nó ngay!`)
            .setImage(selectedCat.image)
            .setColor(0x98FB98);

        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.error('Lỗi spawn mèo:', err);
    }
}

// XỬ LÝ LỆNH
client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot) return;

        const content = message.content.trim();
        if (!content.startsWith(PREFIX) && content.toLowerCase() !== 'cat' && content.toLowerCase() !== 'meo') return;

        const args = content.startsWith(PREFIX) ? content.slice(PREFIX.length).trim().split(/ +/) : [content];
        const command = args.shift().toLowerCase();

        // 📍 BẮT MÈO
        if (command === 'cat' || command === 'meo') {
            if (currentWildCat) {
                const catCaught = currentWildCat;
                currentWildCat = null;
                const user = await getUser(message.author.id);
                if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

                user.cats.push({ name: catCaught.name, rarity: catCaught.rarity, level: 1, xp: 0 });
                updateQuestProgress(user, 'catch', 1);
                user.markModified('cats');
                await user.save();

                const embed = new EmbedBuilder()
                    .setTitle('🎉 Bạn đã bắt thành công!')
                    .setDescription(`${message.author} đã bắt thành công **${catCaught.name}**!`)
                    .setThumbnail(catCaught.image)
                    .setColor(0xFFB6C1);

                return message.channel.send({ embeds: [embed] });
            } else {
                const msg = await message.channel.send('🐾 Hiện không có con mèo nào ở đây cả...');
                setTimeout(() => msg.delete().catch(() => {}), 4000);
                return;
            }
        }

        // 📍 BỘ SƯU TẬP MÈO STYLING OWO (!index / !zoo)
        if (command === 'index' || command === 'zoo') {
            const user = await getUser(message.author.id);
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            // Lấy danh sách tên mèo mà user đã sở hữu
            const ownedCatNames = user.cats.map(c => c.name);

            let indexDescription = '';
            let totalCatsInGame = CAT_TYPES.length;
            let totalOwnedUnique = 0;

            // Lặp qua 6 độ hiếm chuẩn
            for (const [rarityName, rarityInfo] of Object.entries(RARITY_CONFIG)) {
                const catsInRarity = CAT_TYPES.filter(c => c.rarity === rarityName);
                
                let lineIcons = '';
                if (catsInRarity.length > 0) {
                    lineIcons = catsInRarity.map(cat => {
                        const isOwned = ownedCatNames.some(name => name.includes(cat.name) || cat.name.includes(name));
                        if (isOwned) {
                            totalOwnedUnique++;
                            return cat.emoji;
                        }
                        return '❓';
                    }).join(' ');
                } else {
                    lineIcons = '*Đang cập nhật...*';
                }

                indexDescription += `${rarityInfo.icon} **${rarityName}**: ${lineIcons}\n\n`;
            }

            const embed = new EmbedBuilder()
                .setTitle(`🐱 Bộ Sưu Tập Mèo Của ${message.author.username}`)
                .setDescription(indexDescription)
                .setFooter({ text: `Tiến độ thu thập: ${totalOwnedUnique}/${totalCatsInGame} chú mèo khác nhau` })
                .setColor(0xFFB6C1);

            return message.channel.send({ embeds: [embed] });
        }

        // 📍 HELP
        if (command === 'help' || command === 'h') {
            const embed = new EmbedBuilder()
                .setTitle('🍵 Hướng Dẫn Bot Mèo Và Trà')
                .setColor(0x98FB98)
                .addFields(
                    { name: '📜 **Nhiệm Vụ & Điểm Danh**', value: '• `!quest` | `!nv`: Xem & nhận thưởng nhiệm vụ.\n• `!diemdanh` | `!dd`: Điểm danh 24h/lần.' },
                    { name: '🐾 **Mèo & Bộ Sưu Tầm**', value: '• `!cat` | `!meo`: Bắt mèo lang thang.\n• `!index` | `!zoo`: Xem bộ sưu tập mèo chuẩn OwO.\n• `!kiemtien` | `!kt`: Rút xu mèo tích lũy.\n• `!choan <STT>`: Cho mèo ăn tăng XP/Level.' },
                    { name: '🌱 **Nông Trại & Tiệm Đồ**', value: '• `!trong <loại> <số_lượng>`: Trồng cây.\n• `!thuhoach` | `!th`: Thu hoạch nông sản.\n• `!shop` | `!s`: Cửa hàng & số dư.\n• `!tui` | `!t`: Xem hành trang.' }
                )
                .setFooter({ text: 'Chúc bạn có những phút giây thư giãn cùng Miêu Nha!', iconURL: message.author.displayAvatarURL() });

            return message.channel.send({ 
                content: `Chúc bạn chơi game vui vẻ! <:515cfc9ff17fb27363d5bbe71007fb5d:1551954032569098320>`, 
                embeds: [embed] 
            });
        }

        // 📍 NHIỆM VỤ (!quest)
        if (command === 'quest' || command === 'nv') {
            const user = await getUser(message.author.id);
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            const now = Date.now();
            const nextReset = user.questResetAt + (12 * 60 * 60 * 1000);
            const diffMs = Math.max(0, nextReset - now);
            const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
            const minsLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

            let questText = '';
            user.quests.forEach((q, idx) => {
                const status = q.claimed ? '✅ Đã nhận' : (q.progress >= q.target ? '🎁 Sẵn sàng nhận (!nhannv)' : `${q.progress}/${q.target}`);
                questText += `**${idx + 1}. ${q.desc}**\n Tiến độ: \`${status}\` | Thưởng: **${q.reward} xu**\n\n`;
            });

            const embed = new EmbedBuilder()
                .setTitle(`📜 Nhiệm Vụ Hàng Ngày Của ${message.author.username}`)
                .setDescription(questText)
                .setFooter({ text: `Làm mới sau: ${hoursLeft} giờ ${minsLeft} phút. Lệnh nhận thưởng: !nhannv` })
                .setColor(0xFFD700);

            return message.channel.send({ embeds: [embed] });
        }

        // 📍 NHẬN THƯỞNG NHIỆM VỤ (!nhannv)
        if (command === 'nhannv') {
            const user = await getUser(message.author.id);
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            let totalReward = 0;
            user.quests.forEach(q => {
                if (!q.claimed && q.progress >= q.target) {
                    q.claimed = true;
                    totalReward += q.reward;
                }
            });

            if (totalReward === 0) return message.reply('❌ Bạn chưa hoàn thành hoặc đã nhận hết phần thưởng!');

            user.coins += totalReward;
            user.markModified('quests');
            await user.save();

            return message.reply(`🎉 Bạn đã nhận thành công **${totalReward} xu** thưởng nhiệm vụ!`);
        }

        // 📍 TÚI ĐỒ (!tui)
        if (command === 'tui' || command === 't') {
            const user = await getUser(message.author.id);
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            const catList = user.cats.length > 0 
                ? user.cats.map((c, i) => `**${i + 1}.** ${c.name} (Lv.${c.level || 1} - ${c.xp || 0}/${getRequiredXP(c.level || 1)} XP)`).join('\n') 
                : 'Chưa có con mèo nào.';

            let invText = '';
            for (const [item, count] of Object.entries(user.inventory)) {
                if (count > 0) invText += `• ${item}: **${count}**\n`;
            }
            if (!invText) invText = 'Túi đồ trống.';

            const readyPlots = user.plots.filter(p => Date.now() >= p.harvestAt).length;
            const growingPlots = user.plots.length - readyPlots;

            const embed = new EmbedBuilder()
                .setTitle(`🎒 Hành Trang Của ${message.author.username}`)
                .setColor(0xD2B48C)
                .addFields(
                    { name: '💰 Ví tiền', value: `${user.coins} xu` },
                    { name: '🌱 Đất trồng', value: `Tổng: **${user.plots.length}/${user.maxPlots}** ô (Chín: ${readyPlots}, Đang lớn: ${growingPlots})` },
                    { name: '📦 Vật phẩm', value: invText },
                    { name: '🐾 Ổ Mèo', value: catList }
                );

            return message.channel.send({ embeds: [embed] });
        }

        // 📍 CỬA HÀNG (!shop)
        if (command === 'shop' || command === 's') {
            const user = await getUser(message.author.id);
            const userCoins = user ? user.coins : 0;

            const embed = new EmbedBuilder()
                .setTitle('🏪 Tiệm Tạp Hóa Cây & Mèo')
                .setDescription(`💰 **Số tiền hiện có của bạn:** \`${userCoins} xu\`\n\nDùng lệnh \`!mua <tên_món> [số_lượng]\` để mua:`)
                .setColor(0x98FB98)
                .addFields(
                    { name: '🌱 Hạt Giống', value: '• `hatgiong_lua`: 10 xu\n• `hatgiong_tra`: 25 xu\n• `hatgiong_mia`: 45 xu\n• `hatgiong_caphe`: 70 xu\n• `hatgiong_tre`: 120 xu' },
                    { name: '🐟 Thức Ăn', value: '• `thucan`: 30 xu (+15 XP cho mèo)' }
                );

            return message.channel.send({ embeds: [embed] });
        }

        // 📍 MUA ĐỒ (!mua)
        if (command === 'mua') {
            const user = await getUser(message.author.id);
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            const item = args[0]?.toLowerCase();
            const quantity = parseInt(args[1]) || 1;

            if (!item || quantity <= 0 || isNaN(quantity)) return message.reply('❌ Cú pháp: `!mua <tên_món> <số_lượng>`');

            const prices = {
                hatgiong_lua: 10, hatgiong_tra: 25, hatgiong_mia: 45, hatgiong_caphe: 70, hatgiong_tre: 120, thucan: 30
            };

            if (!prices[item]) return message.reply('❌ Vật phẩm không có trong cửa hàng!');

            const total = prices[item] * quantity;
            if (user.coins < total) return message.reply(`❌ Bạn không đủ tiền! Cần **${total} xu**.`);

            user.coins -= total;
            user.inventory[item] = (user.inventory[item] || 0) + quantity;
            user.markModified('inventory');
            await user.save();

            return message.reply(`🛒 Bạn đã mua thành công **${quantity}x ${item}** với giá **${total} xu**!`);
        }

        // 📍 TRỒNG CÂY (!trong)
        if (command === 'trong' || command === 'tr') {
            const user = await getUser(message.author.id);
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            const plantKey = args[0]?.toLowerCase();
            const count = parseInt(args[1]) || 1;

            if (!PLANTS[plantKey]) return message.reply('❌ Loại cây không hợp lệ! Gồm: `lua`, `tra`, `mia`, `caphe`, `tre`.');

            const plant = PLANTS[plantKey];
            const currentSeed = user.inventory[plant.seedItem] || 0;

            if (currentSeed < count) return message.reply(`❌ Bạn không có đủ **${count}x ${plant.seedItem}**.`);

            const emptyPlots = user.maxPlots - user.plots.length;
            if (emptyPlots < count) return message.reply(`❌ Bạn chỉ còn **${emptyPlots}** ô đất trống!`);

            user.inventory[plant.seedItem] -= count;
            const now = Date.now();

            for (let i = 0; i < count; i++) {
                user.plots.push({ plantKey, plantedAt: now, harvestAt: now + plant.timeMs });
            }

            updateQuestProgress(user, 'plant', count);
            user.markModified('inventory');
            user.markModified('plots');
            await user.save();

            return message.reply(`🌱 Đã trồng **${count}x ${plant.name}**! Gõ \`!thuhoach\` khi cây chín.`);
        }

        // 📍 THU HOẠCH (!thuhoach)
        if (command === 'thuhoach' || command === 'th') {
            const user = await getUser(message.author.id);
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            if (user.plots.length === 0) return message.reply('🌱 Bạn chưa trồng cây nào!');

            const now = Date.now();
            const readyPlots = user.plots.filter(p => now >= p.harvestAt);

            if (readyPlots.length === 0) return message.reply('⏳ Chưa có cây nào chín để thu hoạch!');

            const harvestedSummary = {};
            readyPlots.forEach(p => {
                const cropItem = PLANTS[p.plantKey].cropItem;
                harvestedSummary[cropItem] = (harvestedSummary[cropItem] || 0) + 1;
                user.inventory[cropItem] = (user.inventory[cropItem] || 0) + 1;
            });

            user.plots = user.plots.filter(p => now < p.harvestAt);

            user.markModified('inventory');
            user.markModified('plots');
            await user.save();

            let resultMsg = '🌾 **Đã thu hoạch thành công:**\n';
            for (const [crop, count] of Object.entries(harvestedSummary)) {
                resultMsg += `• **${count}x** ${crop}\n`;
            }

            return message.reply(resultMsg);
        }

        // 📍 BÁN NÔNG SẢN (!ban)
        if (command === 'ban' || command === 'b') {
            const user = await getUser(message.author.id);
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            const item = args[0]?.toLowerCase();
            const quantity = parseInt(args[1]) || 1;

            if (!item || quantity <= 0) return message.reply('❌ Cú pháp: `!ban <tên_món> <số_lượng>`');

            const sellPrices = {
                lua: 18, la_tra: 45, cay_mia: 80, hat_caphe: 130, than_tre: 220,
                tradao: 600, caphesua: 400, nuocmia: 250
            };

            if (!sellPrices[item]) return message.reply('❌ Món này không bán được!');

            const userHas = user.inventory[item] || 0;
            if (userHas < quantity) return message.reply(`❌ Bạn chỉ có **${userHas}x ${item}**.`);

            const earnings = sellPrices[item] * quantity;
            user.inventory[item] -= quantity;
            user.coins += earnings;

            user.markModified('inventory');
            await user.save();

            return message.reply(`💰 Bạn đã bán **${quantity}x ${item}** thu về **${earnings} xu**!`);
        }

        // 📍 RÚT TIỀN MÈO TÍCH TỦY (!kiemtien / !kt)
        if (command === 'kiemtien' || command === 'kt') {
            const user = await getUser(message.author.id);
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            if (user.cats.length === 0) return message.reply('😿 Bạn chưa có mèo trong chuồng!');

            const now = Date.now();
            const timePassedSec = Math.floor((now - user.lastClaimCatCoins) / 1000);

            if (timePassedSec < 10) return message.reply('⏰ Đàn mèo chưa tích lũy đủ xu, quay lại sau ít giây nữa!');

            const maxRates = { 'Thường': 0, 'Hiếm': 0, 'Cực Hiếm': 0, 'Huyền Thoại': 0, 'Sử Thi': 0, 'Limited': 0 };

            user.cats.forEach(c => {
                const catDef = CAT_TYPES.find(ct => c.name.includes(ct.name) || ct.name.includes(c.name)) || CAT_TYPES[0];
                if (catDef.incomePerSec > maxRates[catDef.rarity]) {
                    maxRates[catDef.rarity] = catDef.incomePerSec;
                }
            });

            const totalIncomePerSec = Object.values(maxRates).reduce((a, b) => a + b, 0);
            const totalEarned = Math.floor(timePassedSec * totalIncomePerSec);

            if (totalEarned <= 0) return message.reply('🪙 Đàn mèo chưa tích lũy đủ xu!');

            user.coins += totalEarned;
            user.lastClaimCatCoins = now;
            await user.save();

            return message.reply(`🐾 Đàn mèo đã chăm chỉ tích lũy! Bạn rút được **${totalEarned} xu** trong chuồng!`);
        }

        // 📍 CHO MÈO ĂN TĂNG XP & LEVEL (!choan)
        if (command === 'choan') {
            const user = await getUser(message.author.id);
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            if (user.cats.length === 0) return message.reply('😿 Bạn chưa có mèo!');

            const foodCount = user.inventory.thucan || 0;
            if (foodCount <= 0) return message.reply('🐟 Bạn hết thức ăn rồi! Vào `!shop` để mua thêm.');

            const index = parseInt(args[0]) - 1;
            if (isNaN(index) || index < 0 || index >= user.cats.length) return message.reply('❌ Hãy nhập STT mèo hợp lệ!');

            user.inventory.thucan -= 1;
            const targetCat = user.cats[index];
            targetCat.level = targetCat.level || 1;
            targetCat.xp = (targetCat.xp || 0) + 15;

            let reqXP = getRequiredXP(targetCat.level);
            let leveledUp = false;

            while (targetCat.xp >= reqXP) {
                targetCat.xp -= reqXP;
                targetCat.level += 1;
                leveledUp = true;
                reqXP = getRequiredXP(targetCat.level);
            }

            user.markModified('inventory');
            user.markModified('cats');
            await user.save();

            if (leveledUp) {
                return message.reply(`🎉 Bạn đã cho **${targetCat.name}** ăn! Mèo vừa **LÊN LEVEL ${targetCat.level}**! ✨`);
            } else {
                return message.reply(`🐟 Bạn đã cho **${targetCat.name}** ăn! (+15 XP, Hiện tại: ${targetCat.xp}/${reqXP} XP)`);
            }
        }

        // 📍 PHA CHẾ UỐNG (!phache / !pha)
        if (command === 'phache' || command === 'pha') {
            const user = await getUser(message.author.id);
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            const drinkKey = args[0]?.toLowerCase();
            if (!RECIPES[drinkKey]) return message.reply('❌ Món uống không hợp lệ! Gồm: `tradao`, `caphesua`, `nuocmia`');

            const recipe = RECIPES[drinkKey];

            for (const [ing, reqCount] of Object.entries(recipe.ingredients)) {
                if ((user.inventory[ing] || 0) < reqCount) {
                    return message.reply(`❌ Bạn thiếu nguyên liệu! Cần **${reqCount}x ${ing}**.`);
                }
            }

            for (const [ing, reqCount] of Object.entries(recipe.ingredients)) {
                user.inventory[ing] -= reqCount;
            }

            user.inventory[drinkKey] = (user.inventory[drinkKey] || 0) + 1;
            updateQuestProgress(user, 'brew', 1);

            user.markModified('inventory');
            await user.save();

            return message.reply(`🍵 Đã pha thành công **${recipe.name}**! Bạn có thể dùng \`!ban ${drinkKey}\` để bán với giá **${recipe.price} xu**.`);
        }

        // 📍 ĐIỂM DANH (!diemdanh)
        if (command === 'diemdanh' || command === 'dd') {
            const user = await getUser(message.author.id);
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            const now = Date.now();
            const cooldown = 24 * 60 * 60 * 1000;

            if (now - user.lastDiemDanh < cooldown) {
                const timeLeft = cooldown - (now - user.lastDiemDanh);
                const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                return message.reply(`⏰ Bạn đã điểm danh rồi! Quay lại sau **${hoursLeft}h ${minutesLeft}m**.`);
            }

            user.lastDiemDanh = now;
            const reward = Math.floor(Math.random() * 31) + 50;
            user.coins += reward;
            await user.save();

            return message.channel.send(`🍵 ${message.author} thưởng trà sáng và nhận **${reward} xu**!`);
        }

        // 📍 CÀI KÊNH MÈO LANG THANG
        if (command === 'setchannel') {
            if (!message.guild || !message.member?.permissions?.has('Administrator')) {
                return message.reply('❌ Cần quyền Administrator!');
            }
            await Config.findOneAndUpdate({ key: 'spawn_channel' }, { value: message.channel.id }, { upsert: true, new: true });
            return message.channel.send(`🍵 Đã lưu kênh ${message.channel} làm nơi mèo ghé thăm!`);
        }

    } catch (err) {
        console.error('❌ Lỗi thực thi lệnh:', err);
        message.reply('⚠️ Có lỗi xảy ra, vui lòng thử lại sau!').catch(() => {});
    }
});

// 4. KẾT NỐI DATABASE VÀ KHỞI CHẠY BOT
const mongoURI = process.env.MONGODB_URI;
if (mongoURI) {
    mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
        console.log('✅ Đã kết nối thành công với cơ sở dữ liệu MongoDB!');
        client.login(process.env.DISCORD_TOKEN);
    })
    .catch(err => {
        console.error('❌ Lỗi kết nối MongoDB:', err);
    });
} else {
    console.warn('⚠️ Chưa cấu hình MONGODB_URI!');
}