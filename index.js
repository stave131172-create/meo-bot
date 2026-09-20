import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';

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

const CAT_TYPES = [
    { name: 'Mèo Béo Phơi Nắng 🐱', rarity: 'Thường', rate: 50 },
    { name: 'Mèo Trà Xanh 🍵', rarity: 'Hiếm', rate: 30 },
    { name: 'Mèo Lofi Nghe Nhạc 🎧', rarity: 'Cực Hiếm', rate: 15 },
    { name: 'Mèo Hoàng Gia ✨', rarity: 'Huyền Thoại', rate: 5 },
];

function getUser(userId) {
    if (!usersData.has(userId)) {
        usersData.set(userId, {
            coins: 100,
            cats: [],
            inventory: { hatGiong: 1, thucAn: 2 }
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
                    value: '• `cat` hoặc `!cat`: Bắt mèo lang thang vừa xuất hiện trong kênh.\n• `!choan`: Cho mèo ăn để tăng Level.' 
                },
                { 
                    name: '🌱 **Nông Trại & Trà**', 
                    value: '• `!diemdanh`: Nhận xu thưởng uống trà hằng ngày (50 - 100 xu).\n• `!trongtra`: Trồng cây trà (tốn 1 hạt giống, đợi 10s thu hoạch 80 - 150 xu).' 
                },
                { 
                    name: '🏪 **Cửa Hàng & Túi Đồ**', 
                    value: '• `!shop`: Xem danh sách vật phẩm đang bán.\n• `!mua <tên>`: Mua đồ (Ví dụ: `!mua hatgiong`, `!mua thucan`).\n• `!tui`: Kiểm tra số xu, vật phẩm và danh sách ổ mèo.' 
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

    if (command === 'diemdanh') {
        const user = getUser(message.author.id);
        const reward = Math.floor(Math.random() * 51) + 50;
        user.coins += reward;
        return message.channel.send(`🍵 ${message.author} vừa uống trà và nhận được **${reward} xu**!`);
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
            ? user.cats.map(c => `• ${c.name} (Lv.${c.level})`).join('\n') 
            : 'Chưa có con mèo nào.';
        const invList = `• Hạt giống trà: ${user.inventory.hatGiong}\n• Thức ăn cho mèo: ${user.inventory.thucAn}`;

        const embed = new EmbedBuilder()
            .setTitle(`🎒 Hành Trang Của ${message.author.username}`)
            .setColor(0xD2B48C)
            .addFields(
                { name: '💰 Tiền xu', value: `${user.coins} xu` },
                { name: '📦 Vật phẩm', value: invList },
                { name: '🐾 Ổ Mèo', value: catList }
            );

        return message.channel.send({ embeds: [embed] });
    }

    if (command === 'choan') {
        const user = getUser(message.author.id);
        if (user.cats.length === 0) return message.reply('😿 Bạn chưa có con mèo nào!');
        if (user.inventory.thucAn <= 0) return message.reply('🐟 Bạn đã hết thức ăn! Gõ `!shop` để mua.');

        user.inventory.thucAn -= 1;
        user.cats[0].level += 1;
        return message.channel.send(`🐟 Bạn đã cho **${user.cats[0].name}** ăn! Nó đã tăng lên **Level ${user.cats[0].level}**!`);
    }

    if (command === 'shop') {
        const embed = new EmbedBuilder()
            .setTitle('🏪 Tiệm Tạp Hóa Cây & Mèo')
            .setDescription('Dùng `!mua <tên_món>` để mua đồ (Ví dụ: `!mua hatgiong`)')
            .setColor(0x98FB98)
            .addFields(
                { name: '1. hatgiong', value: '💵 Giá: 30 xu | Dùng `!trongtra` để lấy tiền' },
                { name: '2. thucan', value: '💵 Giá: 40 xu | Dùng `!choan` tăng level cho mèo' }
            );

        return message.channel.send({ embeds: [embed] });
    }

    if (command === 'mua') {
        const user = getUser(message.author.id);
        const item = args[0]?.toLowerCase();

        if (item === 'hatgiong') {
            if (user.coins < 30) return message.reply('❌ Bạn không đủ xu!');
            user.coins -= 30;
            user.inventory.hatGiong += 1;
            return message.reply('🌱 Bạn đã mua 1 Hạt Giống Trà!');
        } else if (item === 'thucan') {
            if (user.coins < 40) return message.reply('❌ Bạn không đủ xu!');
            user.coins -= 40;
            user.inventory.thucAn += 1;
            return message.reply('🐟 Bạn đã mua 1 Đĩa Thức Ăn!');
        } else {
            return message.reply('❌ Món đồ không hợp lệ. Gõ `!shop` để xem lại danh sách.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);