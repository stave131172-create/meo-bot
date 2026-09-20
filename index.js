import http from 'http';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';

// Tạo Web Server nhẹ để Render kiểm tra trạng thái sống của Web Service
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

// Danh sách các loài mèo kèm đường link ảnh online
const CAT_TYPES = [
    { 
        name: 'Mèo Béo Phơi Nắng 🐱', 
        rarity: 'Thường', 
        rate: 50,
        image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500' 
    },
    { 
        name: 'Mèo Trà Xanh 🍵', 
        rarity: 'Hiếm', 
        rate: 30,
        image: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=500' 
    },
    { 
        name: 'Mèo Lofi Nghe Nhạc 🎧', 
        rarity: 'Cực Hiếm', 
        rate: 15,
        image: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=500' 
    },
    { 
        name: 'Mèo Hoàng Gia ✨', 
        rarity: 'Huyền Thoại', 
        rate: 5,
        image: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=500' 
    },
];

function getUser(userId) {
    if (!usersData.has(userId)) {
        usersData.set(userId, {
            coins: 100,
            cats: [],
            inventory: { hatGiong: 1, thucAn: 2 },
            lastDiemDanh: 0,
            lastThuHoachPet: 0
        });
    }
    return usersData.get(userId);
}

client.once('ready', () => {
    console.log(`✅ Bot chill Node.js ${client.user.tag} đã sẵn sàng!`);
    client.user.setActivity('Uống trà & chờ mèo 🍵');
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
        .setDescription(`Nó là **${selectedCat.name}** (Độ hiếm: \`${selectedCat.rarity}\`)\n\n👉 Gõ **\`cat\`** hoặc **\`!cat\`** để bắt nó ngay!`)
        .setImage(selectedCat.image)
        .setColor(0x98FB98);

    await channel.send({ embeds: [embed] });
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const content = message.content.trim().toLowerCase();

    if (content === 'cat' || content === '!cat') {
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

    if (!message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Lệnh !help
    if (command === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('🍵 Hướng Dẫn Sử Dụng Bot Mèo Và Trà')
            .setDescription('Chào mừng bạn đến với không gian chill! Dưới đây là danh sách toàn bộ các lệnh:')
            .setColor(0x98FB98)
            .addFields(
                { 
                    name: '🐾 **Hệ Thống Mèo**', 
                    value: '• `cat` hoặc `!cat`: Bắt mèo lang thang vừa xuất hiện.\n• `!choan <STT>`: Cho con mèo thứ STT ăn (Ví dụ: `!choan 1`, `!choan 2`).\n• `!thuhoach`: Nhận xu thưởng từ tổng cấp độ các con mèo bạn nuôi (1 tiếng/lần).' 
                },
                { 
                    name: '🌱 **Nông Trại & Trà**', 
                    value: '• `!diemdanh`: Điểm danh nhận 50 - 100 xu (mỗi 24 giờ 1 lần).\n• `!trongtra`: Trồng cây trà (tốn 1 hạt giống, đợi 10s thu hoạch 80 - 150 xu).' 
                },
                { 
                    name: '🏪 **Cửa Hàng & Túi Đồ**', 
                    value: '• `!shop`: Xem danh sách vật phẩm đang bán.\n• `!mua <tên> [số_lượng]`: Mua đồ (Ví dụ: `!mua hatgiong 5`, `!mua thucan 2`).\n• `!tui`: Kiểm tra số xu, vật phẩm và danh sách ổ mèo.' 
                },
                { 
                    name: '⚙️ **Quản Lý (Admin)**', 
                    value: '• `!setchannel`: Đặt kênh hiện tại làm nơi mèo tự động xuất hiện mỗi 5 phút.' 
                }
            )
            .setFooter({ text: 'Chúc bạn có những phút giây thư giãn cùng Mèo và Trà! 🐾' });

        return message.channel.send({ embeds: [embed] });
    }

    if (command === 'setchannel') {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ Bạn cần quyền Admin để dùng lệnh này!');
        }
        SPAWN_CHANNEL_ID = message.channel.id;
        return message.channel.send(`🍵 Đã đặt kênh ${message.channel} làm nơi mèo ghé thăm mỗi 5 phút!`);
    }

    // FIX LỖI 3: Điểm danh hồi chiêu 24 tiếng
    if (command === 'diemdanh') {
        const user = getUser(message.author.id);
        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000; // 24 giờ tính bằng millisecond

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

    // FIX LỖI 2: Tính năng nuôi mèo kiếm tiền theo level (1 tiếng / lần)
    if (command === 'thuhoach') {
        const user = getUser(message.author.id);
        if (user.cats.length === 0) {
            return message.reply('😿 Bạn chưa nuôi con mèo nào để thu hoạch cả!');
        }

        const now = Date.now();
        const cooldown = 60 * 60 * 1000; // 1 tiếng hồi chiêu

        if (now - user.lastThuHoachPet < cooldown) {
            const timeLeft = cooldown - (now - user.lastThuHoachPet);
            const minutesLeft = Math.floor(timeLeft / (1000 * 60));
            const secondsLeft = Math.floor((timeLeft % (1000 * 60)) / 1000);
            return message.reply(`⏰ Mèo của bạn đang nghỉ ngơi! Hãy quay lại thu hoạch sau **${minutesLeft} phút ${secondsLeft} giây**.`);
        }

        // Tính tổng xu dựa trên tổng Level của tất cả các con mèo (mỗi Level = 15 xu)
        const totalLevel = user.cats.reduce((sum, cat) => sum + cat.level, 0);
        const earnedCoins = totalLevel * 15;

        user.lastThuHoachPet = now;
        user.coins += earnedCoins;

        return message.channel.send(`🐾 Các con mèo của ${message.author} (Tổng Level: **${totalLevel}**) đã làm nũng và mang về cho bạn **${earnedCoins} xu**!`);
    }

    if (command === 'trongtra') {
        const user = getUser(message.author.id);
        if (user.inventory.hatGiong <= 0) return message.reply('🌱 Bạn không có hạt giống! Gõ `!shop` để mua.');

        user.inventory.hatGiong -= 1;
        await message.channel.send('🌱 Bạn đã gieo mầm cây trà... Đợi 10 giây để thu hoạch nhé!');

        setTimeout(() => {
            const coinsEarned = Math.floor(Math.random() * 71) + 80;
            user.coins += coinsEarned;
            message.channel.send(`🍃 Cây trà đã lớn! ${message.author} bán lá trà nhận được **${coinsEarned} xu**!`);
        }, 10000);
    }

    if (command === 'tui') {
        const user = getUser(message.author.id);
        const catList = user.cats.length > 0 
            ? user.cats.map((c, index) => `**${index + 1}.** ${c.name} (Lv.${c.level})`).join('\n') 
            : 'Chưa có con mèo nào.';
        const invList = `• Hạt giống trà: ${user.inventory.hatGiong}\n• Thức ăn cho mèo: ${user.inventory.thucAn}`;

        const embed = new EmbedBuilder()
            .setTitle(`🎒 Hành Trang Của ${message.author.username}`)
            .setColor(0xD2B48C)
            .addFields(
                { name: '💰 Tiền xu', value: `${user.coins} xu` },
                { name: '📦 Vật phẩm', value: invList },
                { name: '🐾 Ổ Mèo (Dùng !choan <STT> để nâng cấp)', value: catList }
            );

        return message.channel.send({ embeds: [embed] });
    }

    // FIX LỖI 1: Cho phép chọn con mèo cụ thể để cho ăn theo STT
    if (command === 'choan') {
        const user = getUser(message.author.id);
        if (user.cats.length === 0) return message.reply('😿 Bạn chưa có con mèo nào!');
        if (user.inventory.thucAn <= 0) return message.reply('🐟 Bạn đã hết thức ăn! Gõ `!shop` để mua.');

        const index = parseInt(args[0]) - 1; // Lấy số thứ tự người dùng nhập (trừ 1 vì mảng tính từ 0)

        if (isNaN(index) || index < 0 || index >= user.cats.length) {
            return message.reply(`❌ Vui lòng nhập số thứ tự con mèo hợp lệ! Ví dụ: \`!choan 1\` (Bạn đang có ${user.cats.length} con mèo, gõ \`!tui\` để xem).`);
        }

        user.inventory.thucAn -= 1;
        user.cats[index].level += 1;
        return message.channel.send(`🐟 Bạn đã cho **${user.cats[index].name}** (Số ${index + 1}) ăn! Nó đã tăng lên **Level ${user.cats[index].level}**!`);
    }

    if (command === 'shop') {
        const embed = new EmbedBuilder()
            .setTitle('🏪 Tiệm Tạp Hóa Cây & Mèo')
            .setDescription('Dùng `!mua <tên_món> [số_lượng]` để mua đồ (Ví dụ: `!mua hatgiong 5`)')
            .setColor(0x98FB98)
            .addFields(
                { name: '1. hatgiong', value: '💵 Giá: 30 xu/cái | Dùng `!trongtra` để lấy tiền' },
                { name: '2. thucan', value: '💵 Giá: 40 xu/cái | Dùng `!choan <STT>` tăng level cho mèo' }
            );

        return message.channel.send({ embeds: [embed] });
    }

    // FIX LỖI 4: Mua vật phẩm theo số lượng
    if (command === 'mua') {
        const user = getUser(message.author.id);
        const item = args[0]?.toLowerCase();
        const quantity = parseInt(args[1]) || 1; // Nếu không nhập số lượng thì mặc định là 1

        if (quantity <= 0 || isNaN(quantity)) {
            return message.reply('❌ Số lượng mua phải lớn hơn 0!');
        }

        if (item === 'hatgiong') {
            const totalPrice = 30 * quantity;
            if (user.coins < totalPrice) {
                return message.reply(`❌ Bạn không đủ xu! Cần **${totalPrice} xu** để mua ${quantity} hạt giống (Bạn có ${user.coins} xu).`);
            }
            user.coins -= totalPrice;
            user.inventory.hatGiong += quantity;
            return message.reply(`🌱 Bạn đã mua **${quantity} Hạt Giống Trà** với giá ${totalPrice} xu!`);
        } else if (item === 'thucan') {
            const totalPrice = 40 * quantity;
            if (user.coins < totalPrice) {
                return message.reply(`❌ Bạn không đủ xu! Cần **${totalPrice} xu** để mua ${quantity} đĩa thức ăn (Bạn có ${user.coins} xu).`);
            }
            user.coins -= totalPrice;
            user.inventory.thucAn += quantity;
            return message.reply(`🐟 Bạn đã mua **${quantity} Đĩa Thức Ăn** với giá ${totalPrice} xu!`);
        } else {
            return message.reply('❌ Món đồ không hợp lệ. Gõ `!shop` để xem lại danh sách.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);