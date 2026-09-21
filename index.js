import http from 'http';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';

// Tạo Web Server để Render giữ service sống
http.createServer((req, res) => res.end('Bot Meo va Tra is running!')).listen(process.env.PORT || 3000);

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

const PREFIX = '!';
let SPAWN_CHANNEL_ID = null;
let currentWildCat = null;
const usersData = new Map();

// Danh sách Mèo (Đã cập nhật ảnh mới & các loại mèo mới)
const CAT_TYPES = [
    { 
        name: 'Mèo Béo Phơi Nắng 🐱', 
        rarity: 'Thường', 
        rate: 30,
        image: 'https://i.pinimg.com/736x/09/04/14/0904144cabdfd4e01784bf064d56d290.jpg' 
    },
    { 
        name: 'Mèo Ta 🐾', 
        rarity: 'Thường', 
        rate: 25,
        image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500' 
    },
    { 
        name: 'Mèo Trà Xanh 🍵', 
        rarity: 'Hiếm', 
        rate: 15,
        image: 'https://i.pinimg.com/736x/a2/06/ad/a206ad186aed59dff16bbce4bdff424b.jpg' 
    },
    { 
        name: 'Mèo Anh Lông Ngắn 🐱', 
        rarity: 'Hiếm', 
        rate: 12,
        image: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=500' 
    },
    { 
        name: 'Mèo Lofi Nghe Nhạc 🎧', 
        rarity: 'Cực Hiếm', 
        rate: 10,
        image: 'https://i.pinimg.com/736x/b3/12/89/b3128925bda713b4303f89b9c2d62744.jpg' 
    },
    { 
        name: 'Mèo Anh Lông Dài 🦁', 
        rarity: 'Cực Hiếm', 
        rate: 5,
        image: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=500' 
    },
    { 
        name: 'Mèo Hoàng Gia ✨', 
        rarity: 'Huyền Thoại', 
        rate: 3,
        image: 'https://i.pinimg.com/736x/ce/04/8c/ce048c234c179b17841811151df5259c.jpg' 
    },
];

// Thông tin các loại cây trồng
const PLANTS = {
    tra: { name: 'Cây Trà', seedItem: 'hatgiong_tra', cropItem: 'la_tra', cropName: 'Lá Trà', timeMs: 30000, seedPrice: 20, sellPrice: 35 },
    caphe: { name: 'Cây Cà Phê', seedItem: 'hatgiong_caphe', cropItem: 'hat_caphe', cropName: 'Hạt Cà Phê', timeMs: 45000, seedPrice: 30, sellPrice: 55 },
    lua: { name: 'Cây Lúa', seedItem: 'hatgiong_lua', cropItem: 'lúa', cropName: 'Lúa', timeMs: 20000, seedPrice: 10, sellPrice: 18 },
    tre: { name: 'Cây Tre', seedItem: 'hatgiong_tre', cropItem: 'than_tre', cropName: 'Thân Tre', timeMs: 60000, seedPrice: 50, sellPrice: 95 },
    mia: { name: 'Cây Mía', seedItem: 'hatgiong_mia', cropItem: 'cay_mia', cropName: 'Cây Mía', timeMs: 40000, seedPrice: 25, sellPrice: 45 },
};

// Thông tin các món đồ bán được
const ITEMS_SELL_PRICE = {
    la_tra: 35,
    hat_caphe: 55,
    lua: 18,
    than_tre: 95,
    cay_mia: 45,
    coc_tra: 180,
    coc_caphe: 280,
    coc_nuocmia: 220,
    tra_dao: 500,
};

function getUser(userId) {
    if (!usersData.has(userId)) {
        usersData.set(userId, {
            coins: 100,
            cats: [],
            inventory: { hatgiong_tra: 2, thucAn: 2 },
            maxPlots: 5,
            plotsUsed: 0,
            unlockedRecipes: [], // Công thức mua trong shop
            lastDiemDanh: 0,
            lastKiemTienPet: 0
        });
    }
    return usersData.get(userId);
}

client.once('ready', () => {
    console.log(`✅ Bot chill Node.js ${client.user.tag} đã sẵn sàng!`);
    client.user.setActivity('Uống trà & chăm mèo 🍵');
    setInterval(spawnCatTask, 5 * 60 * 1000);
});

async function spawnCatTask() {
    if (!SPAWN_CHANNEL_ID) return;
    const channel = await client.channels.fetch(SPAWN_CHANNEL_ID).catch(() => null);
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
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = message.content.trim();
    if (!content.startsWith(PREFIX) && content.toLowerCase() !== 'cat' && content.toLowerCase() !== 'meo') return;

    const args = content.startsWith(PREFIX) ? content.slice(PREFIX.length).trim().split(/ +/) : [content];
    const command = args.shift().toLowerCase();

    // Lệnh Bắt Mèo (!cat / !meo)
    if (command === 'cat' || command === 'meo') {
        if (currentWildCat) {
            const catCaught = currentWildCat;
            currentWildCat = null;
            const user = getUser(message.author.id);
            user.cats.push({ name: catCaught.name, level: 1 });

            const embed = new EmbedBuilder()
                .setTitle('🎉 Bạn đã bắt thành công!')
                .setDescription(`${message.author} đã nhận được **${catCaught.name}** vào ổ mèo!`)
                .setThumbnail(catCaught.image)
                .setColor(0xFFB6C1);

            return message.channel.send({ embeds: [embed] });
        } else {
            const msg = await message.channel.send('🐾 Hiện không có con mèo nào ở đây cả...');
            setTimeout(() => msg.delete().catch(() => {}), 4000);
            return;
        }
    }

    // Lệnh !help
    if (command === 'help' || command === 'h') {
        const embed = new EmbedBuilder()
            .setTitle('🍵 Hướng Dẫn Sử Dụng Bot Mèo Và Trà')
            .setDescription('Dưới đây là danh sách toàn bộ các lệnh (có hỗ trợ lệnh viết tắt):')
            .setColor(0x98FB98)
            .addFields(
                { 
                    name: '🐾 **Hệ Thống Mèo**', 
                    value: '• `!cat` | `!meo`: Bắt mèo lang thang xuất hiện.\n• `!choan <STT>` | `!ca <STT>`: Cho mèo ăn tăng level.\n• `!kiemtien` | `!kt`: Nhận xu thưởng từ level của đàn mèo (1h/lần).' 
                },
                { 
                    name: '🌱 **Nông Trại & Trồng Cây**', 
                    value: '• `!trong <loại> <số_lượng>` | `!tr`: Trồng cây (tra, caphe, lua, tre, mia).\n• `!muadat`: Mua thêm 1 ô đất trồng cây (200 xu).\n• `!phache <loại>` | `!pha`: Pha nước uống từ nông sản (mất 1 phút).' 
                },
                { 
                    name: '🏪 **Cửa Hàng, Mua & Bán**', 
                    value: '• `!shop` | `!s`: Xem cửa hàng mua hạt giống & công thức.\n• `!mua <tên> [số_lượng]`: Mua vật phẩm.\n• `!ban <tên_món> <số_lượng>` | `!b`: Bán nông sản/nước uống lấy xu.\n• `!tui` | `!t`: Xem hành trang, nông sản và ổ mèo.\n• `!diemdanh` | `!dd`: Điểm danh nhận xu hàng ngày (24h/lần).' 
                },
                { 
                    name: '⚙️ **Quản Lý**', 
                    value: '• `!setchannel`: Đặt kênh hiện tại làm nơi mèo ghé thăm.' 
                }
            );

        return message.channel.send({ embeds: [embed] });
    }

    if (command === 'setchannel') {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ Bạn cần quyền Admin để dùng lệnh này!');
        }
        SPAWN_CHANNEL_ID = message.channel.id;
        return message.channel.send(`🍵 Đã đặt kênh ${message.channel} làm nơi mèo ghé thăm mỗi 5 phút!`);
    }

    // Lệnh điểm danh (!diemdanh / !dd)
    if (command === 'diemdanh' || command === 'dd') {
        const user = getUser(message.author.id);
        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000;

        if (now - user.lastDiemDanh < cooldown) {
            const timeLeft = cooldown - (now - user.lastDiemDanh);
            const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            return message.reply(`⏰ Bạn đã điểm danh hôm nay rồi! Vui lòng quay lại sau **${hoursLeft} giờ ${minutesLeft} phút** nữa.`);
        }

        user.lastDiemDanh = now;
        const reward = Math.floor(Math.random() * 51) + 50;
        user.coins += reward;
        return message.channel.send(`🍵 ${message.author} vừa uống trà và nhận được **${reward} xu**!`);
    }

    // Lệnh kiếm tiền từ pet (!kiemtien / !kt)
    if (command === 'kiemtien' || command === 'kt') {
        const user = getUser(message.author.id);
        if (user.cats.length === 0) {
            return message.reply('😿 Bạn chưa nuôi con mèo nào để kiếm tiền cả!');
        }

        const now = Date.now();
        const cooldown = 60 * 60 * 1000;

        if (now - user.lastKiemTienPet < cooldown) {
            const timeLeft = cooldown - (now - user.lastKiemTienPet);
            const minutesLeft = Math.floor(timeLeft / (1000 * 60));
            const secondsLeft = Math.floor((timeLeft % (1000 * 60)) / 1000);
            return message.reply(`⏰ Các con mèo đang nghỉ ngơi! Quay lại kiếm tiền sau **${minutesLeft} phút ${secondsLeft} giây**.`);
        }

        const totalLevel = user.cats.reduce((sum, cat) => sum + cat.level, 0);
        const earnedCoins = totalLevel * 15;

        user.lastKiemTienPet = now;
        user.coins += earnedCoins;

        return message.channel.send(`🐾 Đàn mèo của ${message.author} (Tổng Level: **${totalLevel}**) vừa làm nũng mang về **${earnedCoins} xu**!`);
    }

    // Lệnh Trồng Cây (!trong / !tr)
    if (command === 'trong' || command === 'tr') {
        const user = getUser(message.author.id);
        const plantKey = args[0]?.toLowerCase();
        const quantity = parseInt(args[1]) || 1;

        if (!plantKey || !PLANTS[plantKey]) {
            return message.reply('🌱 Loại cây không hợp lệ! Các loại cây có thể trồng: `tra`, `caphe`, `lua`, `tre`, `mia`. (Ví dụ: `!trong tra 2`)');
        }

        if (quantity <= 0 || isNaN(quantity)) {
            return message.reply('❌ Số lượng cây trồng phải lớn hơn 0!');
        }

        const plantInfo = PLANTS[plantKey];
        const currentSeedCount = user.inventory[plantInfo.seedItem] || 0;

        if (currentSeedCount < quantity) {
            return message.reply(`❌ Bạn không đủ hạt giống! Cần **${quantity}** ${plantInfo.seedItem} (Hiện có: ${currentSeedCount}). Gõ \`!shop\` để mua.`);
        }

        const availablePlots = user.maxPlots - user.plotsUsed;
        if (availablePlots < quantity) {
            return message.reply(`❌ Vườn không đủ chỗ! Bạn chỉ còn **${availablePlots} ô đất trống** (Đã dùng ${user.plotsUsed}/${user.maxPlots} ô). Gõ \`!muadat\` để mở thêm ô đất.`);
        }

        // Trừ hạt giống & chiếm ô đất
        user.inventory[plantInfo.seedItem] -= quantity;
        user.plotsUsed += quantity;

        const timeInSec = plantInfo.timeMs / 1000;
        await message.channel.send(`🌱 ${message.author} đã gieo **${quantity} ${plantInfo.name}**! Vườn còn ${user.maxPlots - user.plotsUsed} ô trống. Đợi **${timeInSec} giây** để thu hoạch...`);

        setTimeout(() => {
            user.plotsUsed -= quantity;
            if (!user.inventory[plantInfo.cropItem]) user.inventory[plantInfo.cropItem] = 0;
            user.inventory[plantInfo.cropItem] += quantity;

            message.channel.send(`🍃 ${message.author} ơi! **${quantity} ${plantInfo.name}** đã chín! Bạn thu hoạch được **${quantity} ${plantInfo.cropName}** vào túi đồ (Gõ \`!tui\` để xem).`);
        }, plantInfo.timeMs);
    }

    // Lệnh Mua Đất (!muadat)
    if (command === 'muadat') {
        const user = getUser(message.author.id);
        const cost = 200;
        if (user.coins < cost) return message.reply(`❌ Bạn cần **${cost} xu** để mua thêm 1 ô đất! (Hiện có: ${user.coins} xu).`);

        user.coins -= cost;
        user.maxPlots += 1;
        return message.reply(`🏡 Bạn đã mua thêm 1 ô đất! Tối đa hiện tại có thể trồng: **${user.maxPlots} cây cùng lúc**.`);
    }

    // Lệnh Pha Chế (!phache / !pha)
    if (command === 'phache' || command === 'pha') {
        const user = getUser(message.author.id);
        const recipe = args[0]?.toLowerCase();

        if (!recipe) {
            return message.reply('🍵 Nhập món muốn pha! Ví dụ:\n• `!phache tra`: 10 Lá Trà -> 1 Cốc Trà\n• `!phache caphe`: 10 Hạt Cà Phê -> 1 Cốc Cà Phê\n• `!phache nuocmia`: 10 Cây Mía -> 1 Cốc Nước Mía\n• `!phache tradao`: 10 Lá Trà + Công thức Trà Đào -> 1 Trà Đào Cam Sả');
        }

        let reqItem = '';
        let reqAmount = 10;
        let resultItem = '';
        let resultName = '';

        if (recipe === 'tra') {
            reqItem = 'la_tra';
            resultItem = 'coc_tra';
            resultName = 'Cốc Trà Xanh';
        } else if (recipe === 'caphe') {
            reqItem = 'hat_caphe';
            resultItem = 'coc_caphe';
            resultName = 'Cốc Cà Phê';
        } else if (recipe === 'nuocmia') {
            reqItem = 'cay_mia';
            resultItem = 'coc_nuocmia';
            resultName = 'Cốc Nước Mía';
        } else if (recipe === 'tradao') {
            if (!user.unlockedRecipes.includes('tradao')) {
                return message.reply('🔒 Bạn chưa mở khóa công thức **Trà Đào Cam Sả**! Hãy vào `!shop` để mua công thức trước.');
            }
            reqItem = 'la_tra';
            resultItem = 'tra_dao';
            resultName = 'Trà Đào Cam Sả Thượng Hạng';
        } else {
            return message.reply('❌ Món pha chế không hợp lệ!');
        }

        const currentHave = user.inventory[reqItem] || 0;
        if (currentHave < reqAmount) {
            return message.reply(`❌ Bạn cần ít nhất **${reqAmount} ${reqItem}** để pha chế món này (Hiện có: ${currentHave}).`);
        }

        user.inventory[reqItem] -= reqAmount;
        await message.channel.send(`🍵 ${message.author} đang tiến hành pha chế **${resultName}**... Vui lòng đợi **1 phút (60s)**!`);

        setTimeout(() => {
            if (!user.inventory[resultItem]) user.inventory[resultItem] = 0;
            user.inventory[resultItem] += 1;
            message.channel.send(`✨ **Pha chế thành công!** ${message.author} đã nhận được **1 ${resultName}** vào túi đồ! Bán món này được rất nhiều tiền đó!`);
        }, 60000);
    }

    // Lệnh Bán Nông Sản / Nước Uống (!ban / !b)
    if (command === 'ban' || command === 'b') {
        const user = getUser(message.author.id);
        const itemKey = args[0]?.toLowerCase();
        const quantity = parseInt(args[1]) || 1;

        if (!itemKey || !ITEMS_SELL_PRICE[itemKey]) {
            return message.reply('❌ Tên món hàng không hợp lệ! Nhập tên món cần bán (Ví dụ: `!ban la_tra 5`, `!ban coc_tra 1`). Các món bán được: `la_tra`, `hat_caphe`, `lua`, `than_tre`, `cay_mia`, `coc_tra`, `coc_caphe`, `coc_nuocmia`, `tra_dao`.');
        }

        const currentCount = user.inventory[itemKey] || 0;
        if (currentCount < quantity) {
            return message.reply(`❌ Bạn không đủ **${itemKey}** để bán! (Hiện có: ${currentCount}).`);
        }

        const pricePerUnit = ITEMS_SELL_PRICE[itemKey];
        const totalPrice = pricePerUnit * quantity;

        user.inventory[itemKey] -= quantity;
        user.coins += totalPrice;

        return message.reply(`💰 Bạn đã bán **${quantity} ${itemKey}** thu về **${totalPrice} xu**!`);
    }

    // Lệnh Túi Đồ (!tui / !t)
    if (command === 'tui' || command === 't') {
        const user = getUser(message.author.id);
        const catList = user.cats.length > 0 
            ? user.cats.map((c, index) => `**${index + 1}.** ${c.name} (Lv.${c.level})`).join('\n') 
            : 'Chưa có con mèo nào.';

        let invText = '';
        for (const [item, count] of Object.entries(user.inventory)) {
            if (count > 0) invText += `• ${item}: **${count}**\n`;
        }
        if (!invText) invText = 'Túi đồ trống.';

        const embed = new EmbedBuilder()
            .setTitle(`🎒 Hành Trang Của ${message.author.username}`)
            .setColor(0xD2B48C)
            .addFields(
                { name: '💰 Tiền xu', value: `${user.coins} xu` },
                { name: '🏡 Ô đất trồng cây', value: `${user.plotsUsed}/${user.maxPlots} ô (Gõ !muadat để mua thêm)` },
                { name: '📦 Vật phẩm & Nông sản', value: invText },
                { name: '🐾 Ổ Mèo (Dùng !choan <STT> để nuôi)', value: catList }
            );

        return message.channel.send({ embeds: [embed] });
    }

    // Lệnh Cho Mèo Ăn (!choan / !ca)
    if (command === 'choan' || command === 'ca') {
        const user = getUser(message.author.id);
        if (user.cats.length === 0) return message.reply('😿 Bạn chưa có con mèo nào!');
        if ((user.inventory.thucAn || 0) <= 0) return message.reply('🐟 Bạn đã hết thức ăn! Gõ `!shop` để mua.');

        const index = parseInt(args[0]) - 1;

        if (isNaN(index) || index < 0 || index >= user.cats.length) {
            return message.reply(`❌ Vui lòng nhập STT mèo hợp lệ! Ví dụ: \`!choan 1\` (Gõ \`!tui\` để xem danh sách).`);
        }

        user.inventory.thucAn -= 1;
        user.cats[index].level += 1;
        return message.channel.send(`🐟 Bạn đã cho **${user.cats[index].name}** (Số ${index + 1}) ăn! Nó đã tăng lên **Level ${user.cats[index].level}**!`);
    }

    // Lệnh Cửa Hàng (!shop / !s)
    if (command === 'shop' || command === 's') {
        const embed = new EmbedBuilder()
            .setTitle('🏪 Tiệm Tạp Hóa Cây & Mèo')
            .setDescription('Dùng `!mua <tên_món> [số_lượng]` để mua vật phẩm:')
            .setColor(0x98FB98)
            .addFields(
                { name: '🌱 Hạt Giống Cây Trồng', value: '• `hatgiong_tra`: 20 xu\n• `hatgiong_caphe`: 30 xu\n• `hatgiong_lua`: 10 xu\n• `hatgiong_tre`: 50 xu\n• `hatgiong_mia`: 25 xu' },
                { name: '🐟 Thức Ăn Cho Mèo', value: '• `thucan`: 40 xu/đĩa (Dùng `!choan <STT>` để tăng level cho mèo)' },
                { name: '📜 Công Thức Đặc Biệt', value: '• `congthuc_tradao`: 300 xu (Mở khóa pha chế Trà Đào Cam Sả bán 500 xu/cốc)' }
            );

        return message.channel.send({ embeds: [embed] });
    }

    // Lệnh Mua đồ (!mua)
    if (command === 'mua') {
        const user = getUser(message.author.id);
        const item = args[0]?.toLowerCase();
        const quantity = parseInt(args[1]) || 1;

        if (!item) return message.reply('❌ Nhập tên món đồ muốn mua! Gõ `!shop` để xem.');
        if (quantity <= 0 || isNaN(quantity)) return message.reply('❌ Số lượng mua phải lớn hơn 0!');

        const seedPrices = {
            hatgiong_tra: 20,
            hatgiong_caphe: 30,
            hatgiong_lua: 10,
            hatgiong_tre: 50,
            hatgiong_mia: 25,
            thucan: 40
        };

        if (seedPrices[item]) {
            const totalPrice = seedPrices[item] * quantity;
            if (user.coins < totalPrice) {
                return message.reply(`❌ Bạn không đủ xu! Cần **${totalPrice} xu** để mua ${quantity} ${item} (Bạn có ${user.coins} xu).`);
            }
            user.coins -= totalPrice;
            if (!user.inventory[item]) user.inventory[item] = 0;
            user.inventory[item] += quantity;
            return message.reply(`🛒 Bạn đã mua thành công **${quantity} ${item}** với giá **${totalPrice} xu**!`);
        } else if (item === 'congthuc_tradao') {
            if (user.unlockedRecipes.includes('tradao')) return message.reply('📜 Bạn đã mua công thức này rồi!');
            if (user.coins < 300) return message.reply('❌ Bạn cần 300 xu để mua công thức này!');

            user.coins -= 300;
            user.unlockedRecipes.push('tradao');
            return message.reply('🎉 Bạn đã mở khóa thành công **Công Thức Trà Đào Cam Sả**! Dùng `!phache tradao` để pha chế.');
        } else {
            return message.reply('❌ Món đồ không có trong cửa hàng!');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);