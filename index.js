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
    selectedCats: { type: Array, default: [] }, // Danh sách các chỉ số (index) mèo được chọn (Tối đa 3)
    inventory: { type: Object, default: { hatgiong_lua: 2, thucan: 2 } },
    plots: { type: Array, default: [] },
    maxPlots: { type: Number, default: 5 },
    unlockedRecipes: { type: Array, default: [] },
    lastDiemDanh: { type: Number, default: 0 },
    lastClaimCatCoins: { type: Number, default: Date.now() },
    lastActiveAt: { type: Number, default: Date.now() }, // Thời điểm tương tác cuối để tính Offline
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

// DỮ LIỆU CÂY TRỒNG MỚI & CƠ CHẾ GIAI ĐOẠN
const PLANTS = {
    lua: {
        name: 'Lúa',
        seedItem: 'hatgiong_lua',
        cropItem: 'lua',
        cropName: 'Lúa',
        seedPrice: 10,
        cropPrice: 18,
        permanent: false,
        seedEmoji: '🌾',
        cropEmoji: '🌾',
        stages: [
            { durationMs: 10000, emoji: '🌱' },
            { durationMs: 10000, emoji: '✨' }
        ]
    },
    carot: {
        name: 'Cà Rốt',
        seedItem: 'hatgiong_carot',
        cropItem: 'carot',
        cropName: 'Cà Rốt',
        seedPrice: 15,
        cropPrice: 35,
        permanent: false,
        seedEmoji: '<:Carrot_Seeds:1553398816785309879>',
        cropEmoji: '<:Carrot:1553399221200363520>',
        stages: [
            { durationMs: 30000, emoji: '<:Carrot_Stage_1:1553398949082042428>' },
            { durationMs: 30000, emoji: '<:Carrot_Stage_2:1553398991838904341>' },
            { durationMs: 0, emoji: '<:Carrot_Stage_3:1553399066392666163>' }
        ]
    },
    caphe: {
        name: 'Cây Cà Phê',
        seedItem: 'hatgiong_caphe',
        cropItem: 'hat_caphe',
        cropName: 'Hạt Cà Phê',
        seedPrice: 100,
        cropPrice: 180,
        permanent: true,
        regrowStage: 3, // Sau khi hái lùi về giai đoạn 4 (index 3)
        seedEmoji: '<:coffe_seed:1553711053731405976>',
        cropEmoji: '<:Coffee_Bean:1553399563430404269>',
        stages: [
            { durationMs: 120000, emoji: '<:Coffee_Stage_1:1553399628638978059>' }, // 2'
            { durationMs: 120000, emoji: '<:Coffee_Stage_2:1553399691213807617>' }, // 2'
            { durationMs: 120000, emoji: '<:Coffee_Stage_2:1553399691213807617>' }, // 2'
            { durationMs: 240000, emoji: '<:Coffee_Stage_5:1553399880871972964>' }, // 4'
            { durationMs: 0, emoji: '<:Coffee_Stage_5:1553399880871972964>' }      // Khi ra quả
        ]
    },
    tra: {
        name: 'Cây Trà',
        seedItem: 'hatgiong_tra',
        cropItem: 'la_tra',
        cropName: 'Lá Trà',
        seedPrice: 30,
        cropPrice: 55,
        permanent: true,
        regrowStage: 1, // Sau khi hái lùi về giai đoạn 2 (index 1)
        seedEmoji: '<:Tea_Sapling:1553704361597870190>',
        cropEmoji: '<:Tea_Leaves:1553704316643057816>',
        stages: [
            { durationMs: 240000, emoji: '<:Tea_Stage_1:1553704420934680670>' }, // 4'
            { durationMs: 240000, emoji: '<:Tea_Stage_2:1553704487636705360>' }, // 4'
            { durationMs: 0, emoji: '<:Tea_Stage_4:1553712192619159592>' }       // Khi ra quả
        ]
    },
    ot: {
        name: 'Cây Ớt',
        seedItem: 'hatgiong_ot',
        cropItem: 'trai_ot',
        cropName: 'Trái Ớt',
        seedPrice: 50,
        cropPrice: 110,
        permanent: true,
        regrowStage: 3, // Sau khi hái lùi về giai đoạn 4 (index 3)
        seedEmoji: '<:Pepper_Seeds:1553712338635591690>',
        cropEmoji: '<:Hot_Pepper:1553707775262195712>',
        stages: [
            { durationMs: 120000, emoji: '<:Hot_Pepper_Stage_1:1553707865808572587>' }, // 2'
            { durationMs: 120000, emoji: '<:Hot_Pepper_Stage_2:1553707944430936155>' }, // 2'
            { durationMs: 120000, emoji: '<:Hot_Pepper_Stage_3:1553708039348031620>' }, // 2'
            { durationMs: 240000, emoji: '<:Hot_Pepper_Stage_4:1553708412901138503>' }, // 4'
            { durationMs: 0, emoji: '<:Hot_Pepper_Stage_5:1553708105722892298>' }      // Khi ra quả
        ]
    },
    suplo: {
        name: 'Súp Lơ',
        seedItem: 'hatgiong_suplo',
        cropItem: 'suplo',
        cropName: 'Súp Lơ',
        seedPrice: 200,
        cropPrice: 420,
        permanent: false,
        seedEmoji: '🌱',
        cropEmoji: '<:Cauliflower_item:1553701544547844117>',
        stages: [
            { durationMs: 60000, emoji: '<:Cauliflower_Stage_1:1553701171363975178>' },  // 1'
            { durationMs: 60000, emoji: '<:Cauliflower_Stage_2:1553701217014653100>' },  // 1'
            { durationMs: 120000, emoji: '<:Cauliflower_Stage_3:1553701273415712838>' }, // 2'
            { durationMs: 180000, emoji: '<:Cauliflower_Stage_4:1553701323671605319>' }, // 3'
            { durationMs: 0, emoji: '<:Cauliflower_Stage_5:1553701425090007213>' }       // Có thể hái
        ]
    }
};

const RARITY_CONFIG = {
    'Thường': { icon: '<:common:1551966215721975878>' },
    'Hiếm': { icon: '<:uncommon:1551966317287055430>' },
    'Cực Hiếm': { icon: '<:rare_:1551966385893277706>' },
    'Huyền Thoại': { icon: '<:legend:1551966453459324968>' },
    'Sử Thi': { icon: '<:mythic:1551966543074820106>' },
    'Limited': { icon: '<:secret:1551966624221888592>' }
};

// CẤU HÌNH CÂN BẰNG MÈO THEO YÊU CẦU MỚI (Income theo xu/phút)
const CAT_TYPES = [
    { name: 'Mèo Béo Phơi Nắng', rarity: 'Thường', rate: 25, emoji: '<:meobeophoinang:1551973509796724786>', image: 'https://i.pinimg.com/736x/09/04/14/0904144cabdfd4e01784bf064d56d290.jpg', incomePerMin: 1 },
    { name: 'Mèo Mướp', rarity: 'Thường', rate: 20, emoji: '<:meomuop:1551973509796724786>', image: 'https://i.pinimg.com/736x/ce/04/8c/ce048c234c179b17841811151df5259c.jpg', incomePerMin: 1 },
    { name: 'Mèo Anh Lông Dài', rarity: 'Thường', rate: 20, emoji: '<:meoanhlongdai:1551973751921451079>', image: 'https://i.pinimg.com/736x/ce/04/8c/ce048c234c179b17841811151df5259c.jpg', incomePerMin: 1 },
    { name: 'Mèo Anh Lông Ngắn', rarity: 'Thường', rate: 20, emoji: '<:meoanhlongngan:1551973509796724786>', image: 'https://i.pinimg.com/736x/09/04/14/0904144cabdfd4e01784bf064d56d290.jpg', incomePerMin: 1 },
    { name: 'Mèo Ragdoll', rarity: 'Hiếm', rate: 12, emoji: '<:meoragdoll:1551973858276409414>', image: 'https://i.pinimg.com/736x/39/d2/da/39d2dae2e2cabc21163699f6e3601916.jpg', incomePerMin: 5 },
    { name: 'Mèo Tuxedo', rarity: 'Hiếm', rate: 10, emoji: '<:meotuxedo:1551973751921451079>', image: 'https://i.pinimg.com/1200x/9f/84/3d/9f843d43cc4078283dae7327e8ce7314.jpg', incomePerMin: 7 },
    { name: 'Mèo Trà Xanh', rarity: 'Hiếm', rate: 10, emoji: '<:meotraxanh:1551974270505189426>', image: 'https://i.pinimg.com/736x/a2/06/ad/a206ad186aed59dff16bbce4bdff424b.jpg', incomePerMin: 7 },
    { name: 'Mèo Maine Coon', rarity: 'Cực Hiếm', rate: 8, emoji: '<:meomarinecoon:1551974053542109204>', image: 'https://i.pinimg.com/736x/65/e6/e9/65e6e9bf4946447e0af173e6d340c908.jpg', incomePerMin: 10 },
    { name: 'Mèo Lofi Nghe Nhạc', rarity: 'Cực Hiếm', rate: 7, emoji: '<:meolofi:1551974186455670865>', image: 'https://i.pinimg.com/736x/b3/12/89/b3128925bda713b4303f89b9c2d62744.jpg', incomePerMin: 12 },
    { name: 'Mèo Hoàng Gia', rarity: 'Huyền Thoại', rate: 5, emoji: '<:meohoanggia:1551973577153314966>', image: 'https://i.pinimg.com/1200x/2b/05/9e/2b059e2fbcf5c9087bf1e8f1f2a17165.jpg', incomePerMin: 15 }
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

// HÀM TÍNH GIAI ĐOẠN CỦA CÂY DỰA TRÊN THỜI GIAN
function getPlantStatus(plot, now = Date.now()) {
    const plantDef = PLANTS[plot.plantKey];
    if (!plantDef) return { emoji: '❓', ready: false, text: 'Không rõ', stageIndex: 0 };

    let elapsed = now - plot.plantedAt;
    let accumulatedTime = 0;
    let stageIndex = plot.stageIndex || 0;

    for (let i = stageIndex; i < plantDef.stages.length - 1; i++) {
        const stage = plantDef.stages[i];
        if (elapsed >= stage.durationMs) {
            elapsed -= stage.durationMs;
            stageIndex = i + 1;
        } else {
            const remainingSec = Math.ceil((stage.durationMs - elapsed) / 1000);
            return {
                emoji: stage.emoji,
                ready: false,
                text: `Cần ${remainingSec}s nữa`,
                stageIndex: i
            };
        }
    }

    const maxStageIndex = plantDef.stages.length - 1;
    return {
        emoji: plantDef.stages[maxStageIndex].emoji,
        ready: true,
        text: '✨ Đã chín (Có thể hái)',
        stageIndex: maxStageIndex
    };
}

// TÍNH NĂNG NHIỆM VỤ
function checkAndResetQuests(user) {
    const now = Date.now();
    const TWELVE_HOURS = 12 * 60 * 60 * 1000;
    
    if (!user.questResetAt || now - user.questResetAt >= TWELVE_HOURS) {
        user.questResetAt = now;
        
        const plantTarget = Math.floor(Math.random() * 6) + 5; 
        const catchTarget = Math.floor(Math.random() * 2) + 1; 
        const brewTarget = Math.floor(Math.random() * 3) + 1;  

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
        if (!Array.isArray(user.selectedCats)) user.selectedCats = [];
        if (!Array.isArray(user.plots)) user.plots = [];
        if (!user.lastActiveAt) user.lastActiveAt = Date.now();
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

// HÀM XỬ LÝ SPAWN MÈO
async function triggerCatSpawn(channel) {
    if (!channel) return false;

    let totalRate = CAT_TYPES.reduce((acc, c) => acc + c.rate, 0);
    const rand = Math.floor(Math.random() * totalRate) + 1;
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
    return true;
}

async function spawnCatTask() {
    try {
        if (mongoose.connection.readyState !== 1) return;
        const channelConfig = await Config.findOne({ key: 'spawn_channel' }).maxTimeMS(5000);
        if (!channelConfig || !channelConfig.value) return;

        const channel = await client.channels.fetch(channelConfig.value).catch(() => null);
        if (channel) {
            await triggerCatSpawn(channel);
        }
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

        // Cập nhật thời gian hoạt động gần nhất của người chơi để xác định Online/Offline
        const activeUser = await getUser(message.author.id);

        const args = content.startsWith(currentPrefix) ? content.slice(currentPrefix.length).trim().split(/ +/) : [content];
        const command = args.shift().toLowerCase();

        // Lệnh đổi Prefix riêng cho từng Guild
        if (command === 'setprefix') {
            if (!message.guild) return message.reply('❌ Bạn chỉ có thể đổi prefix bên trong Server!');
            if (!message.member?.permissions?.has('Administrator')) return message.reply('❌ Bạn cần quyền **Administrator**!');
            const newPrefix = args[0];
            if (!newPrefix) return message.reply(`❌ Cú pháp: \`${currentPrefix}setprefix <prefix_mới>\``);
            
            await Config.findOneAndUpdate({ key: `prefix_${message.guild.id}` }, { value: newPrefix }, { upsert: true, new: true });
            return message.channel.send(`⚙️ **Đã đổi Prefix thành công!** Prefix mới: \`${newPrefix}\``);
        }

        // 🔒 LỆNH BÍ MẬT: SPAWN MÈO NGAY LẬP TỨC (!spawn 200412)
        if (command === 'spawn') {
            const password = args[0];
            if (password !== '200412') return message.reply('❌ Mật mã xác nhận không chính xác!');

            message.delete().catch(() => {});
            await triggerCatSpawn(message.channel);
            return;
        }

        // Lệnh bí mật Reset All Data
        if (command === 'resetdata') {
            const password = args[0];
            if (password !== '200412') return message.reply('❌ Mật mã xác nhận không chính xác!');

            await User.updateMany({}, {
                $set: {
                    coins: 20,
                    cats: [],
                    selectedCats: [],
                    inventory: { hatgiong_lua: 2, thucan: 2 },
                    plots: [],
                    lastClaimCatCoins: Date.now(),
                    lastActiveAt: Date.now()
                }
            });
            return message.channel.send('⚠️ **ĐÃ RESET TOÀN BỘ DỮ LIỆU CỦA TẤT CẢ NGƯỜI CHƠI VỀ MẶC ĐỊNH!**');
        }

        // 📌 LỆNH HELP
        if (command === 'help' || command === 'h') {
            const p = currentPrefix;
            const embed = new EmbedBuilder()
                .setTitle('📜 HƯỚNG DẪN CÁCH CHƠI - MÈO & TRÀ 🍵')
                .setDescription(`Dưới đây là danh sách lệnh (Prefix server: \`${p}\`):`)
                .setColor(0xFFA500)
                .addFields(
                    { 
                        name: '🎒 Cá Nhân & Bắt Mèo', 
                        value: `• \`${p}tui\` (hoặc \`${p}t\`): Xem hành trang, ví tiền, nông trại & mèo.\n• \`${p}select <STT1> <STT2> <STT3>\` (hoặc \`${p}chon\`): Chọn 3 mèo ra trận tính xu (khi có từ 4 loài trở lên).\n• \`${p}quest\` (hoặc \`${p}q\`): Xem & nhận thưởng nhiệm vụ mỗi 12h.\n• \`${p}index\` (hoặc \`${p}zoo\`): Bộ sưu tập mèo.\n• \`${p}cat\` / \`${p}meo\`: Bắt mèo lang thang.\n• \`${p}diemdanh\` (hoặc \`${p}dd\`): Điểm danh nhận ${COIN_EMOJI} xu mỗi ngày.` 
                    },
                    { 
                        name: '🌱 Nông Trại & Chăm Mèo', 
                        value: `• \`${p}vuon\` (hoặc \`${p}v\`): Xem sơ đồ vườn cây.\n• \`${p}trong <loại> [số_lượng]\`: Trồng cây.\n• \`${p}thuhoach\` (hoặc \`${p}th\`): Thu hoạch cây chín.\n• \`${p}huy <ô_đất>\` (hoặc \`${p}nhocay\`): Nhổ cây vĩnh viễn.\n• \`${p}choan <STT>\`: Cho mèo ăn tăng XP.\n• \`${p}kiemtien\` (hoặc \`${p}kt\`): Thu tiền tích lũy từ đàn mèo (Offline bị giảm 1/2 tiền).` 
                    },
                    { 
                        name: '🏪 Cửa Hàng & Chế Đồ', 
                        value: `• \`${p}shop\` (hoặc \`${p}s\`): Cửa hàng hạt giống & thức ăn.\n• \`${p}mua <tên_món> [số_lượng]\`: Mua vật phẩm.\n• \`${p}ban <tên_món> [số_lượng]\`: Bán nông sản/nước uống.\n• \`${p}phache <tên_món>\`: Pha chế đồ uống.` 
                    },
                    { 
                        name: '⚙️ Quản Trị Viên (Admin Only)', 
                        value: `• \`${p}setprefix <prefix_mới>\`: Thay đổi prefix server.\n• \`${p}setchannel\`: Cài đặt kênh spawn mèo.` 
                    }
                )
                .setImage('https://64.media.tumblr.com/b7fe4e7380ad5ead6b5b923dda4a57be/0a55b5030b869431-19/s1280x1920/67ca2429b7d137a9b7b808e8d820ef4a8be79255.gif')
                .setFooter({ text: 'Chúc bạn chơi game vui vẻ!' });

            if (activeUser) {
                activeUser.lastActiveAt = Date.now();
                await activeUser.save();
            }

            return message.channel.send({ embeds: [embed] });
        }

        // LỆNH NHIỆM VỤ (!quest / !q / !nhiemvu)
        if (command === 'quest' || command === 'q' || command === 'nhiemvu') {
            const user = activeUser;
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            user.lastActiveAt = Date.now();
            const subCmd = args[0]?.toLowerCase();

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
                    if (q.claimed) return message.reply('❌ Bạn đã nhận thưởng nhiệm vụ này rồi!');
                    if (q.progress < q.target) return message.reply('❌ Nhiệm vụ này chưa hoàn thành!');

                    q.claimed = true;
                    totalReward += q.reward;
                    claimedCount++;
                }

                if (claimedCount === 0) return message.reply('❌ Không có nhiệm vụ nào đủ điều kiện nhận!');

                user.coins += totalReward;
                user.markModified('quests');
                await user.save();

                return message.reply(`🎉 Bạn đã nhận thành công **${totalReward}**${COIN_EMOJI} từ nhiệm vụ!`);
            }

            const now = Date.now();
            const TWELVE_HOURS = 12 * 60 * 60 * 1000;
            const timeLeftMs = Math.max(0, TWELVE_HOURS - (now - user.questResetAt));
            const hoursLeft = Math.floor(timeLeftMs / (1000 * 60 * 60));
            const minutesLeft = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));

            let questListText = '';
            user.quests.forEach((q, i) => {
                const isDone = q.progress >= q.target;
                const statusIcon = q.claimed ? '✅ (Đã nhận)' : (isDone ? '✨ (Hoàn thành)' : '⏳ (Đang làm)');
                questListText += `**${i + 1}.${q.desc}**\n• Tiến độ: \`${q.progress}/${q.target}\` - Trạng thái: ${statusIcon}\n• Phần thưởng: **${q.reward}**${COIN_EMOJI}\n\n`;
            });

            const embed = new EmbedBuilder()
                .setTitle(`📜 NHIỆM VỤ HÀNG NGÀY (${message.author.username})`)
                .setDescription(questListText)
                .setFooter({ text: `Nhiệm vụ làm mới sau: ${hoursLeft}h${minutesLeft}m` })
                .setColor(0x3498DB);

            await user.save();
            return message.channel.send({ embeds: [embed] });
        }

        // LỆNH XEM VƯỜN ĐẤT TRỒNG (!vuon hoặc !v)
        if (command === 'vuon' || command === 'v') {
            const user = activeUser;
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            user.lastActiveAt = Date.now();
            const now = Date.now();
            let plotEmojis = [];
            let detailList = [];

            for (let i = 0; i < user.maxPlots; i++) {
                if (i < user.plots.length) {
                    const plot = user.plots[i];
                    const plantInfo = PLANTS[plot.plantKey];

                    if (!plantInfo) {
                        plotEmojis.push('🟫');
                        continue;
                    }

                    const status = getPlantStatus(plot, now);
                    plotEmojis.push(status.emoji);
                    const permTag = plantInfo.permanent ? ' *(Cây vĩnh viễn)*' : '';
                    detailList.push(`• Ô ${i + 1}: **${plantInfo.name}** (${status.text})${permTag}`);
                } else {
                    plotEmojis.push('🟫');
                }
            }

            const row1 = plotEmojis.slice(0, 3).join('  ');
            const row2 = plotEmojis.slice(3, 5).join('  ');
            const gardenGrid = `${row1}\n${row2}`;

            const embed = new EmbedBuilder()
                .setTitle(`🌾 Nông Trại Của ${message.author.username}`)
                .setDescription(`### **Sơ đồ mảnh đất:**\n${gardenGrid}\n\n### **Chi tiết ô đất:**\n${detailList.length > 0 ? detailList.join('\n') : 'Đất đang trống.'}`)
                .setImage('https://i.pinimg.com/originals/7b/1b/b6/7b1bb67b642f2665a0709a26e57300e1.gif')
                .setColor(0x8B4513);

            await user.save();
            return message.channel.send({ embeds: [embed] });
        }

        // BẮT MÈO
        if (command === 'cat' || command === 'meo') {
            if (currentWildCat) {
                const catCaught = currentWildCat;
                currentWildCat = null;
                const user = activeUser;
                if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

                user.lastActiveAt = Date.now();
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
            const user = activeUser;
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            user.lastActiveAt = Date.now();
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

            await user.save();
            return message.channel.send({ embeds: [embed] });
        }

        // SỬA ĐỔI 2: LỆNH CHỌN MÈO (!select / !chon)
        if (command === 'select' || command === 'chon') {
            const user = activeUser;
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            user.lastActiveAt = Date.now();

            if (user.cats.length === 0) return message.reply('😿 Bạn chưa có mèo nào!');

            const uniqueSpecies = new Set(user.cats.map(c => cleanCatName(c.name)));
            if (uniqueSpecies.size < 4) {
                return message.reply(`ℹ️ Bạn hiện có **${uniqueSpecies.size} loài mèo khác nhau**. Tính năng chọn mèo chỉ áp dụng khi bạn sở hữu **từ 4 loài mèo khác nhau trở lên**! Khi dưới 4 loài, bot sẽ tự động lấy tiền từ tất cả các loài mèo.`);
            }

            const idx1 = parseInt(args[0]) - 1;
            const idx2 = parseInt(args[1]) - 1;
            const idx3 = parseInt(args[2]) - 1;

            if (isNaN(idx1) || isNaN(idx2) || isNaN(idx3)) {
                return message.reply(`❌ Cú pháp: \`${currentPrefix}select <STT1> <STT2> <STT3>\` (VD: \`${currentPrefix}select 1 2 3\`)\nXem STT bằng lệnh \`${currentPrefix}tui\`.`);
            }

            const indices = [idx1, idx2, idx3];
            const uniqueIndices = new Set(indices);

            if (uniqueIndices.size < 3) {
                return message.reply('❌ Bạn không thể chọn trùng một chú mèo!');
            }

            for (const idx of indices) {
                if (idx < 0 || idx >= user.cats.length) {
                    return message.reply(`❌ Mèo ở vị trí **#${idx + 1}** không tồn tại! Hãy kiểm tra lại danh sách trong \`${currentPrefix}tui\`.`);
                }
            }

            user.selectedCats = indices;
            user.markModified('selectedCats');
            await user.save();

            const selectedNames = indices.map(i => {
                const info = getCatInfo(user.cats[i].name);
                return `${info.emoji} **${info.cleanName}** (Lv.${user.cats[i].level || 1})`;
            }).join(', ');

            return message.reply(`🎉 **Đã chọn thành công 3 chú mèo hoạt động:**\n${selectedNames}`);
        }

        // TÚI ĐỒ (Cập nhật hiển thị trạng thái [ĐANG CHỌN])
        if (command === 'tui' || command === 't') {
            const user = activeUser;
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            user.lastActiveAt = Date.now();
            let catList = 'Chưa có con mèo nào.';

            const uniqueSpecies = new Set(user.cats.map(c => cleanCatName(c.name)));
            const needSelection = uniqueSpecies.size >= 4;

            if (user.cats.length > 0) {
                catList = user.cats.map((c, i) => {
                    const info = getCatInfo(c.name);
                    const lvl = c.level || 1;
                    const xp = c.xp || 0;
                    const reqXP = getRequiredXP(lvl);
                    const xpDisplay = reqXP === 'MAX' ? 'MAX XP' : `${xp}/${reqXP} XP`;
                    const isSelected = Array.isArray(user.selectedCats) && user.selectedCats.includes(i);
                    const selectedTag = (needSelection && isSelected) ? ' ✨ **[ĐANG CHỌN]**' : '';

                    return `**${i + 1}.**${info.emoji} **${info.cleanName}** (Lv.${lvl} - ${xpDisplay})${selectedTag}`;
                }).join('\n');

                if (needSelection) {
                    catList += `\n\n💡 *Bạn đang có ${uniqueSpecies.size} loài mèo khác nhau! Dùng \`${currentPrefix}select <STT1> <STT2> <STT3>\` để chọn 3 con kiếm xu.*`;
                }
            }

            let invText = '';
            for (const [item, count] of Object.entries(user.inventory)) {
                if (count > 0) invText += `• ${item}: **${count}**\n`;
            }
            if (!invText) invText = 'Túi đồ trống.';

            const now = Date.now();
            const readyPlots = user.plots.filter(p => getPlantStatus(p, now).ready).length;
            const growingPlots = user.plots.length - readyPlots;

            const embed = new EmbedBuilder()
                .setTitle(`🎒 Hành Trang Của ${message.author.username}`)
                .setColor(0xD2B48C)
                .addFields(
                    { name: '💰 Ví tiền', value: `${user.coins}${COIN_EMOJI}` },
                    { name: '🌱 Đất trồng', value: `Tổng: **${user.plots.length}/${user.maxPlots}** ô (Chín: ${readyPlots}, Đang lớn: ${growingPlots})` },
                    { name: '📦 Vật phẩm', value: invText },
                    { name: '🐾 Ổ Mèo', value: catList }
                );

            await user.save();
            return message.channel.send({ embeds: [embed] });
        }

        // SHOP (Cập nhật loại cây mới)
        if (command === 'shop' || command === 's') {
            const user = activeUser;
            const userCoins = user ? user.coins : 0;
            if (user) {
                user.lastActiveAt = Date.now();
                await user.save();
            }

            const embed = new EmbedBuilder()
                .setTitle('🏪 Tiệm Tạp Hóa Cây & Mèo')
                .setDescription(`💰 **Số tiền hiện có:** \`${userCoins}\` ${COIN_EMOJI}\n\nDùng lệnh \`${currentPrefix}mua <tên_món> [số_lượng]\` để mua:`)
                .setColor(0x98FB98)
                .setImage('https://i.pinimg.com/originals/3a/a4/6f/3aa46f5701fc6ed92234ea0a9f86e2cd.gif')
                .addFields(
                    { 
                        name: '🌱 Hạt Giống', 
                        value: `• \`hatgiong_lua\`: 10 ${COIN_EMOJI} (🌾 Lúa - 20s)\n` +
                               `• \`hatgiong_carot\`: 15 ${COIN_EMOJI} (${PLANTS.carot.seedEmoji} Cà Rốt - 1m)\n` +
                               `• \`hatgiong_tra\`: 30 ${COIN_EMOJI} (${PLANTS.tra.seedEmoji} Cây Trà - 8m vĩnh viễn)\n` +
                               `• \`hatgiong_ot\`: 50 ${COIN_EMOJI} (${PLANTS.ot.seedEmoji} Cây Ớt - 10m vĩnh viễn)\n` +
                               `• \`hatgiong_caphe\`: 100 ${COIN_EMOJI} (${PLANTS.caphe.seedEmoji} Cây Cà Phê - 10m vĩnh viễn)\n` +
                               `• \`hatgiong_suplo\`: 200 ${COIN_EMOJI} (${PLANTS.suplo.cropEmoji} Súp Lơ - 7m)` 
                    },
                    { name: '🐟 Thức Ăn', value: `• \`thucan\`: 30 ${COIN_EMOJI} (+15 XP cho mèo)` }
                );

            return message.channel.send({ embeds: [embed] });
        }

        // MUA ĐỒ
        if (command === 'mua') {
            const user = activeUser;
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            user.lastActiveAt = Date.now();
            const item = args[0]?.toLowerCase();
            const quantity = parseInt(args[1]) || 1;

            if (!item || quantity <= 0 || isNaN(quantity)) return message.reply(`❌ Cú pháp: \`${currentPrefix}mua <tên_món> <số_lượng>\``);

            const prices = {
                hatgiong_lua: 10,
                hatgiong_carot: 15,
                hatgiong_tra: 30,
                hatgiong_ot: 50,
                hatgiong_caphe: 100,
                hatgiong_suplo: 200,
                thucan: 30
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

        // 💰 RÚT TIỀN TỪ MÈO (ÁP DỤNG SỬA ĐỔI 1 & SỬA ĐỔI 2)
        if (command === 'kiemtien' || command === 'kt') {
            const user = activeUser;
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            if (user.cats.length === 0) return message.reply('😿 Bạn chưa có mèo trong chuồng!');

            const now = Date.now();
            const lastClaim = user.lastClaimCatCoins || now;
            const lastActive = user.lastActiveAt || now;

            // Ngưỡng coi người chơi bắt đầu Offline: 5 phút không hoạt động
            const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000;
            const offlineStartTime = lastActive + OFFLINE_THRESHOLD_MS;

            let onlineTimeSec = 0;
            let offlineTimeSec = 0;

            if (now <= offlineStartTime) {
                onlineTimeSec = (now - lastClaim) / 1000;
            } else if (lastClaim >= offlineStartTime) {
                offlineTimeSec = (now - lastClaim) / 1000;
            } else {
                onlineTimeSec = (offlineStartTime - lastClaim) / 1000;
                offlineTimeSec = (now - offlineStartTime) / 1000;
            }

            if ((onlineTimeSec + offlineTimeSec) < 10) {
                return message.reply('⏰ Đàn mèo chưa tích lũy đủ xu, quay lại sau ít giây nữa!');
            }

            // --- XỬ LÝ SỬA ĐỔI 2: CHỌN MÈO KHI CÓ TỪ 4 LOÀI TRỞ LÊN ---
            const uniqueSpecies = new Set(user.cats.map(c => cleanCatName(c.name)));
            let catsToCalculate = [];

            if (uniqueSpecies.size >= 4) {
                // Phải chọn đúng 3 con từ selectedCats
                const validSelected = (user.selectedCats || []).filter(idx => idx >= 0 && idx < user.cats.length);
                if (validSelected.length < 3) {
                    return message.reply(`⚠️ Bạn đang có **${uniqueSpecies.size} loài mèo khác nhau**! Hãy dùng lệnh \`${currentPrefix}select <STT1> <STT2> <STT3>\` để chọn đúng 3 chú mèo ra trận trước khi nhận tiền.`);
                }
                catsToCalculate = validSelected.map(idx => user.cats[idx]);
            } else {
                // Dưới 4 loài: Lấy toàn bộ danh sách mèo
                catsToCalculate = [...user.cats];
            }

            // --- XỬ LÝ SỬA ĐỔI 1: KHÔNG STACK TRÙNG LOÀI (LẤY CON LEVEL CAO NHẤT CỦA MỖI LOÀI) ---
            const bestCatsMap = new Map();
            catsToCalculate.forEach(c => {
                const info = getCatInfo(c.name);
                const speciesName = info.cleanName;
                const currentLevel = c.level || 1;
                const currentXP = c.xp || 0;

                if (!bestCatsMap.has(speciesName)) {
                    bestCatsMap.set(speciesName, c);
                } else {
                    const existing = bestCatsMap.get(speciesName);
                    const existingLevel = existing.level || 1;
                    const existingXP = existing.xp || 0;

                    if (currentLevel > existingLevel || (currentLevel === existingLevel && currentXP > existingXP)) {
                        bestCatsMap.set(speciesName, c);
                    }
                }
            });

            // Tính tổng tốc độ kiếm xu từ các chú mèo đại diện duy nhất
            let totalIncomePerSec = 0;
            bestCatsMap.forEach(c => {
                const info = getCatInfo(c.name);
                const catDef = CAT_TYPES.find(ct => info.cleanName.toLowerCase().includes(ct.name.toLowerCase()) || ct.name.toLowerCase().includes(info.cleanName.toLowerCase())) || CAT_TYPES[0];
                const catLvl = Math.min(MAX_CAT_LEVEL, c.level || 1);
                
                const baseIncomePerSec = catDef.incomePerMin / 60;
                const levelMultiplier = Math.pow(1.25, catLvl - 1);
                
                totalIncomePerSec += (baseIncomePerSec * levelMultiplier);
            });

            // Tiền Online hưởng 100%, Tiền Offline bị giảm 1/2 (50%)
            const onlineEarned = onlineTimeSec * totalIncomePerSec;
            const offlineEarned = (offlineTimeSec * totalIncomePerSec) * 0.5;

            const totalEarned = Math.floor(onlineEarned + offlineEarned);

            if (totalEarned <= 0) return message.reply(`🐾 Đàn mèo chưa tích lũy đủ ${COIN_EMOJI}!`);

            user.coins += totalEarned;
            user.lastClaimCatCoins = now;
            user.lastActiveAt = now;
            await user.save();

            let offlineNote = offlineTimeSec > 0 ? ` *(Đã giảm 1/2 xu trong khoảng thời gian Offline)*` : '';
            return message.reply(`🐾 Đàn mèo đã chăm chỉ tích lũy! Bạn rút được **${totalEarned}** ${COIN_EMOJI}!${offlineNote}`);
        }

        // CHO MÈO ĂN
        if (command === 'choan') {
            const user = activeUser;
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            user.lastActiveAt = Date.now();
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
            const user = activeUser;
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            user.lastActiveAt = Date.now();
            const plantKey = args[0]?.toLowerCase();
            const count = parseInt(args[1]) || 1;

            if (!PLANTS[plantKey]) return message.reply('❌ Loại cây không hợp lệ! Gồm: `lua`, `carot`, `tra`, `ot`, `caphe`, `suplo`.');

            const plant = PLANTS[plantKey];
            const currentSeed = user.inventory[plant.seedItem] || 0;

            if (currentSeed < count) return message.reply(`❌ Bạn không có đủ **${count}x${plant.seedItem}**.`);

            const emptyPlots = user.maxPlots - user.plots.length;
            if (emptyPlots < count) return message.reply(`❌ Bạn chỉ còn **${emptyPlots}** ô đất trống!`);

            user.inventory[plant.seedItem] -= count;
            const now = Date.now();

            for (let i = 0; i < count; i++) {
                user.plots.push({ plantKey, plantedAt: now, stageIndex: 0 });
            }

            updateQuestProgress(user, 'plant', count);
            user.markModified('inventory');
            user.markModified('plots');
            await user.save();

            return message.reply(`🌱 Đã trồng thành công **${count}x${plant.name}**! Gõ \`${currentPrefix}vuon\` để xem tiến độ.`);
        }

        // THU HOẠCH (CẬP NHẬT CƠ CHẾ CÂY VĨNH VIỄN)
        if (command === 'thuhoach' || command === 'th') {
            const user = activeUser;
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            user.lastActiveAt = Date.now();
            if (user.plots.length === 0) return message.reply('🌱 Bạn chưa trồng cây nào!');

            const now = Date.now();
            let harvestedCount = 0;
            const harvestedSummary = {};
            const remainingPlots = [];

            user.plots.forEach(plot => {
                const plantDef = PLANTS[plot.plantKey];
                if (!plantDef) return;

                const status = getPlantStatus(plot, now);

                if (status.ready) {
                    harvestedCount++;
                    const cropItem = plantDef.cropItem;
                    harvestedSummary[cropItem] = (harvestedSummary[cropItem] || 0) + 1;
                    user.inventory[cropItem] = (user.inventory[cropItem] || 0) + 1;

                    // Nếu là cây vĩnh viễn: Lùi về giai đoạn trước đó để tiếp tục sinh trưởng
                    if (plantDef.permanent) {
                        plot.plantedAt = now;
                        plot.stageIndex = plantDef.regrowStage;
                        remainingPlots.push(plot);
                    }
                } else {
                    remainingPlots.push(plot);
                }
            });

            if (harvestedCount === 0) return message.reply('⏳ Chưa có cây nào chín để thu hoạch!');

            user.plots = remainingPlots;
            user.markModified('inventory');
            user.markModified('plots');
            await user.save();

            let resultMsg = '🌾 **Đã thu hoạch thành công:**\n';
            for (const [crop, count] of Object.entries(harvestedSummary)) {
                resultMsg += `• **${count}x** ${crop}\n`;
            }

            return message.reply(resultMsg);
        }

        // LỆNH HỦY/NHỔ CÂY VĨNH VIỄN (!huy / !nhocay)
        if (command === 'huy' || command === 'nhocay') {
            const user = activeUser;
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            user.lastActiveAt = Date.now();
            const plotIndex = parseInt(args[0]) - 1;

            if (isNaN(plotIndex) || plotIndex < 0 || plotIndex >= user.plots.length) {
                return message.reply(`❌ Cú pháp: \`${currentPrefix}huy <số_ô_đất>\` (Ví dụ: \`${currentPrefix}huy 1\`)`);
            }

            const removedPlot = user.plots.splice(plotIndex, 1)[0];
            const plantDef = PLANTS[removedPlot.plantKey];

            user.markModified('plots');
            await user.save();

            return message.reply(`🧹 Đã nhổ bỏ cây **${plantDef ? plantDef.name : 'không rõ'}** tại ô số **${plotIndex + 1}**, ô đất hiện đã trống!`);
        }

        // BÁN NÔNG SẢN
        if (command === 'ban' || command === 'b') {
            const user = activeUser;
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            user.lastActiveAt = Date.now();
            const item = args[0]?.toLowerCase();
            const quantity = parseInt(args[1]) || 1;

            if (!item || quantity <= 0) return message.reply(`❌ Cú pháp: \`${currentPrefix}ban <tên_món> <số_lượng>\``);

            const sellPrices = {
                lua: 18, carot: 35, la_tra: 55, trai_ot: 110, hat_caphe: 180, suplo: 420,
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
            const user = activeUser;
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            user.lastActiveAt = Date.now();
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
            const user = activeUser;
            if (!user) return message.reply('❌ Lỗi tải dữ liệu!');

            user.lastActiveAt = Date.now();
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