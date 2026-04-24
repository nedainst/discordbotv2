const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const embedPresets = require('../../utils/embedPresets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('translate')
        .setDescription('Terjemahkan teks ke bahasa lain')
        .addStringOption((opt) => opt.setName('text').setDescription('Teks yang akan diterjemahkan').setRequired(true).setMaxLength(500))
        .addStringOption((opt) =>
            opt.setName('to').setDescription('Bahasa tujuan').setRequired(true).addChoices(
                { name: 'English', value: 'en' },
                { name: 'Indonesian', value: 'id' },
                { name: 'Japanese', value: 'ja' },
                { name: 'Korean', value: 'ko' },
                { name: 'Chinese', value: 'zh' },
                { name: 'Spanish', value: 'es' },
                { name: 'French', value: 'fr' },
                { name: 'German', value: 'de' },
                { name: 'Arabic', value: 'ar' },
                { name: 'Portuguese', value: 'pt' },
                { name: 'Russian', value: 'ru' },
                { name: 'Thai', value: 'th' },
                { name: 'Malay', value: 'ms' },
            )
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const text = interaction.options.getString('text');
        const targetLang = interaction.options.getString('to');

        try {
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|${targetLang}`;
            const res = await fetch(url);
            const data = await res.json();

            if (!data.responseData || data.responseStatus !== 200) {
                throw new Error('Translation failed');
            }

            const translated = data.responseData.translatedText;
            const detectedLang = data.responseData.match?.source || 'auto';
            const langNames = {
                en: '🇬🇧 English', id: '🇮🇩 Indonesian', ja: '🇯🇵 Japanese', ko: '🇰🇷 Korean',
                zh: '🇨🇳 Chinese', es: '🇪🇸 Spanish', fr: '🇫🇷 French', de: '🇩🇪 German',
                ar: '🇸🇦 Arabic', pt: '🇵🇹 Portuguese', ru: '🇷🇺 Russian', th: '🇹🇭 Thai',
                ms: '🇲🇾 Malay',
            };

            const embed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle('🌐 Translation')
                .addFields(
                    { name: `📥 Original (${langNames[detectedLang] || detectedLang})`, value: text },
                    { name: `📤 ${langNames[targetLang] || targetLang}`, value: translated }
                )
                .setTimestamp()
                .setFooter({ text: `${config.defaults.footerText} • MyMemory API` });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({
                embeds: [embedPresets.error('Translation Error', 'Gagal menerjemahkan. Coba lagi nanti.')],
            });
        }
    },
};
