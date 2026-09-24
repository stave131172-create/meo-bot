import http from 'http';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// EMOJI MEOCOIN CẤU HÌNH DÙNG CHUNG
const COIN_EMOJI = '<:MeoCoin:1552668338411409438>';

// 1. Web Server giữ Render sống
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => res.end('Bot Meo va Tra is running!')).listen(PORT, () => {
    console.log(`🌐 Web server đang lắng nghe tại port ${PORT}`);
});

// 2. SCHEMAS & DATABASE
const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    coins: { type: Number, default: 20 },
    cats: { type: Array, default: [] },
    inventory: { type: Object, default: { hatgiong_lua: 2, thucan: 2 } },
    plots: { type: Array, default: [] },
    maxPlots: { type: Number, default: 5 },
    unlockedRecipes: { type: Array, default: [] },
    lastDiemDanh: { type: Number, default: 0 },
    lastClaimCatCoins: { type: Number, default: Date.now() },
    questResetAt: { type: Number, default: 0 },
    quests: { type: Array, default: [] }
});

// Schema lưu Config riêng cho từng Guild (Server)
const configSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: String, default: null }
});

const User = mongoose.model('User', userSchema);
const Config = mongoose.model('Config', configSchema);

// DỮ LIỆU CÂY TRỒNG
const PLANTS = {
    lua: { name: 'Lúa', seedItem: 'hatgiong_lua', cropItem: 'lua', cropName: 'Lúa', seedPrice: 10, cropPrice: 18, timeMs: 20000 },
    tra: { name: 'Cây Trà', seedItem: 'hatgiong_tra', cropItem: 'la_tra', cropName: 'Lá Trà', seedPrice: 30, cropPrice: 55, timeMs: 40000 },
    mia: { name: 'Cây Mía', seedItem: 'hatgiong_mia', cropItem: 'cay_mia', cropName: 'Cây Mía', seedPrice: 55, cropPrice: 100, timeMs: 60000 },
    caphe: { name: 'Cây Cà Phê', seedItem: 'hatgiong_caphe', cropItem: 'hat_caphe', cropName: 'Hạt Cà Phê', seedPrice: 100, cropPrice: 180, timeMs: 90000 },
    tre: { name: 'Cây Tre', seedItem: 'hatgiong_tre', cropItem: 'than_tre', cropName: 'Thân Tre', seedPrice: 200, cropPrice: 360, timeMs: 120000 }
};

const RARITY_CONFIG = {
    'Thường': { icon: '<:common:1551966215721975878>' },
    'Hiếm': { icon: '<:uncommon:1551966317287055430>' },
    'Cực Hiếm': { icon: '<:rare_:1551966385893277706>' },
    'Huyền Thoại': { icon: '<:legend:1551966453459324968>' },
    'Sử Thi': { icon: '<:mythic:1551966543074820106>' },
    'Limited': { icon: '<:secret:1551966624221888592>' }
};

const CAT_TYPES = [
    { name: 'Mèo Béo Phơi Nắng', rarity: 'Thường', rate: 25, emoji: '<:meobeophoinang:1551973509796724786>', image: 'https://i.pinimg.com/736x/09/04/14/0904144cabdfd4e01784bf064d56d290.jpg', incomePerSec: 0.02 },
    { name: 'Mèo Mướp', rarity: 'Thường', rate: 20, emoji: '<:meomuop:1551973509796724786>', image: 'https://i.pinimg.com/736x/ce/04/8c/ce048c234c179b17841811151df5259c.jpg', incomePerSec: 0.02 },
    { name: 'Mèo Anh Lông Dài', rarity: 'Thường', rate: 15, emoji: '<:meoanhlongdai:1551973751921451079>', image: 'https://i.pinimg.com/736x/ce/04/8c/ce048c234c179b17841811151df5259c.jpg', incomePerSec: 0.025 },
    { name: 'Mèo Anh Lông Ngắn', rarity: 'Thường', rate: 15, emoji: '<:meoanhlongngan:1551973509796724786>', image: 'https://i.pinimg.com/736x/09/04/14/0904144cabdfd4e01784bf064d56d290.jpg', incomePerSec: 0.025 },
    { name: 'Mèo Ragdoll', rarity: 'Hiếm', rate: 12, emoji: '<:meoragdoll:1551973858276409414>', image: 'https://i.pinimg.com/736x/39/d2/da/39d2dae2e2cabc21163699f6e3601916.jpg', incomePerSec: 0.06 },
    { name: 'Mèo Tuxedo', rarity: 'Hiếm', rate: 12, emoji: '<:meotuxedo:1551973751921451079>', image: 'https://i.pinimg.com/1200x/9f/84/3d/9f843d43cc4078283dae7327e8ce7314.jpg', incomePerSec: 0.06 },
    { name: 'Mèo Trà Xanh', rarity: 'Hiếm', rate: 10, emoji: '<:meotraxanh:1551974270505189426>', image: 'https://i.pinimg.com/736x/a2/06/ad/a206ad186aed59dff16bbce4bdff424b.jpg', incomePerSec: 0.07 },
    { name: 'Mèo Maine Coon', rarity: 'Cực Hiếm', rate: 8, emoji: '<:meomarinecoon:1551974053542109204>', image: 'https://i.pinimg.com/736x/65/e6/e9/65e6e9bf4946447e0af173e6d340c908.jpg', incomePerSec: 0.15 },
    { name: 'Mèo Lofi Nghe Nhạc', rarity: 'Cực Hiếm', rate: 8, emoji: '<:meolofi:1551974186455670865>', image: 'https://i.pinimg.com/736x/b3/12/89/b3128925bda713b4303f89b9c2d62744.jpg', incomePerSec: 0.15 },
    { name: 'Mèo Hoàng Gia', rarity: 'Huyền Thoại', rate: 5, emoji: '<:meohoanggia:1551973577153314966>', image: 'https://i.pinimg.com/1200x/2b/05/9e/2b059e2fbcf5c9087bf1e8f1f2a17165.jpg', incomePerSec: 0.4 }
];

const RECIPES = {
    tradao: { name: 'Trà Đào Cam Sả 🍹', ingredients: { la_tra: 5, dao: 3, cam: 2 }, brewTimeMs: 180000, price: 600 },
    caphesua: { name: 'Cà Phê Sữa ☕', ingredients: { hat_caphe: 4, sua: 2 }, brewTimeMs: 150000, price: 400 },
    nuocmia: { name: 'Nước Mía Tắc 🥤', ingredients: { cay_mia: 5, tac: 2 }, brewTimeMs: 90000, price: 250 }
};

const MAX_CAT_LEVEL = 10;
const DEFAULT_PREFIX = '!';

async function getPrefix(guildId) {
    if (!guildId || mongoose.connection.readyState !== 1) return DEFAULT_PREFIX;
    try {
        const config = await Config.findOne({ key: `prefix_${guildId}` }).maxTimeMS(3000);
        return config?.value || DEFAULT_PREFIX;
    } catch {
        return DEFAULT_PREFIX;
    }
}

function getRequiredXP(level) {
    if (level >= MAX_CAT_LEVEL) return 'MAX';
    return Math.floor(15 * Math.pow(level, 1.4));
}

function toSuperscript(num) {
    const supers = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
    return String(num).split('').map(digit => supers[digit] || digit).join('');
}

function cleanCatName(rawName) {
    if (!rawName) return 'Mèo Mướp';
    let clean = rawName.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|<a?:.+?:\d+>/gu, '').trim();
    if (clean === 'Mèo Ta') return 'Mèo Mướp';
    return clean;
}

function getCatInfo(rawName) {
    const clean = cleanCatName(rawName);
    const found = CAT_TYPES.find(c => clean.toLowerCase().includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(clean.toLowerCase()));
    return {
        cleanName: clean,
        emoji: found ? found.emoji : '🐱'
    };
}

// TÍNH NĂNG NHIỆM VỤ (QUESTS RESET MỖI 12 GIỜ)
function checkAndResetQuests(user) {
    const now = Date.now();
    const TWELVE_HOURS = 12 * 60 * 60 * 1000;
    
    if (!user.questResetAt || now - user.questResetAt >= TWELVE_HOURS) {
        user.questResetAt = now;
        
        const plantTarget = Math.floor(Math.random() * 6) + 5; // 5 - 10 cây
        const catchTarget = Math.floor(Math.random() * 2) + 1; // 1 - 2 mèo
        const brewTarget = Math.floor(Math.random() * 3) + 1;  // 1 - 3 ly nước

        user.quests = [
            { id: 'plant', desc: `Trồng ${plantTarget} cây bất kỳ`, target: plantTarget, progress: 0, reward: plantTarget * 20, claimed: false },
            { id: 'catch', desc: `Bắt ${catchTarget} con mèo lang thang`, target: catchTarget, progress: 0, reward: catchTarget * 150, claimed: false },
            { id: 'brew', desc: `Pha ${brewTarget} ly nước uống`, target: brewTarget, progress: 0, reward: brewTarget * 100, claimed: false }
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

let currentWildCat = null;

client.once('ready', async () => {
    console.log(`✅ Bot chill Node.js ${client.user.tag} đã sẵn sàng!`);
    client.user.setActivity(`Uống trà & chăm mèo 🍵 (!help)`);
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
        const currentPrefix = await getPrefix(channel.guild?.id);

        const embed = new EmbedBuilder()
            .setTitle('🐾 Một con mèo lang thang vừa xuất hiện!')
            .setDescription(`Nó là **${selectedCat.name}** (Độ hiếm: \`${selectedCat.rarity}\`)\n\n👉 Gõ **\`${currentPrefix}cat\`** hoặc **\`${currentPrefix}meo\`** để bắt nó ngay!`)
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

        const currentPrefix = await getPrefix(message.guild?.id);
        const content = message.content.trim();

        if (!content.startsWith(currentPrefix) && content.toLowerCase() !== 'cat' && content.toLowerCase() !== 'meo') return;

        const args = content.startsWith(currentPrefix) ? content.slice(currentPrefix.length).trim().split(/ +/) : [content];
        const command = args.shift().toLowerCase();

        // Lệnh đổi Prefix riêng cho từng Guild
        if (command === 'setprefix') {
            if (!message.guild) {
                return message.reply('❌ Bạn chỉ có thể đổi prefix bên trong Server!');
            }
            if (!message.member?.permissions?.has('Administrator')) {
                return message.reply('❌ Bạn cần quyền **Administrator** để thay đổi Prefix của Server này!');
            }
            const newPrefix = args[0];
            if (!newPrefix) {
                return message.reply(`❌ Cú pháp: \`${currentPrefix}setprefix <prefix_mới>\``);
            }
            await Config.findOneAndUpdate({ key: `prefix_${message.guild.id}` }, { value: newPrefix }, { upsert: true, new: true });
            return message.channel.send(`⚙️ **Đã đổi Prefix thành công cho Server này!** Prefix mới: \`${newPrefix}\``);
        }

        // Lệnh bí mật Reset All Data
        if (command === 'resetdata') {
            const password = args[0];
            if (password !== '200412') {
                return message.reply('❌ Mật mã xác nhận không chính xác!');
            }

            await User.updateMany({}, {
                $set: {
                    coins: 20,
                    cats: [],
                    inventory: { hatgiong_lua: 2, thucan: 2 },
                    plots: [],
                    lastClaimCatCoins: Date.now()
                }
            });
            return message.channel.send('⚠️ **ĐÃ RESET TOÀN BỘ DỮ LIỆU CỦA TẤT CẢ NGƯỜI CHƠI TRÊN MỌI SERVER VỀ MẶC ĐỊNH!**');
        }

        // 📌 LỆNH HELP
        if (command === 'help' || command === 'h') {
            const p = currentPrefix;
            const embed = new EmbedBuilder()
                .setTitle('📜 HƯỚNG DẪN CÁCH CHƠI - MÈO & TRÀ 🍵')
                .setDescription(`Dưới đây là toàn bộ danh sách lệnh bạn có thể sử dụng (Prefix server này: \`${p}\`):`)
                .setColor(0xFFA500)
                .addFields(
                    { 
                        name: '🎒 Cá Nhân & Bắt Mèo', 
                        value: `• \`${p}tui\` (hoặc \`${p}t\`): Xem hành trang, ví tiền, nông trại & mèo đang có.\n• \`${p}quest\` (hoặc \`${p}q\`): Xem & nhận thưởng nhiệm vụ mỗi 12h.\n• \`${p}index\` (hoặc \`${p}zoo\`): Xem bộ sưu tập mèo đã thu thập được.\n• \`${p}cat\` / \`${p}meo\`: Bắt mèo lang thang khi nó xuất hiện.\n• \`${p}diemdanh\` (hoặc \`${p}dd\`): Uống trà sáng nhận ${COIN_EMOJI} xu miễn phí mỗi ngày.` 
                    },
                    { 
                        name: '🌱 Nông Trại & Chăm Mèo', 
                        value: `• \`${p}vuon\` (hoặc \`${p}v\`): Xem sơ đồ vườn cây dạng ô đất.\n• \`${p}trong <loại> [số_lượng]\`: Trồng cây (lua, tra, mia, caphe, tre).\n• \`${p}thuhoach\` (hoặc \`${p}th\`): Thu hoạch cây trồng đã chín.\n• \`${p}choan <STT>\`: Cho mèo ăn tăng XP (STT lấy từ lệnh \`${p}tui\`).\n• \`${p}kiemtien\` (hoặc \`${p}kt\`): Thu gom tiền tích lũy từ đàn mèo.` 
                    },
                    { 
                        name: '🏪 Cửa Hàng & Chế Đồ', 
                        value: `• \`${p}shop\` (hoặc \`${p}s\`): Xem danh sách hạt giống và thức ăn.\n• \`${p}mua <tên_món> [số_lượng]\`: Mua hạt giống hoặc thức ăn.\n• \`${p}ban <tên_món> [số_lượng]\`: Bán nông sản/nước uống kiếm ${COIN_EMOJI} xu.\n• \`${p}phache <tên_món>\`: Pha chế đồ uống (tradao, caphesua, nuocmia).` 
                    },
                    { 
                        name: '⚙️ Quản Trị Viên (Admin Only)', 
                        value: `• \`${p}setprefix <prefix_mới>\`: Thay đổi prefix riêng cho server này.\n• \`${p}setchannel\`: Cài đặt kênh này làm nơi mèo xuất hiện.` 
                    }
                )
                .setImage('https://64.media.tumblr.com/b7fe4e7380ad5ead6b5b923dda4a57be/0a55b5030b869431-19/s1280x1920/67ca2429b7d137a9b7b808e8d820ef4a8be79255.gif')
                .setFooter({ text: 'Chúc bạn chơi game vui vẻ!' });

            return message.channel.send({ embeds: [embed] });
        }

        // LỆNH NHIỆM VỤ (!quest / !q / !nhiemvu)
        if (command === 'quest' || command === 'q' || command === 'nhiemvu') {
            const user = await getUser(message.author.id);
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            const subCmd = args[0]?.toLowerCase();

            // Nhận thưởng nhiệm vụ: !quest nhan <STT / all>
            if (subCmd === 'nhan' || subCmd === 'claim') {
                const target = args[1]?.toLowerCase();
                let totalReward = 0;
                let claimedCount = 0;

                if (target === 'all') {
                    user.quests.forEach(q => {
                        if (q.progress >= q.target && !q.claimed) {
                            q.claimed = true;
                            totalReward += q.reward;
                            claimedCount++;
                        }
                    });
                } else {
                    const idx = parseInt(target) - 1;
                    if (isNaN(idx) || idx < 0 || idx >= user.quests.length) {
                        return message.reply(`❌ Cú pháp nhận thưởng: \`${currentPrefix}quest nhan <1/2/3>\` hoặc \`${currentPrefix}quest nhan all\``);
                    }

                    const q = user.quests[idx];
                    if (q.claimed) {
                        return message.reply('❌ Bạn đã nhận thưởng nhiệm vụ này rồi!');
                    }
                    if (q.progress < q.target) {
                        return message.reply('❌ Nhiệm vụ này chưa hoàn thành!');
                    }

                    q.claimed = true;
                    totalReward += q.reward;
                    claimedCount++;
                }

                if (claimedCount === 0) {
                    return message.reply('❌ Không có nhiệm vụ nào đủ điều kiện nhận thưởng!');
                }

                user.coins += totalReward;
                user.markModified('quests');
                await user.save();

                return message.reply(`🎉 Bạn đã nhận thành công **${totalReward}**${COIN_EMOJI} từ nhiệm vụ!`);
            }

            // Hiển thị danh sách Nhiệm vụ
            const now = Date.now();
            const TWELVE_HOURS = 12 * 60 * 60 * 1000;
            const timeLeftMs = Math.max(0, TWELVE_HOURS - (now - user.questResetAt));
            const hoursLeft = Math.floor(timeLeftMs / (1000 * 60 * 60));
            const minutesLeft = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));

            let questListText = '';
            user.quests.forEach((q, i) => {
                const isDone = q.progress >= q.target;
                const statusIcon = q.claimed ? '✅ (Đã nhận)' : (isDone ? '✨ (Hoàn thành - Sẵn sàng nhận)' : '⏳ (Đang làm)');
                questListText += `**${i + 1}.${q.desc}**\n• Tiến độ: \`${q.progress}/${q.target}\` - Trạng thái: ${statusIcon}\n• Phần thưởng: **${q.reward}**${COIN_EMOJI}\n\n`;
            });

            const embed = new EmbedBuilder()
                .setTitle(`📜 NHIỆM VỤ HÀNG NGÀY (Của ${message.author.username})`)
                .setDescription(questListText)
                .setFooter({ text: `Nhiệm vụ làm mới sau: ${hoursLeft}h ${minutesLeft}m \vert{} Gõ ${currentPrefix}quest nhan <STT/all> để nhận` })
                .setColor(0x3498DB);

            return message.channel.send({ embeds: [embed] });
        }

        // LỆNH XEM VƯỜN ĐẤT TRỒNG (!vuon hoặc !v)
        if (command === 'vuon' || command === 'v') {
            const user = await getUser(message.author.id);
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            const now = Date.now();
            let plotEmojis = [];
            let detailList = [];

            for (let i = 0; i < user.maxPlots; i++) {
                if (i < user.plots.length) {
                    const plot = user.plots[i];
                    const plantInfo = PLANTS[plot.plantKey];

                    if (now >= plot.harvestAt) {
                        plotEmojis.push('✨');
                        detailList.push(`• Ô ${i + 1}: **${plantInfo.name}** (✨ Đã chín - sẵn sàng thu hoạch)`);
                    } else {
                        plotEmojis.push('🪻');
                        const timeLeftSec = Math.ceil((plot.harvestAt - now) / 1000);
                        detailList.push(`• Ô ${i + 1}: **${plantInfo.name}** (🪻 Đang lớn - còn ${timeLeftSec}s)`);
                    }
                } else {
                    plotEmojis.push('🟫');
                }
            }

            const row1 = plotEmojis.slice(0, 3).join('  ');
            const row2 = plotEmojis.slice(3, 5).join('  ');
            const gardenGrid = `${row1}\n${row2}`;

            const embed = new EmbedBuilder()
                .setTitle(`🌾 Nông Trại Của ${message.author.username}`)
                .setDescription(`### **Sơ đồ mảnh đất:**\n${gardenGrid}\n\n### **Chi tiết ô đất:**\n${detailList.length > 0 ? detailList.join('\n') : 'Chưa trồng cây nào (Đất đang trống).'}`)
                .setFooter({ text: `Dùng ${currentPrefix}trong <loại> để trồng \vert{} ${currentPrefix}thuhoach để thu hoạch` })
                .setColor(0x8B4513);

            return message.channel.send({ embeds: [embed] });
        }

        // BẮT MÈO
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
                    .setDescription(`${message.author} đã bắt thành công **${catCaught.name}**${catCaught.emoji}!`)
                    .setThumbnail(catCaught.image)
                    .setColor(0xFFB6C1);

                return message.channel.send({ embeds: [embed] });
            } else {
                const msg = await message.channel.send('🐾 Hiện không có con mèo nào ở đây cả...');
                setTimeout(() => msg.delete().catch(() => {}), 4000);
                return;
            }
        }

        // INDEX MÈO
        if (command === 'index' || command === 'zoo') {
            const user = await getUser(message.author.id);
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            const catCounts = {};
            user.cats.forEach(c => {
                const clean = cleanCatName(c.name);
                catCounts[clean] = (catCounts[clean] || 0) + 1;
            });

            let indexDescription = '';
            let totalCatsInGame = CAT_TYPES.length;
            let totalOwnedUnique = 0;

            for (const [rarityName, rarityInfo] of Object.entries(RARITY_CONFIG)) {
                const catsInRarity = CAT_TYPES.filter(c => c.rarity === rarityName);
                
                let lineIcons = '';
                if (catsInRarity.length > 0) {
                    lineIcons = catsInRarity.map(cat => {
                        const count = catCounts[cat.name] || 0;
                        if (count > 0) {
                            totalOwnedUnique++;
                            return count > 1 ? `${cat.emoji}${toSuperscript(count)}` : `${cat.emoji}`;
                        }
                        return '❓';
                    }).join(' ');
                } else {
                    lineIcons = '*Đang cập nhật...*';
                }

                indexDescription += `${rarityInfo.icon} **${rarityName}**:${lineIcons}\n\n`;
            }

            const embed = new EmbedBuilder()
                .setTitle(`🐱 Bộ Sưu Tập Mèo Của ${message.author.username}`)
                .setDescription(indexDescription)
                .setFooter({ text: `Tiến độ thu thập: ${totalOwnedUnique}/${totalCatsInGame} chú mèo khác nhau` })
                .setColor(0xFFB6C1);

            return message.channel.send({ embeds: [embed] });
        }

        // TÚI ĐỒ
        if (command === 'tui' || command === 't') {
            const user = await getUser(message.author.id);
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            let catList = 'Chưa có con mèo nào.';
            if (user.cats.length > 0) {
                const groupedCats = {};
                user.cats.forEach(c => {
                    const info = getCatInfo(c.name);
                    const lvl = c.level || 1;
                    const xp = c.xp || 0;
                    const key = `${info.cleanName}_Lv${lvl}_XP${xp}`;

                    if (!groupedCats[key]) {
                        groupedCats[key] = {
                            name: info.cleanName,
                            emoji: info.emoji,
                            level: lvl,
                            xp: xp,
                            count: 1
                        };
                    } else {
                        groupedCats[key].count += 1;
                    }
                });

                catList = Object.values(groupedCats).map((item, i) => {
                    const reqXP = getRequiredXP(item.level);
                    const xpDisplay = reqXP === 'MAX' ? 'MAX XP' : `${item.xp}/${reqXP} XP`;
                    const countStr = item.count > 1 ? ` - **${item.count} con**` : '';
                    return `**${i + 1}.**${item.emoji} **${item.name}** (Lv.${item.level} - ${xpDisplay})${countStr}`;
                }).join('\n');
            }

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
                    { name: '💰 Ví tiền', value: `${user.coins}${COIN_EMOJI}` },
                    { name: '🌱 Đất trồng', value: `Tổng: **${user.plots.length}/${user.maxPlots}** ô (Chín: ${readyPlots}, Đang lớn: ${growingPlots})\n👉 Gõ \`${currentPrefix}vuon\` để xem sơ đồ đất` },
                    { name: '📦 Vật phẩm', value: invText },
                    { name: '🐾 Ổ Mèo', value: catList }
                );

            return message.channel.send({ embeds: [embed] });
        }

        // SHOP (CẬP NHẬT GIF MỚI THEO YÊU CẦU)
        if (command === 'shop' || command === 's') {
            const user = await getUser(message.author.id);
            const userCoins = user ? user.coins : 0;

            const embed = new EmbedBuilder()
                .setTitle('🏪 Tiệm Tạp Hóa Cây & Mèo')
                .setDescription(`💰 **Số tiền hiện có của bạn:** \`${userCoins}\` ${COIN_EMOJI}\n\nDùng lệnh \`${currentPrefix}mua <tên_món> [số_lượng]\` để mua:`)
                .setColor(0x98FB98)
                .setImage('https://i.pinimg.com/originals/3a/a4/6f/3aa46f5701fc6ed92234ea0a9f86e2cd.gif')
                .addFields(
                    { name: '🌱 Hạt Giống', value: `• \`hatgiong_lua\`: 10 ${COIN_EMOJI}\n• \`hatgiong_tra\`: 30 ${COIN_EMOJI}\n• \`hatgiong_mia\`: 55 ${COIN_EMOJI}\n• \`hatgiong_caphe\`: 100 ${COIN_EMOJI}\n• \`hatgiong_tre\`: 200 ${COIN_EMOJI}` },
                    { name: '🐟 Thức Ăn', value: `• \`thucan\`: 30 ${COIN_EMOJI} (+15 XP cho mèo)` }
                );

            return message.channel.send({ embeds: [embed] });
        }

        // MUA ĐỒ
        if (command === 'mua') {
            const user = await getUser(message.author.id);
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            const item = args[0]?.toLowerCase();
            const quantity = parseInt(args[1]) || 1;

            if (!item || quantity <= 0 || isNaN(quantity)) return message.reply(`❌ Cú pháp: \`${currentPrefix}mua <tên_món> <số_lượng>\``);

            const prices = {
                hatgiong_lua: 10, hatgiong_tra: 30, hatgiong_mia: 55, hatgiong_caphe: 100, hatgiong_tre: 200, thucan: 30
            };

            if (!prices[item]) return message.reply('❌ Vật phẩm không có trong cửa hàng!');

            const total = prices[item] * quantity;
            if (user.coins < total) return message.reply(`❌ Bạn không đủ tiền! Cần **${total}**${COIN_EMOJI}.`);

            user.coins -= total;
            user.inventory[item] = (user.inventory[item] || 0) + quantity;
            user.markModified('inventory');
            await user.save();

            return message.reply(`🛒 Bạn đã mua thành công **${quantity}x${item}** với giá **${total}**${COIN_EMOJI}!`);
        }

        // RÚT TIỀN TỪ MÈO
        if (command === 'kiemtien' || command === 'kt') {
            const user = await getUser(message.author.id);
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            if (user.cats.length === 0) return message.reply('😿 Bạn chưa có mèo trong chuồng!');

            const now = Date.now();
            const timePassedSec = Math.floor((now - user.lastClaimCatCoins) / 1000);

            if (timePassedSec < 10) return message.reply('⏰ Đàn mèo chưa tích lũy đủ xu, quay lại sau ít giây nữa!');

            let totalIncomePerSec = 0;

            user.cats.forEach(c => {
                const info = getCatInfo(c.name);
                const catDef = CAT_TYPES.find(ct => info.cleanName.toLowerCase().includes(ct.name.toLowerCase()) || ct.name.toLowerCase().includes(info.cleanName.toLowerCase())) || CAT_TYPES[0];
                const catLvl = Math.min(MAX_CAT_LEVEL, c.level || 1);
                
                const baseIncome = catDef.incomePerSec;
                const levelBonus = 1 + ((catLvl - 1) * 0.1);
                totalIncomePerSec += (baseIncome * levelBonus);
            });

            const totalEarned = Math.floor(timePassedSec * totalIncomePerSec);

            if (totalEarned <= 0) return message.reply(`🐾 Đàn mèo chưa tích lũy đủ ${COIN_EMOJI}!`);

            user.coins += totalEarned;
            user.lastClaimCatCoins = now;
            await user.save();

            return message.reply(`🐾 Đàn mèo đã chăm chỉ tích lũy! Bạn rút được **${totalEarned}**${COIN_EMOJI} trong chuồng!`);
        }

        // CHO MÈO ĂN
        if (command === 'choan') {
            const user = await getUser(message.author.id);
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            if (user.cats.length === 0) return message.reply('😿 Bạn chưa có mèo!');

            const foodCount = user.inventory.thucan || 0;
            if (foodCount <= 0) return message.reply(`🐟 Bạn hết thức ăn rồi! Vào \`${currentPrefix}shop\` để mua thêm.`);

            const index = parseInt(args[0]) - 1;
            if (isNaN(index) || index < 0 || index >= user.cats.length) return message.reply('❌ Hãy nhập STT mèo hợp lệ!');

            const targetCat = user.cats[index];
            targetCat.level = targetCat.level || 1;

            if (targetCat.level >= MAX_CAT_LEVEL) {
                return message.reply(`✨ Con mèo này đã đạt **LEVEL MAX (${MAX_CAT_LEVEL})** rồi!`);
            }

            user.inventory.thucan -= 1;
            const info = getCatInfo(targetCat.name);
            targetCat.name = info.cleanName;

            targetCat.xp = (targetCat.xp || 0) + 15;
            let reqXP = getRequiredXP(targetCat.level);
            let leveledUp = false;

            while (reqXP !== 'MAX' && targetCat.xp >= reqXP) {
                targetCat.xp -= reqXP;
                targetCat.level += 1;
                leveledUp = true;

                if (targetCat.level >= MAX_CAT_LEVEL) {
                    targetCat.level = MAX_CAT_LEVEL;
                    targetCat.xp = 0;
                    break;
                }
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

        // TRỒNG CÂY
        if (command === 'trong' || command === 'tr') {
            const user = await getUser(message.author.id);
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            const plantKey = args[0]?.toLowerCase();
            const count = parseInt(args[1]) || 1;

            if (!PLANTS[plantKey]) return message.reply('❌ Loại cây không hợp lệ! Gồm: `lua`, `tra`, `mia`, `caphe`, `tre`.');

            const plant = PLANTS[plantKey];
            const currentSeed = user.inventory[plant.seedItem] || 0;

            if (currentSeed < count) return message.reply(`❌ Bạn không có đủ **${count}x${plant.seedItem}**.`);

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

            return message.reply(`🌱 Đã trồng thành công **${count}x${plant.name}**! Gõ \`${currentPrefix}vuon\` để xem tiến độ hoặc \`${currentPrefix}thuhoach\` khi cây chín.`);
        }

        // THU HOẠCH
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

        // BÁN NÔNG SẢN
        if (command === 'ban' || command === 'b') {
            const user = await getUser(message.author.id);
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            const item = args[0]?.toLowerCase();
            const quantity = parseInt(args[1]) || 1;

            if (!item || quantity <= 0) return message.reply(`❌ Cú pháp: \`${currentPrefix}ban <tên_món> <số_lượng>\``);

            const sellPrices = {
                lua: 18, la_tra: 55, cay_mia: 100, hat_caphe: 180, than_tre: 360,
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

            return message.reply(`💰 Bạn đã bán **${quantity}x ${item}** thu về **${earnings}** ${COIN_EMOJI}!`);
        }

        // PHA CHẾ
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

            return message.reply(`🍵 Đã pha thành công **${recipe.name}**! Bạn có thể dùng \`${currentPrefix}ban${drinkKey}\` để bán với giá **${recipe.price}** ${COIN_EMOJI}.`);
        }

        // ĐIỂM DANH
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
            const reward = Math.floor(Math.random() * 21) + 30;
            user.coins += reward;
            await user.save();

            return message.channel.send(`🍵 ${message.author} thưởng trà sáng và nhận **${reward}** ${COIN_EMOJI}!`);
        }

        // KÊNH SPAWN MÈO
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