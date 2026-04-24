const chalk = {
    red: (t) => `\x1b[31m${t}\x1b[0m`,
    green: (t) => `\x1b[32m${t}\x1b[0m`,
    yellow: (t) => `\x1b[33m${t}\x1b[0m`,
    blue: (t) => `\x1b[34m${t}\x1b[0m`,
    magenta: (t) => `\x1b[35m${t}\x1b[0m`,
    cyan: (t) => `\x1b[36m${t}\x1b[0m`,
    white: (t) => `\x1b[37m${t}\x1b[0m`,
    gray: (t) => `\x1b[90m${t}\x1b[0m`,
    bold: (t) => `\x1b[1m${t}\x1b[0m`,
};

function getTimestamp() {
    return new Date().toLocaleString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

const logger = {
    info(message) {
        console.log(`${chalk.gray(getTimestamp())} ${chalk.blue('[INFO]')} ${message}`);
    },
    success(message) {
        console.log(`${chalk.gray(getTimestamp())} ${chalk.green('[SUCCESS]')} ${message}`);
    },
    warn(message) {
        console.log(`${chalk.gray(getTimestamp())} ${chalk.yellow('[WARN]')} ${message}`);
    },
    error(message, error = null) {
        console.log(`${chalk.gray(getTimestamp())} ${chalk.red('[ERROR]')} ${message}`);
        if (error) console.error(error);
    },
    command(commandName, user, guild) {
        console.log(
            `${chalk.gray(getTimestamp())} ${chalk.magenta('[CMD]')} ${chalk.cyan(commandName)} by ${chalk.white(user)} in ${chalk.yellow(guild)}`
        );
    },
    event(eventName, detail = '') {
        console.log(
            `${chalk.gray(getTimestamp())} ${chalk.green('[EVENT]')} ${chalk.cyan(eventName)} ${detail}`
        );
    },
    debug(message) {
        if (process.env.DEBUG === 'true') {
            console.log(`${chalk.gray(getTimestamp())} ${chalk.gray('[DEBUG]')} ${message}`);
        }
    },
};

module.exports = logger;
