const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const embedPresets = require('../../utils/embedPresets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('weather')
        .setDescription('Cek cuaca kota manapun di dunia')
        .addStringOption((opt) => opt.setName('city').setDescription('Nama kota').setRequired(true).setMaxLength(50)),

    async execute(interaction) {
        await interaction.deferReply();
        const city = interaction.options.getString('city');

        try {
            const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
            if (!res.ok) throw new Error('City not found');
            const data = await res.json();

            const current = data.current_condition[0];
            const area = data.nearest_area[0];
            const forecast = data.weather.slice(0, 3);

            const weatherEmojis = {
                Sunny: '☀️', Clear: '🌙', 'Partly cloudy': '⛅', Cloudy: '☁️',
                Overcast: '🌥️', Mist: '🌫️', Fog: '🌫️', Rain: '🌧️',
                'Light rain': '🌦️', 'Heavy rain': '⛈️', Snow: '🌨️', Thunderstorm: '⛈️',
            };

            const desc = current.weatherDesc[0].value;
            const emoji = weatherEmojis[desc] || '🌤️';

            const embed = new EmbedBuilder()
                .setColor('#4FC3F7')
                .setTitle(`${emoji} Cuaca di ${area.areaName[0].value}, ${area.country[0].value}`)
                .setDescription(`**${desc}**`)
                .addFields(
                    { name: '🌡️ Suhu', value: `**${current.temp_C}°C** (${current.temp_F}°F)`, inline: true },
                    { name: '💧 Humidity', value: `${current.humidity}%`, inline: true },
                    { name: '💨 Angin', value: `${current.windspeedKmph} km/h ${current.winddir16Point}`, inline: true },
                    { name: '☁️ Cloudcover', value: `${current.cloudcover}%`, inline: true },
                    { name: '🌡️ Feels Like', value: `${current.FeelsLikeC}°C`, inline: true },
                    { name: '👁️ Visibility', value: `${current.visibility} km`, inline: true },
                )
                .setTimestamp()
                .setFooter({ text: `${config.defaults.footerText} • Powered by wttr.in` });

            // Add forecast
            if (forecast.length > 0) {
                const forecastText = forecast.map((day) => {
                    const d = new Date(day.date);
                    const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
                    return `**${dayName}** ${day.mintempC}°—${day.maxtempC}°C`;
                }).join(' │ ');

                embed.addFields({ name: '📅 Forecast 3 Hari', value: forecastText, inline: false });
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({
                embeds: [embedPresets.error('Not Found', `Kota "${city}" tidak ditemukan atau layanan cuaca sedang gangguan.`)],
            });
        }
    },
};
