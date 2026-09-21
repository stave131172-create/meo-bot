import http from 'http';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// 1. Tạo Web Server giữ Render luôn hoạt động
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => res.end('Bot Meo va Tra is running!')).listen(PORT, () => {
    console.log(`🌐 Web server đang lắng nghe tại port ${PORT}`);
});

dotenv.config();

// 2. KẾT NỐI MONGODB
const mongoURI = process.env.MONGODB_URI;
if (mongoURI) {
    mongoose.connect(mongoURI)
        .then(() => console.log('✅ Đã kết nối thành công với cơ sở dữ liệu MongoDB!'))
        .catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));
} else {	
    console.warn('⚠️ Chưa cấu hình MONGODB_URI trong biến môi trường!');
}

// Định nghĩa khung dữ liệu Người dùng (User Schema)
const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    coins: { type: Number, default: 100 },
    cats: { type: Array, default: [] },
    inventory: { type: Object, default: { hatgiong_tra: 2, thucan: 2 } }, // Chuẩn hóa thucan
    maxPlots: { type: Number, default: 5 },
    plotsUsed: { type: Number, default: 0 },
    unlockedRecipes: { type: Array, default: [] },
    lastDiemDanh: { type: Number, default: 0 },
    lastKiemTienPet: { type: Number, default: 0 }
});

// Định nghĩa khung dữ liệu Cấu hình Bot
const configSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: String, default: null }
});

const User = mongoose.model('User', userSchema);
const Config = mongoose.model('Config', configSchema);

// Hàm lấy dữ liệu User
async function getUser(userId) {
    let user = await User.findOne({ userId });
    if (!user) {
        user = new User({ userId });
        await user.save();
    }
    if (!user.inventory) user.inventory = {};
    return user;
}

// 3. CẤU HÌNH BOT DISCORD
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

const PREFIX = '!';
let currentWildCat = null;

const CAT_TYPES = [
    { name: 'Mèo Béo Phơi Nắng 🐱', rarity: 'Thường', rate: 30, image: 'https://i.pinimg.com/736x/09/04/14/0904144cabdfd4e01784bf064d56d290.jpg' },
    { name: 'Mèo Ta 🐾', rarity: 'Thường', rate: 25, image: 'https://i.pinimg.com/736x/ce/04/8c/ce048c234c179b17841811151df5259c.jpg' },
    { name: 'Mèo Trà Xanh 🍵', rarity: 'Hiếm', rate: 15, image: 'https://i.pinimg.com/736x/a2/06/ad/a206ad186aed59dff16bbce4bdff424b.jpg' },
    { name: 'Mèo Anh Lông Ngắn 🐱', rarity: 'Hiếm', rate: 12, image: 'https://i.pinimg.com/736x/47/98/2b/47982b1d70bac5ce044ead6bc1e18fe2.jpg' },
    { name: 'Mèo Lofi Nghe Nhạc 🎧', rarity: 'Cực Hiếm', rate: 10, image: 'https://i.pinimg.com/736x/b3/12/89/b3128925bda713b4303f89b9c2d62744.jpg' },
    { name: 'Mèo Anh Lông Dài 🦁', rarity: 'Cực Hiếm', rate: 5, image: 'https://i.pinimg.com/736x/0e/09/90/0e09907cf9dccf5e15816bcc01f308dd.jpg' },
    { name: 'Mèo Hoàng Gia ✨', rarity: 'Huyền Thoại', rate: 3, image: 'https://i.pinimg.com/736x/ce/04/8c/ce048c234c179b17841811151df5259c.jpg' },
];

const PLANTS = {
    tra: { name: 'Cây Trà', seedItem: 'hatgiong_tra', cropItem: 'la_tra', cropName: 'Lá Trà', timeMs: 30000 },
    caphe: { name: 'Cây Cà Phê', seedItem: 'hatgiong_caphe', cropItem: 'hat_caphe', cropName: 'Hạt Cà Phê', timeMs: 45000 },
    lua: { name: 'Cây Lúa', seedItem: 'hatgiong_lua', cropItem: 'lua', cropName: 'Lúa', timeMs: 20000 },
    tre: { name: 'Cây Tre', seedItem: 'hatgiong_tre', cropItem: 'than_tre', cropName: 'Thân Tre', timeMs: 60000 },
    mia: { name: 'Cây Mía', seedItem: 'hatgiong_mia', cropItem: 'cay_mia', cropName: 'Cây Mía', timeMs: 40000 },
};

const ITEMS_SELL_PRICE = {
    la_tra: 35, hat_caphe: 55, lua: 18, than_tre: 95, cay_mia: 45,
    coc_tra: 180, coc_caphe: 280, coc_nuocmia: 220, tra_dao: 500
};

client.once('ready', () => {
    console.log(`✅ Bot chill Node.js ${client.user.tag} đã sẵn sàng!`);
    client.user.setActivity('Uống trà & chăm mèo 🍵');
    setInterval(spawnCatTask, 5 * 60 * 1000); // 5 phút xuất hiện 1 lần
});

// Hàm Spawn mèo lang thang
async function spawnCatTask() {
    try {
        if (mongoose.connection.readyState !== 1) return;

        const channelConfig = await Config.findOne({ key: 'spawn_channel' });
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
        console.error('Lỗi khi spawn mèo:', err);
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

        // 📍 Lệnh Bắt Mèo
        if (command === 'cat' || command === 'meo') {
            if (currentWildCat) {
                const catCaught = currentWildCat;
                currentWildCat = null;
                const user = await getUser(message.author.id);
                
                user.cats.push({ name: catCaught.name, level: 1 });
                user.markModified('cats');
                await user.save();

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

        // 📍 Lệnh Help
        if (command === 'help' || command === 'h') {
            const embed = new EmbedBuilder()
                .setTitle('🍵 Hướng Dẫn Sử Dụng Bot Mèo Và Trà')
                .setDescription('Dữ liệu của bạn được lưu trữ an toàn vĩnh viễn trên MongoDB!')
                .setColor(0x98FB98)
                .addFields(
                    { name: '⚙️ **Cấu hình (Admin)**', value: '• `!setchannel`: Cài đặt kênh xuất hiện mèo lang thang.' },
                    { name: '🐾 **Hệ Thống Mèo**', value: '• `!cat` | `!meo`: Bắt mèo lang thang xuất hiện.\n• `!choan <STT>` | `!ca <STT>`: Cho mèo ăn tăng level.\n• `!kiemtien` | `!kt`: Nhận xu thưởng từ đàn mèo (1h/lần).' },
                    { name: '🌱 **Nông Trại & Trồng Cây**', value: '• `!trong <loại> <số_lượng>` | `!tr`: Trồng cây (tra, caphe, lua, tre, mia).\n• `!muadat`: Mua thêm 1 ô đất (200 xu).\n• `!phache <loại>` | `!pha`: Pha nước uống từ nông sản.' },
                    { name: '🏪 **Cửa Hàng, Mua & Bán**', value: '• `!shop` | `!s`: Xem cửa hàng.\n• `!mua <tên> [số_lượng]`: Mua vật phẩm.\n• `!ban <tên_món> <số_lượng>` | `!b`: Bán nông sản/nước uống.\n• `!tui` | `!t`: Xem túi đồ và ổ mèo.\n• `!diemdanh` | `!dd`: Điểm danh nhận xu hàng ngày.' }
                );

            return message.channel.send({ embeds: [embed] });
        }

        // 📍 Lệnh Cài Đặt Kênh Spawn (Đã sửa an toàn quyền Admin)
        if (command === 'setchannel') {
            if (!message.guild || !message.member?.permissions?.has('Administrator')) {
                return message.reply('❌ Bạn cần quyền Administrator trong Server để dùng lệnh này!');
            }
            await Config.findOneAndUpdate(
                { key: 'spawn_channel' },
                { value: message.channel.id },
                { upsert: true, new: true }
            );
            return message.channel.send(`🍵 Đã lưu kênh ${message.channel} làm nơi mèo ghé thăm cố định!`);
        }

        // 📍 Lệnh Điểm Danh
        if (command === 'diemdanh' || command === 'dd') {
            const user = await getUser(message.author.id);
            const now = Date.now();
            const cooldown = 24 * 60 * 60 * 1000;

            if (now - user.lastDiemDanh < cooldown) {
                const timeLeft = cooldown - (now - user.lastDiemDanh);
                const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                return message.reply(`⏰ Bạn đã điểm danh rồi! Quay lại sau **${hoursLeft} giờ ${minutesLeft} phút**.`);
            }

            user.lastDiemDanh = now;
            const reward = Math.floor(Math.random() * 51) + 50;
            user.coins += reward;
            await user.save();

            return message.channel.send(`🍵 ${message.author} vừa thưởng trà và nhận được **${reward} xu**!`);
        }

        // 📍 Lệnh Kiếm Tiền Từ Mèo
        if (command === 'kiemtien' || command === 'kt') {
            const user = await getUser(message.author.id);
            if (!user.cats || user.cats.length === 0) return message.reply('😿 Bạn chưa nuôi con mèo nào!');

            const now = Date.now();
            const cooldown = 60 * 60 * 1000;

            if (now - user.lastKiemTienPet < cooldown) {
                const timeLeft = cooldown - (now - user.lastKiemTienPet);
                const minutesLeft = Math.floor(timeLeft / (1000 * 60));
                return message.reply(`⏰ Đàn mèo đang ngủ! Quay lại sau **${minutesLeft} phút**.`);
            }

            const totalLevel = user.cats.reduce((sum, cat) => sum + (cat.level || 1), 0);
            const earnedCoins = totalLevel * 15;

            user.lastKiemTienPet = now;
            user.coins += earnedCoins;
            await user.save();

            return message.channel.send(`🐾 Đàn mèo của ${message.author} đi dạo và mang về **${earnedCoins} xu**!`);
        }

        // 📍 Lệnh Trồng Cây
        if (command === 'trong' || command === 'tr') {
            const user = await getUser(message.author.id);
            const plantKey = args[0]?.toLowerCase();
            const quantity = parseInt(args[1]) || 1;

            if (!plantKey || !PLANTS[plantKey]) return message.reply('🌱 Cây không hợp lệ (`tra`, `caphe`, `lua`, `tre`, `mia`).');
            if (quantity <= 0 || isNaN(quantity)) return message.reply('❌ Số lượng phải lớn hơn 0!');

            const plantInfo = PLANTS[plantKey];
            const currentSeedCount = user.inventory[plantInfo.seedItem] || 0;

            if (currentSeedCount < quantity) {
                return message.reply(`❌ Bạn không đủ hạt giống! Cần **${quantity}** ${plantInfo.seedItem}.`);
            }

            const availablePlots = user.maxPlots - user.plotsUsed;
            if (availablePlots < quantity) {
                return message.reply(`❌ Vườn không đủ chỗ! Còn **${availablePlots} ô đất trống**.`);
            }

            user.inventory[plantInfo.seedItem] -= quantity;
            user.plotsUsed += quantity;
            user.markModified('inventory');
            await user.save();

            await message.channel.send(`🌱 ${message.author} đã gieo **${quantity} ${plantInfo.name}**! Đợi **${plantInfo.timeMs / 1000} giây**...`);

            setTimeout(async () => {
                try {
                    const u = await getUser(message.author.id);
                    u.plotsUsed = Math.max(0, u.plotsUsed - quantity);
                    if (!u.inventory[plantInfo.cropItem]) u.inventory[plantInfo.cropItem] = 0;
                    u.inventory[plantInfo.cropItem] += quantity;
                    u.markModified('inventory');
                    await u.save();

                    message.channel.send(`🍃 ${message.author} ơi! **${quantity} ${plantInfo.name}** đã chín! Đã thu hoạch vào túi.`);
                } catch (e) {
                    console.error('Lỗi thu hoạch:', e);
                }
            }, plantInfo.timeMs);
        }

        // 📍 Lệnh Mua Đất
        if (command === 'muadat') {
            const user = await getUser(message.author.id);
            if (user.coins < 200) return message.reply(`❌ Cần **200 xu** để mua thêm 1 ô đất!`);

            user.coins -= 200;
            user.maxPlots += 1;
            await user.save();
            return message.reply(`🏡 Bạn đã mở rộng vườn thành **${user.maxPlots} ô đất**!`);
        }

        // 📍 Lệnh Pha Chế
        if (command === 'phache' || command === 'pha') {
            const user = await getUser(message.author.id);
            const recipe = args[0]?.toLowerCase();

            if (!recipe) return message.reply('🍵 Nhập món muốn pha: `tra`, `caphe`, `nuocmia`, `tradao`.');

            let reqItem = '', reqAmount = 10, resultItem = '', resultName = '';

            if (recipe === 'tra') { reqItem = 'la_tra'; resultItem = 'coc_tra'; resultName = 'Cốc Trà Xanh'; }
            else if (recipe === 'caphe') { reqItem = 'hat_caphe'; resultItem = 'coc_caphe'; resultName = 'Cốc Cà Phê'; }
            else if (recipe === 'nuocmia') { reqItem = 'cay_mia'; resultItem = 'coc_nuocmia'; resultName = 'Cốc Nước Mía'; }
            else if (recipe === 'tradao') {
                if (!user.unlockedRecipes.includes('tradao')) return message.reply('🔒 Bạn chưa mua công thức Trà Đào trong `!shop`!');
                reqItem = 'la_tra'; resultItem = 'tra_dao'; resultName = 'Trà Đào Cam Sả';
            } else return message.reply('❌ Món pha chế không hợp lệ!');

            const currentHave = user.inventory[reqItem] || 0;
            if (currentHave < reqAmount) return message.reply(`❌ Cần **${reqAmount} ${reqItem}** (Hiện có: ${currentHave}).`);

            user.inventory[reqItem] -= reqAmount;
            user.markModified('inventory');
            await user.save();

            await message.channel.send(`🍵 ${message.author} đang pha **${resultName}**... Vui lòng đợi **1 phút**!`);

            setTimeout(async () => {
                try {
                    const u = await getUser(message.author.id);
                    if (!u.inventory[resultItem]) u.inventory[resultItem] = 0;
                    u.inventory[resultItem] += 1;
                    u.markModified('inventory');
                    await u.save();

                    message.channel.send(`✨ **Pha chế thành công!** ${message.author} nhận được **1 ${resultName}**!`);
                } catch (e) {
                    console.error('Lỗi pha chế:', e);
                }
            }, 60000);
        }

        // 📍 Lệnh Bán Đồ
        if (command === 'ban' || command === 'b') {
            const user = await getUser(message.author.id);
            const itemKey = args[0]?.toLowerCase();
            const quantity = parseInt(args[1]) || 1;

            if (!itemKey || !ITEMS_SELL_PRICE[itemKey]) return message.reply('❌ Tên món không hợp lệ!');

            const currentCount = user.inventory[itemKey] || 0;
            if (currentCount < quantity) return message.reply(`❌ Không đủ **${itemKey}** để bán (Có: ${currentCount}).`);

            const totalPrice = ITEMS_SELL_PRICE[itemKey] * quantity;
            user.inventory[itemKey] -= quantity;
            user.coins += totalPrice;
            user.markModified('inventory');
            await user.save();

            return message.reply(`💰 Bạn đã bán **${quantity} ${itemKey}** thu về **${totalPrice} xu**!`);
        }

        // 📍 Lệnh Xem Túi Đồ
        if (command === 'tui' || command === 't') {
            const user = await getUser(message.author.id);
            const catList = (user.cats && user.cats.length > 0) 
                ? user.cats.map((c, i) => `**${i + 1}.** ${c.name} (Lv.${c.level || 1})`).join('\n') 
                : 'Chưa có con mèo nào.';

            let invText = '';
            if (user.inventory) {
                for (const [item, count] of Object.entries(user.inventory)) {
                    if (count > 0) invText += `• ${item}: **${count}**\n`;
                }
            }
            if (!invText) invText = 'Túi đồ trống.';

            const embed = new EmbedBuilder()
                .setTitle(`🎒 Hành Trang Của ${message.author.username}`)
                .setColor(0xD2B48C)
                .addFields(
                    { name: '💰 Tiền xu', value: `${user.coins} xu` },
                    { name: '🏡 Ô đất trồng cây', value: `${user.plotsUsed}/${user.maxPlots} ô` },
                    { name: '📦 Vật phẩm & Nông sản', value: invText },
                    { name: '🐾 Ổ Mèo', value: catList }
                );

            return message.channel.send({ embeds: [embed] });
        }

        // 📍 Lệnh Cho Mèo Ăn (Đã sửa dùng 'thucan')
        if (command === 'choan' || command === 'ca') {
            const user = await getUser(message.author.id);
            if (!user.cats || user.cats.length === 0) return message.reply('😿 Bạn chưa có con mèo nào!');
            
            const foodCount = user.inventory.thucan || user.inventory.thucAn || 0;
            if (foodCount <= 0) return message.reply('🐟 Hết thức ăn! Vào `!shop` để mua.');

            const index = parseInt(args[0]) - 1;
            if (isNaN(index) || index < 0 || index >= user.cats.length) return message.reply('❌ STT mèo không hợp lệ!');

            if (user.inventory.thucan) user.inventory.thucan -= 1;
            else if (user.inventory.thucAn) user.inventory.thucAn -= 1;

            user.cats[index].level = (user.cats[index].level || 1) + 1;
            user.markModified('inventory');
            user.markModified('cats');
            await user.save();

            return message.channel.send(`🐟 Bạn đã cho **${user.cats[index].name}** ăn! Lên **Level ${user.cats[index].level}**!`);
        }

        // 📍 Lệnh Cửa Hàng
        if (command === 'shop' || command === 's') {
            const embed = new EmbedBuilder()
                .setTitle('🏪 Tiệm Tạp Hóa Cây & Mèo')
                .setDescription('Dùng `!mua <tên_món> [số_lượng]` để mua:')
                .setColor(0x98FB98)
                .addFields(
                    { name: '🌱 Hạt Giống', value: '• `hatgiong_tra`: 20 xu\n• `hatgiong_caphe`: 30 xu\n• `hatgiong_lua`: 10 xu\n• `hatgiong_tre`: 50 xu\n• `hatgiong_mia`: 25 xu' },
                    { name: '🐟 Thức Ăn', value: '• `thucan`: 40 xu/đĩa' },
                    { name: '📜 Công Thức', value: '• `congthuc_tradao`: 300 xu' }
                );

            return message.channel.send({ embeds: [embed] });
        }

        // 📍 Lệnh Mua Đồ
        if (command === 'mua') {
            const user = await getUser(message.author.id);
            const item = args[0]?.toLowerCase();
            const quantity = parseInt(args[1]) || 1;

            if (!item) return message.reply('❌ Nhập tên món đồ muốn mua!');
            if (quantity <= 0 || isNaN(quantity)) return message.reply('❌ Số lượng mua không hợp lệ!');

            const seedPrices = { hatgiong_tra: 20, hatgiong_caphe: 30, hatgiong_lua: 10, hatgiong_tre: 50, hatgiong_mia: 25, thucan: 40 };

            if (seedPrices[item]) {
                const totalPrice = seedPrices[item] * quantity;
                if (user.coins < totalPrice) return message.reply(`❌ Bạn cần **${totalPrice} xu**.`);
                user.coins -= totalPrice;
                if (!user.inventory[item]) user.inventory[item] = 0;
                user.inventory[item] += quantity;
                user.markModified('inventory');
                await user.save();
                return message.reply(`🛒 Đã mua thành công **${quantity} ${item}**!`);
            } else if (item === 'congthuc_tradao') {
                if (user.unlockedRecipes.includes('tradao')) return message.reply('📜 Bạn đã mua công thức này rồi!');
                if (user.coins < 300) return message.reply('❌ Cần 300 xu!');

                user.coins -= 300;
                user.unlockedRecipes.push('tradao');
                user.markModified('unlockedRecipes');
                await user.save();
                return message.reply('🎉 Đã mở khóa thành công **Công Thức Trà Đào Cam Sả**!');
            } else {
                return message.reply('❌ Món đồ không tồn tại!');
            }
        }

    } catch (err) {
        console.error('❌ Lỗi khi thực thi lệnh:', err);
        message.reply('⚠️ Có lỗi xảy ra khi xử lý lệnh, vui lòng thử lại!').catch(() => {});
    }
});

client.login(process.env.DISCORD_TOKEN);